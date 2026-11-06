import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getPrompt, listPrompts, LATEST_PROMPT_VERSION } from '../../../lambdas/lib/promptVersions.mjs';
import { buildMessages, extractTasks, PROMPT_VERSION } from '../../../lambdas/lib/extractTasks.mjs';

test('saved named prompt versions include the latest and reproduce original baseline messages', async()=>{
  assert.equal(PROMPT_VERSION,LATEST_PROMPT_VERSION);
  const prompts=listPrompts();
  assert.equal(prompts.filter(p=>p.latest).length,1);
  for(const prompt of prompts) {
    assert.deepEqual(getPrompt(prompt.version),JSON.parse(await readFile(new URL(`../../../lambdas/lib/prompts/${prompt.version}.json`,import.meta.url),'utf8')));
    // Candidate versions may revise the user template as well as the system
    // template; only v1 promises the original baseline wording.
    assert.equal(buildMessages({transcript:'test',promptVersion:prompt.version})[1].content,prompt.userTemplate.replaceAll('{{transcript}}','test'));
  }
  const without=buildMessages({transcript:'Buy milk',promptVersion:'task-extraction-v1'});
  assert.equal(without[1].content,'User-provided input: Buy milk');
  assert.equal(without[0].content.startsWith('\n                \n                Your role'),true);
  const withContext=buildMessages({transcript:'Buy milk',userLocalTime:'LOCAL',userTimeZone:'ZONE',utcDateTime:'UTC',promptVersion:'task-extraction-v1'});
  assert.equal(withContext[0].content,without[0].content.replace('\n                \n',"\n                The user's current local date and time is LOCAL (timezone: ZONE). The current UTC time is UTC.\n"));
});
test('prompt substitution leaves transcript template tokens literal and unknown versions fail before requests',async()=>{
  const transcript='{{timeContext}} {{transcript}} <script>alert(1)</script>';
  assert.equal(buildMessages({transcript})[1].content,`User-provided input: ${transcript}`);
  let calls=0;
  const client={chat:{completions:{create:async()=>{calls++;return {choices:[{message:{content:'{"tasks":[]}'}}]};}}}};
  await assert.rejects(extractTasks({client,transcript:'test',promptVersion:'missing'}),/Unknown task extraction prompt version/);
  assert.equal(calls,0);
  await extractTasks({client,transcript:'test',promptVersion:'task-extraction-v1'});
  assert.equal(calls,1);
});

test('creating immutable versions persists manifest, supports latest selection, and rejects invalid input',async()=>{
  const {mkdtemp,writeFile,rm}=await import('node:fs/promises');
  const {tmpdir}=await import('node:os');
  const {join}=await import('node:path');
  const {pathToFileURL}=await import('node:url');
  const {createPromptRegistry}=await import('../../../lambdas/lib/promptVersions.mjs');
  const dir=await mkdtemp(join(tmpdir(),'prompt-registry-'));
  try {
    const original=getPrompt('task-extraction-v1');
    await writeFile(join(dir,'task-extraction-v1.json'),JSON.stringify(original));
    await writeFile(join(dir,'manifest.json'),JSON.stringify({latest:original.version,versions:[original.version]}));
    const url=pathToFileURL(dir+'/');
    const registry=createPromptRegistry(url);
    const input={...original,version:'candidate-v2',parentVersion:original.version,description:'Test revision',makeLatest:false};
    const saved=registry.create(input);
    assert.equal(saved.latest,false);assert.ok(saved.createdAt);
    assert.equal(registry.latest,original.version);
    assert.equal(registry.get('candidate-v2').description,'Test revision');
    assert.throws(()=>registry.create(input),/already exists/);
    assert.throws(()=>registry.create({...input,version:'../outside'}),/Version must/);
    assert.throws(()=>registry.create({...input,version:'invalid',systemTemplate:'Missing context'}),/Invalid task extraction prompt/);
    assert.throws(()=>registry.create({...input,version:'unknown-parent',parentVersion:'missing'}),/source version/);
    assert.equal(registry.list().length,2);
    registry.create({...input,version:'candidate-v3',makeLatest:true});
    const reloaded=createPromptRegistry(url);
    assert.equal(reloaded.latest,'candidate-v3');
    assert.equal(reloaded.get().version,'candidate-v3');
    assert.equal(reloaded.list().length,3);
    assert.equal(reloaded.get(original.version).systemTemplate,original.systemTemplate);
  } finally {await rm(dir,{recursive:true,force:true});}
});

test('new versions are immediately executable and latest changes update extractor defaults',async()=>{
  const {mkdtemp,writeFile,rm,mkdir,copyFile}=await import('node:fs/promises');
  const {tmpdir}=await import('node:os');
  const {join}=await import('node:path');
  const {pathToFileURL}=await import('node:url');
  const dir=await mkdtemp(join(tmpdir(),'prompt-execution-'));
  try {
    await mkdir(join(dir,'prompts'));
    const original=getPrompt('task-extraction-v1');
    await writeFile(join(dir,'prompts','task-extraction-v1.json'),JSON.stringify(original));
    await writeFile(join(dir,'prompts','manifest.json'),JSON.stringify({latest:original.version,versions:[original.version]}));
    for(const file of ['promptVersions.mjs','extractTasks.mjs'])await copyFile(new URL(`../../../lambdas/lib/${file}`,import.meta.url),join(dir,file));
    const registry=await import(pathToFileURL(join(dir,'promptVersions.mjs')).href);
    const extractor=await import(pathToFileURL(join(dir,'extractTasks.mjs')).href);
    const input={...original,version:'candidate-v2',parentVersion:original.version,systemTemplate:original.systemTemplate+'\nCandidate instruction',makeLatest:false};
    registry.createPrompt(input);
    assert.equal(extractor.PROMPT_VERSION,original.version);
    let request;
    const client={chat:{completions:{create:async value=>{request=value;return {choices:[{message:{content:'{"tasks":[]}'}}]};}}}};
    await extractor.extractTasks({client,transcript:'test',promptVersion:'candidate-v2'});
    assert.ok(request.messages[0].content.endsWith('Candidate instruction'));
    registry.createPrompt({...input,version:'candidate-v3',systemTemplate:original.systemTemplate+'\nLatest instruction',makeLatest:true});
    assert.equal(extractor.PROMPT_VERSION,'candidate-v3');
    await extractor.extractTasks({client,transcript:'test'});
    assert.ok(request.messages[0].content.endsWith('Latest instruction'));
    await extractor.extractTasks({client,transcript:'test',promptVersion:original.version});
    assert.equal(request.messages[0].content,buildMessages({transcript:'test',promptVersion:original.version})[0].content);
  } finally {await rm(dir,{recursive:true,force:true});}
});
