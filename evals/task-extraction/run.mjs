import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildMessages, extractTasks, DEFAULT_MODEL, PROMPT_VERSION } from '../../lambdas/lib/extractTasks.mjs';
import { grade, summarize, isUtc, outputHash } from './grade.mjs';
import { getPrompt } from '../../lambdas/lib/promptVersions.mjs';
import { createAdapter, modelOption } from './models.mjs';
import { formatRate, PASS_RATE_NOTE, isFullyPassed } from './metrics.mjs';

const baseDirectory = dirname(fileURLToPath(import.meta.url));
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const readJson = async path => JSON.parse(await readFile(resolve(path), 'utf8'));
const fenced = value => `\n\n\`\`\`json\n${JSON.stringify(value, null, 2).replaceAll('```', '\\u0060\\u0060\\u0060')}\n\`\`\`\n`;

export function validateCases(cases) {
  const ids = new Set();

  for (const testCase of cases) {
    if (
      !testCase.id ||
      ids.has(testCase.id) ||
      typeof testCase.transcript !== 'string' ||
      !testCase.context ||
      !Array.isArray(testCase.tags) ||
      !Array.isArray(testCase.expected)
    ) {
      throw new Error(`Invalid or duplicate case: ${testCase.id}`);
    }
    ids.add(testCase.id);

    const expectedIds = new Set(testCase.expected.map(task => task.id));
    if (expectedIds.size !== testCase.expected.length) {
      throw new Error(`Duplicate expected task ID: ${testCase.id}`);
    }

    for (const task of testCase.expected) {
      if (
        !task.id ||
        !task.meaning ||
        !task.match ||
        (task.parentId !== null && !expectedIds.has(task.parentId)) ||
        (task.scheduledDatetimeUtc !== null && !isUtc(task.scheduledDatetimeUtc))
      ) {
        throw new Error(`Invalid expectation: ${testCase.id}/${task.id}`);
      }
      new RegExp(task.match, 'i');
    }
  }
}

export function compare(records, baseline) {
  return records.map(record => {
    const previous = baseline.records.find(
      candidate => candidate.case.id === record.case.id && candidate.repeat === record.repeat,
    );
    if (!previous) return { id: record.key, change: 'new' };
    if (hash(previous.case) !== hash(record.case)) {
      return { id: record.key, change: 'case changed; not comparable' };
    }

    const passedBefore = isFullyPassed(previous);
    const passedAfter = isFullyPassed(record);
    let change = 'unchanged';
    if (passedBefore !== passedAfter) {
      change = passedAfter ? 'improved' : 'regressed';
    }
    return { id: record.key, change };
  });
}

export async function main(args = process.argv.slice(2), hooks = {}) {
  const { values: opts } = parseArgs({
    args,
    options: {
    model: { type: 'string', default: DEFAULT_MODEL },
    provider: { type: 'string', default: 'openai' },
    'prompt-version': { type: 'string', default: PROMPT_VERSION },
    case: { type: 'string' },
    tag: { type: 'string' },
    repeats: { type: 'string', default: '1' },
    concurrency: { type: 'string', default: '2' },
    label: { type: 'string', default: 'run' },
    'output-dir': { type: 'string', default: resolve(baseDirectory, 'results') },
    cases: { type: 'string', default: resolve(baseDirectory, 'cases.jsonl') },
    baseline: { type: 'string' },
    reviews: { type: 'string' },
    replay: { type: 'string' },
    'validate-only': { type: 'boolean', default: false },
    help: { type: 'boolean', default: false },
    },
  });
  if (opts.help) {
    console.log('Usage: npm run eval -- [--provider openai|anthropic|google|mistral|xai] [--model MODEL] [--prompt-version VERSION] [--case ID] [--tag TAG] [--repeats N] [--concurrency N] [--label NAME] [--baseline REPORT.json] [--reviews REVIEWS.json] [--replay REPORT.json] [--validate-only]');
    return;
  }
  const repeats = Number(opts.repeats);
  const concurrency = Number(opts.concurrency);
  if (![repeats, concurrency].every(n => Number.isInteger(n) && n >= 1 && n <= 100)) {
    throw new Error('Repeats and concurrency must be integers from 1 to 100');
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(opts.label)) {
    throw new Error('Label must use letters, numbers, underscores or hyphens');
  }

  const cases = (await readFile(resolve(opts.cases), 'utf8'))
    .split('\n')
    .filter(line => line.trim())
    .map(JSON.parse);
  validateCases(cases);
  const selected = cases.filter(testCase =>
    (!opts.case || testCase.id === opts.case) &&
    (!opts.tag || testCase.tags.includes(opts.tag)),
  );
  if (!selected.length) throw new Error('No cases selected');
  if (opts['validate-only']) {
    console.log(`Validated ${selected.length} cases; no API calls made.`);
    return;
  }

  const reviews = opts.reviews ? await readJson(opts.reviews) : {};
  const baseline = opts.baseline ? await readJson(opts.baseline) : null;
  const replay = opts.replay ? await readJson(opts.replay) : null;
  if (!replay) { getPrompt(opts['prompt-version']); modelOption(opts.provider, opts.model); }
  let records;
  if (replay) {
    records = replay.records
      .filter(record => selected.some(testCase => testCase.id === record.case.id))
      .map(record => ({
        ...record,
        outputHash: outputHash(record.tasks),
        grade: record.error ? null : grade(record.case, record.tasks, reviews[record.key]),
      }));
    if (!records.length) throw new Error('No replay records selected');
  } else {
    const adapter = hooks.adapter ?? createAdapter(opts.provider);
    const jobs = selected.flatMap(testCase =>
      Array.from({ length: repeats }, (_, index) => ({ case: testCase, repeat: index + 1 })),
    );
    records = new Array(jobs.length);
    // Workers claim an index before awaiting, preserving the job order in records.
    let next = 0;
    await Promise.all(
      Array.from({ length: Math.min(concurrency, jobs.length) }, async () => {
        while (next < jobs.length) {
          const index = next++;
          const job = jobs[index];
          const key = `${job.case.id}#${job.repeat}`;
          const record = { ...job, key };
          const start = performance.now();
          try {
            const result = await extractTasks({
              adapter,
              captureOutputErrors: true,
              model: opts.model,
              promptVersion: opts['prompt-version'],
              transcript: job.case.transcript,
              ...job.case.context,
            });
            Object.assign(record, result, {
              outputHash: outputHash(result.tasks),
              grade: grade(job.case, result.tasks, reviews[key]),
            });
          } catch (error) {
            record.error = {
              kind: error.name === 'ExtractionOutputError' ? 'output' : 'api',
              name: error.name,
              status: error.status ?? null,
            };
            // Avoid storing provider error messages, which may contain request data.
            if (error.rawContent !== undefined) record.rawContent = error.rawContent;
            if (error.usage) record.usage = error.usage;
            if (error.providerUsage) record.providerUsage = error.providerUsage;
            if (error.finishReason) record.finishReason = error.finishReason;
            if (error.model) record.model = error.model;
          }
          record.latencyMs = Math.round(performance.now() - start);
          records[index] = record;
          await hooks.onRecord?.(record, { completed: records.filter(Boolean).length, total: jobs.length });
          console.log(`${key}: ${record.error?.kind ?? (isFullyPassed(record) ? 'fully passed' : record.grade.semantic === 'pending' ? 'not fully passed / review pending' : 'not fully passed')}`);
        }
      }),
    );
  }
  const modelSnapshot = replay ? (replay.modelSnapshot ?? null) : modelOption(opts.provider, opts.model);
  const report = {
    createdAt: new Date().toISOString(),
    label: opts.label,
    model: replay?.model ?? opts.model,
    provider: replay?.provider ?? (replay ? 'openai' : opts.provider),
    modelSnapshot,
    promptVersion: replay?.promptVersion ?? opts['prompt-version'],
    promptSnapshot: replay ? (replay.promptSnapshot ?? null) : getPrompt(opts['prompt-version']),
    promptHash: replay?.promptHash ?? hash(buildMessages({ transcript: '', promptVersion: opts['prompt-version'] })[0].content),
    datasetHash: hash(records.map(record => record.case)),
    replayOf: opts.replay ?? null,
    summary: summarize(records),
    categories: Object.fromEntries(
      [...new Set(records.flatMap(record => record.case.tags))].map(tag => [
        tag,
        summarize(records.filter(record => record.case.tags.includes(tag))),
      ]),
    ),
    usage: records.reduce(
      (sum, record) => ({
        prompt_tokens: sum.prompt_tokens + (record.usage?.prompt_tokens ?? 0),
        completion_tokens: sum.completion_tokens + (record.usage?.completion_tokens ?? 0),
      }),
      { prompt_tokens: 0, completion_tokens: 0 },
    ),
    comparison: baseline ? compare(records, baseline) : null,
    reviews: Object.fromEntries(records.filter(record => reviews[record.key]?.outputHash === record.outputHash).map(record => [record.key, reviews[record.key]])),
    records,
  };
  const folder = resolve(opts['output-dir']);
  await mkdir(folder, { recursive: true });
  const stem = resolve(folder, `${report.createdAt.replaceAll(/[:.]/g, '-')}-${opts.label}`);
  let markdown = `# Task extraction eval: ${opts.label}

Provider: ${report.provider}; model: ${report.model}; prompt: ${report.promptVersion} (${report.promptHash})

Fully passed with semantic review: ${report.summary.fullyPassed}/${report.summary.total}. Semantic reviews pending: ${report.summary.semanticPending}. API errors: ${report.summary.apiErrors}; output errors: ${report.summary.outputErrors}.

Pass Rate: ${formatRate(report.summary.passRate)}.

${PASS_RATE_NOTE}

Pattern matches are hints. Review task meaning, omissions, invented tasks, and grouping before treating a run as accepted.

## Categories

| Category | Fully passed | Pass Rate |
|---|---|---|
`;
  for (const [tag, summary] of Object.entries(report.categories)) {
    markdown += `| ${tag} | ${summary.fullyPassed}/${summary.total} | ${formatRate(summary.passRate)} |\n`;
  }
  if (report.comparison) {
    markdown += `\n## Baseline comparison\n${fenced(report.comparison)}`;
  }
  for (const record of records) {
    markdown += `\n## ${record.key}\n${fenced({
      transcript: record.case.transcript,
      context: record.case.context,
      expected: record.case.expected,
      actual: record.tasks,
      outputHash: record.outputHash,
      rawContent: record.error ? record.rawContent : undefined,
      grade: record.grade,
      review: report.reviews[record.key],
      error: record.error,
    })}`;
  }
  await writeFile(`${stem}.json`, JSON.stringify(report, null, 2));
  await writeFile(`${stem}.md`, markdown);
  await hooks.onReport?.(report, stem);
  console.log(JSON.stringify(report.summary, null, 2));
  console.log(`Reports: ${stem}.{json,md}`);
  const hasFailedGrades = records.some(record =>
    record.grade && (!record.grade.deterministicPass || record.grade.semantic === 'fail'),
  );
  if (!hooks.embedded && (report.summary.apiErrors || report.summary.outputErrors || hasFailedGrades)) {
    process.exitCode = 1;
  }
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
