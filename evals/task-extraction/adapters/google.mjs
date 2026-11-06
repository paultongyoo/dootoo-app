import { postJson, usageCounts } from './http.mjs';
// Gemini's native generateContent API uses parts, systemInstruction and usageMetadata.
export function googleAdapter({ apiKey, ...transport }) {
  return {
    async generate({ model, messages, onTrace }) {
      const response = await postJson({ ...transport, onTrace,
        url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        headers: { 'x-goog-api-key': apiKey },
        body: { systemInstruction: { parts: messages.filter(m => m.role === 'system').map(m => ({ text: m.content })) },
          contents: messages.filter(m => m.role !== 'system').map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 8192 },
        },
      });
      const candidate = response.candidates?.[0];
      const usage = response.usageMetadata;
      const output = Number.isFinite(usage?.candidatesTokenCount) ? usage.candidatesTokenCount + (usage.thoughtsTokenCount ?? 0) : null;
      return { rawContent: candidate?.content?.parts?.filter(part => !part.thought && typeof part.text === 'string').map(part => part.text).join(''),
        model: response.modelVersion ?? model, usage: usageCounts(usage?.promptTokenCount, output, usage?.totalTokenCount),
        providerUsage: usage, finishReason: candidate?.finishReason ?? response.promptFeedback?.blockReason };
    },
  };
}
