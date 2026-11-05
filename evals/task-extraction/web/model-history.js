import { formatRate, PASS_RATE_NOTE } from '../metrics.mjs';
const esc = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const percent=(n,total)=>total?`${(100*n/total).toFixed(1)}%`:'—';
export async function showModelHistory({api,workspace,isCurrent,experiment,openRun,notice}) {
  const [models,runs,config]=await Promise.all([api('/api/models'),api('/api/runs'),api('/api/config')]);
  if(!isCurrent())return;
  const all=[...models];
  for(const run of runs) {
    const provider=run.provider??'openai';
    if(!all.some(m=>m.provider===provider&&m.model===run.model))all.push({id:`${provider}/${run.model}`,provider,model:run.model,name:run.model,providerName:provider,purpose:'Historical model outside the configured catalog.',historical:true,references:[]});
  }
  workspace.innerHTML=`<span class="eyebrow">MODELS & TASK BENCHMARKS</span><h2>Model History</h2><p class="muted">${models.length} configured model options across ${new Set(models.map(m=>m.provider)).size} providers. Credential status means a local key exists; account access and live availability have not been probed. Select a model to inspect results or start an experiment with any prompt version.</p><div class="card"><h3>Task-extraction benchmark suite · ${config.cases.length} cases</h3><p class="muted">Measures task count, UUID structure, parent relationships, UTC schedules, explicit semantic approval, pass rate, latency and token usage. Categories: ${esc([...new Set(config.cases.flatMap(c=>c.tags))].sort().join(', '))}.</p><p class="muted">Local results below are per run. Dataset, prompt and review coverage can differ: use Compare runs for matched-case deltas. No published benchmark score is treated as measured task-extraction accuracy. Token counts are provider-specific and are not a cross-provider cost estimate.</p><p class="muted">${esc(PASS_RATE_NOTE)}</p></div><div class="prompt-history-layout"><nav>${all.map(m=>`<button class="history" data-model="${esc(m.id)}">${esc(m.name)}<small>${esc(m.providerName)} · ${m.historical?'Historical':m.credentialAvailable?'Key configured':'Key missing'}</small></button>`).join('')}</nav><div id="model-detail"></div></div>`;
  let current;
  const display=async model=>{
    current=model.id;
    document.querySelectorAll('[data-model]').forEach(b=>b.classList.toggle('selected',b.dataset.model===model.id));
    const matched=runs.filter(r=>(r.provider??'openai')===model.provider&&r.model===model.model);
    const detail=document.querySelector('#model-detail');
    detail.innerHTML=`<section class="card"><h3>${esc(model.name)}</h3><p class="muted meta">${esc(model.providerName)} · ${esc(model.model)}</p><p>${esc(model.purpose)}</p>${model.historical?'':`<p class="muted">Credential: ${esc(model.keyEnv)} · ${model.credentialAvailable?'configured':'missing'}. Restart the studio after changing environment keys.</p><p class="muted">API: ${esc(model.adapter.endpoint)} · Output: ${esc(model.adapter.outputMode)} · Output cap: ${model.adapter.maxOutputTokens??'provider default'} tokens · Reasoning: provider default.</p><button id="model-experiment">New experiment with this model</button>`}<h3 class="compare-heading">Provider documentation & published evaluation references</h3><ul>${model.references.map(r=>`<li><a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(r.title)}</a></li>`).join('')||'<li>No configured reference for this historical model.</li>'}</ul><p class="muted">Catalog checked ${esc(model.checkedAt??'not recorded')}. References describe broader capabilities, not an apples-to-apples extraction benchmark or a ranking for this app.</p></section><section class="card"><h3>Local task-extraction evals · ${matched.length} runs</h3><div id="model-runs">${matched.length?'Loading saved metrics…':'Not yet evaluated on this task. Start an experiment to measure it.'}</div></section>`;
    const launch=document.querySelector('#model-experiment');if(launch)launch.onclick=()=>experiment(model);
    const reports=await Promise.all(matched.map(r=>api(`/api/runs/${r.id}`)));
    if(!isCurrent()||current!==model.id)return;
    const mean=(records,get)=>{const values=records.map(get).filter(Number.isFinite);return values.length?`${(values.reduce((a,b)=>a+b,0)/values.length).toFixed(0)} (${values.length} outputs)`:'—';};
    const rows=reports.map(r=>{const s=r.summary;return `<tr><td><button class="download" data-model-run="${esc(r.id)}">${esc(r.label)}</button><div class="muted">${new Date(r.createdAt).toLocaleString()} · ${esc(r.status)}<br>${esc(r.promptVersion)}<br>${s.total} outputs</div></td><td>${formatRate(s.passRate)}</td><td>${s.fullyPassed}/${s.total}</td><td>${s.semanticPending}</td><td>${s.apiErrors+s.outputErrors}</td><td>${mean(r.records,r=>r.latencyMs)}</td><td>${mean(r.records,r=>Number.isFinite(r.usage?.prompt_tokens)&&Number.isFinite(r.usage?.completion_tokens)?r.usage.prompt_tokens+r.usage.completion_tokens:null)}</td></tr>`;}).join('');
    document.querySelector('#model-runs').innerHTML=reports.length?`<div class="table-scroll"><table class="metrics"><thead><tr><th>Run / prompt</th><th>Pass Rate</th><th>Fully passed</th><th>Review pending</th><th>Errors</th><th>Mean ms</th><th>Mean tokens</th></tr></thead><tbody>${rows}</tbody></table></div>${reports.map(r=>`<details><summary>${esc(r.label)} · category scores and provenance</summary><pre>${esc(JSON.stringify({provider:r.provider??'openai',model:r.model,promptVersion:r.promptVersion,promptHash:r.promptHash,datasetHash:r.datasetHash,categories:r.categories,adapter:r.modelSnapshot?.adapter},null,2))}</pre></details>`).join('')}`:'Not yet evaluated on this task.';
    document.querySelectorAll('[data-model-run]').forEach(b=>b.onclick=()=>openRun(b.dataset.modelRun));
  };
  document.querySelectorAll('[data-model]').forEach(b=>b.onclick=()=>display(all.find(m=>m.id===b.dataset.model)).catch(notice));
  await display(all[0]);
}
