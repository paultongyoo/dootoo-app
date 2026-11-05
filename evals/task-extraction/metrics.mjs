// Shared report and browser metrics. Semantic review is reported separately.
export function isFailedOutput(record) {
  return Boolean(record.error || record.grade?.deterministicPass === false || record.grade?.semantic === 'fail');
}
export function isFullyPassed(record) {
  return !record.error && record.grade?.deterministicPass === true && record.grade?.semantic === 'pass';
}
export function passRate(records) {
  if (!records.length) return null;
  return records.filter(isFullyPassed).length / records.length;
}
export const formatRate=value=>Number.isFinite(value)?`${(100*value).toFixed(1)}%`:'—';
export const PASS_RATE_NOTE='Pass Rate = fully passed outputs ÷ total outputs. Fully passed requires all deterministic checks and semantic approval. Pending reviews, errors and failed checks are not fully passed. No outputs is shown as —.';
