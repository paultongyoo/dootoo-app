import { postJson, usageCounts } from './http.mjs';
// OpenAI Chat Completions: preserve the original harness's JSON-object request.
export function openaiAdapter({ apiKey, ...transport }) {
  return {
    async generate({ model, messages, anonymousId, onTrace }) {
      const response = await postJson({ ...transport, onTrace, url: 'https://api.openai.com/v1/chat/completions',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: { model, messages, response_format: { type: 'json_object' },
          ...(model === 'gpt-4o-mini' ? {} : { max_completion_tokens: 8192 }), ...(anonymousId ? { user: anonymousId } : {}) },
      });
      const choice = response.choices?.[0];
      return { rawContent: choice?.message?.content, model: response.model ?? model,
        usage: usageCounts(response.usage?.prompt_tokens, response.usage?.completion_tokens, response.usage?.total_tokens),
        providerUsage: response.usage, finishReason: choice?.finish_reason };
    },
  };
}
