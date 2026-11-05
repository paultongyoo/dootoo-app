// Compare only identical saved case inputs/expectations at the same repeat index.
const canonical = value => JSON.stringify(value, (_, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))) : v);
const reviewed = r => ['pass','fail'].includes(r.grade?.semantic);
const mean = values => values.length ? values.reduce((a,b)=>a+b,0)/values.length : null;
const percentile = values => values.length ? [...values].sort((a,b)=>a-b)[Math.ceil(values.length*.95)-1] : null;
export function compareRuns(baseline, candidate) {
  const identity = r => `${r.case.id}#${r.repeat}`;
  const before = new Map(baseline.records.map(r=>[identity(r),r]));
  const after = new Map(candidate.records.map(r=>[identity(r),r]));
  const rows = [...new Set([...before.keys(),...after.keys()])].map(key=> {
    const b=before.get(key), c=after.get(key);
    const comparable=Boolean(b&&c&&canonical(b.case)===canonical(c.case));
    const change = field => !comparable ? null : field(b)===field(c) ? 'unchanged' : field(c) ? 'improved' : 'regressed';
    return {key,baseline:b,candidate:c,comparable,reason:!b?'Candidate only':!c?'Baseline only':!comparable?'Case changed':null,deterministic:change(r=>Boolean(r.grade?.deterministicPass)),semantic:comparable&&reviewed(b)&&reviewed(c)?change(r=>r.grade.semantic==='pass'):null};
  });
  const paired=rows.filter(r=>r.comparable);
  const metricsFor = pairs => {
    const sem=pairs.filter(r=>reviewed(r.baseline)&&reviewed(r.candidate));
    const latency=pairs.filter(r=>Number.isFinite(r.baseline.latencyMs)&&Number.isFinite(r.candidate.latencyMs));
    const tokens=pairs.filter(r=>['baseline','candidate'].every(side=>Number.isFinite(r[side].usage?.prompt_tokens)&&Number.isFinite(r[side].usage?.completion_tokens)));
    const rate=(list,side,fn)=>list.length ? list.filter(r=>fn(r[side])).length/list.length*100 : null;
    const metric=(name,unit,list,fn)=> {const b=fn('baseline'),c=fn('candidate');return {name,unit,samples:list.length,baseline:b,candidate:c,delta:b===null||c===null?null:c-b};};
    return [
      metric('Deterministic pass rate','%',pairs,s=>rate(pairs,s,r=>r.grade?.deterministicPass)),
      metric('Semantic approval rate (both reviewed)','%',sem,s=>rate(sem,s,r=>r.grade.semantic==='pass')),
      metric('Fully passed rate','%',pairs,s=>rate(pairs,s,r=>r.grade?.deterministicPass&&r.grade.semantic==='pass')),
      metric('Semantic review coverage','%',pairs,s=>rate(pairs,s,reviewed)),
      metric('API / output error rate','%',pairs,s=>rate(pairs,s,r=>Boolean(r.error))),
      metric('Mean latency','ms',latency,s=>mean(latency.map(r=>r[s].latencyMs))),
      metric('P95 latency','ms',latency,s=>percentile(latency.map(r=>r[s].latencyMs))),
      metric('Mean total tokens','tokens',tokens,s=>mean(tokens.map(r=>r[s].usage.prompt_tokens+r[s].usage.completion_tokens))),
    ];
  };
  return {createdAt:new Date().toISOString(),baseline:{id:baseline.id,label:baseline.label,model:baseline.model,promptVersion:baseline.promptVersion,promptHash:baseline.promptHash,status:baseline.status,total:baseline.records.length},candidate:{id:candidate.id,label:candidate.label,model:candidate.model,promptVersion:candidate.promptVersion,promptHash:candidate.promptHash,status:candidate.status,total:candidate.records.length},paired:paired.length,excluded:rows.length-paired.length,metrics:metricsFor(paired),categories:Object.fromEntries([...new Set(paired.flatMap(r=>r.baseline.case.tags))].map(tag=>[tag,metricsFor(paired.filter(r=>r.baseline.case.tags.includes(tag)))])),rows};
}
