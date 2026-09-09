// Source and numeric regression checks for the reported camera/shadow issues.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import * as T from '../web/vendor/three.module.min.js';
import {createCameraFlow,configureStoryFrustum} from '../web/experience/camera-flow.js';
import {createReadingClock,readingSeconds,openingShots} from '../web/narrative/reading-clock.js';
import {entries,cueFor,createJourney} from '../web/narrative/journey.js';
import {cameraForViewport} from '../web/narrative/framing.js';
import {flowCopy} from '../web/narrative/flow-copy.js';
import {createInfantry} from '../web/battle/infantry.js';

const flow=createCameraFlow(),p=new T.Vector3(10,6,12),a=new T.Vector3(0,3,1);flow.reset(p,a);
let maxSpeed=0,last=p.clone();
for(let i=0;i<1800;i++){
  const target=i%60<30?new T.Vector3(20,8,-22):new T.Vector3(8,5,18);
  const frame=flow.follow(target,new T.Vector3(0,12,25),1/60);
  const speed=frame.position.distanceTo(last)*60;assert(speed<=5.001,'Rapid retargets stay within the travel limit');maxSpeed=Math.max(maxSpeed,speed);last.copy(frame.position);
  const held=frame.position.clone();flow.follow(target,a,0);assert(held.equals(frame.position),'Paused time never teleports');
}
const journey=createJourney();journey.go(entries.findIndex(e=>e.chapter===11));journey.update(.1);const before=structuredClone(journey.state);journey.go(entries.findIndex(e=>e.chapter===11)+7);assert.deepEqual(journey.state,before,'Next starts at the current state');
let end=0;const clock=createReadingClock({onEnd:()=>end++});clock.set('A short passage.');for(let i=0;i<100;i++)clock.update(.25);assert.equal(end,0,'Never auto read until requested');
clock.play();clock.update(1);const at=clock.progress;clock.update(1,true);assert.equal(clock.progress,at,'Background/menu pause preserves progress');clock.pause();clock.update(1);assert.equal(clock.progress,at);clock.play();for(let i=0;i<100;i++)clock.update(.25);assert.equal(end,1,'A passage completes once');
assert(readingSeconds('अर्जुन कृष्ण से पूछते हैं।','hi')>=10);assert(readingSeconds('这是一个阅读段落。','zh-Hans')>=11);
function flat(o,path=''){return Object.entries(o).flatMap(([k,v])=>v&&typeof v==='object'?flat(v,path+'.'+k):[[path+'.'+k,v]]);}
const keys=flat(flowCopy.en).map(([k])=>k);for(const [lang,copy] of Object.entries(flowCopy)){assert.deepEqual(flat(copy).map(([k])=>k),keys);for(const [key,text] of flat(copy))assert(typeof text==='string'&&text.trim(),lang+key);assert.equal(copy.opening.length,5);}
assert.equal(openingShots.length,5);
const projections=[];
for(const [w,h,insets] of [[1440,900,{top:82,bottom:264}],[1024,768,{top:82,bottom:238}],[390,844,{top:72,bottom:373}],[390,844,{top:72,bottom:610}],[320,568,{top:72,bottom:291}],[844,390,{top:66,bottom:180}],[1440,900,{left:558,top:86,bottom:88}],[844,390,{left:416,top:66,bottom:72}],[390,844,{top:78,bottom:663}],[320,568,{top:78,bottom:454}]]){
  const camera=new T.PerspectiveCamera(46,1,.18,4000),aspect=configureStoryFrustum(camera,w,h,insets);let maxX=0;
  for(let i=0;i<entries.length;i++){
    const s=cueFor(i);cameraForViewport(s,aspect,camera.position);camera.lookAt(new T.Vector3(...s.aim));camera.updateMatrixWorld(true);
    for(const point of [[0,4.02,-1.47],[0,3.9,.93]]){
      const projected=new T.Vector3(...point).project(camera),x=(projected.x+1)*w/2,y=(1-projected.y)*h/2;
      assert(x>(insets.left||0)&&x<w&&y>(insets.top||0)&&y<h-(insets.bottom||0),`${w}x${h} face hidden at ${entries[i].id}`);maxX=Math.max(maxX,x);
    }
    const plain=new T.PerspectiveCamera(camera.fov,aspect,.18,4000);plain.position.copy(camera.position);plain.quaternion.copy(camera.quaternion);plain.updateMatrixWorld(true);
    const v=new T.Vector3(...s.aim).project(camera),q=new T.Vector3(...s.aim).project(plain);
    assert(Math.abs((v.x+1)*w/2-((q.x+1)*(w-(insets.left||0))/2+(insets.left||0)))<1e-7);
    assert(Math.abs((1-v.y)*h/2-((1-q.y)*(h-(insets.top||0)-(insets.bottom||0))/2+(insets.top||0)))<1e-7);
  }
  projections.push({width:w,height:h,insets,aspect,maxFaceX:maxX});
}
const army=createInfantry({quality:'low'}),shadow=army.root.getObjectByName('contactShadow');
assert(shadow.material.map,'Shadow must use RGBA map alpha');assert.equal(shadow.material.alphaMap,null,'RGB channels of this texture are white');
const tex=shadow.material.map.image.data,n=shadow.material.map.image.width;
for(const index of [0,n-1,n*(n-1),n*n-1])assert.equal(tex[index*4+3],0,'No rectangular corner can cast a contact shadow');assert(tex[(Math.floor(n/2)*n+Math.floor(n/2))*4+3]>240);
assert.equal(shadow.castShadow,false);assert.equal(shadow.material.depthWrite,false);army.dispose();
const html=await readFile(new URL('../web/index.html',import.meta.url),'utf8'),ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
const adapter=await readFile(new URL('../web/experience/interface.js',import.meta.url),'utf8');
const appSource=await readFile(new URL('../web/app.js',import.meta.url),'utf8');
const dynamicIds=[...[...adapter.matchAll(/\.id='([a-z-]+)'/g),...appSource.matchAll(/\.id='([a-z-]+)'/g)].map(m=>m[1]),'audio-rewind','audio-forward'];
assert.equal(ids.length+dynamicIds.length,new Set([...ids,...dynamicIds]).size,'Adapter IDs must be unique');
const app=await readFile(new URL('../web/app.js',import.meta.url),'utf8');for(const [,id] of app.matchAll(/\$\('#([a-z-]+)'\)/g))assert([...ids,...dynamicIds].includes(id),'Missing '+id);
for(const id of ['opening-caption','opening-play','skip-opening','read-play','source-toggle','source-panel','verse-select','verse-back','verse-next'])assert(ids.includes(id));
assert(!app.slice(app.indexOf('function setSource('),app.indexOf('async function renderStudy')).includes('narrator.pause'),'Opening the source must not pause Listen mode');
const report={passed:true,maxCameraSpeed:maxSpeed,translatedStringsPerLanguage:keys.length,openingStages:5,projections,checks:['no camera teleport on retarget','bounded camera speed','manual and automatic reading','pause without skipping','four-language copy parity','transparent shadow corners','shared source panel without interrupting narration'],browserQA:'not performed'};
await writeFile(new URL('./flow-validation.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
