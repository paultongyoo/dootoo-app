// Shared by the deployed Lambda and the local evaluation harness.
import { LATEST_PROMPT_VERSION as PROMPT_VERSION, promptMessages } from './promptVersions.mjs';
export { PROMPT_VERSION };
export const DEFAULT_MODEL = 'gpt-4o-mini';

export function buildMessages({ promptVersion = PROMPT_VERSION, ...input }) {
  return promptMessages(input, promptVersion);
}

export async function extractTasks({ client, model = DEFAULT_MODEL, anonymousId, captureOutputErrors = false, ...input }) {
  const completion = await client.chat.completions.create({
    model,
    messages: buildMessages(input),
    response_format: { type: 'json_object' },
    user: anonymousId,
  });
  const rawContent = completion.choices[0].message.content;
  // Preserve the raw response on output errors so evals can distinguish them from API errors.
  let parsed;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    const error = new Error('Extraction returned invalid JSON');
    error.name = 'ExtractionOutputError';
    if (captureOutputErrors) {
      error.rawContent = rawContent;
      error.usage = completion.usage;
    }
    throw error;
  }
  return { tasks: parsed?.tasks, usage: completion.usage, rawContent, model: completion.model };
}
