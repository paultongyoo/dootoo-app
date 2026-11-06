import {captureErrorResponse} from './error-response.mjs';
// Transport policy shared by adapters; provider mappings stay in each adapter.
export async function postJson({url,headers,body,fetchImpl=fetch,sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),timeoutMs=60000,onTrace=()=>{}}) {
  for(let attempt=1;attempt<=3;attempt++) {
    const start=performance.now();let response;
    onTrace('request.started',{attempt});
    try {
      response=await fetchImpl(url,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body),signal:AbortSignal.timeout(timeoutMs),redirect:'error'});
    }catch(cause){
      const reason=['AbortError','TimeoutError'].includes(cause?.name)?'timeout':'network_error';
      onTrace('request.completed',{attempt,durationMs:Math.round(performance.now()-start),outcome:'error',reason});
      if(attempt<3){const delayMs=500*2**(attempt-1);onTrace('retry.scheduled',{attempt,delayMs,reason});await sleep(delayMs);continue;}
      const error=new Error('Provider network request failed or timed out');error.name='ProviderNetworkError';error.code=reason;throw error;
    }
    const requestId=(response.headers.get('request-id')??response.headers.get('x-request-id')??response.headers.get('x-goog-request-id')??'').slice(0,256);
    const attributes={attempt,status:response.status,requestId,durationMs:Math.round(performance.now()-start)};
    if(!response.ok){
      const providerResponse=await captureErrorResponse(response,{headers,body});
      onTrace('request.completed',{...attributes,durationMs:Math.round(performance.now()-start),outcome:'http_error',providerResponse});
      if(attempt<3&&(response.status===429||response.status>=500)){
        const retryAfter=Number(response.headers.get('retry-after'));
        const delayMs=Number.isFinite(retryAfter)&&retryAfter>0?Math.min(retryAfter*1000,10000):500*2**(attempt-1);
        onTrace('retry.scheduled',{attempt,delayMs,reason:`http_${response.status}`});await sleep(delayMs);continue;
      }
      const error=new Error(`Provider returned HTTP ${response.status}`);error.name='ProviderApiError';error.status=response.status;error.code=`http_${response.status}`;error.response=providerResponse;throw error;
    }
    try {
      const result=await response.json();
      onTrace('request.completed',{...attributes,durationMs:Math.round(performance.now()-start),outcome:'success'});return result;
    }catch{
      onTrace('request.completed',{...attributes,durationMs:Math.round(performance.now()-start),outcome:'invalid_envelope'});
      const error=new Error('Provider returned an invalid response envelope');error.name='ProviderResponseError';error.code='invalid_response_envelope';throw error;
    }
  }
}
export function usageCounts(prompt,completion,total){return {prompt_tokens:Number.isFinite(prompt)?prompt:null,completion_tokens:Number.isFinite(completion)?completion:null,total_tokens:Number.isFinite(total)?total:Number.isFinite(prompt)&&Number.isFinite(completion)?prompt+completion:null};}
