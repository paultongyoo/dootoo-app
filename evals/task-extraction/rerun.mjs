import {createHash} from 'node:crypto';
import {getPrompt} from '../../lambdas/lib/promptVersions.mjs';
import {buildMessages} from '../../lambdas/lib/extractTasks.mjs';
import {createAdapter,modelOption} from './models.mjs';
import {isFailedOutput} from './metrics.mjs';
import {executeRecord} from './execute-record.mjs';
export function prepareRerun(run,input,adapterFactory=createAdapter) {
  const index=run.records.findIndex(r=>r.key===input.key);
  const previous=run.records[index];
  if(!previous||!isFailedOutput(previous))throw new Error('Select a failed result to re-run');
  if((input.outputHash??null)!==(previous.outputHash??null)||(input.traceId??null)!==(previous.trace?.id??null))throw new Error('Output changed; reload before re-running');
  const provider=run.provider??'openai';
  const promptSnapshot=run.promptSnapshot??getPrompt(run.promptVersion);
  const hash=createHash('sha256').update(JSON.stringify(buildMessages({transcript:'',promptVersion:run.promptVersion,promptSnapshot})[0].content)).digest('hex');
  if(!run.promptSnapshot&&(!run.promptHash||run.promptHash!==hash))throw new Error('The saved prompt cannot be verified; create a new experiment instead');
  const adapter=adapterFactory(provider);
  const snapshot=modelOption(provider,run.model);
  return async()=>{
    if(!isFailedOutput(previous))throw new Error('This result is no longer failing');
    const replacement=await executeRecord({testCase:previous.case,repeat:previous.repeat,key:previous.key,adapter,provider,model:run.model,promptVersion:run.promptVersion,promptSnapshot});
    const {previousAttempts=[],...original}=previous;
    replacement.previousAttempts=[...previousAttempts,{record:structuredClone(original),review:run.reviews?.[previous.key]??null,errorAnalysis:run.errorAnalysis?.[previous.key]??null,modelSnapshot:previous.modelSnapshot??run.modelSnapshot??null,archivedAt:new Date().toISOString()}];
    replacement.modelSnapshot=snapshot;
    replacement.attempt=replacement.previousAttempts.length+1;
    return {index,record:replacement};
  };
}
