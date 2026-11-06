import { readFileSync } from 'node:fs';
import { openaiAdapter } from './adapters/openai.mjs';
import { anthropicAdapter, ANTHROPIC_OUTPUT_SCHEMA } from './adapters/anthropic.mjs';
import { googleAdapter } from './adapters/google.mjs';
import { mistralAdapter } from './adapters/mistral.mjs';
import { xaiAdapter } from './adapters/xai.mjs';
const catalog = JSON.parse(readFileSync(new URL('./models.json', import.meta.url), 'utf8'));
export const providers = {
  openai: { name: 'OpenAI', keyEnv: 'OPENAI_API_KEY', create: openaiAdapter, outputMode: 'JSON object', endpoint: 'Chat Completions', maxOutputTokens: null },
  anthropic: { name: 'Anthropic', keyEnv: 'ANTHROPIC_API_KEY', create: anthropicAdapter, outputMode: 'JSON schema (tasks envelope)', endpoint: 'Messages', maxOutputTokens: 8192 },
  google: { name: 'Google', keyEnv: 'GEMINI_API_KEY', create: googleAdapter, outputMode: 'JSON MIME type', endpoint: 'generateContent', maxOutputTokens: 8192 },
  mistral: { name: 'Mistral', keyEnv: 'MISTRAL_API_KEY', create: mistralAdapter, outputMode: 'JSON object', endpoint: 'Chat Completions', maxOutputTokens: 8192 },
  xai: { name: 'xAI', keyEnv: 'XAI_API_KEY', create: xaiAdapter, outputMode: 'Prompt-directed JSON', endpoint: 'Responses', maxOutputTokens: 8192 },
};
export function modelOption(provider = 'openai', model = 'gpt-4o-mini') {
  if (!Object.hasOwn(providers, provider)) throw new Error('Unknown model provider');
  if (typeof model !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,150}$/.test(model)) throw new Error('Invalid model ID');
  const configured = catalog.models.find(m => m.provider === provider && m.model === model);
  const { name: providerName, keyEnv, outputMode, endpoint, maxOutputTokens } = providers[provider];
  return { ...(configured ?? { id: `${provider}/${model}`, provider, model, name: model, purpose: 'Custom model ID; verify compatibility and account access.', references: [] }), providerName, keyEnv,
    credentialAvailable: Boolean(process.env[keyEnv]), checkedAt: catalog.checkedAt,
    adapter: { id: `${provider}-v${provider === 'anthropic' ? 2 : 1}`, ...(provider === 'anthropic' ? { outputSchema: ANTHROPIC_OUTPUT_SCHEMA } : {}), endpoint, outputMode, maxOutputTokens: provider === 'openai' && model !== 'gpt-4o-mini' ? 8192 : maxOutputTokens, reasoning: 'Provider default', timeoutMs: 60000, maxRetries: 2 } };
}
export function listModels() { return catalog.models.map(m => modelOption(m.provider, m.model)); }
export function createAdapter(provider, options = {}) {
  if (!Object.hasOwn(providers, provider)) throw new Error('Unknown model provider');
  const {keyEnv, create} = providers[provider];
  const apiKey = options.apiKey ?? process.env[keyEnv];
  if (!apiKey) throw new Error(`Set ${keyEnv} before running live evals for ${provider}`);
  return create({ ...options, apiKey });
}
