import assert from 'node:assert/strict';
import {readFile,stat,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),json=async p=>JSON.parse(await readFile(new URL(p,root)));
const manifest=await json('web/narrative/audio.json'),script=await json('production/narration/release-script.json'),cast=await json('production/narration/cast.json');
assert.equal(manifest.status,'complete');assert.equal(cast.languages.hi.voices.Krishna.approved_preview_id,'hRHid0k1FJN4S80Kbs5m');assert(cast.languages.hi.voices.Krishna.approved);
let total=0,bytes=0;
for(const [locale,rows] of Object.entries(script.languages)){
 assert.equal(Object.keys(manifest.languages[locale]).length,188);assert.equal(Object.keys(manifest.openings[locale]).length,5);assert.equal(Object.keys(cast.languages[locale].voices).length,3);
 for(const row of rows){
  const record=(row.id.startsWith('opening.')?manifest.openings:manifest.languages)[locale][row.id];assert(record,row.id);
  assert.equal(createHash('sha256').update(row.text).digest('hex'),record.textSha256);assert.equal(record.voice_id,cast.languages[locale].voices[row.speakerKey].voice_id);assert(record.duration>.25&&record.duration<180);
  assert(record.src.startsWith('./audio/'+locale+'/'));const file=await stat(new URL('web/'+record.src.slice(2),root));assert(file.isFile()&&file.size>128);bytes+=file.size;total++;
 }
}
assert.equal(total,965);
const html=await readFile(new URL('web/index.html',root),'utf8');
for(const [,path] of html.matchAll(/(?:src|href)="(\.\/[^"?#]+)(?:\?[^"#]*)?"/g))assert((await stat(new URL('web/'+path.slice(2),root))).isFile(),path);
const app=await readFile(new URL('web/app.js',root),'utf8');
assert(app.includes("arrival=createArrival(()=>Promise.all([ensureWorld(),manifestReady,import('./narrative/sanskrit.js'),preloadFieldRecordings().catch(()=>{})]))"));
assert(app.includes('await manifestReady;await Promise.all([fonts,preloadChapter({opening:true,language:selectedLocale,chapter:selectedChapter})])'));
assert(html.includes('id="language-gate"'));assert(html.includes('is-loading #experience-ui'));assert(!app.includes('speechSynthesis'));
async function scan(dir){for(const file of await readdir(new URL(dir,root),{withFileTypes:true})){const path=dir+'/'+file.name;assert(!file.name.startsWith('.env'),'No credential files in public assets');if(file.isDirectory())await scan(path);else if(/\.(js|json|html|css)$/.test(file.name))assert(!/sk_[0-9a-f]{32,}/i.test(await readFile(new URL(path,root),'utf8')),'Secret-like key in public assets');}}
await scan('web');console.log(JSON.stringify({passed:true,languages:5,voices:15,storyClips:940,openingClips:25,audioBytes:bytes,apiKeyInWebsite:false},null,2));
