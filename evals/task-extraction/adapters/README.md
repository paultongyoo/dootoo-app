# Model adapters

Each adapter is deliberately a small, explicit provider mapping. Read `openai.mjs`,
`anthropic.mjs`, `google.mjs`, `mistral.mjs`, and `xai.mjs` directly; the only shared
transport policy is in `http.mjs`. No universal SDK or runtime request rewriting
hides provider differences.

## Contract

The factory takes `{ apiKey, fetchImpl?, sleep?, timeoutMs? }` and returns:

```js
{
  async generate({ model, messages, anonymousId }) {
    return {
      rawContent,     // exact generated text (no code-fence stripping or JSON repair)
      model,          // provider-returned model ID, falling back to requested ID
      usage: { prompt_tokens, completion_tokens, total_tokens }, // number or null
      providerUsage,  // original accounting fields for audit
      finishReason,
    };
  }
}
```

`extractTasks.mjs` builds the selected prompt, invokes `generate`, parses the JSON,
and returns tasks to the same grader used for OpenAI. It does not alter task text,
UUIDs, schedules or semantic decisions. Missing text, invalid JSON, refusals and
known truncation reasons are output errors, not repaired responses. SDK `client`
input remains supported for the deployed Lambda, whose model call is unchanged.

| Adapter | Provider API | JSON behavior | Token accounting |
|---|---|---|---|
| OpenAI | Chat Completions | `json_object` (original baseline behavior) | prompt/completion counts |
| Anthropic | Messages | JSON requested by saved prompt | input + cache creation + cache read; output |
| Google | generateContent | `application/json` MIME type | prompt; candidate + thought tokens |
| Mistral | Chat Completions | `json_object` | prompt/completion counts |
| xAI | Responses | JSON requested by saved prompt | input/output counts |

System/user text is preserved; Anthropic and Google require different message
containers. Reasoning blocks are excluded from task text. Provider-native usage
is retained. Missing telemetry stays null, so comparison metrics can exclude it.
Tokens are not equivalent to cost across provider tokenizers, caching or reasoning.

GPT-4o mini keeps its original unspecified output cap. Other models set an 8192
token cap, including reasoning where the provider counts it that way. Temperature
and reasoning settings use provider defaults. These differences are captured in
`modelSnapshot.adapter`; do not interpret cross-provider latency as identical
compute budgets. A fixed stricter task schema is not added, to preserve the prompt
and keep schema failures visible to the grader.

Transport uses native Node fetch with a 60-second timeout per attempt and at most
two retries for network errors, HTTP 429 and HTTP 5xx. HTTP auth/validation failures
are not retried. Retries can add latency and API usage. Provider error bodies are
never saved or logged, because they can echo input or secrets.

## Study / extend

1. Add a configured model to `../models.json` to reuse an existing adapter.
2. For another provider, write a separate file implementing this contract and
   register its factory and key environment variable in `../models.mjs`.
3. Add offline payload-mapping, usage, output-error and replay tests in
   `../test/adapters.test.mjs`. Inject `fetchImpl`; tests never need real keys.
4. Verify current native API and model documentation. Keep only official links in
   the catalog. Published general model scores are not local extraction results.

All adapter code is eval-local. The Lambda needs only its existing extraction
module, prompt registry and JSON versions, with its existing OpenAI SDK client.

## Official API references

- OpenAI: https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create
- Anthropic: https://platform.claude.com/docs/en/api/messages
- Google: https://ai.google.dev/api/generate-content
- Mistral: https://docs.mistral.ai/api/endpoint/chat
- xAI: https://docs.x.ai/developers/rest-api-reference/inference/responses

Catalog model references live in `../models.json`. Model pages and general
published evaluations are supporting context; the local suite provides the
actual task-extraction measurements. API contracts were checked 2026-11-05.
