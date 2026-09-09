import assert from 'node:assert/strict';
import {createNarrator} from '../web/narrative/audio-player.js';
import {chapterTimeline,locateChapterTime,locateSkip,playbackSpeeds} from '../web/experience/podcast.js';
import {createPreparation,preparationCopy,createAudioCache} from '../web/experience/preparation.js';
import {createCreditsClock} from '../web/experience/opening-credits.js';

const entries=[{id:'a',chapter:1},{id:'b',chapter:1},{id:'c',chapter:1},{id:'d',chapter:2}];
const records={a:{duration:10},b:{duration:20},c:{duration:30},d:{duration:40}};
const chapter=chapterTimeline(entries,1,records);
assert.equal(chapter.duration,60);assert.equal(chapter.current.start,10);assert(chapter.complete);
assert.deepEqual(locateChapterTime(chapter,27),{index:1,time:17});
assert.deepEqual(locateChapterTime(chapter,32),{index:2,time:2});
assert.deepEqual(locateChapterTime(chapter,-15),{index:0,time:0});
assert.equal(locateChapterTime(chapter,100).index,2,'Scrubbing never invents the next chapter');
assert.equal(chapterTimeline(entries,0,{a:records.a}).complete,false,'Partial manifests cannot advertise a complete chapter timeline');
assert.deepEqual(locateSkip(entries,2,28,15,records),{index:3,time:13},'15-second skip carries across chapters');
assert.deepEqual(locateSkip(entries,1,2,-15,records),{index:0,time:0},'Rewind clamps at the book start');
assert.deepEqual(playbackSpeeds,[.5,.75,1,1.25,1.5,1.75,2]);
class FakeAudio extends EventTarget{
 currentTime=0;duration=NaN;ended=false;paused=true;muted=false;playbackRate=1;
 load(){this.currentTime=0;this.duration=NaN;this.ended=false;}
 removeAttribute(){} async play(){this.paused=false;}pause(){this.paused=true;this.dispatchEvent(new Event('pause'));}
 emit(type){this.dispatchEvent(new Event(type));}
}
const a=new FakeAudio();let completions=0,state;
const narrator=createNarrator({createAudio:()=>a,onEnd:()=>completions++,onState:s=>state=s});
narrator.setRate(1.75);narrator.setTrack('one',{startTime:7});assert.equal(a.playbackRate,1.75);assert(a.preservesPitch);
a.duration=20;a.emit('loadedmetadata');assert.equal(a.currentTime,7,'Resume seeks when metadata is available');
await narrator.prime();assert.equal(completions,0);assert.equal(a.muted,false);assert(a.paused,'Gesture priming is silent and leaves the passage paused');
narrator.setTrack('two');narrator.seekSeconds(9);a.duration=15;a.emit('loadedmetadata');assert.equal(a.currentTime,9,'Cross-passage seek survives source loading');
await narrator.play();narrator.pause();a.ended=true;a.emit('ended');assert.equal(completions,0);
await narrator.play();a.ended=true;a.emit('ended');a.emit('ended');assert.equal(completions,1);
narrator.dispose();a.emit('ended');assert.equal(completions,1);

const props=['document','requestAnimationFrame','fetch','location'];const previous=Object.fromEntries(props.map(k=>[k,globalThis[k]]));
class Element{
 hidden=false;inert=false;attributes={};textContent='';focused=false;
 setAttribute(k,v){this.attributes[k]=v;}focus(){this.focused=true;}
}
const label=new Element(),progress=new Element(),actions=new Element(),retry=new Element(),back=new Element(),root=new Element(),intro=new Element(),content=new Element();root.hidden=true;
root.querySelector=s=>({'[role=status]':label,progress,nav:actions,'[data-retry]':retry,'[data-back]':back}[s]);
const classes=new Set();globalThis.document={body:{classList:{add:x=>classes.add(x),remove:x=>classes.delete(x)}}};globalThis.requestAnimationFrame=f=>queueMicrotask(f);
let starts=0,cancels=0,complete;const deferred=()=>new Promise(r=>complete=r);
try{
 const gate=createPreparation({root,intro,content,locale:()=> 'hi',onReady:()=>starts++,onCancel:()=>cancels++});
 const preparation=deferred();const run=gate.run(()=>preparation);
 await Promise.resolve();await Promise.resolve();assert.equal(starts,0);assert.equal(root.hidden,false);assert(intro.inert&&content.inert);assert(classes.has('is-loading'));assert.equal(label.textContent,preparationCopy.hi.loading);
 const duplicate=gate.run(()=>{throw Error('Duplicate first-click work');});await duplicate;complete();await run;assert.equal(starts,1);assert(root.hidden);assert(!classes.has('is-loading'));
 const outstanding=deferred();const canceled=gate.run(()=>outstanding);await Promise.resolve();await Promise.resolve();gate.cancel();complete();await canceled;assert.equal(starts,1,'Cancelled loading cannot reveal the scene later');assert.equal(cancels,1);
 await gate.run(()=>Promise.reject(Error('Missing scene')));assert.equal(starts,1);assert.equal(actions.hidden,false);assert.equal(progress.hidden,true);assert.equal(root.attributes['aria-busy'],'false');assert(retry.focused);gate.cancel();
 globalThis.location=new URL('https://example.test/');let fetches=0;globalThis.fetch=async()=>{fetches++;return {ok:true,blob:async()=>new Blob(['real audio bytes'])};};
 const cache=createAudioCache({maxBytes:24});const [one,two]=await Promise.all([cache.load('/one.mp3'),cache.load('/one.mp3')]);assert.equal(one,two);assert.equal(fetches,1,'Coalesce in-flight preload requests');await cache.load('/two.mp3');cache.retain(['/two.mp3']);assert.equal(cache.get('/one.mp3'),null);assert(cache.get('/two.mp3'));await assert.rejects(()=>cache.load('https://outside.test/file.mp3'),/locally/);cache.dispose();
 const clock=createCreditsClock();clock.set(0,{seconds:14});assert.equal(clock.duration,14);clock.play();for(let i=0;i<100;i++)clock.update(.1);assert(clock.playing,'Longer opening narration cannot be cut by the old eight-second film');clock.pause();const held=clock.progress;clock.update(.1);assert.equal(clock.progress,held);
 console.log(JSON.stringify({passed:true,checks:['chapter seeking and skip boundaries','speed and preserved pitch','saved position after metadata','silent gesture priming','no stale or duplicate completion','loader covers asynchronous work','double click coalescing','cancellation and errors','bounded compressed audio cache','opening duration follows recording'],browserQA:'not performed'},null,2));
}finally{Object.assign(globalThis,previous);}
