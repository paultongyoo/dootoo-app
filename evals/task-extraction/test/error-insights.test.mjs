import test from 'node:test';
import assert from 'node:assert/strict';
import {categoryInsights,groupAnalysisByModel} from '../web/error-analysis.js';
const run=(id,analysis)=>({id,label:id,model:'test',promptVersion:'v1',analysis});
test('category insights rank cross-run counts and retain drill-down contributors',()=>{
 const runs=[run('one',{failures:5,categorized:3,uncategorized:2,topCategories:[{id:'format',name:'Formatting',count:3},{id:'lang',name:'Language',count:1}]}),run('two',{failures:4,categorized:4,uncategorized:0,topCategories:[{id:'lang',name:'Language',count:4},{id:'format',name:'Formatting',count:1}]})];
 const insight=categoryInsights(runs);
 assert.equal(insight.failures,9);assert.equal(insight.categorized,7);assert.equal(insight.coverage,7/9);
 assert.deepEqual(insight.categories.map(c=>[c.id,c.count]),[['lang',5],['format',4]]);
 assert.deepEqual(insight.categories[0].runs.map(r=>r.id),['two','one']);
 assert.equal(insight.nextRunId,'one');
 // Multi-label totals exceed unique categorized failures, without inflating coverage.
 assert.equal(insight.categories.reduce((n,c)=>n+c.count,0),9);
});
test('single-run scope and ties are deterministic',()=>{
 const insight=categoryInsights([run('only',{failures:2,categorized:1,uncategorized:1,topCategories:[{id:'b',name:'Beta',count:1},{id:'a',name:'Alpha',count:1}]})]);
 assert.equal(insight.categories[0].name,'Alpha');assert.equal(insight.categories[0].runs.length,1);assert.equal(insight.coverage,.5);
});
test('empty and unclassified scopes do not invent category insights',()=>{
 const empty=categoryInsights([]);assert.equal(empty.coverage,null);assert.deepEqual(empty.categories,[]);assert.equal(empty.nextRunId,null);
 const unclassified=categoryInsights([run('few',{failures:2,categorized:0,uncategorized:2,topCategories:[]}),run('many',{failures:4,categorized:0,uncategorized:4,topCategories:[]})]);
 assert.equal(unclassified.nextRunId,'many');assert.equal(unclassified.coverage,0);assert.deepEqual(unclassified.categories,[]);
});

test('model analyses separate providers and keep runs of the same model together',()=>{
 const runs=[{id:'a',provider:'openai',model:'shared'},{id:'b',provider:'google',model:'shared'},{id:'c',provider:'openai',model:'shared'},{id:'legacy',model:'old'}];
 const groups=groupAnalysisByModel(runs);assert.equal(groups.length,3);
 assert.deepEqual(groups[0].runs.map(r=>r.id),['a','c']);
 assert.equal(groups[1].provider,'google');assert.equal(groups[2].provider,'openai');
 assert.notEqual(groups[0].id,groups[1].id);assert.deepEqual(groupAnalysisByModel([]),[]);
});
