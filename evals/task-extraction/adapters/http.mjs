// Transport policy shared by adapters; provider request/response mappings stay in each file.
export async function postJson({ url, headers, body, fetchImpl = fetch, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), timeoutMs = 60000 }) {
  for (let attempt = 0; attempt < 3; attempt++) {
    let response;
    try {
      response = await fetchImpl(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs), redirect: 'error',
      });
    } catch {
      if (attempt < 2) { await sleep(500 * 2 ** attempt); continue; }
      const error = new Error('Provider network request failed or timed out');
      error.name = 'ProviderNetworkError'; throw error;
    }
    if (!response.ok) {
      // Never include provider error bodies: they may echo transcripts or credentials.
      await response.body?.cancel();
      if (attempt < 2 && (response.status === 429 || response.status >= 500)) {
        const retryAfter = Number(response.headers.get('retry-after'));
        await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 10000) : 500 * 2 ** attempt);
        continue;
      }
      const error = new Error(`Provider returned HTTP ${response.status}`);
      error.name = 'ProviderApiError'; error.status = response.status; throw error;
    }
    try { return await response.json(); }
    catch { const error = new Error('Provider returned an invalid response envelope'); error.name = 'ProviderResponseError'; throw error; }
  }
}
export function usageCounts(prompt, completion, total) {
  return {
    prompt_tokens: Number.isFinite(prompt) ? prompt : null,
    completion_tokens: Number.isFinite(completion) ? completion : null,
    total_tokens: Number.isFinite(total) ? total : Number.isFinite(prompt) && Number.isFinite(completion) ? prompt + completion : null,
  };
}
