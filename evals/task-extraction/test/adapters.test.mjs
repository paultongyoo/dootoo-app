import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createAdapter,listModels,modelOption} from '../models.mjs';
import {postJson} from '../adapters/http.mjs';
import {extractTasks,buildMessages} from '../../../lambdas/lib/extractTasks.mjs';
import {main} from '../run.mjs';
const tasks=[{uuid:'11111111-1111-4111-8111-111111111111',text:'Buy milk',scheduled_datetime_utc:null}];
const raw=JSON.stringify({tasks});
const fixtures={
 openai:{model:'resolved-openai',choices:[{message:{content:raw},finish_reason:'stop'}],usage:{prompt_tokens:20,completion_tokens:10,total_tokens:30}},
 mistral:{model:'resolved-mistral',choices:[{message:{content:[{type:'text',text:raw}]},finish_reason:'stop'}],usage:{prompt_tokens:20,completion_tokens:10,total_tokens:30}},
 anthropic:{model:'resolved-anthropic',content:[{type:'thinking',thinking:'not output'},{type:'text',text:raw}],stop_reason:'end_turn',usage:{input_tokens:12,cache_read_input_tokens:5,cache_creation_input_tokens:3,output_tokens:10}},
 google:{modelVersion:'resolved-google',candidates:[{content:{parts:[{thought:true,text:'not output'},{text:raw}]},finishReason:'STOP'}],usageMetadata:{promptTokenCount:20,candidatesTokenCount:8,thoughtsTokenCount:2,totalTokenCount:30}},
 xai:{model:'resolved-xai',status:'completed',output:[{type:'reasoning',summary:[]},{type:'message',content:[{type:'output_text',text:raw}]}],usage:{input_tokens:20,output_tokens:10,total_tokens:30}},
};
for(const provider of Object.keys(fixtures))test(`${provider} maps exact prompt, authentication, output and usage through the common extractor`,async()=>{
 let request;
 const option=listModels().find(m=>m.provider===provider);
 const adapter=createAdapter(provider,{apiKey:'test-only-secret',fetchImpl:async(url,init)=>{request={url,...init,body:JSON.parse(init.body)};return Response.json(fixtures[provider]);}});
 const input={transcript:'Buy milk',userLocalTime:'LOCAL',userTimeZone:'ZONE',utcDateTime:'UTC',promptVersion:'task-extraction-v1'};
 const messages=buildMessages(input);
 const result=await extractTasks({adapter,model:option.model,...input,captureOutputErrors:true});
 assert.deepEqual(result.tasks,tasks);assert.equal(result.model,`resolved-${provider}`);
 assert.deepEqual(result.usage,{prompt_tokens:20,completion_tokens:10,total_tokens:30});
 if(provider==='google')assert.ok(request.url.endsWith(`/${encodeURIComponent(option.model)}:generateContent`));else assert.equal(request.body.model,option.model);
 assert.ok(request.signal instanceof AbortSignal);
 if(['openai','mistral'].includes(provider)) {assert.deepEqual(request.body.messages,messages);assert.equal(request.body.response_format.type,'json_object');assert.equal(request.headers.Authorization,'Bearer test-only-secret');}
 if(provider==='anthropic'){assert.equal(request.body.system,messages[0].content);assert.deepEqual(request.body.messages,[messages[1]]);assert.equal(request.headers['x-api-key'],'test-only-secret');assert.equal(request.body.max_tokens,8192);}
 if(provider==='google'){assert.equal(request.body.systemInstruction.parts[0].text,messages[0].content);assert.equal(request.body.contents[0].parts[0].text,messages[1].content);assert.equal(request.headers['x-goog-api-key'],'test-only-secret');assert.equal(request.body.generationConfig.responseMimeType,'application/json');}
 if(provider==='xai'){assert.deepEqual(request.body.input,messages);assert.equal(request.body.store,false);assert.equal(request.url,'https://api.x.ai/v1/responses');}
});
test('transport bounds retries, does not retry auth, redacts error bodies and network errors',async()=>{
 let calls=0;const waits=[];
 const output=await postJson({url:'https://example.com',headers:{},body:{},sleep:async ms=>waits.push(ms),fetchImpl:async()=>{calls++;return calls<3?new Response('private',{status:429,headers:{'retry-after':'1'}}):Response.json({ok:true});}});
 assert.deepEqual(output,{ok:true});assert.equal(calls,3);assert.deepEqual(waits,[1000,1000]);
 calls=0;
 await assert.rejects(postJson({url:'https://example.com',headers:{},body:{},fetchImpl:async()=>{calls++;return new Response('secret transcript',{status:401});}}),error=>error.status===401&&!error.message.includes('secret'));
 assert.equal(calls,1);
 await assert.rejects(postJson({url:'https://example.com',headers:{},body:{},sleep:async()=>{},fetchImpl:async()=>{throw new Error('secret key');}}),error=>error.name==='ProviderNetworkError'&&!error.message.includes('secret'));
});
test('missing and truncated adapter output is recorded as output error with raw response and usage',async()=>{
 for(const result of [{rawContent:raw,finishReason:'max_tokens',usage:{completion_tokens:3}},{rawContent:undefined},{rawContent:'```json\n{}\n```'}]) {
  await assert.rejects(extractTasks({adapter:{generate:async()=>result},captureOutputErrors:true,transcript:'test'}),error=>error.name==='ExtractionOutputError'&&error.rawContent===result.rawContent);
 }
 assert.throws(()=>createAdapter('not-a-provider'),/Unknown/);
 assert.throws(()=>modelOption('google','../invalid'),/Invalid model/);
 const adapter=createAdapter('google',{apiKey:'test',fetchImpl:async()=>Response.json({candidates:[]})});
 await assert.rejects(extractTasks({adapter,transcript:'test'}),/invalid JSON/);
});
for(const provider of Object.keys(fixtures))test(`offline ${provider} run saves provider/model/prompt provenance and replays without credentials`,async()=>{
 const dir=await mkdtemp(join(tmpdir(),'adapter-eval-'));
 try {
  const option=listModels().find(m=>m.provider===provider);
  const adapter=createAdapter(provider,{apiKey:'test-only-secret',fetchImpl:async()=>Response.json(fixtures[provider])});
  const report=await main(['--provider',provider,'--model',option.model,'--prompt-version','task-extraction-v1','--case','simple','--output-dir',dir],{embedded:true,adapter});
  assert.equal(report.provider,provider);assert.equal(report.model,option.model);assert.equal(report.modelSnapshot.adapter.id,`${provider}-v1`);assert.equal(report.promptSnapshot.version,'task-extraction-v1');
  assert.equal(report.records[0].model,`resolved-${provider}`);assert.deepEqual(report.records[0].tasks,tasks);
  assert.ok(!JSON.stringify(report).includes('test-only-secret'));
  const {readdir}=await import('node:fs/promises');const file=(await readdir(dir)).find(f=>f.endsWith('.json'));
  const replay=await main(['--replay',join(dir,file),'--case','simple','--output-dir',dir],{embedded:true});
  assert.equal(replay.provider,provider);assert.deepEqual(replay.modelSnapshot,report.modelSnapshot);
 }finally{await rm(dir,{recursive:true,force:true});}
});
