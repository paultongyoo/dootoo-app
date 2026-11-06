import test from 'node:test';
import assert from 'node:assert/strict';
import {captureErrorResponse} from '../adapters/error-response.mjs';
import {createAdapter} from '../models.mjs';
import {executeRecord} from '../execute-record.mjs';
import {createTrace} from '../trace.mjs';
test('structured provider diagnostics preserve useful details and redact credentials, echoed inputs and unsafe headers',async()=>{
 const credential='sensitive-credential-value',transcript='Private reminder about an account';
 const response=Response.json({error:{type:'overloaded_error',code:'capacity',message:`Service unavailable. Request contained ${transcript}; key ${credential}`,details:[{reason:'SERVER_OVERLOADED',metadata:{region:'us-east'}}],api_key:credential,request:{messages:[{content:transcript}]}},request_id:'body-request-1'},{status:503,headers:{'retry-after':'5','x-request-id':'header-request-1','set-cookie':'private-session','x-ratelimit-remaining-tokens':'0'}});
 const captured=await captureErrorResponse(response,{headers:{Authorization:`Bearer ${credential}`},body:{messages:[{role:'user',content:`User-provided input: ${transcript}`}]}});
 assert.equal(captured.body.error.type,'overloaded_error');assert.equal(captured.body.error.code,'capacity');assert.equal(captured.body.error.details[0].reason,'SERVER_OVERLOADED');
 assert.equal(captured.body.error.api_key,'[REDACTED]');assert.equal(captured.body.error.request,'[REDACTED]');assert.ok(!JSON.stringify(captured).includes(credential));assert.ok(!JSON.stringify(captured).includes(transcript));
 assert.equal(captured.headers['retry-after'],'5');assert.equal(captured.headers['x-request-id'],'header-request-1');assert.equal(captured.headers['set-cookie'],undefined);assert.equal(captured.capture.redacted,true);
});
test('non-JSON and oversized error responses are bounded and explicitly marked',async()=>{
 const captured=await captureErrorResponse(new Response('Upstream unavailable '+ 'x'.repeat(70000),{status:503}));
 assert.equal(captured.format,'text');assert.equal(captured.capture.readBytes,32768);assert.equal(captured.capture.truncated,true);assert.ok(captured.body.length<4200);
 const empty=await captureErrorResponse(new Response(null,{status:503}));assert.equal(empty.body,null);assert.equal(empty.format,'empty');
});
test('trace rejects unsanitized diagnostic objects supplied directly',()=>{
 const t=createTrace({provider:'test'});t.event('request.completed',{providerResponse:{body:'secret'},status:503});assert.equal(t.trace.events[0].attributes.providerResponse,undefined);
});
test('terminal error records and every retry retain sanitized response diagnostics',async()=>{
 let attempts=0;
 const adapter=createAdapter('openai',{apiKey:'test-private-key',sleep:async()=>{},fetchImpl:async()=>{attempts++;return Response.json({error:{type:'server_error',code:'overloaded',message:'Temporary capacity issue'}},{status:503,headers:{'x-request-id':`request-${attempts}`}});}});
 const record=await executeRecord({testCase:{id:'case',transcript:'Buy milk',context:{},expected:[]},repeat:1,key:'case#1',adapter,provider:'openai',model:'gpt-4o-mini',promptVersion:'task-extraction-v1'});
 assert.equal(record.error.status,503);assert.equal(record.error.response.body.error.message,'Temporary capacity issue');assert.equal(record.error.response.headers['x-request-id'],'request-3');
 const errors=record.trace.events.filter(e=>e.name==='request.completed');assert.equal(errors.length,3);
 assert.deepEqual(errors.map(e=>e.attributes.providerResponse.headers['x-request-id']),['request-1','request-2','request-3']);
 assert.ok(!JSON.stringify(record).includes('test-private-key'));
});
