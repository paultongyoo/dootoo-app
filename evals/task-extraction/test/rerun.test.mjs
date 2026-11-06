import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {getPrompt} from '../../../lambdas/lib/promptVersions.mjs';
test('batch rerun preserves original evidence, uses saved prompt, resets review, and blocks concurrent execution',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'rerun-eval-'));process.env.EVAL_STUDIO_RESULTS=dir;
 const uuid='11111111-1111-4111-8111-111111111111';
 const record={key:'milk#1',repeat:1,case:{id:'milk',transcript:'Buy milk',context:{},tags:[],expected:[{id:'milk',meaning:'Buy milk',match:'milk',parentId:null,scheduledDatetimeUtc:null}]},error:{kind:'output',name:'ExtractionOutputError'},rawContent:'```json\n{}\n```',trace:{version:1,id:'original-trace',events:[]}};
 const promptSnapshot={...getPrompt('task-extraction-v1'),version:'saved-v0',systemTemplate:getPrompt('task-extraction-v1').systemTemplate+'\nSAVED SNAPSHOT'};
 await writeFile(join(dir,'original.json'),JSON.stringify({label:'original',createdAt:new Date().toISOString(),provider:'openai',model:'gpt-4o-mini',promptVersion:'saved-v0',promptSnapshot,records:[record,{...record,key:'milk#2',repeat:2},{...record,key:'passed#1',case:{...record.case,id:'passed',expected:[]},tasks:[],error:undefined,grade:{deterministicPass:true,semantic:'pass'}}],reviews:{[record.key]:{notes:'previous review'}},errorAnalysis:{[record.key]:{notes:'previous analysis'}}}));
 let release,entered,calls=0,payload;
 const gate=new Promise(resolve=>release=resolve),started=new Promise(resolve=>entered=resolve);
 const {createStudio}=await import('../server.mjs');
 const server=await createStudio({adapterFactory:()=>({generate:async input=>{calls++;payload=input;entered();await gate;return {rawContent:JSON.stringify({tasks:[{uuid,text:'Buy milk',scheduled_datetime_utc:null}]}),model:'gpt-4o-mini',usage:{prompt_tokens:3,completion_tokens:2},finishReason:'stop'};}})});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const root=`http://127.0.0.1:${server.address().port}`;
 const post=(path,body)=>fetch(root+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 try{
  const [run]=await(await fetch(root+'/api/runs')).json();const id=run.id;
  const body={key:record.key,outputHash:null,traceId:'original-trace'};
  const request=post(`/api/runs/${id}/rerun-errors`,body);await started;
  assert.equal((await post(`/api/runs/${id}/rerun-errors`,body)).status,400);
  assert.equal((await post(`/api/runs/${id}/delete`,{})).status,400);
  release();const response=await request;assert.equal(response.status,200);
  const updated=await response.json();const current=updated.records[0];
  assert.equal(calls,2);assert.equal(payload.model,'gpt-4o-mini');assert.ok(payload.messages[0].content.endsWith('SAVED SNAPSHOT'));
  assert.equal(current.key,record.key);assert.equal(current.attempt,2);assert.equal(current.grade.semantic,'pending');
  assert.equal(current.previousAttempts[0].record.rawContent,record.rawContent);
  assert.equal(current.previousAttempts[0].review.notes,'previous review');assert.equal(current.previousAttempts[0].errorAnalysis.notes,'previous analysis');
  assert.equal(updated.reviews[record.key],undefined);assert.equal(updated.errorAnalysis[record.key],undefined);
  assert.equal(updated.summary.outputErrors,0);assert.equal(updated.summary.semanticPending,2);assert.equal(updated.summary.passRate,1/3);
  assert.equal(updated.usage.prompt_tokens,6);
  assert.equal(updated.records[1].attempt,2);assert.equal(updated.records[2].previousAttempts,undefined);assert.equal(updated.rerunning,undefined);
  const disk=JSON.parse(await readFile(join(dir,'studio',`${id}.json`),'utf8'));assert.equal(disk.records[0].previousAttempts.length,1);
  assert.equal((await post(`/api/runs/${id}/rerun-errors`,body)).status,400);assert.equal(calls,2);
 }finally{release();await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true});delete process.env.EVAL_STUDIO_RESULTS;}
});
