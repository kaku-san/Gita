import * as T from './vendor/three.module.min.js';
import {createKrishna} from './elements/krishna/character.js';
import {createArjun} from './elements/arjun/character.js';
import {createChariot} from './elements/chariot/chariot.js';
import {createHorseTeam} from './elements/team/team.js';
import {V,mesh,band,mergeStatic} from './elements/team/geometry.js';

export const TEAM_FORWARD=8.25;

/** The saved elements, composed at their original scale. +Z is forward. */
export async function createAssembly({onProgress=()=>{}}={}){
  const root=new T.Group();root.name='Geeta · Rath assembly';
  const yieldPaint=async()=>{if(typeof requestAnimationFrame==='function')await new Promise(requestAnimationFrame);};
  onProgress('Preparing the chariot…');await yieldPaint();
  const chariot=createChariot();root.add(chariot.root);
  onProgress('Preparing Krishna…');await yieldPaint();
  const krishna=await createKrishna();chariot.mounts.krishna.add(krishna.root);
  onProgress('Preparing Arjun…');await yieldPaint();
  const arjun=await createArjun();chariot.mounts.arjun.add(arjun.root);
  // Their authored seats stay with the figures, on the rath's matching supports.
  chariot.seats.krishna.visible=false;chariot.seats.arjun.visible=false;
  // The provisional yoke is superseded by the approved team harness.
  chariot.yoke.visible=false;
  const team=await createHorseTeam({onProgress:(n,total)=>onProgress(`Preparing the horses · ${n} of ${total}`)});
  team.root.position.z=TEAM_FORWARD;root.add(team.root);

  // A pinned clevis bridges the two approved heights without moving the horses
  // off the ground. The pin passes through the team's horizontal towing eye.
  const coupling=new T.Group();coupling.name='Draw-pole coupling';root.add(coupling);
  const metal=chariot.materials.bronze;
  const pin=mesh(new T.CylinderGeometry(.035,.035,.38,24),metal,coupling);pin.position.set(0,1.28,4.94);
  for(const y of [1.16,1.445]){
    const plate=mesh(new T.CylinderGeometry(.13,.13,.035,32),metal,coupling);plate.position.set(0,y,4.94);
    band(coupling,chariot.materials.darkGold,V(0,y+.020,4.94),V(0,1,0),.074,.005);
  }
  mergeStatic(coupling);
  const reinHand=new T.Object3D();reinHand.name='Krishna · resting rein hand';
  // Resting left palm: the speaking right hand remains free.
  reinHand.position.set(.41,1.115,.58);krishna.root.add(reinHand);
  root.updateMatrixWorld(true);const handWorld=V();
  team.setDriverAnchor(reinHand.getWorldPosition(handWorld));
  const lastHandWorld=handWorld.clone();

  // Bring the oldest element's small procedural textures onto the same filtered
  // sampling as the later studies; their pixels and sculpture are unchanged.
  krishna.root.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){
    for(const name of ['map','bumpMap','normalMap','roughnessMap'])if(m[name]){
      m[name].generateMipmaps=true;m[name].minFilter=T.LinearMipmapLinearFilter;m[name].magFilter=T.LinearFilter;m[name].anisotropy=4;m[name].needsUpdate=true;
    }
  }});
  let moment=false;
  function update(time,dt,animated=true){
    if(!animated)return;
    krishna.update(time,dt,true);arjun.update(time,dt,true);chariot.update(time,dt,true);
    root.updateWorldMatrix(true,true);
    // This position remains correct if a future scene moves the complete rath.
    reinHand.getWorldPosition(handWorld);
    if(handWorld.distanceToSquared(lastHandWorld)>1e-14){team.setDriverAnchor(handWorld);lastHandWorld.copy(handWorld);}
    team.update(time,dt,true);
  }
  function setMoment(value){moment=!!value;arjun.setBowDown(moment);krishna.setGesture(moment);}
  update(0,1/60,true);
  return {root,krishna,arjun,chariot,team,coupling,anchors:{reinHand,tow:team.anchors.tow},
    setMoment,getPose:()=>({moment,arjun:arjun.getPose()}),
    setDeckView(value){chariot.canopy.visible=!value;},update};
}
