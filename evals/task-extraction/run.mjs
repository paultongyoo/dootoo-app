import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildMessages, extractTasks, DEFAULT_MODEL, PROMPT_VERSION } from '../../lambdas/lib/extractTasks.mjs';
import { grade, summarize, isUtc, outputHash } from './grade.mjs';

const base = dirname(fileURLToPath(import.meta.url));
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const json = async path => JSON.parse(await readFile(resolve(path), 'utf8'));
const fenced = value => `\n\n\`\`\`json\n${JSON.stringify(value, null, 2).replaceAll('```', '\\u0060\\u0060\\u0060')}\n\`\`\`\n`;

export function validateCases(cases) {
  const ids = new Set();
  for (const c of cases) {
    if (!c.id || ids.has(c.id) || typeof c.transcript !== 'string' || !c.context || !Array.isArray(c.tags) || !Array.isArray(c.expected)) throw new Error(`Invalid or duplicate case: ${c.id}`);
    ids.add(c.id);
    const expectedIds = new Set(c.expected.map(t => t.id));
    if (expectedIds.size !== c.expected.length) throw new Error(`Duplicate expected task ID: ${c.id}`);
    for (const t of c.expected) {
      if (!t.id || !t.meaning || !t.match || (t.parentId !== null && !expectedIds.has(t.parentId)) || (t.scheduledDatetimeUtc !== null && !isUtc(t.scheduledDatetimeUtc))) throw new Error(`Invalid expectation: ${c.id}/${t.id}`);
      new RegExp(t.match, 'i');
    }
  }
}

export function compare(records, baseline) {
  return records.map(r => {
    const old = baseline.records.find(b => b.case.id === r.case.id && b.repeat === r.repeat);
    if (!old) return { id: r.key, change: 'new' };
    if (hash(old.case) !== hash(r.case)) return { id: r.key, change: 'case changed; not comparable' };
    const before = Boolean(old.grade?.deterministicPass), after = Boolean(r.grade?.deterministicPass);
    return { id: r.key, change: before === after ? 'unchanged' : after ? 'improved' : 'regressed' };
  });
}

export async function main(args = process.argv.slice(2)) {
  const { values: opts } = parseArgs({ args, options: {
    model: { type: 'string', default: DEFAULT_MODEL },
    case: { type: 'string' }, tag: { type: 'string' },
    repeats: { type: 'string', default: '1' }, concurrency: { type: 'string', default: '2' },
    label: { type: 'string', default: 'run' }, 'output-dir': { type: 'string', default: resolve(base, 'results') }, cases: { type: 'string', default: resolve(base, 'cases.jsonl') },
    baseline: { type: 'string' }, reviews: { type: 'string' }, replay: { type: 'string' },
    'validate-only': { type: 'boolean', default: false }, help: { type: 'boolean', default: false },
  } });
  if (opts.help) { console.log('Usage: npm run eval -- [--model MODEL] [--case ID] [--tag TAG] [--repeats N] [--concurrency N] [--label NAME] [--baseline REPORT.json] [--reviews REVIEWS.json] [--replay REPORT.json] [--validate-only]'); return; }
  const repeats = Number(opts.repeats), concurrency = Number(opts.concurrency);
  if (![repeats, concurrency].every(n => Number.isInteger(n) && n >= 1 && n <= 100)) throw new Error('Repeats and concurrency must be integers from 1 to 100');
  if (!/^[a-zA-Z0-9_-]+$/.test(opts.label)) throw new Error('Label must use letters, numbers, underscores or hyphens');
  const cases = (await readFile(resolve(opts.cases), 'utf8')).split('\n').filter(l => l.trim()).map(JSON.parse);
  validateCases(cases);
  const selected = cases.filter(c => (!opts.case || c.id === opts.case) && (!opts.tag || c.tags.includes(opts.tag)));
  if (!selected.length) throw new Error('No cases selected');
  if (opts['validate-only']) { console.log(`Validated ${selected.length} cases; no API calls made.`); return; }
  const reviews = opts.reviews ? await json(opts.reviews) : {};
  const baseline = opts.baseline ? await json(opts.baseline) : null;
  const replay = opts.replay ? await json(opts.replay) : null;
  let records, client;
  if (replay) {
    records = replay.records.filter(r => selected.some(c => c.id === r.case.id)).map(r => ({ ...r, outputHash: outputHash(r.tasks), grade: r.error ? null : grade(r.case, r.tasks, reviews[r.key]) }));
    if (!records.length) throw new Error('No replay records selected');
  } else {
    if (!process.env.OPENAI_API_KEY) throw new Error('Set OPENAI_API_KEY before running live evals (or use --validate-only / --replay).');
    const { default: OpenAI } = await import('openai');
    client = new OpenAI({ maxRetries: 2, timeout: 60000 });
    const jobs = selected.flatMap(c => Array.from({ length: repeats }, (_, i) => ({ case: c, repeat: i + 1 })));
    records = new Array(jobs.length);
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, async () => {
      while (next < jobs.length) {
        const i = next++, job = jobs[i], key = `${job.case.id}#${job.repeat}`;
        const record = { ...job, key }, start = performance.now();
        try {
          const result = await extractTasks({ client, captureOutputErrors: true, model: opts.model, transcript: job.case.transcript, ...job.case.context });
          Object.assign(record, result, { outputHash: outputHash(result.tasks), grade: grade(job.case, result.tasks, reviews[key]) });
        } catch (error) {
          record.error = { kind: error.name === 'ExtractionOutputError' ? 'output' : 'api', name: error.name, status: error.status ?? null };
          // Avoid storing provider error messages, which may contain request data.
          if (error.rawContent !== undefined) record.rawContent = error.rawContent;
          if (error.usage) record.usage = error.usage;
        }
        record.latencyMs = Math.round(performance.now() - start);
        records[i] = record;
        console.log(`${key}: ${record.error?.kind ?? (record.grade.deterministicPass ? 'checks passed' : 'checks failed / matching pending')}`);
      }
    }));
  }
  const report = {
    createdAt: new Date().toISOString(), label: opts.label,
    model: replay?.model ?? opts.model, promptVersion: replay?.promptVersion ?? PROMPT_VERSION,
    promptHash: replay?.promptHash ?? hash(buildMessages({ transcript: '' })[0].content),
    datasetHash: hash(records.map(r => r.case)), replayOf: opts.replay ?? null,
    summary: summarize(records),
    categories: Object.fromEntries([...new Set(records.flatMap(r => r.case.tags))].map(tag => [tag, summarize(records.filter(r => r.case.tags.includes(tag)))])),
    usage: records.reduce((sum, r) => ({ prompt_tokens: sum.prompt_tokens + (r.usage?.prompt_tokens ?? 0), completion_tokens: sum.completion_tokens + (r.usage?.completion_tokens ?? 0) }), { prompt_tokens: 0, completion_tokens: 0 }),
    comparison: baseline ? compare(records, baseline) : null,
    records,
  };
  const folder = resolve(opts['output-dir']);
  await mkdir(folder, { recursive: true });
  const stem = resolve(folder, `${report.createdAt.replaceAll(/[:.]/g, '-')}-${opts.label}`);
  let markdown = `# Task extraction eval: ${opts.label}\n\nModel: ${report.model}; prompt: ${report.promptVersion} (${report.promptHash})\n\nDeterministic checks: ${report.summary.deterministicPassed}/${report.summary.total}. Fully passed with semantic review: ${report.summary.fullyPassed}/${report.summary.total}. Semantic reviews pending: ${report.summary.semanticPending}. API errors: ${report.summary.apiErrors}; output errors: ${report.summary.outputErrors}.\n\nPattern matches are hints. Review task meaning, omissions, invented tasks, and grouping before treating a run as accepted.\n\n## Categories\n\n| Category | Deterministic passes |\n|---|---|\n`;
  for (const [tag, s] of Object.entries(report.categories)) markdown += `| ${tag} | ${s.deterministicPassed}/${s.total} |\n`;
  if (report.comparison) markdown += `\n## Baseline comparison\n${fenced(report.comparison)}`;
  for (const r of records) markdown += `\n## ${r.key}\n${fenced({ transcript: r.case.transcript, context: r.case.context, expected: r.case.expected, actual: r.tasks, outputHash: r.outputHash, rawContent: r.error ? r.rawContent : undefined, grade: r.grade, error: r.error })}`;
  await writeFile(`${stem}.json`, JSON.stringify(report, null, 2));
  await writeFile(`${stem}.md`, markdown);
  console.log(JSON.stringify(report.summary, null, 2));
  console.log(`Reports: ${stem}.{json,md}`);
  if (report.summary.apiErrors || report.summary.outputErrors || records.some(r => r.grade && (!r.grade.deterministicPass || r.grade.semantic === 'fail'))) process.exitCode = 1;
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
