import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import vm from 'node:vm';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { grade, isUtc, outputHash } from '../grade.mjs';
import { validateCases, compare, main } from '../run.mjs';
import { extractTasks, buildMessages } from '../../../lambdas/lib/extractTasks.mjs';
const root = '11111111-1111-4111-8111-111111111111';
const child = '22222222-2222-4222-8222-222222222222';
const c = { id: 'case', transcript: 'Buy milk and as part of that visit the store', context: {}, tags: ['hierarchy'], expected: [
  { id: 'milk', meaning: 'Buy milk', match: 'milk', parentId: null, scheduledDatetimeUtc: null },
  { id: 'store', meaning: 'Visit store', match: 'store', parentId: 'milk', scheduledDatetimeUtc: '2026-11-05T14:00:00Z' },
] };
const tasks = () => [
  { uuid: root, text: 'Buy milk', parent_item_uuid: null, scheduled_datetime_utc: null },
  { uuid: child, text: 'Visit store', parent_item_uuid: root, scheduled_datetime_utc: '2026-11-05T14:00:00Z' },
];
test('dataset validates and has at least 30 distinct cases', async () => {
  const cases = (await readFile(new URL('../cases.jsonl', import.meta.url), 'utf8')).trim().split('\n').map(JSON.parse);
  validateCases(cases); assert.ok(cases.length >= 30);
});
test('grading ignores order and keeps semantics pending until reviewed', () => {
  const g = grade(c, tasks().reverse()); assert.equal(g.deterministicPass, true); assert.equal(g.semantic, 'pending');
  assert.equal(grade(c, tasks(), { semanticPass: true, outputHash: outputHash(tasks()) }).semantic, 'pass');
});
test('grader rejects malformed structures, cycles, dangling parents, duplicate IDs, and wrong schedules', () => {
  assert.equal(grade(c, {}).deterministicPass, false);
  for (const mutate of [
    ts => { ts[0] = null; },
    ts => { ts[0].uuid = 'bad'; },
    ts => { ts[1].uuid = root; },
    ts => { ts[0].parent_item_uuid = child; },
    ts => { ts[1].parent_item_uuid = '33333333-3333-4333-8333-333333333333'; },
    ts => { ts[1].scheduled_datetime_utc = '2026-11-05T15:00:00Z'; },
    ts => { delete ts[0].scheduled_datetime_utc; },
    ts => { ts[1].parent_item_uuid = null; },
  ]) { const ts = tasks(); mutate(ts); assert.equal(grade(c, ts).deterministicPass, false); }
  assert.equal(isUtc('2026-02-30T06:00:00Z'), false);
});
test('unknown wording requires matching review; explicit mappings restore checks', () => {
  const ts = tasks(); ts[0].text = 'Purchase dairy';
  assert.equal(grade(c, ts).matchingPending, true);
  assert.equal(grade(c, ts, { matches: { milk: root }, semanticPass: true, outputHash: outputHash(ts) }).deterministicPass, true);
});
test('empty output passes a no-task case, extra output fails', () => {
  assert.equal(grade({ expected: [] }, []).deterministicPass, true);
  assert.equal(grade({ expected: [] }, tasks()).deterministicPass, false);
});
test('extractor forwards time context and metadata and returns usage', async () => {
  let request;
  const client = { chat: { completions: { create: async input => { request = input; return { choices: [{ message: { content: JSON.stringify({ tasks: tasks() }) } }], usage: { prompt_tokens: 10, completion_tokens: 20 }, model: 'test' }; } } } };
  const result = await extractTasks({ client, transcript: 'Buy milk', userLocalTime: 'LOCAL', userTimeZone: 'ZONE', utcDateTime: 'UTC', anonymousId: 'anonymous' });
  assert.match(request.messages[0].content, /LOCAL \(timezone: ZONE\)/);
  assert.equal(request.messages[1].content, 'User-provided input: Buy milk');
  assert.equal(request.user, 'anonymous'); assert.equal(request.model, 'gpt-4o-mini');
  assert.deepEqual(request.response_format, { type: 'json_object' });
  assert.equal(result.usage.prompt_tokens, 10);
  assert.ok(!buildMessages({ transcript: '', userTimeZone: 'ZONE' })[0].content.includes('current local date'));
  client.chat.completions.create = async () => ({ choices: [{ message: { content: 'not json' } }], usage: {} });
  await assert.rejects(extractTasks({ client, captureOutputErrors: true, transcript: '' }), error => error.name === 'ExtractionOutputError' && error.rawContent === 'not json');
});
test('baseline compares only identical cases', () => {
  const r = { case: c, key: 'case#1', repeat: 1, grade: { deterministicPass: true } };
  assert.equal(compare([r], { records: [{ ...r, grade: { deterministicPass: false } }] })[0].change, 'improved');
  assert.match(compare([r], { records: [{ ...r, case: { ...c, transcript: 'changed' } }] })[0].change, /not comparable/);
});
test('Lambda forwards transcribed input, preserves response, and short-circuits moderation', async () => {
  const requests = []; let flagged = false; let called = 0;
  const context = vm.createContext({ Buffer, console: { log() {}, error() {} } });
  const fakeClient = { audio: { transcriptions: { create: async () => ({ text: 'Buy milk' }) } }, moderations: { create: async () => ({ results: [{ flagged }] }) } };
  const modules = {
    openai: new vm.SyntheticModule(['default'], function () { this.setExport('default', function () { return fakeClient; }); }, { context }),
    'openai/uploads': new vm.SyntheticModule(['toFile'], function () { this.setExport('toFile', async (buffer, name) => { assert.equal(buffer.toString(), 'audio'); assert.equal(name, 'audio.m4a'); return {}; }); }, { context }),
    './lib/extractTasks.mjs': new vm.SyntheticModule(['extractTasks'], function () { this.setExport('extractTasks', async input => { called++; requests.push(input); return { tasks: tasks(), usage: { prompt_tokens: 10, completion_tokens: 20 } }; }); }, { context }),
  };
  const source = await readFile(new URL('../../../lambdas/transcribeAudioToTasks.js', import.meta.url), 'utf8');
  const module = new vm.SourceTextModule(source, { context });
  await module.link(name => modules[name]); await module.evaluate();
  const event = { body: Buffer.from('audio').toString('base64'), isBase64Encoded: true, headers: { 'content-type': 'audio/m4a', userlocaltime: 'LOCAL', usertimezone: 'ZONE', utcdatetime: 'UTC', anonymous_id: 'anon', durationseconds: '60' } };
  const response = await module.namespace.handler(event);
  assert.equal(response.statusCode, 200); assert.deepEqual(JSON.parse(response.body), tasks());
  assert.equal(response.headers.audio_cost, 0.006); assert.ok(response.headers.chat_cost > 0);
  assert.equal(requests[0].transcript, 'Buy milk'); assert.equal(requests[0].userTimeZone, 'ZONE'); assert.equal(requests[0].anonymousId, 'anon');
  flagged = true;
  assert.equal((await module.namespace.handler(event)).body, 'flagged'); assert.equal(called, 1);
  flagged = false; fakeClient.audio.transcriptions.create = async () => { throw new Error('failure'); };
  assert.equal((await module.namespace.handler(event)).statusCode, 500);
});

test('stale human reviews do not approve changed output', () => {
  const ts = tasks();
  const review = { semanticPass: true, outputHash: outputHash(ts) };
  ts[0].text = 'Buy milk and invent a task';
  assert.equal(grade(c, ts, review).semantic, 'pending');
  assert.equal(grade(c, ts, review).reviewStale, true);
});
test('offline replay writes readable reports and applies bound reviews', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'task-evals-'));
  try {
    const fixture = join(folder, 'fixture.json'), reviews = join(folder, 'reviews.json');
    const cases = join(folder, 'cases.jsonl');
    await writeFile(cases, JSON.stringify(c) + '\n');
    await writeFile(fixture, JSON.stringify({ model: 'mock', promptVersion: 'test', promptHash: 'hash', records: [{ key: 'case#1', case: c, repeat: 1, tasks: tasks(), usage: { prompt_tokens: 1, completion_tokens: 2 } }] }));
    await writeFile(reviews, JSON.stringify({ 'case#1': { semanticPass: true, outputHash: outputHash(tasks()) } }));
    const report = await main(['--cases', cases, '--replay', fixture, '--reviews', reviews, '--baseline', fixture, '--output-dir', folder]);
    assert.equal(report.summary.fullyPassed, 1);
    assert.equal(report.comparison[0].change, 'improved');
    assert.deepEqual(report.usage, { prompt_tokens: 1, completion_tokens: 2 });
  } finally { await rm(folder, { recursive: true, force: true }); }
});
