import test from 'node:test';
import assert from 'node:assert/strict';
import { compareRuns } from '../web/compare.mjs';
const record=(id,overrides={})=>({key:`${id}#1`,repeat:1,case:{id,transcript:id,context:{},tags:['basic'],expected:[]},grade:{deterministicPass:true,semantic:'pass'},latencyMs:100,usage:{prompt_tokens:10,completion_tokens:5},...overrides});
test('comparison pairs identical cases, excludes changed and missing cases, and separates pending semantics',()=>{
 const a=record('a'),b=record('b',{grade:{deterministicPass:false,semantic:'pending'}}),c=record('c');
 const candidate=[record('a',{grade:{deterministicPass:false,semantic:'fail'},latencyMs:200}),record('b',{grade:{deterministicPass:true,semantic:'pass'}}),record('c',{case:{...c.case,transcript:'changed'}}),record('new')];
 const report=compareRuns({records:[a,b,c,record('removed')]},{records:candidate});
 assert.equal(report.paired,2);assert.equal(report.excluded,3);
 const metric=name=>report.metrics.find(m=>m.name===name);
 assert.equal(metric('Deterministic pass rate').delta,0);
 assert.equal(metric('Semantic approval rate (both reviewed)').samples,1);
 assert.equal(metric('Semantic approval rate (both reviewed)').delta,-100);
 assert.equal(metric('Mean latency').delta,50);
 assert.equal(report.rows[0].deterministic,'regressed');assert.equal(report.rows[1].deterministic,'improved');
 assert.equal(report.categories.basic[0].samples,2);
});
test('no overlap and missing telemetry produce unavailable metrics rather than zero',()=>{
 const empty=compareRuns({records:[record('a')]},{records:[record('b')]});
 assert.ok(empty.metrics.every(m=>m.delta===null));
 const missing=compareRuns({records:[record('a',{usage:null,latencyMs:null})]},{records:[record('a')]});
 assert.equal(missing.metrics.find(m=>m.name==='Mean latency').samples,0);
 assert.equal(missing.metrics.find(m=>m.name==='Mean total tokens').baseline,null);
});
