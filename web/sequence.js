import {passages,interpolate,clamp01} from './story.js';

/** Reusable Chapter XI director. No DOM, renderer, wall clock or hidden timers.
 * A user advances each passage; update only settles the requested transition.
 */
export function createSequence({initial=0}={}){
  let index=Math.max(0,Math.min(passages.length-1,Math.floor(Number(initial)||0)));
  let state=interpolate(passages[index],passages[index],1),from=state,target=passages[index],progress=1,duration=0;
  function go(value,{immediate=false}={}){
    if(!Number.isFinite(value))return;
    index=Math.max(0,Math.min(passages.length-1,Math.floor(value)));
    from=structuredClone(state);target=passages[index];duration=target.duration||3;
    progress=immediate?1:0;state=interpolate(from,target,progress);return state;
  }
  function update(dt,{paused=false,reduced=false}={}){
    if(reduced)progress=1;
    else if(!paused&&progress<1)progress=clamp01(progress+Math.max(0,Math.min(Number.isFinite(dt)?dt:0,.1))/duration);
    state=interpolate(from,target,progress);return state;
  }
  return{go,update,get index(){return index;},get state(){return state;},get passage(){return passages[index];},get moving(){return progress<1;},get progress(){return progress;}};
}
