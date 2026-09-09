import * as T from '../vendor/three.module.min.js';

export const creditDurations=[8,9,8,4.5,6];
export const creditPhases=['faceoff','arjuna','krishna','title','arrival'];

/** A film timeline, separate from reading pace and narration. */
export function createCreditsClock({onEnd=()=>{}}={}){
  let duration=8,elapsed=0,playing=false,ended=false,rate=1;
  return {
    set(index,{seconds=0}={}){duration=Math.max(creditDurations[index]||5.5,Number(seconds)||0);elapsed=0;ended=false;rate=1;},
    play(){if(ended){elapsed=0;ended=false;}playing=true;},pause(){playing=false;},
    update(dt,blocked=false){if(playing&&!blocked&&!ended){elapsed=Math.min(duration,elapsed+Math.max(0,Math.min(Number(dt)||0,.1))*rate);if(elapsed>=duration){ended=true;playing=false;onEnd();}}return elapsed/duration;},
    requestEnd(){rate=Math.max(1,(duration-elapsed)/1.5);playing=true;},
    get playing(){return playing;},get progress(){return elapsed/duration;},get duration(){return duration;}
  };
}

/** Two live views of opposing fighters from the existing battlefield. No
 * photographs, generated art, textures, cloned characters or new models. */
export function createFaceoffCameras(pair){
  const cameras=[new T.PerspectiveCamera(34,1,.1,4000),new T.PerspectiveCamera(34,1,.1,4000)];
  const root=new T.Vector3(),forward=new T.Vector3(),right=new T.Vector3(),target=new T.Vector3(),aims=[new T.Vector3(),new T.Vector3()];
  function update(width,height,progress=0,reduced=false){
    const portrait=height>width,expand=reduced?0:T.MathUtils.smoothstep(progress,.82,1),fraction=.5+.5*expand;
    const panes=portrait?
      [{x:0,y:height*(1-fraction),w:width,h:height*fraction},{x:0,y:0,w:width,h:Math.max(1,height*(1-fraction))}]:
      [{x:0,y:0,w:width*fraction,h:height},{x:width*fraction,y:0,w:Math.max(1,width*(1-fraction)),h:height}];
    for(let side=0;side<2;side++){
      const camera=cameras[side],pane=panes[side],yaw=pair.yaw+side*Math.PI;
      root.set(...pair.roots[side]);forward.set(Math.sin(yaw),0,Math.cos(yaw));right.set(Math.cos(yaw),0,-Math.sin(yaw));
      const t=reduced?.5:T.MathUtils.smoothstep(progress,0,1);
      // Approach from outside the duel; the other fighter cannot block this face.
      const distance=T.MathUtils.lerp(3.1,2.35,t),lateral=(side?1:-1)*T.MathUtils.lerp(2.1,1.7,t);
      camera.position.copy(root).addScaledVector(forward,distance).addScaledVector(right,lateral);camera.position.y+=2.05;
      target.copy(root);target.y+=1.36;
      camera.aspect=pane.w/pane.h;camera.fov=T.MathUtils.lerp(portrait?32:38,T.MathUtils.lerp(57,46,T.MathUtils.smoothstep(width/height,.65,1.08)),expand);camera.updateProjectionMatrix();camera.lookAt(target);camera.updateMatrixWorld(true);aims[side].copy(target);
    }
    return {cameras,panes,aims};
  }
  return {cameras,update};
}
