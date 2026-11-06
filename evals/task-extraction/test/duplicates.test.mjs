import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
test('managed live reports and stale auto-imports are not counted as additional runs',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'analysis-duplicates-'));process.env.EVAL_STUDIO_RESULTS=dir;
 await mkdir(join(dir,'studio'));
 const record={key:'case#1',repeat:1,case:{id:'case',transcript:'test',context:{},tags:[],expected:[]},tasks:[],grade:{deterministicPass:true,semantic:'pass'}};
 const report={label:'live',createdAt:new Date().toISOString(),model:'test',records:[record]};
 await writeFile(join(dir,'live-report.json'),JSON.stringify(report));
 await writeFile(join(dir,'studio','live.json'),JSON.stringify({...report,id:'live',status:'completed',reviews:{},reportStem:join(dir,'live-report')}));
 await writeFile(join(dir,'studio','import-live-report.json'),JSON.stringify({...report,id:'import-live-report',status:'completed',reviews:{},source:'live-report.json'}));
 const {createStudio}=await import('../server.mjs');const server=await createStudio();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const root=`http://127.0.0.1:${server.address().port}`;
  const runs=await(await fetch(root+'/api/runs')).json();assert.equal(runs.length,1);assert.equal(runs[0].id,'live');
  const analysis=await(await fetch(root+'/api/error-analysis')).json();assert.equal(analysis.runs.length,1);
 }finally{await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true});delete process.env.EVAL_STUDIO_RESULTS;}
});
