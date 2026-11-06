import { readFileSync, writeFileSync, renameSync, unlinkSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
const validVersion = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(value);
const fields = ['name','description','contextTemplate','systemTemplate','userTemplate'];
function validatePrompt(prompt, version) {
  if (prompt.version !== version || !validVersion(version) || !fields.every(field => typeof prompt[field] === 'string' && prompt[field].length <= 30000) || !prompt.name.trim() || prompt.name.length > 200 || !prompt.systemTemplate.includes('{{timeContext}}') || !prompt.userTemplate.includes('{{transcript}}')) {
    throw new Error(`Invalid task extraction prompt: ${version}. Name, templates, {{timeContext}} and {{transcript}} are required.`);
  }
}
export function createPromptRegistry(directory) {
  const read = file => JSON.parse(readFileSync(new URL(file, directory), 'utf8'));
  let manifest, versions;
  const load = () => {
    const next = read('manifest.json');
    if (!Array.isArray(next.versions) || !next.versions.length || new Set(next.versions).size !== next.versions.length || !next.versions.every(validVersion) || !next.versions.includes(next.latest)) throw new Error('Invalid task extraction prompt manifest');
    const entries = next.versions.map(version => { const prompt=read(`${version}.json`);validatePrompt(prompt,version);return [version,Object.freeze(prompt)]; });
    manifest=next;versions=new Map(entries);
  };
  load();
  return {
    get latest() { return manifest.latest; },
    get(version = manifest.latest) { const prompt=versions.get(version);if(!prompt)throw new Error(`Unknown task extraction prompt version: ${version}`);return prompt; },
    list() { return [...versions.values()].map(prompt=>({...prompt,latest:prompt.version===manifest.latest})); },
    create(input) {
      load();
      if (!input || typeof input !== 'object') throw new Error('Prompt fields are required');
      if (!validVersion(input.version)) throw new Error('Version must use 1–100 letters, numbers, underscores or hyphens');
      if (versions.has(input.version)) throw new Error('That prompt version already exists; choose a new version name');
      if (!versions.has(input.parentVersion)) throw new Error('Choose an existing source version');
      if (typeof input.makeLatest !== 'boolean') throw new Error('Specify whether this version should become latest');
      const prompt={version:input.version,...Object.fromEntries(fields.map(field=>[field,input[field]])),parentVersion:input.parentVersion,createdAt:new Date().toISOString()};
      validatePrompt(prompt,input.version);
      const path=new URL(`${prompt.version}.json`,directory);
      const temp=new URL(`manifest-${randomUUID()}.tmp`,directory);
      // Never overwrite a saved version; publish it through an atomic manifest update.
      writeFileSync(path,JSON.stringify(prompt,null,2)+'\n',{flag:'wx'});
      try {
        const next={...manifest,versions:[...manifest.versions,prompt.version],latest:input.makeLatest?prompt.version:manifest.latest};
        writeFileSync(temp,JSON.stringify(next,null,2)+'\n',{flag:'wx'});
        renameSync(temp,new URL('manifest.json',directory));
        manifest=next;versions.set(prompt.version,Object.freeze(prompt));
      } catch(error) {
        unlinkSync(path);try{unlinkSync(temp);}catch{}throw error;
      }
      return {...prompt,latest:prompt.version===manifest.latest};
    },
  };
}
const registry=createPromptRegistry(new URL('./prompts/',import.meta.url));
export let LATEST_PROMPT_VERSION=registry.latest;
export const getPrompt=version=>registry.get(version);
export const listPrompts=()=>registry.list();
export function createPrompt(input) { const prompt=registry.create(input);LATEST_PROMPT_VERSION=registry.latest;return prompt; }
const render = (template, values) => template.replace(/\{\{(\w+)\}\}/g, (slot, key) => Object.hasOwn(values,key) ? String(values[key]) : slot);
export function promptMessages({ transcript, userLocalTime, userTimeZone, utcDateTime }, version = LATEST_PROMPT_VERSION, snapshot) {
  const prompt = snapshot ?? getPrompt(version);
  if (snapshot) validatePrompt(snapshot, version);
  const timeContext = userLocalTime && userTimeZone && utcDateTime
    ? render(prompt.contextTemplate, {userLocalTime,userTimeZone,utcDateTime}) : '';
  return [
    {role:'system',content:render(prompt.systemTemplate,{timeContext})},
    {role:'user',content:render(prompt.userTemplate,{transcript})},
  ];
}
