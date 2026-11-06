import {readFile,writeFile,rename} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {DEFAULT_ERROR_CATEGORIES} from './error-analysis.mjs';
export function createCategoryStore(directory) {
  const path=join(directory,'error-categories.json');let pending=Promise.resolve();
  const list=async()=>{
    try{return JSON.parse(await readFile(path,'utf8')).categories;}
    catch(error){
      if(error.code!=='ENOENT')throw error;
      const categories=DEFAULT_ERROR_CATEGORIES.map(name=>({id:randomUUID(),name,createdAt:new Date().toISOString()}));
      try{await writeFile(path,JSON.stringify({categories},null,2),{flag:'wx'});return categories;}
      catch(error){if(error.code==='EEXIST')return list();throw error;}
    }
  };
  const create=input=>{
    const action=pending.then(async()=>{
      if(typeof input.name!=='string')throw new Error('Enter a category name');
      const name=input.name.trim().replace(/\s+/g,' ');
      if(!name||name.length>80)throw new Error('Category names must contain 1–80 characters');
      const categories=await list();
      const existing=categories.find(c=>c.name.toLowerCase()===name.toLowerCase());if(existing)return existing;
      if(categories.length>=500)throw new Error('Category limit reached');
      const category={id:randomUUID(),name,createdAt:new Date().toISOString()};categories.push(category);
      const temporary=`${path}.tmp`;await writeFile(temporary,JSON.stringify({categories},null,2));await rename(temporary,path);return category;
    });
    pending=action.catch(()=>{});return action;
  };
  return {list,create};
}
