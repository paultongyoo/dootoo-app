import { postJson, usageCounts } from './http.mjs';
// Anthropic places system text outside the conversation. Do not rewrite prompt text.
export function anthropicAdapter({ apiKey, ...transport }) {
  return {
    async generate({ model, messages }) {
      const response = await postJson({ ...transport, url: 'https://api.anthropic.com/v1/messages',
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: { model, max_tokens: 8192,
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
