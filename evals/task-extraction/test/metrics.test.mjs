import test from 'node:test';
import assert from 'node:assert/strict';
import {passRate,isFailedOutput,formatRate} from '../metrics.mjs';
import {grade,summarize} from '../grade.mjs';
import {compareRuns} from '../web/compare.mjs';
const output=(passed,extra={})=>({case:{id:'case',transcript:'test',expected:[],tags:['basic']},repeat:1,grade:{deterministicPass:passed,semantic:'pass'},...extra});
test('Pass Rate counts only fully passed outputs and includes errors and incomplete grades in denominator',()=>{
 const records=[output(true),output(false),output(true,{error:{kind:'api'}}),output(false,{grade:null})];
 assert.equal(passRate(records),.25);
 assert.equal(summarize(records).passRate,.25);
 assert.equal(summarize(records).fullyPassed,1);
 assert.equal('deterministicPassed' in summarize(records),false);
 assert.equal('deterministicPassRate' in summarize(records),false);
 assert.equal(formatRate(passRate(records)),'25.0%');
});
test('empty runs have no rate and correct no-task cases pass',()=>{
 assert.equal(passRate([]),null);assert.equal(formatRate(null),'—');
 const c={id:'empty',expected:[],tags:[]};
 assert.equal(passRate([{case:c,tasks:[],grade:grade(c,[])}]),1);
});
test('Pass Rate requires both semantic approval and complete checks',()=>{
 assert.equal(passRate([output(true,{grade:{deterministicPass:true,semantic:'fail'}})]),0);
 assert.equal(passRate([output(true,{grade:{deterministicPass:true,semantic:'pending'}})]),0);
 assert.equal(passRate([output(false,{grade:{deterministicPass:false,matchingPending:true,semantic:'pass'}})]),0);
});
test('failure highlighting distinguishes pending semantics from failures',()=>{
 const r=output(true,{grade:{deterministicPass:true,semantic:'pending'}});assert.equal(isFailedOutput(r),false);
 assert.equal(isFailedOutput({...r,grade:{...r.grade,semantic:'fail'}}),true);
 assert.equal(isFailedOutput(output(false)),true);
 assert.equal(isFailedOutput({...r,error:{kind:'output'}}),true);
});
test('comparison reports Pass Rate on comparable pairs and handles empty comparisons',()=>{
 const baseline=output(false),candidate=output(true);
 const report=compareRuns({records:[baseline]},{records:[candidate,output(false,{case:{...candidate.case,id:'extra'}})]});
 const metric=report.metrics.find(m=>m.name==='Pass Rate');
 assert.equal(metric.baseline,0);assert.equal(metric.candidate,100);assert.equal(metric.delta,100);assert.equal(metric.samples,1);
 assert.equal(report.excluded,1);assert.equal(report.categories.basic.find(m=>m.name==='Pass Rate').delta,100);
 const empty=compareRuns({records:[]},{records:[candidate]});
 assert.equal(empty.metrics.find(m=>m.name==='Pass Rate').delta,null);
});
