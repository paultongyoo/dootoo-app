import { postJson, usageCounts } from './http.mjs';
// Mistral uses Chat Completions too, but has its own endpoint and credentials.
export function mistralAdapter({ apiKey, ...transport }) {
  return {
    async generate({ model, messages }) {
      const response = await postJson({ ...transport, url: 'https://api.mistral.ai/v1/chat/completions',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: { model, messages, response_format: { type: 'json_object' }, max_tokens: 8192 },
      });
      const choice = response.choices?.[0];
      const content = choice?.message?.content;
      const rawContent = Array.isArray(content) ? content.filter(block => block.type === 'text').map(block => block.text).join('') : content;
      return { rawContent, model: response.model ?? model,
        usage: usageCounts(response.usage?.prompt_tokens, response.usage?.completion_tokens, response.usage?.total_tokens),
        providerUsage: response.usage, finishReason: choice?.finish_reason };
    },
  };
}
