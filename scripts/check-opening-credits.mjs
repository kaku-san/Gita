import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from '../web/vendor/three.module.min.js';
import {createCreditsClock,createFaceoffCameras,creditDurations,creditPhases} from '../web/experience/opening-credits.js';
import {createInfantry} from '../web/battle/infantry.js';
import {createCameraRig} from '../web/experience/camera-rig.js';
import {configureStoryFrustum} from '../web/experience/camera-flow.js';

assert.equal(creditDurations.reduce((a,b)=>a+b),35.5);assert.equal(creditPhases.length,5);
let completed=0;const clock=createCreditsClock({onEnd:()=>completed++});
for(let stage=0;stage<creditPhases.length;stage++){
 clock.set(stage);clock.update(.1);assert.equal(clock.progress,0);
 clock.play();clock.update(.1);const before=clock.progress;clock.update(.1,true);assert.equal(clock.progress,before);
 clock.pause();clock.update(.1);assert.equal(clock.progress,before);clock.play();
 for(let i=0;i<Math.ceil(creditDurations[stage]*10)+2;i++)clock.update(.1);
 assert.equal(completed,stage+1);assert.equal(clock.progress,1);assert.equal(clock.playing,false);
}
clock.set(0);clock.play();clock.update(.1);const beforeExit=clock.progress;clock.requestEnd();assert.equal(clock.progress,beforeExit,'Continue retimes remaining film without skipping to another camera');for(let i=0;i<16;i++)clock.update(.1);assert.equal(clock.progress,1);
const army=createInfantry({quality:'low'}),pair=army.metadata.pairs[0],faceoff=createFaceoffCameras(pair),viewports=[];
for(const [width,height] of [[1440,900],[390,844],[320,568],[844,390]]){
 const portrait=height>width;
 for(const progress of [0,.4,.82,.9,.99,1]){
  const {cameras,panes}=faceoff.update(width,height,progress);
  assert(Math.abs(portrait?panes[0].h+panes[1].h-height:panes[0].w+panes[1].w-width)<=1.001);
  for(let side=0;side<2;side++){
   const pane=panes[side],camera=cameras[side];if(pane.w<width*.35||pane.h<height*.35)continue;
   const head=new T.Vector3(...pair.roots[side]);head.y+=1.65;head.project(camera);
   assert(Math.abs(head.x)<.8&&Math.abs(head.y)<.9&&head.z<1,'Fighter head stays in its live pane');
  }
 }
 const {cameras,aims,panes}=faceoff.update(width,height,1);
 const camera=new T.PerspectiveCamera();configureStoryFrustum(camera,width,height,{});const rig=createCameraRig(camera);
 rig.capture(cameras[0].position,aims[0]);camera.updateMatrixWorld(true);
 assert(Math.abs(camera.fov-cameras[0].fov)<1e-9);assert(Math.abs(camera.aspect-cameras[0].aspect)<1e-9);
 assert(camera.quaternion.angleTo(cameras[0].quaternion)<1e-7);assert.equal(panes[0].w,width);assert.equal(panes[0].h,height);
 const pose=camera.position.clone();rig.follow(new T.Vector3(2,4,-6),new T.Vector3(0,4,-10),0);assert(camera.position.equals(pose));
 rig.follow(new T.Vector3(2,4,-6),new T.Vector3(0,4,-10),1/60);assert(camera.position.distanceTo(pose)<5/60);
 const a=faceoff.update(width,height,0,true).cameras.map(c=>c.position.clone());
 const b=faceoff.update(width,height,.99,true).cameras;assert(a.every((p,i)=>p.equals(b[i].position)));
 viewports.push({width,height,panesCoverViewport:true,headFraming:true,continuousHandoff:true});
}
army.dispose();
let protectedFiles=0;
for(const manifest of ['approved-assets.json','approved-vishvarupa.json']){
 const {files}=JSON.parse(await readFile(new URL(manifest,import.meta.url)));
 for(const [path,hash] of Object.entries(files)){
  assert.equal(createHash('sha256').update(await readFile(new URL('../web/'+path,import.meta.url))).digest('hex'),hash,path+' must preserve approved asset');protectedFiles++;
 }
}
const app=await readFile(new URL('../web/app.js',import.meta.url),'utf8');
assert(app.includes('beginOpening();modalState();render();save();'),'Prepared entry also enters through the film');
assert(app.includes('onReady:()=>revealStory('),'Entry waits for the preparation gate');
assert(!app.slice(app.indexOf('function finishOpening'),app.indexOf('function setSource')).includes('skipArrival'),'Film handoff must not teleport the moving chariot');
const report={passed:true,duration:35.5,stages:creditPhases,viewports,protectedFiles,browserQA:'not performed'};
await writeFile(new URL('opening-validation.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
