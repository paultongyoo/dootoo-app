import {isCapturedResponse} from './adapters/error-response.mjs';
import { randomUUID } from 'node:crypto';
// Traces remain local. Allowlist attributes so request bodies, keys and provider
// unsanitized error text cannot leak through instrumentation callbacks.
const fields=new Set(['attempt','status','requestId','durationMs','outcome','delayMs','reason','model','finishReason','rawContentLength','messageCount','promptVersion','failureCount','semantic','errorKind']);
export function createTrace({provider,model,promptVersion}) {
  const start=performance.now();
  const trace={version:1,id:randomUUID(),startedAt:new Date().toISOString(),provider,model,promptVersion,events:[]};
  const event=(name,attributes={})=>{
    if(trace.events.length>=200)return;
    const safe=Object.fromEntries(Object.entries(attributes).filter(([key,value])=>fields.has(key)&&['string','number','boolean'].includes(typeof value)).map(([key,value])=>[key,typeof value==='string'?value.slice(0,512):value]));
    if(isCapturedResponse(attributes.providerResponse))safe.providerResponse=attributes.providerResponse;
    trace.events.push({name,time:new Date().toISOString(),elapsedMs:Math.round(performance.now()-start),attributes:safe});
  };
  const finish=outcome=>{trace.finishedAt=new Date().toISOString();trace.durationMs=Math.round(performance.now()-start);trace.outcome=outcome;event('extraction.finished',{outcome});};
  return {trace,event,finish};
}
