import { showComparison } from './comparison-view.js';
const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pretty = v => esc(JSON.stringify(v, null, 2));
let config, selected, run, key, filter = 'all', dirty = false;
async function api(path, body) { const res = await fetch(path, body === undefined ? {} : {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); const data = await res.json(); if (!res.ok) throw new Error(data.error); return data; }
function notice(error) { $('#notice').textContent = error?.message ?? ''; }
function option(value, label) { return `<option value="${esc(value)}">${esc(label)}</option>`; }
async function history() {
  const runs = await api('/api/runs');
  $('#history').innerHTML = runs.length ? runs.map(r => `<button class="history ${r.id === selected ? 'selected' : ''}" data-id="${esc(r.id)}">${esc(r.label)}<small>${esc(r.model)}${r.status === 'completed' ? '' : ` · ${esc(({running:'Running',failed:'Failed',interrupted:'Interrupted'})[r.status] ?? r.status)}`}<br>${new Date(r.createdAt).toLocaleString()}</small></button>`).join('') : '<p class="muted">Your experiments will appear here.</p>';
  $('#history').querySelectorAll('button').forEach(b => b.onclick = () => open(b.dataset.id));
  const select = $('[name=baseline]'), value = select.value;
  select.innerHTML = option('', 'No baseline') + runs.filter(r => r.status !== 'running').map(r => option(r.id, `${r.label} · ${r.summary?.fullyPassed ?? 0}/${r.summary?.total ?? 0} fully passed`)).join(''); select.value = value;
  if ($('#nav-home').classList.contains('current')) renderDashboard(runs);
}
async function open(id) { showWorkspace(); selected = id; key = null; dirty = false; notice(); run = await api(`/api/runs/${id}`); render(); await history(); }
const semantic = r => r.error ? 'error' : r.grade?.semantic ?? 'pending';
function render() {
  const s = run.summary, records = run.records.filter(r => filter === 'all' || (filter === 'checks' ? !r.grade?.deterministicPass : semantic(r) === filter));
  const semanticComplete=run.status!=='running' && run.records.length>0 && run.records.every(r=>r.grade?.semantic==='pass' || r.grade?.semantic==='fail');
  if (!records.some(r => r.key === key)) key = records[0]?.key;
  $('#workspace').innerHTML = `<div class="toolbar"><div><span class="eyebrow">RUN WORKSPACE</span><h2>${esc(run.label)}</h2><span class="run-review-status ${semanticComplete?'completed':'pending'}" role="status">${semanticComplete?'Semantic review completed':'Pending semantic review'}</span></div><div class="actions"><button id="finalize" ${run.status === 'running' ? 'disabled' : ''}>Generate reviewed report</button>${run.finalStem ? `<a class="download" href="/api/runs/${selected}/export/json">JSON ↓</a><a class="download" href="/api/runs/${selected}/export/md">Markdown ↓</a>` : ''}<button id="delete-run" class="delete-run" ${run.status === 'running' ? 'disabled' : ''}>Delete run</button></div></div><div class="meta muted">${esc(run.model)} · ${esc(run.promptVersion)} · ${esc(run.status)} · ${run.records.length}/${run.total} outputs<br>Prompt hash: ${esc(run.promptHash ?? 'Captured when run finishes')}</div>${run.error ? `<p class="warning">${esc(run.error)}</p>` : ''}<div class="stats">${[[`${s.deterministicPassed}/${s.total}`,'Deterministic passes'],[`${s.fullyPassed}/${s.total}`,'Fully passed'],[s.semanticPending,'Awaiting semantic review'],[s.apiErrors+s.outputErrors,'API / output errors']].map(([n,t])=>`<div class="stat"><strong>${n}</strong><span>${t}</span></div>`).join('')}</div>${run.finalizedAt ? `<p class="status-line">Reviewed report generated ${new Date(run.finalizedAt).toLocaleString()}. ${run.finalReport.summary.semanticPending} reviews pending. Available as a baseline in new experiments.</p>` : ''}<div class="review-layout"><nav><select id="filter">${[['all','All outputs'],['pending','Review pending'],['fail','Semantic rejected'],['checks','Checks / matching failed'],['pass','Semantic approved'],['error','Errors']].map(([v,t])=>option(v,t)).join('')}</select><div class="queue">${records.map(r=>`<button class="record ${r.key===key?'active':''}" data-key="${esc(r.key)}">${esc(r.key)}<span class="badge">${esc(semantic(r))} · ${r.grade?.deterministicPass?'checks passed':'checks incomplete / failed'}</span></button>`).join('') || '<p class="muted">No outputs in this queue.</p>'}</div></nav><div id="detail"></div></div><details><summary>Categories, usage & baseline comparison</summary><pre>${pretty({categories:run.categories,usage:run.usage,comparison:run.comparison})}</pre></details>`;
  $('#filter').value = filter; $('#filter').onchange = e => {filter=e.target.value; render();};
  document.querySelectorAll('[data-key]').forEach(b => b.onclick = () => { key=b.dataset.key;dirty=false;render(); });
  $('#finalize').onclick = async () => { try { $('#finalize').disabled=true; run=await api(`/api/runs/${selected}/finalize`,{});render();notice(); } catch(e){notice(e);$('#finalize').disabled=false;} };
  $('#delete-run').onclick = async () => {
    if (!confirm(`Delete run "${run.label}"? It will be removed from run history and baseline choices. Saved files remain on disk for recovery.`)) return;
    try {
      $('#delete-run').disabled=true;
      await api(`/api/runs/${selected}/delete`,{});
      selected=null;run=null;key=null;dirty=false;
      $('#workspace').innerHTML='<div class="empty"><h2>Run deleted</h2><p>Select another run or start a new experiment.</p></div>';
      notice();await history();
    } catch(e) {notice(e);$('#delete-run').disabled=false;}
  };
  detail();
}
function detail() {
  const r = run.records.find(r=>r.key===key); if (!r) { $('#detail').innerHTML='<div class="card">Outputs will appear here as requests finish.</div>';return; }
  const review=run.reviews[r.key]??{};
  const decision=semantic(r);
  const decisionLabel=decision==='pass'?'Approved':decision==='fail'?'Rejected':'Pending';
  $('#detail').innerHTML=`<div class="card"><span class="eyebrow">${esc(r.key)} · ${r.latencyMs ?? '—'} MS</span><p class="transcript">${esc(r.case.transcript)}</p><details><summary>Time context</summary><pre>${pretty(r.case.context)}</pre></details><div class="columns"><div><h3>Expected meaning</h3>${r.case.expected.map(t=>`<div class="task"><strong>${esc(t.id)}</strong> · ${esc(t.meaning)}<small>Parent: ${esc(t.parentId??'none')}<br>UTC: ${esc(t.scheduledDatetimeUtc??'none')}</small></div>`).join('')||'<p>No tasks expected.</p>'}</div><div><h3>Extracted tasks</h3>${(Array.isArray(r.tasks)?r.tasks:[]).map(t=>`<div class="task"><strong>${esc(t?.text)}</strong><small>UUID: ${esc(t?.uuid)}<br>Parent: ${esc(t?.parent_item_uuid??'none')}<br>UTC: ${esc(t?.scheduled_datetime_utc??'none')}</small></div>`).join('')||'<p>No tasks returned.</p>'}</div></div>${r.error?`<p class="warning">${pretty(r.error)}</p>`:`<p class="${r.grade.deterministicPass?'good':'warning'}">${r.grade.deterministicPass?'Deterministic checks passed':esc([...r.grade.failures,...(r.grade.matchingPending?['Matching is incomplete; assign expected tasks below.']:[])].join('\n'))}</p><form id="review"><h3>Semantic review</h3><p class="semantic-status" role="status">Assigned category: <strong>${decisionLabel}</strong></p><p class="muted">Check meaning, omissions, invented tasks, English, schedule wording, capitalization and grouping. Mappings associate tasks; approval records your semantic judgment.</p>${r.case.expected.map(t=>`<label>${esc(t.id)} → generated task<select data-match="${esc(t.id)}">${option('','Use automatic hint')}${(r.tasks??[]).filter(t=>t?.uuid).map(t=>option(t.uuid,t.text)).join('')}</select></label>`).join('')}<label>Review notes<textarea id="notes" placeholder="What worked? What should the next prompt improve?">${esc(review.notes??'')}</textarea></label><div class="review-actions">${decision!=='pass'?'<button type="submit" name="decision" value="pass">Approve</button>':''}${decision!=='fail'?'<button type="submit" name="decision" value="fail">Reject</button>':''}</div><hr class="review-divider"><div class="review-actions metadata-actions"><button type="submit" class="save-metadata" name="decision" value="skip">Save review & next</button><span class="muted">Save notes and task mappings without changing the semantic category.</span></div></form>`}<details><summary>Raw output, checks & provenance</summary><pre>${pretty(r)}</pre></details></div>`;
  if (r.error) return;

  document.querySelectorAll('[data-match]').forEach(el=> {el.value=review.matches?.[el.dataset.match]??'';});
  $('#review').oninput=()=>{dirty=true;};
  $('#review').onsubmit=async e=>{e.preventDefault();try {
    const matches=Object.fromEntries([...document.querySelectorAll('[data-match]')].filter(el=>el.value).map(el=>[el.dataset.match,el.value]));
    const value=e.submitter?.value ?? 'skip';
    const semanticPass=value==='skip' ? (review.semanticPass ?? null) : value==='pass';
    document.querySelectorAll('#review button').forEach(button=>{button.disabled=true;});
    run=await api(`/api/runs/${selected}/review`,{key:r.key,outputHash:r.outputHash,matches,notes:$('#notes').value,semanticPass});
    dirty=false;const index=run.records.findIndex(t=>t.key===r.key);
    const next=[...run.records.slice(index+1),...run.records.slice(0,index)].find(t=>semantic(t)==='pending');
    key=next?.key??r.key;render();notice();
  }catch(err){notice(err);document.querySelectorAll('#review button').forEach(button=>{button.disabled=false;});}};
}
function showWorkspace() {
  $('#experiment-panel').hidden=true;$('#workspace').hidden=false;
  document.querySelectorAll('.studio-nav button').forEach(b=>b.classList.remove('current'));
}
function renderDashboard(runs) {
  const sum = field => runs.reduce((total,r)=>total+(r.summary?.[field]??0),0);
  const pending=runs.filter(r=>(r.summary?.semanticPending??0)>0);
  const saved=runs.filter(r=>r.status!=='running' && (r.summary?.total??0)>0);
  const reviewed=saved.filter(r=>r.status==='completed' && r.summary.semanticPending===0 && r.summary.apiErrors===0 && r.summary.outputErrors===0);
  const running=runs.filter(r=>r.status==='running');
  const attention=runs.filter(r=>['failed','interrupted'].includes(r.status)||(r.summary?.apiErrors??0)+(r.summary?.outputErrors??0)>0);
  const latest=runs[0];
  const reviewTarget=pending[0];
  const stats=[[runs.length,'Saved runs'],[sum('semanticPending'),'Outputs awaiting review'],[reviewed.length,'Fully reviewed runs'],[running.length,'Running now']];
  $('#workspace').innerHTML=`<div class="toolbar"><div><span class="eyebrow">EXPERIMENT → REVIEW → COMPARE</span><h2>Dashboard</h2></div><span class="muted">Updates automatically · local saved runs</span></div><div class="stats">${stats.map(([n,label])=>`<div class="stat"><strong>${n}</strong><span>${label}</span></div>`).join('')}</div><div class="dashboard-actions"><section class="card"><span class="eyebrow">01 / EXPERIMENT</span><h3>Try a model or prompt change</h3><p class="muted">${runs.length?'Build on your saved experiments with a new candidate.':'Start your first experiment to establish a baseline.'}</p><button id="home-new">New experiment</button></section><section class="card"><span class="eyebrow">02 / REVIEW</span><h3>${sum('semanticPending')} outputs need a decision</h3><p class="muted">${pending.length?`${pending.length} ${pending.length===1?'run has':'runs have'} pending semantic reviews. Review meaning and task matching before drawing quality conclusions.`:'No saved outputs are awaiting semantic review.'}</p><button id="home-review" ${!reviewTarget?'disabled':''}>Continue semantic review</button></section><section class="card"><span class="eyebrow">03 / COMPARE</span><h3>${saved.length} runs available to compare</h3><p class="muted">${saved.length>=2?`${reviewed.length} ${reviewed.length===1?'run has':'runs have'} complete semantic reviews and no API/output errors. Compare matching cases to measure changes.`:'Save at least two runs to compare a baseline and candidate.'}</p><button id="home-compare" ${saved.length<2?'disabled':''}>Compare runs</button></section></div>${attention.length?`<section class="card"><h3>${attention.length} ${attention.length===1?'run needs':'runs need'} attention</h3><p class="muted">Failed or interrupted execution, or API/output errors. Open a run to inspect its saved outputs.</p><div class="actions">${attention.map(r=>`<button class="download" data-dashboard-run="${esc(r.id)}">${esc(r.label)} · ${esc(['failed','interrupted'].includes(r.status)?r.status:'API/output errors')}</button>`).join('')}</div></section>`:''}${latest?`<section class="card"><div class="toolbar"><h3>Latest run · ${esc(latest.label)}</h3><button class="download" data-dashboard-run="${esc(latest.id)}">Open run</button></div><p class="muted">${esc(latest.model)} · ${esc(latest.promptVersion??'Unknown prompt')} · ${new Date(latest.createdAt).toLocaleString()}</p><div class="columns"><p><strong>${latest.summary?.deterministicPassed??0}/${latest.summary?.total??0}</strong> deterministic passes</p><p><strong>${latest.summary?.fullyPassed??0}/${latest.summary?.total??0}</strong> fully passed with semantic approval</p></div><p class="muted">These metrics describe this run only. Use Compare runs to evaluate changes on matching cases. Fully reviewed means every saved output has a semantic decision; rejected outputs count as reviewed.</p></section>`:'<p class="muted">Your run metrics will appear here after your first experiment.</p>'}`;
  $('#home-new').onclick=experiment;$('#home-compare').onclick=comparison;
  $('#home-review').onclick=async()=>{if(reviewTarget){filter='pending';await open(reviewTarget.id);}};
  document.querySelectorAll('[data-dashboard-run]').forEach(button=>button.onclick=()=>{filter='all';open(button.dataset.dashboardRun);});
}
async function home() {
  showWorkspace();selected=null;run=null;dirty=false;notice();
  $('#nav-home').classList.add('current');
  $('#workspace').innerHTML='<p class="muted">Loading dashboard…</p>';
  try {await history();}catch(e){notice(e);}
}
function experiment() {
  showWorkspace();selected=null;run=null;dirty=false;notice();
  $('#workspace').hidden=true;$('#experiment-panel').hidden=false;$('#nav-experiment').classList.add('current');
}
function promptEditor(source, prompts) {
  let version=source.version.replace(/\d+$/,n=>String(Number(n)+1));
  if(version===source.version) version=`${source.version}-copy`;
  while(prompts.some(p=>p.version===version)) version=`${version}-new`;
  $('#prompt-detail').innerHTML=`<h3>Create prompt version</h3><p class="muted">Based on ${esc(source.version)}. Saved versions are immutable. Saving does not make API calls.</p><form id="prompt-editor"><label>Version ID<input name="version" value="${esc(version)}" required pattern="[a-zA-Z0-9_-]{1,100}" maxlength="100"></label><label>Name<input name="name" value="${esc(source.name)}" required maxlength="200"></label><label>Change notes<textarea name="description" required maxlength="30000" placeholder="What changed, and what improvement do you expect?"></textarea></label><label>System template<textarea name="systemTemplate" class="template-editor" required maxlength="30000">${esc(source.systemTemplate)}</textarea></label><p class="muted">Keep {{timeContext}} where scheduling context should be inserted.</p><label>Time context template<textarea name="contextTemplate" required maxlength="30000">${esc(source.contextTemplate)}</textarea></label><label>User template<textarea name="userTemplate" required maxlength="30000">${esc(source.userTemplate)}</textarea></label><p class="muted">Keep {{transcript}} for the input transcript. Time context accepts {{userLocalTime}}, {{userTimeZone}} and {{utcDateTime}}.</p><label class="checkbox-label"><input type="checkbox" name="makeLatest">Use as latest default for new extractions</label><p class="muted">Leave unchecked to evaluate this candidate before changing the default.</p><div class="actions"><button type="submit" value="save">Save version</button><button type="submit" value="experiment">Save & new experiment</button><button type="button" class="download" id="cancel-prompt">Cancel</button></div></form>`;
  $('#cancel-prompt').onclick=()=>promptHistory(source.version);
  $('#prompt-editor').onsubmit=async event=>{
    event.preventDefault();
    const launch=event.submitter?.value==='experiment';
    const input=Object.fromEntries(new FormData(event.target));
    input.parentVersion=source.version;input.makeLatest=event.target.elements.makeLatest.checked;
    document.querySelectorAll('#prompt-editor button').forEach(b=>b.disabled=true);
    try {
      const saved=await api('/api/prompts',input);
      const selectedVersion=$('[name=promptVersion]').value;
      config=await api('/api/config');
      $('[name=promptVersion]').innerHTML=config.prompts.map(p=>option(p.version,p.version+(p.latest?' · Latest':''))).join('');
      $('[name=promptVersion]').value=input.makeLatest?saved.version:selectedVersion;
      if(launch){experiment();$('[name=promptVersion]').value=saved.version;}
      else await promptHistory(saved.version);
      notice();
    }catch(error){notice(error);document.querySelectorAll('#prompt-editor button').forEach(b=>b.disabled=false);}
  };
}

async function promptHistory(selectedVersion) {
  showWorkspace();selected=null;run=null;dirty=false;notice();$('#nav-prompts').classList.add('current');
  $('#workspace').innerHTML='<p class="muted">Loading prompt history…</p>';
  try {
    const prompts=await api('/api/prompts');
    if (!$('#nav-prompts').classList.contains('current')) return;
    $('#workspace').innerHTML=`<div class="toolbar"><div><span class="eyebrow">EXTRACTION INSTRUCTIONS</span><h2>Prompt History</h2></div><button id="create-prompt">Create version</button></div><p class="muted">${prompts.length} saved ${prompts.length===1?'version':'versions'}. The latest version is the default for extraction. Select any saved version in New experiment to evaluate it. Historical run snapshots remain in their reports.</p><div class="prompt-history-layout"><nav id="prompt-list">${[...prompts].reverse().map(p=>`<button class="history" data-prompt="${esc(p.version)}">${esc(p.version)}${p.latest?' · Latest':''}<small>${esc(p.name)}</small></button>`).join('')}</nav><div id="prompt-detail" class="card"></div></div>`;
    const display=version=>{
      const p=prompts.find(p=>p.version===version);
      document.querySelectorAll('[data-prompt]').forEach(button=>button.classList.toggle('selected',button.dataset.prompt===version));
      $('#prompt-detail').innerHTML=`<div class="toolbar"><h3>${esc(p.version)}</h3>${p.latest?'<span class="run-review-status completed">Latest</span>':''}</div><p><strong>${esc(p.name)}</strong></p><p class="muted">${esc(p.description)}</p><p class="muted meta">System prompt hash (without time context): ${esc(p.promptHash)}</p><h3>System template</h3><pre class="prompt-template">${esc(p.systemTemplate)}</pre><h3>Time context template</h3><pre class="prompt-template">${esc(p.contextTemplate)}</pre><p class="muted">{{timeContext}} is empty unless local time, timezone and UTC time are all supplied.</p><h3>User template</h3><pre class="prompt-template">${esc(p.userTemplate)}</pre><button id="evaluate-prompt">New experiment with this version</button>`;
      $('#evaluate-prompt').onclick=()=>{experiment();$('[name=promptVersion]').value=p.version;};
      $('#create-prompt').onclick=()=>promptEditor(p,prompts);
    };
    document.querySelectorAll('[data-prompt]').forEach(button=>button.onclick=()=>display(button.dataset.prompt));
    display(typeof selectedVersion==='string' && prompts.some(p=>p.version===selectedVersion)?selectedVersion:prompts.find(p=>p.latest).version);
  }catch(e){notice(e);}
}
async function comparison() {
  showWorkspace();selected=null;run=null;dirty=false;notice();$('#nav-compare').classList.add('current');
  try {await showComparison(api,notice);}catch(e){notice(e);}
}
try {
  document.querySelector('article').insertBefore($('#experiment-panel'),$('#workspace'));
  $('#nav-home').onclick=home;$('#nav-experiment').onclick=experiment;$('#nav-compare').onclick=comparison;
  $('#nav-prompts').onclick=promptHistory;
  home();
  config=await api('/api/config');
  $('[name=promptVersion]').innerHTML=config.prompts.map(p=>option(p.version, p.version+(p.latest?' · Latest':''))).join('');
  $('[name=promptVersion]').value=config.promptVersion; $('[name=model]').value=config.model;
  $('[name=case]').innerHTML+=config.cases.map(c=>option(c.id,c.id)).join('');
  $('[name=tag]').innerHTML+=[...new Set(config.cases.flatMap(c=>c.tags))].sort().map(t=>option(t,t)).join('');
  $('#connection').textContent=config.keyAvailable?'Local API key ready':'API key unavailable · saved runs can be reviewed';
  const estimate=()=> { const f=new FormData($('#new-run')); const n=config.cases.filter(c=>(!f.get('case')||c.id===f.get('case'))&&(!f.get('tag')||c.tags.includes(f.get('tag')))).length; $('#estimate').textContent=`${n} cases × ${f.get('repeats')} repeats = ${n*Number(f.get('repeats'))} API requests`; };
  $('#new-run').oninput=estimate;estimate();await history();
  $('#new-run').onsubmit=async e=>{e.preventDefault();try {$('#launch').disabled=true;const j=await api('/api/runs',Object.fromEntries(new FormData(e.target)));await open(j.id);notice();}catch(err){notice(err);}finally{$('#launch').disabled=false;}};
  setInterval(async()=>{try {if(selected&&run?.status==='running'&&!dirty){run=await api(`/api/runs/${selected}`);render();}await history();}catch(e){notice(e);}},2500);
} catch(e){notice(e);}
