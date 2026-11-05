import { createHash } from 'node:crypto';

export const outputHash = tasks => createHash('sha256')
  .update(JSON.stringify(tasks) ?? 'undefined')
  .digest('hex');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

export function isUtc(value) {
  if (
    typeof value !== 'string' ||
    !UTC.test(value) ||
    !Number.isFinite(Date.parse(value))
  ) {
    return false;
  }

  // Reject dates that JavaScript normalizes, such as February 30.
  return new Date(value).toISOString().slice(0, 19) === value.slice(0, 19);
}

// Matching patterns are dataset hints, not semantic graders. Human review remains separate.
export function grade(testCase, tasks, review) {
  const reviewStale = Boolean(review && review.outputHash !== outputHash(tasks));
  if (reviewStale) review = undefined;

  const failures = [];
  const fail = message => failures.push(message);

  if (!Array.isArray(tasks)) {
    return {
      deterministicPass: false,
      failures: ['tasks must be an array'],
      semantic: 'pending',
      matches: {},
    };
  }
  if (tasks.length !== testCase.expected.length) {
    fail(`Expected ${testCase.expected.length} tasks; received ${tasks.length}`);
  }

  // Validate each task before checking relationships between tasks.
  const taskIds = new Set();
  for (const [index, task] of tasks.entries()) {
    if (!task || typeof task !== 'object' || Array.isArray(task)) {
      fail(`Task ${index}: must be an object`);
      continue;
    }
    if (!UUID.test(task.uuid ?? '')) {
      fail(`Task ${index}: invalid UUID`);
    }
    if (taskIds.has(task.uuid)) {
      fail(`Task ${index}: duplicate UUID`);
    }
    taskIds.add(task.uuid);

    if (typeof task.text !== 'string' || !task.text.trim()) {
      fail(`Task ${index}: missing task text`);
    }
    if (task.scheduled_datetime_utc !== null && !isUtc(task.scheduled_datetime_utc)) {
      fail(`Task ${index}: schedule must be null or a UTC timestamp`);
    }
    // Existing prompt does not explicitly require null parent fields for root tasks.
    if (task.parent_item_uuid != null && !UUID.test(task.parent_item_uuid)) {
      fail(`Task ${index}: invalid parent UUID`);
    }
  }

  const tasksById = new Map(
    tasks
      .filter(task => task && typeof task === 'object')
      .map(task => [task.uuid, task]),
  );
  for (const task of tasksById.values()) {
    const ancestorIds = new Set([task.uuid]);
    let parentId = task.parent_item_uuid;
    while (parentId != null) {
      if (!tasksById.has(parentId)) {
        fail(`Task ${task.uuid}: missing parent`);
        break;
      }
      if (ancestorIds.has(parentId)) {
        fail(`Task ${task.uuid}: parent cycle`);
        break;
      }
      ancestorIds.add(parentId);
      parentId = tasksById.get(parentId).parent_item_uuid;
    }
  }

  // Prefer explicit review mappings; otherwise use the dataset's matching hints.
  const matches = {};
  const matchedTaskIds = new Set();
  for (const expected of testCase.expected) {
    const reviewedTaskId = review?.matches?.[expected.id];
    const candidates = reviewedTaskId
      ? tasks.filter(task => task?.uuid === reviewedTaskId)
      : tasks.filter(task =>
        typeof task?.text === 'string' && new RegExp(expected.match, 'i').test(task.text),
      );
    if (candidates.length !== 1 || matchedTaskIds.has(candidates[0]?.uuid)) {
      continue;
    }
    const matchedTaskId = candidates[0].uuid;
    matches[expected.id] = matchedTaskId;
    matchedTaskIds.add(matchedTaskId);
  }

  const allExpectedMatched = Object.keys(matches).length === testCase.expected.length;
  if (allExpectedMatched) {
    for (const expected of testCase.expected) {
      const actual = tasksById.get(matches[expected.id]);
      const expectedParentId = expected.parentId === null ? null : matches[expected.parentId];
      if ((actual.parent_item_uuid ?? null) !== expectedParentId) {
        fail(`${expected.id}: incorrect parent`);
      }

      const actualSchedule = actual.scheduled_datetime_utc;
      const incorrectSchedule = expected.scheduledDatetimeUtc === null
        ? actualSchedule !== null
        : !isUtc(actualSchedule) || Date.parse(actualSchedule) !== Date.parse(expected.scheduledDatetimeUtc);
      if (incorrectSchedule) {
        fail(`${expected.id}: incorrect schedule (expected ${expected.scheduledDatetimeUtc}, received ${actualSchedule})`);
      }
    }
  }

  let semantic = 'pending';
  if (review?.semanticPass === true) {
    semantic = 'pass';
  } else if (review?.semanticPass === false) {
    semantic = 'fail';
  } else if (testCase.expected.length === 0 && tasks.length === 0) {
    semantic = 'pass';
  }

  return {
    deterministicPass: failures.length === 0 && allExpectedMatched,
    failures,
    matchingPending: !allExpectedMatched,
    reviewStale,
    matches,
    semantic,
  };
}

export function summarize(records) {
  const count = predicate => records.filter(predicate).length;
  const deterministicPassed = count(record => record.grade?.deterministicPass);

  return {
    total: records.length,
    apiErrors: count(record => record.error?.kind === 'api'),
    outputErrors: count(record => record.error?.kind === 'output'),
    deterministicPassed,
    deterministicPassRate: records.length ? deterministicPassed / records.length : 0,
    semanticPending: count(record => record.grade?.semantic === 'pending'),
    fullyPassed: count(record => record.grade?.deterministicPass && record.grade.semantic === 'pass'),
  };
}
