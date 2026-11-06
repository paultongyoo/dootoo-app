// Shared by the deployed Lambda and the local evaluation harness.
import { LATEST_PROMPT_VERSION as PROMPT_VERSION, promptMessages } from './promptVersions.mjs';
export { PROMPT_VERSION };
export const DEFAULT_MODEL = 'gpt-4o-mini';

export function buildMessages({ promptVersion = PROMPT_VERSION, promptSnapshot, ...input }) {
  return promptMessages(input, promptVersion, promptSnapshot);
}

export async function extractTasks({ client, adapter, onTrace = () => {}, model = DEFAULT_MODEL, anonymousId, captureOutputErrors = false, ...input }) {
  const messages = buildMessages(input);
  onTrace('prompt.built', { messageCount: messages.length, promptVersion: input.promptVersion ?? PROMPT_VERSION });
  onTrace('generation.started');
  const generated = adapter ? await adapter.generate({ model, messages, anonymousId, onTrace }) : null;
  const completion = adapter ? null : await client.chat.completions.create({
    model,
    messages,
    response_format: { type: 'json_object' },
    user: anonymousId,
  });
  const rawContent = adapter ? generated.rawContent : completion.choices[0].message.content;
  const usage = adapter ? generated.usage : completion.usage;
  // Preserve the raw response on output errors so evals can distinguish them from API errors.
  onTrace('generation.completed', { model: adapter ? generated.model : completion.model, finishReason: generated?.finishReason, rawContentLength: typeof rawContent === 'string' ? rawContent.length : 0 });
  let parsed;
  let reason = 'invalid_json';
  try {
    if (typeof rawContent !== 'string' || !rawContent.trim()) { reason = 'missing_output'; throw new Error('Missing output'); }
    if (['length','max_tokens','MAX_TOKENS','max_output_tokens','content_filter','SAFETY','RECITATION','BLOCKLIST','PROHIBITED_CONTENT','refusal','incomplete','failed'].includes(generated?.finishReason)) { reason = 'incomplete_or_blocked_output'; throw new Error('Incomplete output'); }
    onTrace('parse.started');
    parsed = JSON.parse(rawContent);
    onTrace('parse.completed', { outcome: 'success' });
  } catch {
    const error = new Error('Extraction returned invalid JSON');
    error.name = 'ExtractionOutputError';
    error.code = reason;
    onTrace('parse.completed', { outcome: 'error', reason });
    if (captureOutputErrors) {
      error.rawContent = rawContent;
      error.usage = usage;
      if (adapter) { error.providerUsage = generated.providerUsage; error.finishReason = generated.finishReason; error.model = generated.model; }
    }
    throw error;
  }
  return { tasks: parsed?.tasks, usage, rawContent, model: adapter ? generated.model : completion.model,
    ...(adapter ? { providerUsage: generated.providerUsage, finishReason: generated.finishReason } : {}) };
}
