import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import * as T from '../web/vendor/three.module.min.js';
import {createEndingTimeline,endingCameraTarget,ENDING_SECONDS} from '../web/experience/ending.js';
import {endingCopy} from '../web/experience/ending-copy.js';
import {createCameraRig} from '../web/experience/camera-rig.js';
import {createReadingClock} from '../web/narrative/reading-clock.js';
import {createNarrator} from '../web/narrative/audio-player.js';
import {entries} from '../web/narrative/journey.js';

let completions=0;const ending=createEndingTimeline({onComplete:()=>completions++});
assert(!ending.active);ending.update(100);assert(!ending.active,'Reading last passage must not infer completion');
const reader=createReadingClock({onEnd:()=>ending.begin()});reader.set(entries.at(-1).text);
for(let i=0;i<500;i++)reader.update(.1);assert(!ending.active,'Manual reading has no forced timeout');
reader.play();for(let i=0;i<800;i++)reader.update(.1);assert(ending.active);assert(!ending.begin(),'Repeated completion is idempotent');
ending.update(.1);const before=ending.frame;ending.pause();ending.update(100);assert.equal(ending.frame.elapsed,before.elapsed);
ending.play();ending.update(100,true);assert.equal(ending.frame.elapsed,before.elapsed,'Menu/hidden-tab holds the closing');
for(let i=0;i<215;i++)ending.update(.1);assert(ending.done);assert.equal(completions,1);assert.equal(ending.frame.sound,1);
ending.complete();assert.equal(completions,1);ending.stay();assert(ending.field);ending.reopen();assert.equal(ending.state,'screen');
ending.cancel();assert(!ending.active);assert.equal(ending.frame.sound,0);ending.begin();assert.equal(ending.frame.elapsed,0);ending.pause();ending.complete();assert(ending.done);assert.equal(completions,2);ending.cancel();

// Real audio completion logic, using an Audio interface double, not a guessed timer.
class Recording {constructor(){this.handlers=new Map();this.ended=false;this.currentTime=0;this.duration=30;}addEventListener(n,f){this.handlers.set(n,f);}removeEventListener(n){this.handlers.delete(n);}removeAttribute(){}load(){}pause(){}async play(){this.ended=false;}emit(n){this.handlers.get(n)?.();}}
const recording=new Recording();let ends=0;const narrator=createNarrator({createAudio:()=>recording,onEnd:()=>{ends++;ending.begin();}});
narrator.setTrack(null);assert(!ending.active);narrator.setTrack('/final-voice.mp3');await narrator.play();recording.emit('error');recording.ended=true;recording.emit('ended');assert.equal(ends,0,'Missing/failed audio must not finish');
await narrator.play();recording.ended=true;recording.emit('ended');assert.equal(ends,1);assert(ending.active);recording.emit('ended');assert.equal(ends,1);narrator.dispose();ending.cancel();

const cameras=[];
for(const [w,h] of [[1440,900],[390,844],[320,568],[844,390]]){
 const aspect=w/h,cam=new T.PerspectiveCamera(46,aspect,.18,4000),rig=createCameraRig(cam),start=new T.Vector3(11,6.4,13),startAim=new T.Vector3(0,3,1.8),hand=new T.Vector3(.7,3.2,-.4),point=new T.Vector3(),aim=new T.Vector3();
 rig.capture(start,startAim);let speed=0,angle=0;const last=cam.position.clone(),q=cam.quaternion.clone();
 for(let i=0;i<=ENDING_SECONDS*60;i++){
  endingCameraTarget(i/60,aspect,start,startAim,hand,point,aim);
  if(i===0){assert(point.equals(start)&&aim.equals(startAim));rig.follow(point,aim,0);assert(cam.position.equals(start));}
  else rig.follow(point,aim,1/60);
  speed=Math.max(speed,cam.position.distanceTo(last)*60);angle=Math.max(angle,cam.quaternion.angleTo(q)*60);last.copy(cam.position);q.copy(cam.quaternion);
 }
 assert(speed<=5.001&&angle<=.35001,'Closing obeys existing continuous rig limits');
 const held=cam.position.clone(),heldQ=cam.quaternion.clone();endingCameraTarget(0,aspect,start,startAim,hand,point,aim);for(let i=0;i<40;i++)rig.follow(point,aim,1/60,{hold:true});assert(cam.position.equals(held)&&cam.quaternion.equals(heldQ));
 // Skipping typography still retargets the moving camera instead of resetting it.
 endingCameraTarget(21,aspect,start,startAim,hand,point,aim);rig.follow(point,aim,0);assert(cam.position.equals(held));
 cameras.push({width:w,height:h,maxSpeed:speed,maxAngularSpeed:angle});
}
const keys=Object.keys(endingCopy.en);for(const [locale,copy] of Object.entries(endingCopy)){assert.deepEqual(Object.keys(copy),keys);assert(Object.values(copy).every(s=>typeof s==='string'&&s.trim()),locale);}
const app=await readFile(new URL('../web/app.js',import.meta.url),'utf8'),html=await readFile(new URL('../web/index.html',import.meta.url),'utf8'),css=await readFile(new URL('../web/experience/ending.css',import.meta.url),'utf8');
for(const id of ['ending-film','ending-pause','ending-skip','ending-actions','ending-chapters','ending-stay','ending-restart','ending-reopen'])assert(html.includes('id="'+id+'"'));
for(const id of ['opening-label','opening-note','ending-label','read-hint','auto-hint','motion-note','source-follow','verse-note','camera-help','intro-sound-hint','source-empty'])assert(!html.includes('id="'+id+'"'),'Visible helper remains: '+id);
assert(app.includes("$('#read-progress').style.width=(readingClock.progress*100)"));
assert(!app.slice(app.indexOf('function setSource('),app.indexOf('async function renderStudy')).includes('narrator.pause'),'Shloka still works alongside narration');
assert(css.includes('body.ending-field[data-mode=listen] #scene-tools'));assert(css.includes('.source-open #scene-tools,.source-open #camera-guide'));assert(css.includes('env(safe-area-inset-top)'));
const report={passed:true,endingSeconds:ENDING_SECONDS,completionEvents:'explicit manual finish, reading autoplay, actual recording ended',languages:Object.keys(endingCopy),cameraChecks:cameras,browserQA:'not performed'};
await writeFile(new URL('ending-validation.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
