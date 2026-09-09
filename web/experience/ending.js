import * as T from '../vendor/three.module.min.js';
export const ENDING_SECONDS=21;
const smooth=(a,b,v)=>T.MathUtils.smoothstep(v,a,b);

/** Explicit completion state. Reading/audio events trigger begin; visiting the
 * final passage alone never completes the experience. */
export function createEndingTimeline({onComplete=()=>{}}={}){
  let state='idle',elapsed=0,playing=false;
  function complete(){if(state!=='film')return;elapsed=ENDING_SECONDS;playing=false;state='screen';onComplete();}
  return {
    begin(){if(state!=='idle')return false;state='film';elapsed=0;playing=true;return true;},
    update(dt,blocked=false){if(state==='film'&&playing&&!blocked){elapsed=Math.min(ENDING_SECONDS,elapsed+Math.max(0,Math.min(Number(dt)||0,.1)));if(elapsed>=ENDING_SECONDS)complete();}return this.frame;},
    pause(){playing=false;},play(){if(state==='film')playing=true;},complete,
    stay(){if(state==='screen')state='field';},reopen(){if(state==='field')state='screen';},
    cancel(){state='idle';elapsed=0;playing=false;},
    get active(){return state!=='idle';},get playing(){return playing;},get field(){return state==='field';},get done(){return state==='screen'||state==='field';},get state(){return state;},
    get frame(){return {elapsed,playing,field:state==='field',done:state==='screen'||state==='field',title:smooth(15,20,elapsed),sound:smooth(3,19,elapsed),words:1-smooth(1,4,elapsed)};}
  };
}

/** Retarget the existing camera rig; this function never writes its transform.
 * The opening view is retained at time zero, including free exploration. */
export function endingCameraTarget(elapsed,aspect,startPoint,startAim,hand,point,aim){
  const reach=aspect<.8?1.2:1,close=hand.clone().add(new T.Vector3(4.6*reach,1.2,5.2*reach));
  const closeAim=hand.clone();closeAim.y+=.25;
  if(elapsed<4){const t=smooth(0,4,elapsed);point.copy(startPoint).lerp(close,t);aim.copy(startAim).lerp(closeAim,t);}
  else{
    const t=smooth(4,19,elapsed),wide=new T.Vector3(aspect<.8?26:32,aspect<.8?20:17,aspect<.8?59:48);
    point.copy(close).lerp(wide,t);aim.copy(closeAim).lerp(new T.Vector3(0,3,5),t);
  }
  return {point,aim};
}
