import * as T from '../vendor/three.module.min.js';
import {cameraPositionFor} from '../camera.js';
const portrait=new T.Vector3();
/** Reading panes produce intermediate aspect ratios. Ease toward the approved
 * portrait composition so the near witness stays visible beside the vision. */
export function cameraForViewport(state,aspect,target=new T.Vector3()){
  cameraPositionFor(state,aspect,target);
  if(aspect>=.8&&aspect<1.55){
    cameraPositionFor(state,.79,portrait);
    target.lerp(portrait,T.MathUtils.smoothstep((1.55-aspect)/.75,0,1));
  }
  return target;
}
