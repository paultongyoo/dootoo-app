// Shared by the deployed Lambda and the local evaluation harness.
import { LATEST_PROMPT_VERSION as PROMPT_VERSION, promptMessages } from './promptVersions.mjs';
export { PROMPT_VERSION };
export const DEFAULT_MODEL = 'gpt-4o-mini';

export function buildMessages({ promptVersion = PROMPT_VERSION, ...input }) {
  return promptMessages(input, promptVersion);
}

export async function extractTasks({ client, adapter, model = DEFAULT_MODEL, anonymousId, captureOutputErrors = false, ...input }) {
  const messages = buildMessages(input);
  const generated = adapter ? await adapter.generate({ model, messages, anonymousId }) : null;
  const completion = adapter ? null : await client.chat.completions.create({
    model,
    messages,
    response_format: { type: 'json_object' },
    user: anonymousId,
  });
  const rawContent = adapter ? generated.rawContent : completion.choices[0].message.content;
  const usage = adapter ? generated.usage : completion.usage;
  // Preserve the raw response on output errors so evals can distinguish them from API errors.
  let parsed;
  try {
    if (typeof rawContent !== 'string' || ['length','max_tokens','MAX_TOKENS','max_output_tokens','content_filter','SAFETY','RECITATION','BLOCKLIST','PROHIBITED_CONTENT','refusal','incomplete','failed'].includes(generated?.finishReason)) throw new Error('Incomplete output');
    parsed = JSON.parse(rawContent);
  } catch {
    const error = new Error('Extraction returned invalid JSON');
    error.name = 'ExtractionOutputError';
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
