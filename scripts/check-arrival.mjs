import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../web/experience/arrival.js',import.meta.url),'utf8');
const {createArrival,setPlaybackButton,wordmarks}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject};};
let sharedCalls=0,languageCalls=0;const common=deferred(),hindi=deferred(),french=deferred();
const arrival=createArrival(()=>{sharedCalls++;return common.promise;});
await Promise.resolve();assert.equal(sharedCalls,1,'Shared assets must load without a click');
const hi=arrival.prepare('hi:1',()=>{languageCalls++;return hindi.promise;});
assert.equal(arrival.prepare('hi:1',()=>assert.fail('Duplicate preparation')),hi);
const fr=arrival.prepare('fr:1',()=>french.promise);
hindi.resolve();await Promise.resolve();assert.equal(arrival.isReady('hi:1'),false,'A language alone cannot release the scene');
common.resolve();await hi;assert.equal(arrival.isReady('hi:1'),true);assert.equal(arrival.isReady('fr:1'),false,'Old language cannot release a new selection');
french.resolve();await fr;assert.equal(arrival.isReady('fr:1'),true);assert.equal(languageCalls,1);
await assert.rejects(arrival.prepare('ja:1',()=>Promise.reject(Error('offline'))));
assert.equal(arrival.isReady('ja:1'),false);await arrival.prepare('ja:1',()=>Promise.resolve());assert.equal(arrival.isReady('ja:1'),true);
class Element{constructor(){this.attributes=new Map();this.dataset={};}toggleAttribute(k,on){if(on)this.attributes.set(k,'');else this.attributes.delete(k);}setAttribute(k,v){this.attributes.set(k,v);}set hidden(value){assert.fail('SVG visibility must use an attribute');}}
const button=new Element(),play=new Element(),pause=new Element();
for(const playing of [false,true,false,true]){const label=playing?'Pause':'Play';setPlaybackButton(button,play,pause,playing,label);assert.equal(play.attributes.has('hidden'),playing);assert.equal(pause.attributes.has('hidden'),!playing);assert.equal(button.attributes.get('aria-label'),label);assert.equal(button.title,label);}
assert.deepEqual(Object.keys(wordmarks),['en','hi','ja','zh-Hans','fr']);assert.equal(wordmarks.en,'GITA');
const app=await readFile(new URL('../web/app.js',import.meta.url),'utf8'),html=await readFile(new URL('../web/index.html',import.meta.url),'utf8'),ui=await readFile(new URL('../web/experience/interface.js',import.meta.url),'utf8');
assert.match(app,/arrival=createArrival\(\(\)=>Promise\.all\(\[ensureWorld\(\)/);
assert.doesNotMatch(app,/initialLanguageReady|setLanguage\(saved.locale\)/);
assert.doesNotMatch(app,/\$\('#(?:play|pause|read-play|read-pause|opening-play|opening-pause)-icon'\)\.hidden/);
assert.match(ui,/svg\(reading\?'listen':'read'\).*reading\?u.listen:u.read/);
assert.match(html,/<section id="language-gate" lang="en"/);assert.match(html,/<section id="intro" hidden inert/);
for(const lang of Object.keys(wordmarks))assert.ok(html.includes(`data-start-language="${lang}"`));
assert.equal((html.match(/data-project-credits/g)||[]).length,3);
console.log('Arrival starts without interaction; language races, retry, SVG playback states, language gate and destination labels passed.');
// Arrival fetches the field recordings once, without constructing an AudioContext.
const nativeFetch=globalThis.fetch;let calls=0;
globalThis.location={href:'https://gita.test/',origin:'https://gita.test'};
globalThis.fetch=async url=>{calls++;return String(url).includes('battlefield.json')?{ok:true,json:async()=>({layers:[{src:'./audio/field/test.mp3'}]})}:{ok:true,arrayBuffer:async()=>new Uint8Array([1,2,3]).buffer};};
try{const field=await import(new URL('../web/experience/field-recordings.js',import.meta.url));await Promise.all([field.preloadFieldRecordings(),field.preloadFieldRecordings()]);assert.equal(calls,2,'Manifest and recording must each load only once');}finally{globalThis.fetch=nativeFetch;}
console.log('Battlefield prefetch reuses compressed bytes and needs no audio gesture.');
