import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import vm from 'node:vm';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { grade, isUtc, outputHash } from '../grade.mjs';
import { validateCases, compare, main } from '../run.mjs';
import { extractTasks, buildMessages } from '../../../lambdas/lib/extractTasks.mjs';

const rootTaskId = '11111111-1111-4111-8111-111111111111';
const childTaskId = '22222222-2222-4222-8222-222222222222';
const testCase = {
  id: 'case',
  transcript: 'Buy milk and as part of that visit the store',
  context: {},
  tags: ['hierarchy'],
  expected: [
    {
      id: 'milk',
      meaning: 'Buy milk',
      match: 'milk',
      parentId: null,
      scheduledDatetimeUtc: null,
    },
    {
      id: 'store',
      meaning: 'Visit store',
      match: 'store',
      parentId: 'milk',
      scheduledDatetimeUtc: '2026-11-05T14:00:00Z',
    },
  ],
};

// Return fresh tasks so mutations in one test cannot affect another.
const createTasks = () => [
  {
    uuid: rootTaskId,
    text: 'Buy milk',
    parent_item_uuid: null,
    scheduled_datetime_utc: null,
  },
  {
    uuid: childTaskId,
    text: 'Visit store',
    parent_item_uuid: rootTaskId,
    scheduled_datetime_utc: '2026-11-05T14:00:00Z',
  },
];

test('dataset validates and has at least 30 distinct cases', async () => {
  const cases = (await readFile(new URL('../cases.jsonl', import.meta.url), 'utf8'))
    .trim()
    .split('\n')
    .map(JSON.parse);

  validateCases(cases);
  assert.ok(cases.length >= 30);
});

test('grading ignores order and keeps semantics pending until reviewed', () => {
  const result = grade(testCase, createTasks().reverse());
  assert.equal(result.deterministicPass, true);
  assert.equal(result.semantic, 'pending');

  const reviewedResult = grade(testCase, createTasks(), {
    semanticPass: true,
    outputHash: outputHash(createTasks()),
  });
  assert.equal(reviewedResult.semantic, 'pass');
});

test('grader rejects malformed structures, cycles, dangling parents, duplicate IDs, and wrong schedules', () => {
  assert.equal(grade(testCase, {}).deterministicPass, false);

  const invalidMutations = [
    tasks => { tasks[0] = null; },
    tasks => { tasks[0].uuid = 'bad'; },
    tasks => { tasks[1].uuid = rootTaskId; },
    tasks => { tasks[0].parent_item_uuid = childTaskId; },
    tasks => { tasks[1].parent_item_uuid = '33333333-3333-4333-8333-333333333333'; },
    tasks => { tasks[1].scheduled_datetime_utc = '2026-11-05T15:00:00Z'; },
    tasks => { delete tasks[0].scheduled_datetime_utc; },
    tasks => { tasks[1].parent_item_uuid = null; },
  ];
  for (const mutate of invalidMutations) {
    const tasks = createTasks();
    mutate(tasks);
    assert.equal(grade(testCase, tasks).deterministicPass, false);
  }

  assert.equal(isUtc('2026-02-30T06:00:00Z'), false);
});

test('unknown wording requires matching review; explicit mappings restore checks', () => {
  const tasks = createTasks();
  tasks[0].text = 'Purchase dairy';
  assert.equal(grade(testCase, tasks).matchingPending, true);

  const reviewedResult = grade(testCase, tasks, {
    matches: { milk: rootTaskId },
    semanticPass: true,
    outputHash: outputHash(tasks),
  });
  assert.equal(reviewedResult.deterministicPass, true);
});

test('empty output passes a no-task case, extra output fails', () => {
  assert.equal(grade({ expected: [] }, []).deterministicPass, true);
  assert.equal(grade({ expected: [] }, createTasks()).deterministicPass, false);
});

test('extractor forwards time context and metadata and returns usage', async () => {
  let request;
  const client = {
    chat: {
      completions: {
        create: async input => {
          request = input;
          return {
            choices: [{ message: { content: JSON.stringify({ tasks: createTasks() }) } }],
            usage: { prompt_tokens: 10, completion_tokens: 20 },
            model: 'test',
          };
        },
      },
    },
  };
  const result = await extractTasks({
    client,
    transcript: 'Buy milk',
    userLocalTime: 'LOCAL',
    userTimeZone: 'ZONE',
    utcDateTime: 'UTC',
    anonymousId: 'anonymous',
  });

  assert.match(request.messages[0].content, /LOCAL \(timezone: ZONE\)/);
  assert.equal(request.messages[1].content, 'User-provided input: Buy milk');
  assert.equal(request.user, 'anonymous');
  assert.equal(request.model, 'gpt-4o-mini');
  assert.deepEqual(request.response_format, { type: 'json_object' });
  assert.equal(result.usage.prompt_tokens, 10);

  const messagesWithoutLocalTime = buildMessages({ transcript: '', userTimeZone: 'ZONE' });
  assert.ok(!messagesWithoutLocalTime[0].content.includes('current local date'));

  client.chat.completions.create = async () => ({
    choices: [{ message: { content: 'not json' } }],
    usage: {},
  });
  await assert.rejects(
    extractTasks({ client, captureOutputErrors: true, transcript: '' }),
    error => error.name === 'ExtractionOutputError' && error.rawContent === 'not json',
  );
});

test('baseline compares only identical cases', () => {
  const record = {
    case: testCase,
    key: 'case#1',
    repeat: 1,
    grade: { deterministicPass: true, semantic: 'pass' },
  };
  const failingBaseline = {
    records: [{ ...record, grade: { deterministicPass: false } }],
  };
  const changedCaseBaseline = {
    records: [{ ...record, case: { ...testCase, transcript: 'changed' } }],
  };

  assert.equal(compare([record], failingBaseline)[0].change, 'improved');
  assert.match(compare([record], changedCaseBaseline)[0].change, /not comparable/);
});

test('Lambda forwards transcribed input, preserves response, and short-circuits moderation', async () => {
  const requests = [];
  let flagged = false;
  let extractionCalls = 0;
  const context = vm.createContext({ Buffer, console: { log() {}, error() {} } });
  const fakeClient = {
    audio: {
      transcriptions: {
        create: async () => ({ text: 'Buy milk' }),
      },
    },
    moderations: {
      create: async () => ({ results: [{ flagged }] }),
    },
  };

  // Load the Lambda with mock dependencies so the test makes no API calls.
  const modules = {
    openai: new vm.SyntheticModule(['default'], function () {
      this.setExport('default', function () {
        return fakeClient;
      });
    }, { context }),
    'openai/uploads': new vm.SyntheticModule(['toFile'], function () {
      this.setExport('toFile', async (buffer, name) => {
        assert.equal(buffer.toString(), 'audio');
        assert.equal(name, 'audio.m4a');
        return {};
      });
    }, { context }),
    './lib/extractTasks.mjs': new vm.SyntheticModule(['extractTasks'], function () {
      this.setExport('extractTasks', async input => {
        extractionCalls++;
        requests.push(input);
        return {
          tasks: createTasks(),
          usage: { prompt_tokens: 10, completion_tokens: 20 },
        };
      });
    }, { context }),
  };
  const source = await readFile(
    new URL('../../../lambdas/transcribeAudioToTasks.js', import.meta.url),
    'utf8',
  );
  const lambdaModule = new vm.SourceTextModule(source, { context });
  await lambdaModule.link(name => modules[name]);
  await lambdaModule.evaluate();

  const event = {
    body: Buffer.from('audio').toString('base64'),
    isBase64Encoded: true,
    headers: {
      'content-type': 'audio/m4a',
      userlocaltime: 'LOCAL',
      usertimezone: 'ZONE',
      utcdatetime: 'UTC',
      anonymous_id: 'anon',
      durationseconds: '60',
    },
  };
  const response = await lambdaModule.namespace.handler(event);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body), createTasks());
  assert.equal(response.headers.audio_cost, 0.006);
  assert.ok(response.headers.chat_cost > 0);
  assert.equal(requests[0].transcript, 'Buy milk');
  assert.equal(requests[0].userTimeZone, 'ZONE');
  assert.equal(requests[0].anonymousId, 'anon');

  flagged = true;
  assert.equal((await lambdaModule.namespace.handler(event)).body, 'flagged');
  assert.equal(extractionCalls, 1);

  flagged = false;
  fakeClient.audio.transcriptions.create = async () => {
    throw new Error('failure');
  };
  assert.equal((await lambdaModule.namespace.handler(event)).statusCode, 500);
});

test('stale human reviews do not approve changed output', () => {
  const tasks = createTasks();
  const review = { semanticPass: true, outputHash: outputHash(tasks) };
  tasks[0].text = 'Buy milk and invent a task';

  assert.equal(grade(testCase, tasks, review).semantic, 'pending');
  assert.equal(grade(testCase, tasks, review).reviewStale, true);
});

test('offline replay writes readable reports and applies bound reviews', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'task-evals-'));
  try {
    const fixturePath = join(folder, 'fixture.json');
    const reviewsPath = join(folder, 'reviews.json');
    const casesPath = join(folder, 'cases.jsonl');
    const replayFixture = {
      model: 'mock',
      promptVersion: 'test',
      promptHash: 'hash',
      records: [{
        key: 'case#1',
        case: testCase,
        repeat: 1,
        tasks: createTasks(),
        usage: { prompt_tokens: 1, completion_tokens: 2 },
      }],
    };
    const reviews = {
      'case#1': { semanticPass: true, outputHash: outputHash(createTasks()) },
    };

    await writeFile(casesPath, JSON.stringify(testCase) + '\n');
    await writeFile(fixturePath, JSON.stringify(replayFixture));
    await writeFile(reviewsPath, JSON.stringify(reviews));

    const report = await main([
      '--cases', casesPath,
      '--replay', fixturePath,
      '--reviews', reviewsPath,
      '--baseline', fixturePath,
      '--output-dir', folder,
    ]);

    assert.equal(report.summary.fullyPassed, 1);
    assert.equal(report.comparison[0].change, 'improved');
    assert.deepEqual(report.usage, { prompt_tokens: 1, completion_tokens: 2 });
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});
