import * as T from '../vendor/three.module.min.js';
import {createCameraFlow} from './camera-flow.js';

/** One owner of the rendered camera. A new shot retargets the moving rig;
 * neither passage selection nor reduced motion can reset its transform. */
export function createCameraRig(camera){
  const flow=createCameraFlow(),matrix=new T.Matrix4(),rotation=new T.Quaternion();
  let initialized=false;
  function capture(position,aim){
    const frame=flow.reset(position,aim);camera.position.copy(frame.position);camera.lookAt(frame.aim);initialized=true;return frame;
  }
  function follow(position,aim,dt,{hold=false}={}){
    if(!initialized)return capture(position,aim);
    const seconds=Number.isFinite(dt)?Math.max(0,Math.min(dt,1/15)):0;
    const frame=flow.follow(position,aim,hold?0:seconds);
    if(hold)return frame;
    camera.position.copy(frame.position);camera.position.y=Math.max(.9,camera.position.y);
    matrix.lookAt(camera.position,frame.aim,camera.up);rotation.setFromRotationMatrix(matrix);
    camera.quaternion.rotateTowards(rotation,seconds*.35);
    return frame;
  }
  return {follow,capture,reinitialize(){initialized=false;},get settling(){return flow.settling;}};
}
