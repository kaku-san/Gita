// Numeric integration checks; no browser, rendering or DOM inspection.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import * as T from '../web/vendor/three.module.min.js';
import {createExploration,configureReadingFrustum,bindExploration} from '../web/experience/exploration.js';
import {daylightFor,sampleDaylight,prayerFor} from '../web/experience/daylight.js';
import {experienceCopy} from '../web/narrative/experience-copy.js';
import {entries,cueFor,contentFor} from '../web/narrative/journey.js';
import {cameraForViewport} from '../web/narrative/framing.js';
import verses from '../web/narrative/sanskrit.js';
import {createAssembly} from '../web/assembly.js';
import {createPrayerPose} from '../web/prayer-pose.js';
import {createRathMotion} from '../web/rath-motion.js';

function strings(o,p=''){return Object.entries(o).flatMap(([k,v])=>typeof v==='object'?strings(v,p+'.'+k):[[p+'.'+k,v]]);}
const keys=strings(experienceCopy.en).map(([k])=>k);
for(const [lang,copy] of Object.entries(experienceCopy)){assert.deepEqual(strings(copy).map(([k])=>k),keys);for(const [key,value] of strings(copy))assert(typeof value==='string'&&value.trim().length,lang+key);for(const e of entries)assert(copy.voices[e.speaker]);}
for(const e of entries){const c=contentFor(e);if(c.scene)assert(verses.some(v=>v.chapter===e.chapter&&v.verse===c.scene.ref));}
assert.equal(daylightFor({chapter:0}),0);assert.equal(daylightFor({chapter:18}),1);assert.equal(sampleDaylight(1).night,1);assert.equal(sampleDaylight(.4).night,0);
for(const e of entries){assert(Number.isFinite(daylightFor(e)));assert.equal(prayerFor(e),e.chapter>=2&&!(e.chapter===18&&e.scene===3&&e.beat>=3)?1:0);}

const framing=[];
for(const [w,h,r] of [[390,844,355],[320,568,260],[844,390,180],[1440,900,320]]){
  let lowest=1;
  for(let i=0;i<entries.length;i++){
    const s=cueFor(i),camera=new T.PerspectiveCamera(46,1,.18,4000),aspect=configureReadingFrustum(camera,w,h,r);
    cameraForViewport(s,aspect,camera.position);camera.lookAt(new T.Vector3(...s.aim));camera.updateMatrixWorld(true);
    for(const p of [[0,4.02,-1.47],[0,3.9,.93]]){
      const v=new T.Vector3(...p).project(camera),y=(1-v.y)*h/2;
      assert(Math.abs(v.x)<.9&&y>0&&y<h-r,`${w}x${h}: figure behind dialogue at ${entries[i].id}`);lowest=Math.min(lowest,1-y/(h-r));
    }
    // Reading reserve preserves the available-area projection exactly.
    const plain=new T.PerspectiveCamera(camera.fov,aspect,.18,4000);plain.position.copy(camera.position);plain.quaternion.copy(camera.quaternion);plain.updateMatrixWorld(true);
    const a=new T.Vector3(...s.aim).project(camera),b=new T.Vector3(...s.aim).project(plain);
    assert(Math.abs((1-a.y)*h/2-(1-b.y)*(h-Math.min(r,h*.46))/2)<1e-7);
  }
  framing.push({width:w,height:h,readingReserve:r,minimumSpaceBelowFaces:lowest});
}
const orbit=createExploration(),position=new T.Vector3(0,8,20),aim=new T.Vector3(0,3,0);
orbit.capture(position,aim);orbit.orbit(Math.PI/.005,0);orbit.update(position,aim,1,true);assert(position.z<-19,'Orbit allows a full rear view');
orbit.zoom(.00001);assert.equal(orbit.radius,4);orbit.zoom(1e8);assert.equal(orbit.radius,240);
orbit.pan(10000,10000);orbit.orbit(0,-10000);orbit.update(position,aim,1,true);assert(position.y>=.9);assert(Math.abs(aim.x)<=150&&aim.z<=180);
orbit.reset();assert.equal(orbit.active,false);
class InputSurface extends EventTarget{clientHeight=844;focus(){}setPointerCapture(){}}
const surface=new InputSurface();let moves=0;
const unbind=bindExploration(surface,{begin(){if(!orbit.active)orbit.capture(new T.Vector3(0,8,20),new T.Vector3(0,3,0));moves++;},model:orbit,wake(){}});
function pointer(type,id,x,y){const e=new Event(type,{cancelable:true});Object.assign(e,{pointerId:id,clientX:x,clientY:y,button:0});surface.dispatchEvent(e);}
pointer('pointerdown',1,100,100);pointer('pointerdown',2,200,100);pointer('pointermove',2,240,140);
assert(orbit.radius<Math.hypot(5,20),'Pinch changes distance');orbit.update(position,aim,1,true);assert(aim.x!==0||aim.z!==0,'Two fingers also pan');
pointer('pointercancel',1,100,100);pointer('pointercancel',2,240,140);const before=moves;pointer('pointermove',2,400,400);assert.equal(moves,before);unbind();

globalThis.fetch=async url=>new Response(await readFile(new URL(url)),{status:200});
const assembly=await createAssembly();for(let i=0;i<100;i++)assembly.update(i*.04,.04,true);
const originalGeometry=assembly.team.horses.map(h=>h.body.geometry),bodyPositions=originalGeometry.map(g=>g.attributes.position.array.slice());
const prayer=createPrayerPose(assembly.arjun,{THREE:T}),travel=createRathMotion(assembly,{autoplay:false});
const wheelStart=assembly.chariot.wheels.map(w=>w.rotation.x);let maxReach=0;
for(const progress of [0,.03,.11,.3,.5,.72,.92,1]){
  assembly.update(progress*10.5,.04,true);prayer.update(0,progress*10.5);travel.setTravel(progress);assembly.root.updateMatrixWorld(true);
  maxReach=Math.max(maxReach,travel.state.maxReachError);assert(travel.state.maxReachError<1e-6);
  const hand=assembly.anchors.reinHand.getWorldPosition(new T.Vector3());
  for(const rein of assembly.team.reins)assert(rein.path.points.at(-1).clone().applyMatrix4(assembly.team.root.matrixWorld).distanceTo(hand)<.056,'Travel harness stays connected');
}
assert(travel.state.arrived);assert.equal(travel.state.distance,9);for(const [i,w] of assembly.chariot.wheels.entries())assert(Math.abs(w.rotation.x-wheelStart[i]-6)<1e-8);
for(const [i,h] of assembly.team.horses.entries())assert.deepEqual(h.body.geometry.attributes.position.array,bodyPositions[i]);
assembly.krishna.root.rotation.y=Math.PI;
assembly.update(11,.04,true);prayer.update(1,11);assembly.chariot.supports.arjun.visible=false;travel.update(11,0,false);assembly.root.updateMatrixWorld(true);
const teacher=assembly.krishna.root.getWorldPosition(new T.Vector3()),student=assembly.arjun.root.getWorldPosition(new T.Vector3());
prayer.faceToward(teacher,1);assembly.root.updateMatrixWorld(true);
for(const [actor,target] of [[assembly.krishna,student],[assembly.arjun,teacher]]){
  const direction=target.clone().sub(actor.root.getWorldPosition(new T.Vector3()));direction.y=0;direction.normalize();
  const face=new T.Vector3(0,0,1).transformDirection(actor.root.matrixWorld);assert(face.dot(direction)>.999,'Figures face one another');
}
assert(prayer.diagnostics().minClothY>=.12-1e-6);assert.equal(assembly.arjun.bow.visible,false);
prayer.dispose();travel.dispose();for(const [i,h] of assembly.team.horses.entries())assert.equal(h.body.geometry,originalGeometry[i]);
const report={passed:true,languages:5,introAndContextStringsPerLanguage:keys.length,passages:194,framing,
  controls:['full orbit','ground-plane pan','two-finger pan and pinch','pointer cancellation','camera reset'],
  choreography:['nine-metre arrival','wheel travel','connected reins','unchanged horse positions','kneeling deck contact','face-to-face orientation','restoration'],maximumReachError:maxReach,
  browserQA:'not performed',audioAudition:'not performed'};
await writeFile(new URL('./experience-validation.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
