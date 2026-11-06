import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createTrace} from '../trace.mjs';
import {postJson} from '../adapters/http.mjs';
import {createCategoryStore} from '../analysis-store.mjs';
import {analysisForRun,failureDetails,evidenceHash,validateAnnotation} from '../error-analysis.mjs';
const failing={key:'case#1',case:{id:'case',transcript:'test',expected:[]},tasks:[],grade:{deterministicPass:false,semantic:'pending'}};
test('trace records retry timing, request IDs and sanitized responses without retaining secrets',async()=>{
 const tracking=createTrace({provider:'test',model:'model',promptVersion:'v1'});let calls=0;
 const result=await postJson({url:'https://example.com',headers:{Authorization:'secret'},body:{input:'private'},sleep:async()=>{},onTrace:tracking.event,fetchImpl:async()=>++calls===1?new Response('provider-secret',{status:429,headers:{'x-request-id':'request-1','retry-after':'1'}}):Response.json({ok:true},{headers:{'request-id':'request-2'}})});
 tracking.event('test',{headers:'secret',body:'private',status:200});tracking.finish('success');
 assert.deepEqual(result,{ok:true});
 const attempts=tracking.trace.events.filter(e=>e.name==='request.completed');
 assert.deepEqual(attempts.map(e=>e.attributes.requestId),['request-1','request-2']);
 assert.deepEqual(attempts.map(e=>e.attributes.status),[429,200]);
 assert.equal(tracking.trace.events.find(e=>e.name==='retry.scheduled').attributes.delayMs,1000);
 assert.ok(tracking.trace.durationMs>=0);assert.ok(!JSON.stringify(tracking.trace).match(/secret|private/));
});
test('failed attempts retain safe timeout reasons and exactly bounded retries',async()=>{
 const tracking=createTrace({provider:'test'});
 await assert.rejects(postJson({url:'https://example.com',headers:{},body:{},onTrace:tracking.event,sleep:async()=>{},fetchImpl:async()=>{const e=new Error('secret');e.name='TimeoutError';throw e;}}),e=>e.code==='timeout');
 assert.equal(tracking.trace.events.filter(e=>e.name==='request.completed').length,3);
 assert.equal(tracking.trace.events.filter(e=>e.name==='retry.scheduled').length,2);
 assert.ok(!JSON.stringify(tracking.trace).includes('secret'));
});
test('categories persist, deduplicate normalized names, and serialize concurrent creation',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'analysis-categories-'));
 try{
  const store=createCategoryStore(dir);const defaults=await store.list();assert.ok(defaults.length>0);
  const [a,b]=await Promise.all([store.create({name:' Novel   category '}),store.create({name:'novel category'})]);
  assert.equal(a.id,b.id);assert.equal(a.name,'Novel category');
  assert.equal((await createCategoryStore(dir).list()).length,defaults.length+1);
  await assert.rejects(store.create({name:' '}),/1–80/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('failure summaries exclude mere pending reviews, count multiple labels once, and detect stale evidence',()=>{
 const categories=[{id:'a',name:'Formatting'},{id:'b',name:'Meaning'}];
 const run={records:[failing,{...failing,key:'other#1',grade:{deterministicPass:true,semantic:'pending'}}],summary:{semanticPending:2,passRate:0},reviews:{'case#1':{notes:'review'}}};
 assert.equal(analysisForRun(run,categories).failures,1);
 const body={key:failing.key,evidenceHash:evidenceHash(failing),categoryIds:['a','b'],notes:'details'};
 run.errorAnalysis={[failing.key]:validateAnnotation(run,body,categories)};
 const summary=analysisForRun(run,categories);assert.equal(summary.categorized,1);assert.equal(summary.topCategories.length,2);assert.equal(summary.tracedFailures,0);
 assert.equal(failureDetails(run,categories)[0].record.review.notes,'review');
 assert.throws(()=>validateAnnotation(run,{...body,evidenceHash:'stale'},categories),/Output changed/);
 assert.throws(()=>validateAnnotation(run,{...body,categoryIds:['missing']},categories),/valid, unique/);
 assert.throws(()=>validateAnnotation(run,{...body,key:'other#1'},categories),/no longer failing/);
 run.records[0]={...failing,rawContent:'changed'};assert.equal(analysisForRun(run,categories).categorized,0);
});
