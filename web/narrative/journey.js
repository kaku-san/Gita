import {story} from './story.js';
import {passages,interpolate,clamp01} from '../story.js';
export const originalEntries=[];
for(let b=0;b<story.prologue.length;b++)originalEntries.push({id:`0.0.${b+1}`,chapter:0,scene:0,beat:b,...story.prologue[b]});
for(const chapter of story.chapters)for(let s=0;s<chapter.scenes.length;s++)for(let b=0;b<chapter.scenes[s].beats.length;b++)originalEntries.push({id:`${chapter.n}.${s+1}.${b+1}`,chapter:chapter.n,scene:s,beat:b,...chapter.scenes[s].beats[b]});
// The experience begins with Arjun and ends with his decision. Keep original
// verse/audio IDs and the unabridged source data stable for existing recordings.
export const entries=originalEntries.filter(e=>e.chapter>0&&e.id!=='1.1.1'&&e.id!=='18.4.5');
export function savedIndex(saved={}){
  const id=saved.passageId||originalEntries[saved.index]?.id;
  return Math.max(0,entries.findIndex(e=>e.id===id));
}
export const xiCues=[0,0,1,2,3,4,4,5,5,6,6,7,8,9];
const xiStart=entries.findIndex(e=>e.chapter===11);
export function indexFromHash(hash){
  const old=/^#passage-(\d+)$/.exec(hash);
  if(old){const cue=Number(old[1])-1;return cue>=0&&cue<10?xiStart+xiCues.indexOf(cue):null;}
  const m=/^#(?:chapter-)?(\d+)[/.](\d+)[/.](\d+)$/.exec(hash);
  if(!m)return null;
  const id=m.slice(1).map(Number).join('.');const i=entries.findIndex(e=>e.id===id);
  if(i>=0)return i;if(id.startsWith('0.0.')||id==='1.1.1')return 0;if(id==='18.4.5')return entries.length-1;return null;
}
export const hashFor=index=>'#chapter-'+entries[index].id.replaceAll('.','/');
export function contentFor(entry,localized=story){
  const chapter=entry.chapter?localized.chapters[entry.chapter-1]:null;
  const scene=chapter?.scenes[entry.scene];
  return {chapter,scene,beat:scene?scene.beats[entry.beat]:localized.prologue[entry.beat]};
}
export function cueFor(index){
  const e=entries[index];
  if(e.chapter===11)return passages[xiCues[index-xiStart]];
  const base={...passages[0],duration:3.8};
  if(e.chapter===0)return {...base,camera:[18,10,25],aim:[0,2.8,3]};
  if(e.chapter===1&&e.scene===0)return {...base,camera:[14,7.8,18],aim:[0,2.8,2.5]};
  if(e.chapter===18&&e.scene===3&&e.beat>=3)return {...base,camera:[11,6.4,13],aim:[0,3,1.8],duration:5};
  // Each chapter has a deliberate composition. Individual replies share a
  // scene, rather than alternating camera angles with every speaker.
  const chapters=[[14,7,13],[11,5.5,4],[16,6.5,10],[12,5.2,-3],[13,5.3,1],[11,5.2,-5],
    [14,6,6],[15,6.4,9],[16,6.7,4],[17,7,11],[11,6.4,13],[10,5.2,4],
    [14,6,-5],[17,6.4,3],[15,6.6,10],[12,5.4,2],[14,6.2,-3],[14,7,12]];
  const camera=chapters[e.chapter-1].slice(),arc=(e.scene-1.5)*.045;
  const x=camera[0],z=camera[2];camera[0]=x*Math.cos(arc)+z*Math.sin(arc);camera[2]=z*Math.cos(arc)-x*Math.sin(arc);
  return {...base,camera,aim:[0,3.25,.4],duration:8};
}
export function bowIsLowered(e){return e.chapter>1&&!(e.chapter===18&&e.scene===3&&e.beat>=3)||e.chapter===1&&e.scene>=3;}
export function createJourney({initial=0}={}){
  let index=Math.max(0,Math.min(entries.length-1,Math.floor(Number(initial)||0))),target=cueFor(index),state=interpolate(target,target,1),from=state,progress=1;
  function go(value,{immediate=false}={}){
    if(!Number.isFinite(value))return state;
    index=Math.max(0,Math.min(entries.length-1,Math.floor(value)));
    from=structuredClone(state);target=cueFor(index);progress=immediate?1:0;state=interpolate(from,target,progress);return state;
  }
  function update(dt,{paused=false,reduced=false}={}){
    if(reduced)progress=1;
    else if(!paused)progress=clamp01(progress+Math.max(0,Math.min(Number.isFinite(dt)?dt:0,.1))/Math.max(entries[index].chapter===11?8:6.5,target.duration||0));
    state=interpolate(from,target,progress);return state;
  }
  return {go,update,get state(){return state;},get target(){return target;},get index(){return index;},get entry(){return entries[index];},get moving(){return progress<1;},get progress(){return progress;}};
}
