import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {story} from '../web/narrative/story.js';
import {entries,contentFor} from '../web/narrative/journey.js';
import {ui} from '../web/narrative/ui.js';
const localizedKeys=new Set(['title','subtitle','text','speaker','simple','example','context','understand','reflection']);
const reports={};
for(const language of ['hi','ja','zh-Hans','fr']){
  const data=JSON.parse(await readFile(new URL(`../web/narrative/locales/${language}.json`,import.meta.url),'utf8'));
  let localized=0,empty=0,protectedFields=0;const unchanged=[];
  function walk(source,target,path='',key=''){
    assert.equal(Array.isArray(source),Array.isArray(target),path);assert.equal(typeof target,typeof source,path);
    if(Array.isArray(source)){assert.equal(target.length,source.length,path);source.forEach((item,i)=>walk(item,target[i],path+'.'+i,key));return;}
    if(source&&typeof source==='object'){assert.deepEqual(Object.keys(target),Object.keys(source),path);for(const k of Object.keys(source))walk(source[k],target[k],path+'.'+k,k);return;}
    if(localizedKeys.has(key)){
      if(!source){assert.equal(target,'',path);empty++;return;}
      assert(target.trim().length>0,path);assert(!/[\uFFFD\u0000]/.test(target),path);localized++;
      if(source===target&&key!=='speaker')unchanged.push({path,text:source});
    }else{assert.equal(target,source,path);protectedFields++;}
  }
  walk(story,data);
  const allowed=language==='fr'?['Om, Tat, Sat']:[];for(const item of unchanged)assert(allowed.includes(item.text),'Untranslated '+language+' '+item.path);
  for(const e of entries){const p=contentFor(e,data);assert(p.beat.text&&p.beat.speaker);}
  assert.equal(data.chapters.length,18);assert.equal(data.chapters.flatMap(c=>c.scenes).length,72);
  assert.deepEqual(Object.keys(ui[language]),Object.keys(ui.en),'UI key parity '+language);
  reports[language]={chapters:18,scenes:72,passages:entries.length,localizedNonemptyFields:localized,emptyContexts:empty,protectedFields,intentionallyUnchanged:unchanged};
}
await writeFile(new URL('./locale-validation.json',import.meta.url),JSON.stringify({passed:true,languages:reports,linguisticReview:'Agent translations and source spot checks; no independent native editor review.'},null,2)+'\n');console.log(JSON.stringify(reports,null,2));
