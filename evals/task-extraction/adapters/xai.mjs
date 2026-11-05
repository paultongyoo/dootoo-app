import { postJson, usageCounts } from './http.mjs';
// xAI recommends Responses for its newer reasoning models. Reasoning is not task output.
export function xaiAdapter({ apiKey, ...transport }) {
  return {
    async generate({ model, messages }) {
      const response = await postJson({ ...transport, url: 'https://api.x.ai/v1/responses',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: { model, input: messages, max_output_tokens: 8192, store: false },
      });
      const rawContent = response.output?.filter(item => item.type === 'message')
        .flatMap(item => item.content ?? []).filter(block => block.type === 'output_text').map(block => block.text).join('');
      return { rawContent, model: response.model ?? model,
        usage: usageCounts(response.usage?.input_tokens, response.usage?.output_tokens, response.usage?.total_tokens),
        providerUsage: response.usage, finishReason: response.incomplete_details?.reason ?? response.status };
    },
  };
}
