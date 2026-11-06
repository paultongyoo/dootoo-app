import {formatRate} from '../metrics.mjs';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pretty=value=>esc(JSON.stringify(value,null,2));
const option=(id,name)=>`<option value="${esc(id)}">${esc(name)}</option>`;
// Aggregate assigned labels without treating multi-label counts as unique outputs.
export function categoryInsights(runs) {
  const failures=runs.reduce((n,r)=>n+r.analysis.failures,0);
  const categorized=runs.reduce((n,r)=>n+r.analysis.categorized,0);
  const categories=new Map();
  for(const run of runs)for(const category of run.analysis.topCategories){
    if(!category.count)continue;
    const entry=categories.get(category.id)??{id:category.id,name:category.name,count:0,runs:[]};
    entry.count+=category.count;
    entry.runs.push({id:run.id,label:run.label,model:run.model,promptVersion:run.promptVersion,count:category.count,failures:run.analysis.failures});
    categories.set(category.id,entry);
  }
  const ranked=[...categories.values()].sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name));
  for(const category of ranked)category.runs.sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label));
  const nextRun=[...runs].filter(r=>r.analysis.uncategorized>0).sort((a,b)=>b.analysis.uncategorized-a.analysis.uncategorized)[0];
  return {failures,categorized,uncategorized:failures-categorized,coverage:failures?categorized/failures:null,categories:ranked,nextRunId:nextRun?.id??null};
}

export function groupAnalysisByModel(runs) {
  const groups=new Map();
  for(const run of runs){
    const provider=run.provider??'openai',id=JSON.stringify([provider,run.model]);
    const group=groups.get(id)??{id,provider,model:run.model,runs:[]};
    group.runs.push(run);groups.set(id,group);
  }
  return [...groups.values()];
}

export async function showErrorAnalysis({api,workspace,isCurrent,notice,openRun}) {
  let overview,detail,key,queueFilter='all',insightScope='all',selectedInsight,activeModel;
  const modelRuns=()=>groupAnalysisByModel(overview.runs).find(group=>group.id===activeModel)?.runs??[];
  const categoriesHtml=(categories,selected)=>[...categories].sort((a,b)=>a.name.localeCompare(b.name)).map(c=>`<label class="category-option"><input type="checkbox" name="category" value="${esc(c.id)}" ${selected.has(c.id)?'checked':''}>${esc(c.name)}</label>`).join('');
  const stats=items=>`<div class="stats">${items.map(([value,label])=>`<div class="stat"><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`).join('')}</div>`;
  const topCategories=summary=>!summary.failures?'<span class="muted">No failing outputs.</span>':summary.topCategories.length?summary.topCategories.slice(0,4).map(c=>`<span class="error-chip">${esc(c.name)} <strong>${c.count}</strong></span>`).join(''):'<span class="muted">No error categories assigned yet.</span>';
  const renderInsights=()=>{
    if(insightScope!=='all'&&!modelRuns().some(r=>r.id===insightScope))insightScope='all';
    const scoped=insightScope==='all'?modelRuns():modelRuns().filter(r=>r.id===insightScope);
    const insights=categoryInsights(scoped);
    const selected=insights.categories.find(c=>c.id===selectedInsight)??insights.categories[0];selectedInsight=selected?.id;
    document.querySelector('#category-insights').innerHTML=`<div class="toolbar"><div><span class="eyebrow">PATTERNS TO INVESTIGATE</span><h3>Most common error categories</h3></div><label class="insights-scope">Insights scope<select id="insights-scope">${option('all','All runs for this model')}${modelRuns().map(r=>option(r.id,`${r.label} · ${r.model} · ${new Date(r.createdAt).toLocaleString()}`)).join('')}</select></label></div><p class="muted"><strong>${insights.categorized}/${insights.failures}</strong> failing outputs categorized · <strong>${formatRate(insights.coverage)}</strong> coverage. Rankings use assigned labels only; pending reviews and uncategorized failures do not establish an error category.</p>${insights.categories.length?`<div class="insights-layout"><div class="category-ranking">${insights.categories.map((c,index)=>`<button class="category-rank ${c.id===selectedInsight?'current':''}" data-insight-category="${esc(c.id)}"><span class="category-rank-title"><span>${index+1}. ${esc(c.name)}</span><strong>${c.count}</strong></span><meter min="0" max="${insights.categorized||1}" value="${c.count}" aria-label="${esc(c.name)} share of categorized failures"></meter><span class="muted">${formatRate(c.count/insights.categorized)} of categorized failures · ${c.runs.length} ${c.runs.length===1?'run':'runs'}</span></button>`).join('')}</div><div class="category-concentration"><h3>Where “${esc(selected.name)}” appears</h3><p class="muted">${selected.count} affected outputs across ${selected.runs.length} ${selected.runs.length===1?'run':'runs'}. Open a run to review only this category.</p>${selected.runs.map(r=>`<button class="history category-run" data-insight-run="${esc(r.id)}"><strong>${esc(r.label)}</strong><small>${esc(r.model)} · ${esc(r.promptVersion)}</small><span>${r.count}/${r.failures} failing outputs in this category →</span></button>`).join('')}</div></div><p class="muted">An output may have multiple labels, so category percentages can total more than 100%. Counts show workload concentration, not a model-quality ranking across different datasets or review coverage.</p>`:`<div class="insights-empty"><h3>${insights.failures?'Categorize failures to reveal patterns':'No failures in this scope'}</h3><p class="muted">${insights.failures?'Assign categories to failing outputs and the most common issues will appear here.':'There are no failing outputs to group. Semantic reviews may still be pending.'}</p></div>`}${insights.uncategorized?`<div class="insights-next"><span><strong>${insights.uncategorized} failures still uncategorized.</strong> Fill these gaps to make the ranking more representative.</span><button id="insights-review">Review uncategorized</button></div>`:''}`;
    document.querySelector('#insights-scope').value=insightScope;
    document.querySelector('#insights-scope').onchange=event=>{insightScope=event.target.value;selectedInsight=null;renderInsights();};
    document.querySelectorAll('[data-insight-category]').forEach(button=>button.onclick=()=>{selectedInsight=button.dataset.insightCategory;renderInsights();});
    document.querySelectorAll('[data-insight-run]').forEach(button=>button.onclick=()=>load(button.dataset.insightRun,undefined,selectedInsight).catch(notice));
    if(document.querySelector('#insights-review'))document.querySelector('#insights-review').onclick=()=>load(insights.nextRunId,undefined,'uncategorized').catch(notice);
  };
  const renderLanding=()=>{
    const groups=groupAnalysisByModel(overview.runs);
    if(!groups.some(group=>group.id===activeModel))activeModel=groups[0]?.id;
    const current=groups.find(group=>group.id===activeModel);
    const totals=modelRuns().reduce((sum,r)=>({failures:sum.failures+r.analysis.failures,categorized:sum.categorized+r.analysis.categorized,unclassified:sum.unclassified+r.analysis.uncategorized}),{failures:0,categorized:0,unclassified:0});
    workspace.innerHTML=`<div class="toolbar"><div><span class="eyebrow">DIAGNOSE & CATEGORIZE</span><h2>Error Analysis</h2></div><button id="analysis-refresh" class="download">Refresh</button></div><div class="analysis-model-tabs" aria-label="Models">${groups.map(group=>`<button class="analysis-model-tab ${group.id===activeModel?'current':''}" data-analysis-model="${esc(group.id)}" aria-pressed="${group.id===activeModel}"><strong>${esc(group.model)}</strong><small>${esc(group.provider)} · ${group.runs.length} ${group.runs.length===1?'run':'runs'}</small></button>`).join('')}</div>${current?`<p class="muted">Showing analyses for <strong>${esc(current.provider)} / ${esc(current.model)}</strong>. Metrics, category rankings and run choices below include only this model.</p>`:'<p class="muted">No saved models to analyze yet.</p>'}${stats([[modelRuns().length,'Runs'],[totals.failures,'Failing outputs'],[totals.categorized,'Categorized outputs'],[totals.unclassified,'Uncategorized outputs']])}<p class="muted">Review failures by case/repeat, inspect saved evidence and assign one or more reusable categories. Pending semantic review alone is not a failure. Category counts refer to outputs; an output can have multiple categories.</p><section id="category-insights" class="card"></section><h3 class="compare-heading">Runs and category breakdowns</h3><form id="analysis-select" class="card"><label>Select a run<select id="analysis-run">${modelRuns().map(r=>option(r.id,`${r.label} · ${r.model} · ${r.analysis.failures} failures · ${new Date(r.createdAt).toLocaleString()}`)).join('')}</select></label><button ${modelRuns().length?'':'disabled'}>Review run failures</button></form><div id="analysis-runs">${modelRuns().map(r=>`<button class="history error-run ${r.analysis.failures?'failed-output':''}" data-analysis-run="${esc(r.id)}"><div class="toolbar"><strong>${esc(r.label)}</strong><span>${formatRate(r.analysis.passRate)} Pass Rate</span></div><small>${esc(r.provider)} / ${esc(r.model)} · ${esc(r.promptVersion)} · ${esc(r.status)}<br>${new Date(r.createdAt).toLocaleString()}</small><div class="error-run-numbers"><span><strong>${r.analysis.failures}</strong> failures</span><span><strong>${r.analysis.categorized}/${r.analysis.failures}</strong> categorized</span><span><strong>${r.analysis.uncategorized}</strong> uncategorized</span><span><strong>${r.analysis.tracedFailures}/${r.analysis.failures}</strong> failure traces</span><span><strong>${r.analysis.pendingReviews}</strong> semantic reviews pending</span></div><div class="error-chips">${topCategories(r.analysis)}</div></button>`).join('')||'<div class="card">No saved runs yet. Start an experiment to collect outputs.</div>'}</div>`;
    document.querySelectorAll('[data-analysis-model]').forEach(button=>button.onclick=()=>{activeModel=button.dataset.analysisModel;insightScope='all';selectedInsight=null;renderLanding();});
    renderInsights();
    document.querySelector('#analysis-refresh').onclick=()=>landing().catch(notice);
    document.querySelector('#analysis-select').onsubmit=e=>{e.preventDefault();load(document.querySelector('#analysis-run').value).catch(notice);};
    document.querySelectorAll('[data-analysis-run]').forEach(b=>b.onclick=()=>load(b.dataset.analysisRun).catch(notice));
  };
  const landing=async()=>{
    overview=await api('/api/error-analysis');if(!isCurrent())return;renderLanding();
  };
  const load=async(id,nextKey,requestedFilter)=>{
    if(detail?.run.id!==id)queueFilter='all';
    detail=await api(`/api/runs/${id}/analysis`);if(!isCurrent())return;
    if(requestedFilter)queueFilter=requestedFilter;
    key=nextKey??detail.failures[0]?.key;renderRun();
  };
  const renderRun=()=>{
    const {run,summary}=detail;
    const queue=detail.failures.filter(f=>queueFilter==='all'||(queueFilter==='uncategorized'?!f.annotation?.categoryIds.length:f.annotation?.categoryIds.includes(queueFilter)));
    if(!queue.some(f=>f.key===key))key=queue[0]?.key;
    workspace.innerHTML=`<button id="analysis-back" class="download comparison-back">← Model analyses</button><div class="toolbar"><div><span class="eyebrow">ERROR ANALYSIS</span><h2>${esc(run.label)}</h2></div><div class="actions"><button id="analysis-refresh" class="download">Refresh</button><button id="analysis-export" class="download">Download analysis JSON</button><button id="analysis-open">Open run</button></div></div><p class="muted">${esc(run.provider)} / ${esc(run.model)} · ${esc(run.promptVersion)} · ${esc(run.status)} · ${formatRate(summary.passRate)} Pass Rate</p>${stats([[summary.failures,'Failing outputs'],[`${summary.categorized}/${summary.failures}`,'Categorized outputs'],[summary.uncategorized,'Uncategorized outputs'],[`${summary.tracedFailures}/${summary.failures}`,'Failure traces']])}<div class="error-chips">${topCategories(summary)}</div><details><summary>Model and prompt configuration</summary><pre>${pretty(run)}</pre></details><p class="muted">Failure means failed/incomplete checks, rejected semantic review, or an API/output error. Older runs have saved output evidence but no attempt trace. Categorization is independent of pass/fail review.</p><div class="review-layout"><nav><label>Failure queue<select id="analysis-filter">${option('all','All failures')}${option('uncategorized','Uncategorized')}${detail.categories.map(c=>option(c.id,c.name)).join('')}</select></label><div class="queue">${queue.map(f=>`<button class="record failed-output ${f.key===key?'active':''}" data-failure="${esc(f.key)}">${esc(f.key)}<span class="badge">${f.annotation?.categoryIds.length?f.annotation.categoryIds.map(id=>detail.categories.find(c=>c.id===id)?.name).map(esc).join(', '):'Uncategorized'}</span></button>`).join('')||'<p class="muted">No failures in this queue.</p>'}</div></nav><div id="failure-detail"></div></div>`;
    document.querySelector('#analysis-back').onclick=()=>landing().catch(notice);
    document.querySelector('#analysis-refresh').onclick=()=>load(run.id,key).catch(notice);
    document.querySelector('#analysis-open').onclick=()=>openRun(run.id);
    document.querySelector('#analysis-filter').value=queueFilter;
    document.querySelector('#analysis-filter').onchange=e=>{queueFilter=e.target.value;renderRun();};
    document.querySelectorAll('[data-failure]').forEach(b=>b.onclick=()=>{key=b.dataset.failure;renderRun();});
    document.querySelector('#analysis-export').onclick=()=>{
      const url=URL.createObjectURL(new Blob([JSON.stringify(detail,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='error-analysis.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    };
    const failure=detail.failures.find(f=>f.key===key);
    if(!failure){document.querySelector('#failure-detail').innerHTML='<div class="card"><h3>No failures to review</h3><p class="muted">Pending semantic reviews are available in the run workspace.</p></div>';return;}
    const r=failure.record;
    const trace=r.trace;
    document.querySelector('#failure-detail').innerHTML=`<div class="card"><h3>${esc(r.key)}</h3><p class="transcript">${esc(r.case.transcript)}</p><p class="warning">${esc(r.error?`${r.error.kind} error · ${r.error.name}${r.error.status?' · HTTP '+r.error.status:''}${r.error.reason?' · '+r.error.reason:''}`:[...(r.grade?.failures??[]),...(r.grade?.matchingPending?['Task matching is incomplete']:[]),...(r.grade?.semantic==='fail'?['Semantic review rejected']:[])].join('\n'))}</p>${r.error?.response?`<details open><summary>Provider error response (sanitized)</summary><pre>${pretty(r.error.response)}</pre></details>`:r.error?.kind==='api'?'<p class="muted">No HTTP error body was captured for this attempt (historical run or network failure).</p>':''}<details><summary>Input time context</summary><pre>${pretty(r.case.context)}</pre></details><div class="columns"><div><h3>Expected tasks</h3><pre>${pretty(r.case.expected)}</pre></div><div><h3>Extracted tasks</h3><pre>${pretty(r.tasks??null)}</pre></div></div><details><summary>Raw generated output</summary><pre>${esc(r.rawContent??'No raw output captured')}</pre></details><details><summary>Saved semantic review and checks</summary><pre>${pretty({grade:r.grade,review:r.review??null})}</pre></details><details><summary>${trace?'Execution trace · '+esc(trace.events.length)+' events':'Execution trace unavailable (historical run)'}</summary>${trace?`<p class="muted meta">Trace ${esc(trace.id)} · ${esc(trace.startedAt)} · ${trace.durationMs??'—'} ms · ${esc(trace.outcome)}</p><div class="table-scroll"><table class="metrics"><thead><tr><th>Elapsed ms</th><th>Event</th><th>Details</th></tr></thead><tbody>${trace.events.map(e=>`<tr><td>${e.elapsedMs}</td><td>${esc(e.name)}</td><td><pre>${pretty(e.attributes)}</pre></td></tr>`).join('')}</tbody></table></div>`:'<p class="muted">This run predates trace capture. No attempt IDs or timing events have been invented.</p>'}</details><hr class="review-divider"><form id="categorize"><h3>Error categories</h3><div id="category-options" class="category-options">${categoriesHtml(detail.categories,new Set(failure.annotation?.categoryIds??[]))}</div><label>Create a reusable category<input id="new-category" maxlength="80" placeholder="For example: Lost schedule wording"></label><button type="button" id="category-create" class="download">Add category</button><label>Analysis notes<textarea id="analysis-notes" maxlength="20000" placeholder="Describe the error, affected task, and a possible prompt/model improvement.">${esc(failure.annotation?.notes??'')}</textarea></label><button type="submit">Save categories & next</button><p class="muted">Assignments bind to this exact saved output. Clearing all categories returns it to the uncategorized queue.</p></form></div>`;
    document.querySelector('#category-create').onclick=async()=>{
      const button=document.querySelector('#category-create');button.disabled=true;
      try{
        const category=await api('/api/error-categories',{name:document.querySelector('#new-category').value});
        const selected=new Set([...document.querySelectorAll('[name=category]:checked')].map(e=>e.value));selected.add(category.id);
        if(!detail.categories.some(c=>c.id===category.id))detail.categories.push(category);
        document.querySelector('#category-options').innerHTML=categoriesHtml(detail.categories,selected);document.querySelector('#new-category').value='';notice();
      }catch(error){notice(error);}finally{button.disabled=false;}
    };
    document.querySelector('#new-category').onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();document.querySelector('#category-create').click();}};
    document.querySelector('#categorize').onsubmit=async event=>{
      event.preventDefault();const buttons=document.querySelectorAll('#categorize button');buttons.forEach(b=>b.disabled=true);
      try{
        await api(`/api/runs/${run.id}/analysis`,{key:r.key,evidenceHash:failure.evidenceHash,categoryIds:[...document.querySelectorAll('[name=category]:checked')].map(e=>e.value),notes:document.querySelector('#analysis-notes').value});
        const index=detail.failures.findIndex(f=>f.key===r.key);
        const order=[...detail.failures.slice(index+1),...detail.failures.slice(0,index)];
        const next=order.find(f=>!f.annotation?.categoryIds.length)?.key??r.key;
        await load(run.id,next);notice();
      }catch(error){notice(error);buttons.forEach(b=>b.disabled=false);}
    };
  };
  await landing();
}
