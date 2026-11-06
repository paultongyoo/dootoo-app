// Capture useful provider diagnostics locally without retaining credentials or
// echoed request payloads. This is a bounded/sanitized copy, not a raw wire dump.
const captured=new WeakSet();
const sensitive=/^(authorization|proxy-authorization|cookie|set-cookie|x-api-key|api[_-]?key|key|token|access[_-]?token|refresh[_-]?token|password|secret|request|request_body|messages|input|prompt|transcript|system|systemInstruction|contents)$/i;
export const isCapturedResponse=value=>Boolean(value&&typeof value==='object'&&captured.has(value));
export async function captureErrorResponse(response,{headers={},body={}}={}) {
  const maxBytes=32768;let bytes=0,truncated=false,text='',readError=false,redacted=false;
  try{
    if(response.body){
      const reader=response.body.getReader(),parts=[];
      try{
        while(true){
          const {done,value}=await reader.read();if(done)break;
          const remaining=maxBytes-bytes;
          if(value.length>remaining){parts.push(value.slice(0,remaining));bytes+=remaining;truncated=true;await reader.cancel();break;}
          parts.push(value);bytes+=value.length;
          if(bytes===maxBytes){truncated=true;await reader.cancel();break;}
        }
      }finally{reader.releaseLock();}
      const buffer=new Uint8Array(bytes);let offset=0;for(const part of parts){buffer.set(part,offset);offset+=part.length;}text=new TextDecoder().decode(buffer);
    }
  }catch{readError=true;}
  const secrets=new Set();
  for(const [name,value] of Object.entries(headers)){if(/authorization|api[-_]?key/i.test(name)&&typeof value==='string'&&value.length>=4){secrets.add(value);if(value.startsWith('Bearer '))secrets.add(value.slice(7));}}
  const collect=(value,inPayload=false)=>{
    if(typeof value==='string'&&inPayload&&value.length>=4){secrets.add(value);const prefix='User-provided input: ';if(value.startsWith(prefix)&&value.length-prefix.length>=4)secrets.add(value.slice(prefix.length));}
    else if(Array.isArray(value))value.forEach(v=>collect(v,inPayload));
    else if(value&&typeof value==='object')for(const [key,child]of Object.entries(value))if(!['role','type','model'].includes(key))collect(child,inPayload||['messages','input','system','systemInstruction','contents'].includes(key));
  };collect(body);
  const cleanString=value=>{
    let result=value;
    for(const secret of [...secrets].sort((a,b)=>b.length-a.length))result=result.split(secret).join('[REDACTED]');
    result=result.replace(/\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi,'Bearer [REDACTED]').replace(/\b(?:sk-|AIza)[A-Za-z0-9_-]{5,}/g,'[REDACTED]');
    if(result!==value)redacted=true;
    if(result.length>4096){truncated=true;result=result.slice(0,4096)+'… [truncated]';}
    return result;
  };
  const sanitize=(value,depth=0)=>{
    if(depth>8){truncated=true;return '[depth limit]';}
    if(typeof value==='string')return cleanString(value);
    if(Array.isArray(value)){if(value.length>30)truncated=true;return value.slice(0,30).map(v=>sanitize(v,depth+1));}
    if(value&&typeof value==='object'){
      const entries=Object.entries(value);if(entries.length>60)truncated=true;
      return Object.fromEntries(entries.slice(0,60).map(([key,child])=>{if(sensitive.test(key)){redacted=true;return [key,'[REDACTED]'];}return [key,sanitize(child,depth+1)];}));
    }
    return value;
  };
  let parsed,format='empty';
  if(text){try{parsed=JSON.parse(text);format='json';}catch{format='text';parsed=text;
    // Unparseable JSON containing payload/credential fields cannot be reliably
    // redacted structurally. Preserve a safe notice rather than partial data.
    if(/^\s*[\[{]/.test(text)&&/"(?:authorization|api[_-]?key|token|password|messages|input|prompt|transcript)"\s*:/i.test(text)){parsed='[Unparseable response omitted: contains sensitive fields]';redacted=true;}
  }}
  const safeHeaders={};
  response.headers.forEach((value,key)=>{if(['content-type','retry-after','request-id','x-request-id','x-goog-request-id'].includes(key)||/^(x-ratelimit-|anthropic-ratelimit-|ratelimit-)/.test(key))safeHeaders[key]=cleanString(value);});
  const result={status:response.status,headers:safeHeaders,format,body:parsed===undefined?null:sanitize(parsed),capture:{maxBytes,readBytes:bytes,truncated,redacted,readError}};
  captured.add(result);return result;
}
