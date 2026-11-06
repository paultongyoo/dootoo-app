import {createHash} from 'node:crypto';
import {isFailedOutput} from './metrics.mjs';
export const DEFAULT_ERROR_CATEGORIES=['Output formatting','Missing task','Invented task','Incorrect meaning','Scheduling','Hierarchy','Language','Task matching','Authentication / access','Rate limit','Provider / network'];
export const evidenceHash=record=>createHash('sha256').update(JSON.stringify({case:record.case,tasks:record.tasks,rawContent:record.rawContent,error:record.error})).digest('hex');
export function validAnnotation(run,record,categories) {
  const annotation=run.errorAnalysis?.[record.key];
  if(!annotation||annotation.evidenceHash!==evidenceHash(record))return null;
  const known=new Set(categories.map(c=>c.id));
  return {...annotation,categoryIds:(annotation.categoryIds??[]).filter(id=>known.has(id))};
}
export function analysisForRun(run,categories) {
  const failures=run.records.filter(isFailedOutput);
  const counts=new Map();let categorized=0,traced=0;
  for(const record of failures) {
    const annotation=validAnnotation(run,record,categories);
    if(annotation?.categoryIds.length){categorized++;for(const id of new Set(annotation.categoryIds))counts.set(id,(counts.get(id)??0)+1);}
    if(record.trace?.version===1)traced++;
  }
  return {totalOutputs:run.records.length,failures:failures.length,categorized,uncategorized:failures.length-categorized,tracedFailures:traced,pendingReviews:run.summary?.semanticPending??0,passRate:run.summary?.passRate??null,
    topCategories:categories.filter(c=>counts.has(c.id)).map(c=>({id:c.id,name:c.name,count:counts.get(c.id)})).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name))};
}
export function failureDetails(run,categories) {
  return run.records.filter(isFailedOutput).map(record=>({key:record.key,evidenceHash:evidenceHash(record),record:{...record,review:run.reviews?.[record.key]??null},annotation:validAnnotation(run,record,categories)}));
}
export function validateAnnotation(run,input,categories) {
  const record=run.records.find(r=>r.key===input.key);
  if(!record||!isFailedOutput(record))throw new Error('This output is no longer failing or does not exist');
  if(input.evidenceHash!==evidenceHash(record))throw new Error('Output changed; reload before categorizing');
  if(!Array.isArray(input.categoryIds)||input.categoryIds.length>30||new Set(input.categoryIds).size!==input.categoryIds.length||input.categoryIds.some(id=>!categories.some(c=>c.id===id)))throw new Error('Choose valid, unique error categories');
  if(typeof input.notes!=='string'||input.notes.length>20000)throw new Error('Notes must be text up to 20,000 characters');
  return {evidenceHash:input.evidenceHash,categoryIds:input.categoryIds,notes:input.notes,updatedAt:new Date().toISOString()};
}
