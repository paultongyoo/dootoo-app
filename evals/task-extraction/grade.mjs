import { createHash } from 'node:crypto';
export const outputHash = tasks => createHash('sha256').update(JSON.stringify(tasks) ?? 'undefined').digest('hex');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
export function isUtc(value) {
  if (typeof value !== 'string' || !UTC.test(value) || !Number.isFinite(Date.parse(value))) return false;
  return new Date(value).toISOString().slice(0, 19) === value.slice(0, 19);
}

// Matching patterns are dataset hints, not semantic graders. Human review remains separate.
export function grade(testCase, tasks, review) {
  const reviewStale = Boolean(review && review.outputHash !== outputHash(tasks));
  if (reviewStale) review = undefined;
  const failures = [];
  const fail = (message) => failures.push(message);
  if (!Array.isArray(tasks)) return { deterministicPass: false, failures: ['tasks must be an array'], semantic: 'pending', matches: {} };
  if (tasks.length !== testCase.expected.length) fail(`Expected ${testCase.expected.length} tasks; received ${tasks.length}`);
  const ids = new Set();
  for (const [i, task] of tasks.entries()) {
    if (!task || typeof task !== 'object' || Array.isArray(task)) { fail(`Task ${i}: must be an object`); continue; }
    if (!UUID.test(task.uuid ?? '')) fail(`Task ${i}: invalid UUID`);
    if (ids.has(task.uuid)) fail(`Task ${i}: duplicate UUID`);
    ids.add(task.uuid);
    if (typeof task.text !== 'string' || !task.text.trim()) fail(`Task ${i}: missing task text`);
    if (task.scheduled_datetime_utc !== null && !isUtc(task.scheduled_datetime_utc)) fail(`Task ${i}: schedule must be null or a UTC timestamp`);
    // Existing prompt does not explicitly require null parent fields for root tasks.
    if (task.parent_item_uuid != null && !UUID.test(task.parent_item_uuid)) fail(`Task ${i}: invalid parent UUID`);
  }
  const byId = new Map(tasks.filter(t => t && typeof t === 'object').map(t => [t.uuid, t]));
  for (const task of byId.values()) {
    const seen = new Set([task.uuid]);
    let parent = task.parent_item_uuid;
    while (parent != null) {
      if (!byId.has(parent)) { fail(`Task ${task.uuid}: missing parent`); break; }
      if (seen.has(parent)) { fail(`Task ${task.uuid}: parent cycle`); break; }
      seen.add(parent);
      parent = byId.get(parent).parent_item_uuid;
    }
  }
  const matches = {};
  const used = new Set();
  for (const expected of testCase.expected) {
    const candidates = review?.matches?.[expected.id]
      ? tasks.filter(t => t?.uuid === review.matches[expected.id])
      : tasks.filter(t => typeof t?.text === 'string' && new RegExp(expected.match, 'i').test(t.text));
    if (candidates.length !== 1 || used.has(candidates[0]?.uuid)) continue;
    matches[expected.id] = candidates[0].uuid;
    used.add(candidates[0].uuid);
  }
  const matched = Object.keys(matches).length === testCase.expected.length;
  if (matched) {
    for (const expected of testCase.expected) {
      const actual = byId.get(matches[expected.id]);
      const parent = expected.parentId === null ? null : matches[expected.parentId];
      if ((actual.parent_item_uuid ?? null) !== parent) fail(`${expected.id}: incorrect parent`);
      const date = actual.scheduled_datetime_utc;
      if (expected.scheduledDatetimeUtc === null ? date !== null : !isUtc(date) || Date.parse(date) !== Date.parse(expected.scheduledDatetimeUtc)) fail(`${expected.id}: incorrect schedule (expected ${expected.scheduledDatetimeUtc}, received ${date})`);
    }
  }
  return {
    deterministicPass: failures.length === 0 && matched,
    failures,
    matchingPending: !matched,
    reviewStale,
    matches,
    semantic: review?.semanticPass === true ? 'pass' : review?.semanticPass === false ? 'fail' : testCase.expected.length === 0 && tasks.length === 0 ? 'pass' : 'pending',
  };
}

export function summarize(records) {
  const count = (predicate) => records.filter(predicate).length;
  const deterministicPassed = count(r => r.grade?.deterministicPass);
  return {
    total: records.length,
    apiErrors: count(r => r.error?.kind === 'api'),
    outputErrors: count(r => r.error?.kind === 'output'),
    deterministicPassed,
    deterministicPassRate: records.length ? deterministicPassed / records.length : 0,
    semanticPending: count(r => r.grade?.semantic === 'pending'),
    fullyPassed: count(r => r.grade?.deterministicPass && r.grade.semantic === 'pass'),
  };
}
