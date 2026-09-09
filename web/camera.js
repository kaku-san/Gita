import * as T from './vendor/three.module.min.js';

/** Portrait keeps the near witness and the revealed form in the same narrow
 * composition. Retreat alone would push Arjun out of the side of the frame. */
export function cameraPositionFor(state,aspect,target=new T.Vector3()){
  const aim=new T.Vector3(...state.aim);target.set(...state.camera);
  if(aspect<.8){
    const vision=T.MathUtils.clamp(state.vision/.45,0,1);
    target.x*=T.MathUtils.lerp(1,.30,vision);
    target.sub(aim).multiplyScalar(T.MathUtils.lerp(1.65,1.14,state.vision)).add(aim);
  }
  return target;
}
