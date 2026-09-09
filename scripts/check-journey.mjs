import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {story} from '../web/narrative/story.js';
import {entries,createJourney,cueFor,contentFor,hashFor,indexFromHash,xiCues,bowIsLowered} from '../web/narrative/journey.js';
import {passages} from '../web/story.js';
import {createNarrator} from '../web/narrative/audio-player.js';
import {cameraForViewport} from '../web/narrative/framing.js';
import * as T from '../web/vendor/three.module.min.js';
assert.equal(story.chapters.length,18);assert.equal(story.chapters.flatMap(c=>c.scenes).length,72);assert.equal(entries.length,188);assert.equal(new Set(entries.map(e=>e.id)).size,188);
const journey=createJourney();
for(let i=0;i<entries.length;i++){
  assert.equal(indexFromHash(hashFor(i)),i);assert(contentFor(entries[i]).beat.text.length>0);
  journey.go(i);const snapshot=structuredClone(journey.state);journey.update(.05,{paused:true});assert.deepEqual(journey.state,snapshot);
  journey.update(.01,{reduced:true});for(const k of ['vision','reveal','dread','gentle','scale','camera','aim','position'])for(const [n,value] of [journey.state[k]].flat().entries())assert(Math.abs(value-[cueFor(i)[k]].flat()[n])<1e-9);
  journey.update(100);assert.equal(journey.index,i,'Reading never auto advances');
}
for(let i=1;i<=10;i++){const at=indexFromHash('#passage-'+i);assert.equal(entries[at].chapter,11);assert.equal(cueFor(at),passages[i-1]);}
const xiEntries=entries.map((e,i)=>[e,i]).filter(([e])=>e.chapter===11);assert.equal(xiEntries.length,14);assert.deepEqual([...new Set(xiCues)],[0,1,2,3,4,5,6,7,8,9]);
assert.equal(cueFor(xiEntries.at(-1)[1]+1).vision,0);assert.equal(cueFor(xiEntries.at(-1)[1]+1).reveal,0);
journey.go(entries.length+1);assert.equal(journey.index,187);journey.go(-3);assert.equal(journey.index,0);
for(const e of entries)assert.equal(bowIsLowered(e),e.chapter===1?e.scene>=3:e.chapter>1&&!(e.chapter===18&&e.scene===3&&e.beat>=3));
for(const hash of ['','#passage-0','#passage-11','#chapter-19/1/1','#chapter-11/8/1','#chapter-1/1/99'])assert.equal(indexFromHash(hash),null);
journey.go(40);journey.update(.05);const moving=structuredClone(journey.state);journey.go(120);assert.deepEqual(journey.state,moving,'Interrupted transition begins at current position');
const framing=[];
for(const [label,width,height] of [['phone reading',390,450],['phone listening',390,844],['small phone reading',320,320],['landscape reading',481,336],['desktop reading',1050,824],['desktop listening',1440,900]]){
  let maxX=0,minY=1,maxY=-1;
  for(let i=0;i<entries.length;i++){
    const state=cueFor(i),aspect=width/height,camera=new T.PerspectiveCamera(aspect<.8?57:46,aspect,.18,4000);
    cameraForViewport(state,aspect,camera.position);camera.lookAt(new T.Vector3(...state.aim));camera.updateMatrixWorld(true);
    const arjun=new T.Vector3(0,4.4,-1.47).project(camera);
    assert(Math.abs(arjun.x)<.88&&arjun.y>-.78&&arjun.y<.8,`${label}: Arjun out of frame at ${entries[i].id}`);
    maxX=Math.max(maxX,Math.abs(arjun.x));minY=Math.min(minY,arjun.y);maxY=Math.max(maxY,arjun.y);
  }
  framing.push({label,maxX,minY,maxY});
}
class FakeAudio extends EventTarget{
  constructor(){super();this.currentTime=0;this.duration=12;this.ended=false;this.playCount=0;this.paused=true;this.failure=null;this.pending=null;}
  load(){this.currentTime=0;this.ended=false;}
  removeAttribute(){}
  play(){this.playCount++;if(this.failure)return Promise.reject(this.failure);this.paused=false;return this.pending||Promise.resolve();}
  pause(){this.paused=true;this.dispatchEvent(new Event('pause'));}
  emit(type){this.dispatchEvent(new Event(type));}
}
let created=0,ended=0,state;
const audio=new FakeAudio(),player=createNarrator({createAudio:()=>{created++;return audio;},onEnd:()=>ended++,onState:s=>state=s});
assert.equal(await player.play(),false);player.setTrack('/audio/en/0.0.1.mp3');assert.equal(audio.playCount,0,'No autoplay on load');
audio.emit('loadedmetadata');assert.equal(state.status,'ready');await player.play();assert.equal(state.status,'playing');
player.pause();audio.ended=true;audio.emit('ended');assert.equal(ended,0,'A paused or canceled passage cannot advance');
await player.play();audio.ended=true;audio.emit('ended');audio.emit('ended');assert.equal(ended,1,'End advances exactly once');
player.setTrack('/audio/en/0.0.2.mp3');assert.equal(created,1,'Reuse the user-authorized audio element across clips');
audio.emit('ended');assert.equal(ended,1,'A stale ended event cannot advance a new track');
player.setRate(1.3);assert.equal(audio.playbackRate,1.3);player.seek(.5);assert.equal(audio.currentTime,6);
audio.failure={name:'NotAllowedError'};assert.equal(await player.play(),false);assert.equal(state.status,'blocked');audio.failure=null;
let resolve;audio.pending=new Promise(r=>resolve=r);const pending=player.play();player.pause();resolve();await pending;assert.equal(state.status,'paused');assert.equal(audio.paused,true,'Late play completion respects pause');audio.pending=null;
await player.play();audio.emit('error');assert.equal(state.status,'error');assert.equal(ended,1,'Audio errors never skip text');
player.setTrack(null);assert.equal(state.status,'missing');assert.equal(player.available,false);assert.equal(await player.play(),false);player.dispose();
const html=await readFile(new URL('../web/index.html',import.meta.url),'utf8');const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size,'Unique UI IDs');
const app=await readFile(new URL('../web/app.js',import.meta.url),'utf8');for(const [,id] of app.matchAll(/\$\('#([a-z-]+)'\)/g))assert([...ids,'mode-toggle','player-details','player-details-toggle','podcast-heading','podcast-speaker','podcast-speed','audio-rewind','audio-forward'].includes(id),'Missing element '+id);
assert(!app.includes('speechSynthesis'),'No substitute device narration');
const css=await readFile(new URL('../web/style.css',import.meta.url),'utf8');assert(css.includes('100dvh')&&css.includes('safe-area-inset-bottom')&&css.includes('overflow:auto'));
const report={passed:true,chapters:18,scenes:72,passages:188,legacyLinks:10,framing,recordedAudio:['user-initiated playback','one reusable audio element','completion-driven progression','no stale or duplicate advance','pause during pending play','missing files and blocked playback','seek and speed'],browserQA:'not performed'};
await writeFile(new URL('./journey-validation.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
