import { postJson, usageCounts } from './http.mjs';
// Request native JSON output instead of relying on prompt-only formatting.
// Keep semantic constraints (UUID validity, schedules, hierarchy) in the grader.
export const ANTHROPIC_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          uuid: { type: 'string' },
          text: { type: 'string' },
          parent_item_uuid: { type: ['string', 'null'] },
          scheduled_datetime_utc: { type: ['string', 'null'] },
        },
        required: ['uuid', 'text', 'scheduled_datetime_utc'],
        additionalProperties: false,
      },
    },
  },
  required: ['tasks'],
  additionalProperties: false,
};
// Anthropic places system text outside the conversation. Do not rewrite prompt text.
export function anthropicAdapter({ apiKey, ...transport }) {
  return {
    async generate({ model, messages, onTrace }) {
      const response = await postJson({ ...transport, onTrace, url: 'https://api.anthropic.com/v1/messages',
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: { model, max_tokens: 8192,
          output_config: { format: { type: 'json_schema', schema: ANTHROPIC_OUTPUT_SCHEMA } },
          system: messages.filter(m => m.role === 'system').map(m => m.content).join('\n'),
          messages: messages.filter(m => m.role !== 'system'),
        },
      });
      const usage = response.usage;
      // Cached input is separate from uncached input in Anthropic's accounting.
      const input = Number.isFinite(usage?.input_tokens)
        ? usage.input_tokens + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0) : null;
      return { rawContent: response.content?.filter(block => block.type === 'text').map(block => block.text).join(''),
        model: response.model ?? model, usage: usageCounts(input, usage?.output_tokens),
        providerUsage: usage, finishReason: response.stop_reason };
    },
  };
}
