import {isCapturedResponse} from './adapters/error-response.mjs';
import {createTrace} from './trace.mjs';
import {extractTasks} from '../../lambdas/lib/extractTasks.mjs';
import {grade,outputHash} from './grade.mjs';
import {isFullyPassed} from './metrics.mjs';
export async function executeRecord({testCase,repeat,key,adapter,provider,model,promptVersion,promptSnapshot,review}) {
  const tracking = createTrace({ provider, model, promptVersion });
  const record = { case: testCase, repeat, key, trace: tracking.trace };
  const start = performance.now();
  try {
    const result = await extractTasks({
      adapter,
      onTrace: tracking.event,
      captureOutputErrors: true,
      model,
      promptVersion,
      promptSnapshot,
      transcript: testCase.transcript,
      ...testCase.context,
    });
    tracking.event('grading.started');
    Object.assign(record, result, {
      outputHash: outputHash(result.tasks),
      grade: grade(testCase, result.tasks, review),
    });
    tracking.event('grading.completed', { failureCount: record.grade.failures.length, semantic: record.grade.semantic });
  } catch (error) {
    record.error = {
      kind: error.name === 'ExtractionOutputError' ? 'output' : 'api',
      name: error.name,
      status: error.status ?? null,
      reason: error.code ?? null,
      ...(isCapturedResponse(error.response) ? {response:error.response} : {}),
    };
    // Only bounded, sanitized provider response details are retained.
    if (error.rawContent !== undefined) record.rawContent = error.rawContent;
    if (error.usage) record.usage = error.usage;
    if (error.providerUsage) record.providerUsage = error.providerUsage;
    if (error.finishReason) record.finishReason = error.finishReason;
    if (error.model) record.model = error.model;
  }
  tracking.finish(record.error ? `${record.error.kind}_error` : isFullyPassed(record) ? 'fully_passed' : record.grade.semantic === 'pending' && !record.grade.failures.length && !record.grade.matchingPending ? 'review_pending' : 'not_fully_passed');
  record.latencyMs = Math.round(performance.now() - start);

  return record;
}
