import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import * as T from '../web/vendor/three.module.min.js';
import {createCameraRig} from '../web/experience/camera-rig.js';
import {configureStoryFrustum} from '../web/experience/camera-flow.js';
import {cameraForViewport} from '../web/narrative/framing.js';
import {entries,originalEntries,createJourney,savedIndex,indexFromHash} from '../web/narrative/journey.js';
import {openingShots} from '../web/narrative/reading-clock.js';
import {flowCopy} from '../web/narrative/flow-copy.js';

assert.equal(entries.length,188);assert.equal(entries[0].speaker,'Arjun');assert.equal(entries.at(-1).speaker,'Arjun');
assert(entries.every(e=>e.chapter>0));
for(let i=0;i<originalEntries.length;i++){
 const target=entries.findIndex(e=>e.id===originalEntries[i].id);
 if(target>=0)assert.equal(savedIndex({index:i}),target,'Old stored positions retain their passage');
}
for(let i=0;i<entries.length;i++)assert.equal(savedIndex({passageId:entries[i].id,index:999}),i);
assert.equal(indexFromHash('#chapter-0/0/1'),0);assert.equal(indexFromHash('#chapter-18/4/5'),entries.length-1);

const report={viewports:[],browserQA:'not performed'};
for(const [w,h,top,bottom] of [[1440,900,82,264],[390,844,72,373],[320,568,72,291],[844,390,66,180]]){
 const camera=new T.PerspectiveCamera(46,1,.18,4000),aspect=configureStoryFrustum(camera,w,h,{top,bottom});
 const rig=createCameraRig(camera),journey=createJourney(),point=new T.Vector3(),aim=new T.Vector3();
 function frame(dt=1/60,hold=false){cameraForViewport(journey.target,aspect,point);aim.set(...journey.target.aim);rig.follow(point,aim,dt,{hold});camera.updateMatrixWorld(true);}
 frame();const start=camera.position.clone();
 const xi=entries.findIndex(e=>e.chapter===11);journey.go(xi+2);frame(0);assert(camera.position.equals(start),'Next never changes the rendered pose before a frame');
 for(let i=0;i<30;i++)frame();const early=camera.position.distanceTo(start);assert(early>.35,'The rendered camera starts travelling within half a second');
 let speed=0,angular=0;const last=camera.position.clone(),q=camera.quaternion.clone();
 for(let i=0;i<720;i++){
  if(i%37===0)journey.go(xi+(Math.floor(i/37)%14));
  journey.update(1/60);frame();
  speed=Math.max(speed,camera.position.distanceTo(last)*60);angular=Math.max(angular,camera.quaternion.angleTo(q)*60);
  assert(speed<=5.001&&angular<=.35001,'Rapid Next must obey rendered linear and angular limits');
  last.copy(camera.position);q.copy(camera.quaternion);
 }
 const held=camera.position.clone(),rotation=camera.quaternion.clone();
 for(let i=0;i<80;i++){journey.go((i*17)%entries.length);frame(1/60,true);}
 assert(camera.position.equals(held)&&camera.quaternion.equals(rotation),'Fixed camera remains fixed through arbitrary Next clicks');
 frame(0);assert(camera.position.equals(held));frame();assert(camera.position.distanceTo(held)<.084,'Leaving fixed mode also resumes continuously');
 report.viewports.push({w,h,aspect,travelInFirstHalfSecond:early,maxSpeed:speed,maxAngularSpeed:angular});
}
assert.equal(openingShots.length,5);
for(const [locale,copy] of Object.entries(flowCopy)){
 assert.equal(copy.opening.length,5);assert.equal(copy.opening[1].name,locale==='hi'?'अर्जुन':locale==='ja'?'アルジュナ':locale==='zh-Hans'?'阿周那':locale==='en'?'Arjun':'Arjuna');
 for(const stage of copy.opening)for(const key of ['title','text','name','clans','role'])assert(stage[key]?.trim(),locale+key);
 assert(!/Sanjaya|Dhritarashtra|संजय|धृतराष्ट्र|サンジャヤ|サンジャーヤ|ドリタラーシュトラ|全胜|持国/i.test(JSON.stringify(copy.opening)));
}
const manifest=JSON.parse(await readFile(new URL('../web/audio/battlefield.json',import.meta.url)));
for(const layer of manifest.layers)assert(layer.src&&layer.bus);
const world=await readFile(new URL('../web/world.js',import.meta.url),'utf8');
assert(!world.includes('director.go(director.index,{immediate:true})'));
assert(world.includes('const destination=director.target'));
report.passed=true;report.activePassages=entries.length;report.audioAssetCount=manifest.layers.length;
await writeFile(new URL('./cinematic-validation.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
