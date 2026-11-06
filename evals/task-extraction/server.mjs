import { isFailedOutput } from './metrics.mjs';
import { prepareRerun } from './rerun.mjs';
import { createCategoryStore } from './analysis-store.mjs';
import { analysisForRun, failureDetails, validateAnnotation } from './error-analysis.mjs';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, readdir, rename } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { main, validateCases, compare } from './run.mjs';
import { grade, summarize, outputHash } from './grade.mjs';
import { DEFAULT_MODEL, PROMPT_VERSION, buildMessages } from '../../lambdas/lib/extractTasks.mjs';
import { listPrompts, getPrompt, createPrompt } from '../../lambdas/lib/promptVersions.mjs';
import { createHash } from 'node:crypto';
import { listModels, modelOption, createAdapter } from './models.mjs';

const base = dirname(fileURLToPath(import.meta.url));
const results = process.env.EVAL_STUDIO_RESULTS || join(base, 'results');
const store = join(results, 'studio');
const jobs = new Map();
const categoryStore=createCategoryStore(store);
const writes=new WeakMap();
const mutate=(job,action)=>{
  if(job.enqueue)return job.enqueue(action);
  const next=(writes.get(job)??Promise.resolve()).then(action);writes.set(job,next.catch(()=>{}));return next;
};
const deleted = new Set();
let active = false;
const json = async path => JSON.parse(await readFile(path, 'utf8'));
const cases = () => readFile(join(base, 'cases.jsonl'), 'utf8').then(s => s.trim().split('\n').map(JSON.parse));
const safeId = id => { if (!/^[\w.-]+$/.test(id)) throw new Error('Invalid run ID'); return id; };
const statePath = id => join(store, `${safeId(id)}.json`);
const save = async job => {
  const path = statePath(job.id);
  await writeFile(`${path}.tmp`, JSON.stringify(job, null, 2));
  // Windows/WSL sharing can briefly deny replacing a file while a reader has it
  // open. Keep the atomic replacement, and retry only transient sharing errors.
  for (let attempt = 0; ; attempt++) {
    try { await rename(`${path}.tmp`, path); break; }
    catch (error) {
      if (!['EPERM', 'EACCES', 'EBUSY'].includes(error.code) || attempt >= 7) throw error;
      await new Promise(resolve => setTimeout(resolve, 50 * 2 ** attempt));
    }
  }
};
const get = async id => { if (deleted.has(id)) throw new Error('Run has been deleted'); return jobs.get(id) ?? json(statePath(id)); };
const refresh = job => {
  for (const r of job.records) if (!r.error) r.grade = grade(r.case, r.tasks, job.reviews[r.key]);
  job.summary = summarize(job.records);
  job.usage=job.records.reduce((sum,r)=>({prompt_tokens:sum.prompt_tokens+(r.usage?.prompt_tokens??0),completion_tokens:sum.completion_tokens+(r.usage?.completion_tokens??0)}),{prompt_tokens:0,completion_tokens:0});
  job.categories = Object.fromEntries([...new Set(job.records.flatMap(r => r.case.tags))].map(tag => [tag, summarize(job.records.filter(r => r.case.tags.includes(tag)))]));
};
async function initialize() {
  await mkdir(store, { recursive: true });
  const reportName=stem=>stem.replaceAll('\\','/').split('/').at(-1)+'.json';
  const managedReports=new Set();
  for (const file of await readdir(store)) if (file.endsWith('.json')) {
    const job = await json(join(store, file));
    if (!job.id || !Array.isArray(job.records) || !job.reviews) continue;
    for(const stem of [job.reportStem,job.finalStem].filter(Boolean))managedReports.add(reportName(stem));
    if(job.rerunning){delete job.rerunning;job.rerunInterrupted=true;await save(job);}
    if (job.deletedAt) { deleted.add(job.id); continue; }
    if (job.status === 'running') { job.status = 'interrupted'; await save(job); }
    refresh(job);
    jobs.set(job.id, job);
  }
  // A live run already owns these report files; keep old duplicate imports on
  // disk for recovery, but do not show or recount them as separate experiments.
  for(const [id,job] of jobs)if(job.source&&managedReports.has(job.source))jobs.delete(id);
  // Bring existing CLI reports into the same review workflow without changing originals.
  for (const file of await readdir(results)) if (file.endsWith('.json') && !managedReports.has(file)) {
    try {
      const report = await json(join(results, file));
      if (!Array.isArray(report.records)) continue;
      const id = `import-${file.slice(0, -5)}`;
      if (jobs.has(id) || deleted.has(id)) continue;
      const reviews = report.reviews ?? Object.fromEntries(report.records.filter(r => r.grade?.semantic === 'pass' || r.grade?.semantic === 'fail').map(r => [r.key, { outputHash: outputHash(r.tasks), semanticPass: r.grade.semantic === 'pass', matches: r.grade.matches ?? {} }]));
      const job = { ...report, id, status: 'completed', reviews, total: report.records.length, source: file };
      refresh(job); jobs.set(id, job); await save(job);
    } catch { /* Review files are not reports. */ }
  }
}
async function start(input) {
  if (active) throw new Error('A run is already in progress');
  const selected = (await cases()).filter(c => (!input.case || c.id === input.case) && (!input.tag || c.tags.includes(input.tag)));
  validateCases(selected);
  if (!selected.length) throw new Error('No cases selected');
  const repeats = Number(input.repeats ?? 1), concurrency = Number(input.concurrency ?? 2);
  if (![repeats, concurrency].every(n => Number.isInteger(n) && n >= 1 && n <= 100)) throw new Error('Repeats and concurrency must be 1–100');
  const model = modelOption(input.provider || 'openai', input.model || DEFAULT_MODEL);
  createAdapter(model.provider);
  if (!/^[\w-]+$/.test(input.label ?? 'run')) throw new Error('Label must use letters, numbers, underscores or hyphens');
  const prompt = getPrompt(input.promptVersion || PROMPT_VERSION);
  const baseline = input.baseline ? await get(safeId(input.baseline)) : null;
  const job = { id: randomUUID(), label: input.label || 'run', model: model.model, provider: model.provider, modelSnapshot: model, promptVersion: prompt.version, promptSnapshot: prompt, createdAt: new Date().toISOString(), status: 'running', records: [], reviews: {}, total: selected.length * repeats, baseline: baseline?.id ?? null };
  refresh(job); jobs.set(job.id, job); await save(job); active = true;
  const args = ['--label', job.label, '--model', job.model, '--provider', job.provider, '--repeats', String(repeats), '--concurrency', String(concurrency), '--output-dir', results, '--prompt-version', prompt.version];
  if (input.case) args.push('--case', input.case);
  if (input.tag) args.push('--tag', input.tag);
  // Serialize disk writes, including reviews arriving during a live run.
  let queue = Promise.resolve();
  job.enqueue = fn => { const next = queue.then(fn); queue = next.catch(() => {}); return next; };
  void main(args, { embedded: true, onRecord: r => job.enqueue(async () => { job.records.push(r); refresh(job); await save(job); }), onReport: (report, stem) => job.enqueue(async () => {
    Object.assign(job, report, { reviews: job.reviews, errorAnalysis: job.errorAnalysis??{}, errorCategories: job.errorCategories??[], status: 'completed', reportStem: stem });
    refresh(job); if (baseline) job.comparison = compare(job.records, baseline);
    await save(job);
  }) }).catch(error => job.enqueue(async () => { job.status = 'failed'; job.error = error.message; await save(job); })).finally(() => { active = false; });
  return job;
}
const send = (res, value, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); };
export async function createStudio({adapterFactory=createAdapter} = {}) {
  await initialize();
  return createServer(async (req, res) => {
    try {
      if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.host ?? '')) return send(res, { error: 'Invalid host' }, 403);
      const origin = req.headers.origin;
      if (origin && origin !== `http://${req.headers.host}`) return send(res, { error: 'Cross-origin requests are blocked' }, 403);
      const url = new URL(req.url, 'http://localhost');
      const parts = url.pathname.split('/').filter(Boolean);
      let body = {};
      if (req.method === 'POST') {
        let raw = ''; for await (const chunk of req) { raw += chunk; if (raw.length > 100000) throw new Error('Request too large'); }
        body = JSON.parse(raw || '{}');
      }
      if (req.method === 'GET' && url.pathname === '/api/error-categories') return send(res, await categoryStore.list());
      if (req.method === 'POST' && url.pathname === '/api/error-categories') return send(res, await categoryStore.create(body),201);
      if (req.method === 'GET' && url.pathname === '/api/error-analysis') {
        const categories=await categoryStore.list();
        return send(res,{categories,runs:[...jobs.values()].map(job=>({id:job.id,label:job.label,provider:job.provider??'openai',model:job.model,promptVersion:job.promptVersion,createdAt:job.createdAt,status:job.status,analysis:analysisForRun(job,categories)})).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))});
      }
      if (req.method === 'GET' && url.pathname === '/api/models') return send(res, listModels());
      if (req.method === 'POST' && url.pathname === '/api/prompts') return send(res, createPrompt(body), 201);
      if (req.method === 'GET' && url.pathname === '/api/prompts') return send(res, listPrompts().map(prompt => ({ ...prompt, promptHash: createHash('sha256').update(JSON.stringify(buildMessages({ transcript: '', promptVersion: prompt.version })[0].content)).digest('hex') })));
      if (req.method === 'GET' && url.pathname === '/api/config') return send(res, { cases: await cases(), models: listModels(), provider: 'openai', model: DEFAULT_MODEL, promptVersion: PROMPT_VERSION, prompts: listPrompts().map(({version,name,latest})=>({version,name,latest})), keyAvailable: Boolean(process.env.OPENAI_API_KEY) });
      if (req.method === 'GET' && url.pathname === '/api/runs') return send(res, [...jobs.values()].map(({ records, reviews, enqueue, ...j }) => j).sort((a,b) => b.createdAt.localeCompare(a.createdAt)));
      if (req.method === 'POST' && url.pathname === '/api/runs') return send(res, await start(body), 201);
      if (parts[0] === 'api' && parts[1] === 'runs' && parts[2]) {
        const job = await get(safeId(parts[2]));
        if (req.method === 'GET' && parts.length === 3) return send(res, job);
        if (req.method === 'POST' && parts[3] === 'rerun-errors') {
          if(active||job.status==='running'||job.rerunning)throw new Error('Wait for the current execution to finish');
          active=true;
          try{
            await mutate(job,async()=>{
              const failed=job.records.filter(isFailedOutput);
              if(!failed.length)throw new Error('This run has no errored tasks to re-run');
              const operations=failed.map(record=>prepareRerun(job,{key:record.key,outputHash:record.outputHash??null,traceId:record.trace?.id??null},adapterFactory));
              job.rerunning={keys:failed.map(r=>r.key),completed:0,total:failed.length,startedAt:new Date().toISOString()};await save(job);
              // Sequential requests bound spend/concurrency and checkpoint each result.
              for(const perform of operations){
                const {index,record}=await perform();job.records[index]=record;
                delete job.reviews[record.key];if(job.errorAnalysis)delete job.errorAnalysis[record.key];
                delete job.finalReport;delete job.finalStem;delete job.finalizedAt;
                job.rerunning.completed++;refresh(job);
                if(job.baseline&&!deleted.has(job.baseline))job.comparison=compare(job.records,await get(job.baseline));
                await save(job);
              }
              delete job.rerunning;delete job.rerunInterrupted;await save(job);
            });
          }finally{active=false;if(job.rerunning){delete job.rerunning;await save(job);}}
          return send(res,job);
        }
        if (req.method === 'GET' && parts[3] === 'analysis') {
          const categories=await categoryStore.list();
          return send(res,{run:{id:job.id,label:job.label,provider:job.provider??'openai',model:job.model,promptVersion:job.promptVersion,promptHash:job.promptHash,promptSnapshot:job.promptSnapshot,modelSnapshot:job.modelSnapshot,status:job.status},summary:analysisForRun(job,categories),categories,failures:failureDetails(job,categories)});
        }
        if (req.method === 'POST' && parts[3] === 'analysis') {
          await mutate(job,async()=>{
            const categories=await categoryStore.list();
            const annotation=validateAnnotation(job,body,categories);
            job.errorAnalysis??={};job.errorAnalysis[body.key]=annotation;job.errorCategories=categories;
            delete job.finalReport;delete job.finalStem;delete job.finalizedAt;await save(job);
          });
          return send(res,{saved:true});
        }
        if (req.method === 'POST' && parts[3] === 'delete') {
          if (job.status === 'running'||job.rerunning) throw new Error('Wait for execution to finish before deleting it');
          job.deletedAt = new Date().toISOString();
          await save(job);
          deleted.add(job.id); jobs.delete(job.id);
          return send(res, { deleted: true });
        }
        if (req.method === 'POST' && parts[3] === 'review') {
          const update = async () => {
            const r = job.records.find(r => r.key === body.key);
            if (!r || r.error) throw new Error('Record is unavailable for review');
            if (body.outputHash !== outputHash(r.tasks)) throw new Error('Output changed; reload before reviewing');
            if (![true, false, null].includes(body.semanticPass)) throw new Error('Invalid review decision');
            const matches = body.matches ?? {};
            if (typeof matches !== 'object' || Array.isArray(matches) || matches === null) throw new Error('Invalid matches');
            const used = new Set();
            for (const [id, uuid] of Object.entries(matches)) {
              if (!r.case.expected.some(e => e.id === id) || !r.tasks.some(t => t?.uuid === uuid) || used.has(uuid)) throw new Error('Mappings must use unique generated UUIDs and expected IDs');
              used.add(uuid);
            }
            job.reviews[r.key] = { outputHash: body.outputHash, semanticPass: body.semanticPass, matches, notes: String(body.notes ?? '').slice(0, 20000), reviewedAt: new Date().toISOString() };
            delete job.finalReport; delete job.finalStem; delete job.finalizedAt;
            refresh(job); await save(job);
          };
          await mutate(job,update);
          return send(res, job);
        }
        if (req.method === 'POST' && parts[3] === 'finalize') {
          await mutate(job,async()=>{
          if (job.status === 'running'||job.rerunning) throw new Error('Wait for execution to finish');
          if (!job.records.length) throw new Error('No outputs to report');
          const prefix = join(store, job.id);
          await writeFile(`${prefix}-cases.jsonl`, [...new Map(job.records.map(r => [r.case.id, r.case])).values()].map(c => JSON.stringify(c)).join('\n'));
          await writeFile(`${prefix}-reviews.json`, JSON.stringify(job.reviews));
          const baseline = job.baseline && !deleted.has(job.baseline) ? await get(job.baseline) : null;
          const args = ['--replay', statePath(job.id), '--reviews', `${prefix}-reviews.json`, '--cases', `${prefix}-cases.jsonl`, '--label', `${job.label}-reviewed`, '--output-dir', results];
          if (baseline) { await writeFile(`${prefix}-baseline.json`, JSON.stringify(baseline)); args.push('--baseline', `${prefix}-baseline.json`); }
          await main(args, { embedded: true, onReport: async (report, stem) => { job.finalReport = report; job.finalStem = stem; job.finalizedAt = new Date().toISOString(); await save(job); } });
          });
          return send(res, job);
        }
        if (req.method === 'GET' && parts[3] === 'export' && ['json','md'].includes(parts[4]) && job.finalStem) {
          res.writeHead(200, { 'Content-Type': parts[4] === 'json' ? 'application/json' : 'text/markdown', 'Content-Disposition': `attachment; filename="${job.label}-reviewed.${parts[4]}"` });
          return res.end(await readFile(`${job.finalStem}.${parts[4]}`));
        }
      }
      if (req.method === 'GET' && ['/', '/app.js', '/style.css', '/compare.mjs', '/comparison-view.js', '/model-history.js', '/error-analysis.js', '/metrics.mjs'].includes(url.pathname)) {
        const name = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
        res.writeHead(200, { 'Content-Type': { 'index.html': 'text/html', 'app.js': 'text/javascript', 'compare.mjs': 'text/javascript', 'comparison-view.js': 'text/javascript', 'model-history.js': 'text/javascript', 'error-analysis.js': 'text/javascript', 'metrics.mjs': 'text/javascript', 'style.css': 'text/css' }[name], 'Content-Security-Policy': "default-src 'self'; style-src 'self'; script-src 'self'; frame-ancestors 'none'" });
        return res.end(await readFile(name === 'metrics.mjs' ? join(base, name) : join(base, 'web', name)));
      }
      send(res, { error: 'Not found' }, 404);
    } catch (error) { send(res, { error: error.message }, 400); }
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = await createStudio();
  server.listen(Number(process.env.PORT || 4317), '127.0.0.1', () => console.log(`Eval studio: http://127.0.0.1:${server.address().port}`));
}
