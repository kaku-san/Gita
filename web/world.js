import * as T from './vendor/three.module.min.js';
import {createAssembly} from './assembly.js';
import {createSurroundings} from './surroundings.js';
import {createVishvarupa} from './vision/vishvarupa.js';
import {createCosmos} from './cosmos.js';
import {createSound} from './sound.js';
import {createPrayerPose} from './prayer-pose.js';
import {createRathMotion} from './rath-motion.js';
import {cameraForViewport} from './narrative/framing.js';
import {bowIsLowered} from './narrative/journey.js';
import {createExploration,bindExploration} from './experience/exploration.js';
import {configureStoryFrustum} from './experience/camera-flow.js';
import {createCameraRig} from './experience/camera-rig.js';
import {openingShots} from './narrative/reading-clock.js';
import {createFaceoffCameras} from './experience/opening-credits.js';
import {endingCameraTarget} from './experience/ending.js';
import {sampleDaylight,daylightFor,prayerFor} from './experience/daylight.js';

export function createWorld({canvas,viewport,director,sound=createSound(),onProgress=()=>{},onError=()=>{},onReady=()=>{},onCameraChange=()=>{},onTravel=()=>{},onAdvance=()=>{},onTogglePlayback=()=>{}}){
const coarse=matchMedia('(pointer: coarse)').matches;
let gentleCamera=matchMedia('(prefers-reduced-motion: reduce)').matches,paused=false,modal=true,intro=true,ready=false;
let renderer,scene,camera,assembly,vision,cosmos,surroundings,lights,envTarget,prayer,travel,arjunNeck;
let raf=0,last=0,time=0,actorAccumulator=0,shadowTime=-100,disposed=false,contextLost=false;
let effectiveAspect=1,shot=null,teaching=0,teacherTurn=0,poseIndex=-1,lastTravel=null;
let endingFrame=null;
const endingStartPoint=new T.Vector3(),endingStartAim=new T.Vector3(),endingHand=new T.Vector3();
let openingIndex=null,openingPlaying=true,openingProgress=0,faceoff,cameraRig;
const layout={left:0,top:0,bottom:0},targetLayout={left:0,top:0,bottom:0};
const targetPoint=new T.Vector3(),targetAim=new T.Vector3(),actorRotation=new T.Quaternion();
let lightingMode='story',dayValue=0,lastSoundVision=-1,lastSoundDread=-1;const day=sampleDaylight(0);
const point=new T.Vector3(),aim=new T.Vector3(),displacement=new T.Vector3(),lookAtTeacher=new T.Vector3();
const exploration=createExploration(),krishnaMaterials=new Set();
let lastVision=-1,lastReveal=-1,lastDread=-1,lastGentle=-1;
const shots={conversation:{camera:[10,5.6,3.5],aim:[0,3.3,0]},side:{camera:[12,5.3,-.5],aim:[0,3.2,.2]},wide:{camera:[0,33,82],aim:[0,2.8,3]}};
function projectLayout(){
  if(!camera)return;
  effectiveAspect=configureStoryFrustum(camera,viewport.clientWidth,viewport.clientHeight,intro||openingIndex!==null?{}:layout);
}
function resize(){
  if(!renderer)return;const width=viewport.clientWidth,height=viewport.clientHeight;if(!width||!height)return;
  renderer.setSize(width,height,false);projectLayout();wake();
}
function placeCamera(state,dt){
  const stopped=paused||modal||intro||openingIndex!==null&&!openingPlaying||endingFrame&&!endingFrame.done&&!endingFrame.playing;
  if(!intro&&openingIndex===null&&(!endingFrame||endingFrame.field)&&exploration.update(point,aim,dt,gentleCamera)){
    cameraRig.capture(point,aim);sound.setListener?.(camera.position,camera.quaternion);return;
  }
  // A camera has one continuous velocity, independently of the visual reveal.
  // Following the already-eased director state made each Next restart a second
  // slow ease and freeze the view. Follow the destination directly instead.
  const destination=director.target;
  const framing=intro?{...state,camera:gentleCamera?[22,12,-28]:[19,9,22],aim:gentleCamera?[0,12,23]:[0,3,3],vision:0,reveal:0}:
    openingIndex!==null?{...state,...openingShots[openingIndex],vision:0,reveal:0}:shot?{...destination,...shots[shot]}:destination;
  cameraForViewport(framing,effectiveAspect,targetPoint);targetAim.set(...framing.aim);
  if(openingIndex===1||openingIndex===2){
    // Close credits use the live character's head, not a far-away fixed point.
    const actor=openingIndex===1?assembly.arjun:assembly.krishna;
    const head=actor.root.getObjectByName('Head');
    if(head){head.getWorldPosition(targetAim);targetAim.y-=.18;
      const reach=effectiveAspect<.8?3.2:2.7;actor.root.getWorldQuaternion(actorRotation);
      targetPoint.copy(targetAim).add(new T.Vector3(1.8,.35,reach).applyQuaternion(actorRotation));
    }
  }
  if(travel&&openingIndex!==1&&openingIndex!==2){targetPoint.add(travel.state.worldDisplacement);targetAim.add(travel.state.worldDisplacement);}
  if(!intro&&openingIndex===null&&!endingFrame&&!shot&&!gentleCamera){
    const amount=1-state.vision*.55;targetPoint.x+=Math.sin(time*.09)*.9*amount;targetPoint.z+=Math.sin(time*.065)*1.1*amount;
  }
  if(endingFrame&&(!endingFrame.field||!shot)){
    const hand=assembly.arjun.root.getObjectByName('Bow wrist');
    if(hand)hand.getWorldPosition(endingHand);else endingHand.set(0,3.2,-.4);
    endingCameraTarget(endingFrame.elapsed,effectiveAspect,endingStartPoint,endingStartAim,endingHand,targetPoint,targetAim);
  }
  // Reduced motion holds the actual camera pose. It never teleports on Next.
  const frame=cameraRig.follow(targetPoint,targetAim,dt,{hold:stopped||gentleCamera});
  point.copy(frame.position);aim.copy(frame.aim);
  sound.setListener?.(camera.position,camera.quaternion);
}
function beginExplore(){if(!ready||intro||openingIndex!==null||endingFrame&&!endingFrame.field)return;if(!exploration.active){
  // Capture the view that is actually on screen, including a turning camera.
  const distance=Math.max(4,camera.position.distanceTo(aim));aim.set(0,0,-1).applyQuaternion(camera.quaternion).multiplyScalar(distance).add(camera.position);
  exploration.capture(camera.position,aim);onCameraChange();}wake();}
function focusPassage(){exploration.reset();shot=null;wake();}
function chooseCamera(name){if(!shots[name])return;exploration.reset();shot=name;onCameraChange();wake();}
function panCamera(direction){beginExplore();const step=Math.max(.8,exploration.radius*.07);if(direction==='left')exploration.pan(-step,0);if(direction==='right')exploration.pan(step,0);if(direction==='forward')exploration.pan(0,step);if(direction==='back')exploration.pan(0,-step);wake();}
function applyState(s,dt){
  const framing=intro||openingIndex!==null;const v=framing?0:s.vision,d=framing?0:s.dread,r=framing?0:s.reveal,g=framing?0:s.gentle;
  if(Math.abs(v-lastVision)>1e-5){surroundings.setVision(v);lastVision=v;}
  if(Math.abs(r-lastReveal)>1e-5){vision.setReveal(r);lastReveal=r;}
  if(Math.abs(d-lastDread)>1e-5){vision.setDread(d);lastDread=d;}
  if(Math.abs(g-lastGentle)>1e-5){vision.setGentle(g);lastGentle=g;}
  vision.root.position.set(...s.position);vision.root.rotation.y=Math.PI;vision.root.scale.setScalar(s.scale);cosmos.setState(v*(1-g*.82),d);
  const familiar=1-T.MathUtils.smoothstep(r,.23,.80);assembly.krishna.root.visible=familiar>.002;krishnaMaterials.forEach(m=>{m.opacity=familiar;});
  const targetDay=intro||openingIndex!==null?0:daylightFor(director.entry,lightingMode);
  dayValue=T.MathUtils.lerp(dayValue,targetDay,gentleCamera||modal||paused||dt===0?1:1-Math.exp(-dt*.7));
  sampleDaylight(dayValue,day);surroundings.setTimeOfDay(dayValue);
  const {sun,fill,hemi,divine,rim}=lights;
  sun.intensity=T.MathUtils.lerp(day.key,.28,v);sun.color.copy(day.sun).lerp(new T.Color(0xffd5a1),v);
  fill.intensity=T.MathUtils.lerp(.8-day.night*.45,.55,v);hemi.intensity=T.MathUtils.lerp(day.ambient,.46,v);hemi.color.copy(day.hemi).lerp(new T.Color(0xc8d6e8),v);
  // The same world direction lights the sky and near moving shadows.
  displacement.copy(travel?.state.worldDisplacement??new T.Vector3());
  sun.target.position.set(0,2,3).add(displacement);sun.position.copy(day.direction).multiplyScalar(68).add(sun.target.position).lerp(new T.Vector3(-35,29,52),v);
  divine.intensity=(T.MathUtils.lerp(1.25,.4,day.night)*(1-v)+v*4.05)*(1-d*.2);divine.color.set(d>.01?0xffc48b:0xd5e1ff);
  rim.intensity=T.MathUtils.lerp(2-day.night*1.25,1.25,v);rim.color.set(d>.1?0xff9d4e:day.night>.5?0x779ccc:0xe8bb78);
  scene.environmentIntensity=T.MathUtils.lerp(T.MathUtils.lerp(.45,.14,day.night),.45,v);renderer.toneMappingExposure=T.MathUtils.lerp(.98,1.03,v);
  if(Math.abs(v-lastSoundVision)>.001||Math.abs(d-lastSoundDread)>.001){sound.state(v,d);lastSoundVision=v;lastSoundDread=d;}
}
function updateActors(dt,state){
  const moving=!paused&&!modal&&!intro&&(openingIndex===null||openingPlaying)&&(!endingFrame||endingFrame.done||endingFrame.playing);
  const entry=openingIndex===null?director.entry:{chapter:1,scene:0,speaker:'Sanjaya'},poseKey=openingIndex===null?director.index:'opening'+openingIndex;
  if(!moving&&poseIndex===poseKey){sound.setTravel?.(0);return;}
  const finalReply=entry.id==='18.4.4';
  const target=openingIndex===null?(finalReply&&!endingFrame?1:prayerFor(entry)):0,turn=entry.chapter>=1&&!travel.state.moving&&(openingIndex===null||openingIndex>=2)?1:0;
  const k=moving?1-Math.exp(-dt*1.35):poseIndex!==poseKey?1:0;
  teaching=finalReply&&endingFrame?1-T.MathUtils.smoothstep(endingFrame.elapsed,0,3.5):T.MathUtils.lerp(teaching,target,k);teacherTurn=T.MathUtils.lerp(teacherTurn,turn,k);
  if(Math.abs(teaching-target)<.0001)teaching=target;if(Math.abs(teacherTurn-turn)<.0001)teacherTurn=turn;
  assembly.arjun.setBowDown(finalReply&&!endingFrame?true:bowIsLowered(entry));assembly.krishna.setGesture(entry.speaker==='Krishna'||entry.chapter===11);
  if(!moving&&poseIndex!==poseKey)for(let i=0;i<80;i++)assembly.update(time,.08,true);
  assembly.krishna.root.rotation.y=Math.PI*teacherTurn;
  assembly.update(time,dt,moving);
  if(arjunNeck){const wonder=intro||openingIndex!==null?0:state.reveal*(1-state.gentle);arjunNeck.rotation.x=.16-.39*wonder+.22*state.gentle*state.reveal;arjunNeck.rotation.y=-.07*(1-wonder);}
  prayer.update(teaching,time);
  if(arjunNeck&&!intro&&openingIndex===null&&state.reveal>.001){const wonder=state.reveal*(1-state.gentle);arjunNeck.rotation.x=.135-.39*wonder+.22*state.gentle*state.reveal;}
  assembly.krishna.root.getWorldPosition(lookAtTeacher);prayer.faceToward(lookAtTeacher,teaching);
  assembly.chariot.supports.arjun.visible=teaching<=.00001;
  const travelState=travel.update(time,dt,moving&&(openingIndex===null||openingIndex>=3));sound.setTravel?.(moving&&travelState.moving&&(openingIndex===null||openingIndex>=3)?Math.min(1,travelState.speed/1.05):0);
  if(lastTravel!==travelState.moving){lastTravel=travelState.moving;onTravel(travelState);}
  surroundings.update(time,dt,moving);vision.update(time,dt,moving);cosmos.update(time,dt,moving);poseIndex=poseKey;
}
function tick(now){
  raf=0;if(disposed||document.hidden||contextLost||!ready)return;
  const dt=last?Math.min((now-last)/1000,.1):1/60;last=now;const stopped=paused||modal||intro||openingIndex!==null&&!openingPlaying||endingFrame&&!endingFrame.done&&!endingFrame.playing;
  if(!stopped)time+=dt;const state=director.update(dt,{paused:stopped||openingIndex!==null,reduced:false});
  actorAccumulator+=dt;if(actorAccumulator>=1/30||stopped){updateActors(Math.min(actorAccumulator,.1),state);actorAccumulator=0;}
  let layoutMoving=false;
  for(const key of ['left','top','bottom']){const target=intro||openingIndex!==null||endingFrame&&!endingFrame.field?0:targetLayout[key];const gap=target-layout[key];if(Math.abs(gap)>.1){layout[key]+=gap*(gentleCamera?1:1-Math.exp(-dt*4));layoutMoving=true;}else layout[key]=target;}
  if(layoutMoving&&!gentleCamera)projectLayout();
  applyState(state,dt);placeCamera(state,dt);
  if(now-shadowTime>200){renderer.shadowMap.needsUpdate=true;shadowTime=now;}
  if(openingIndex===0&&faceoff){
    const w=viewport.clientWidth,h=viewport.clientHeight,{cameras,panes,aims}=faceoff.update(w,h,openingProgress,gentleCamera);
    const visible=assembly.root.visible;assembly.root.visible=openingProgress>.82?visible:false;
    renderer.setScissorTest(true);
    try{for(let i=0;i<2;i++){const p=panes[i];if(p.w<=1||p.h<=1)continue;renderer.setViewport(p.x,p.y,p.w,p.h);renderer.setScissor(p.x,p.y,p.w,p.h);renderer.render(scene,cameras[i]);}}
    finally{assembly.root.visible=visible;renderer.setScissorTest(false);renderer.setViewport(0,0,w,h);}
    if(openingProgress>.82&&!gentleCamera){cameraRig.capture(cameras[0].position,aims[0]);point.copy(camera.position);aim.copy(aims[0]);}
  }else renderer.render(scene,camera);
  if(!stopped||exploration.settling||layoutMoving||cameraRig.settling&&!stopped)raf=requestAnimationFrame(tick);
}
function wake(){if(ready&&!raf&&!disposed&&!document.hidden&&!contextLost){last=0;raf=requestAnimationFrame(tick);}}
const unbind=bindExploration(canvas,{begin:beginExplore,model:exploration,wake,enabled:()=>ready&&!intro&&!modal&&openingIndex===null&&(!endingFrame||endingFrame.field),onReset:focusPassage,onAdvance,onTogglePlayback});
function skipArrival(){if(!travel)return;travel.setTravel(false);sound.setTravel?.(0);lastTravel=false;onTravel(travel.state);wake();}
function enter({arrival=false,opening=null}={}){intro=false;openingIndex=opening;openingProgress=0;openingPlaying=true;focusPassage();if(travel){travel.setTravel(arrival&&!gentleCamera);lastTravel=null;}resize();wake();}
async function initialize(){
  renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,coarse?1:1.35));renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate=false;
  scene=new T.Scene();scene.background=new T.Color(0xc29873);camera=new T.PerspectiveCamera(46,1,.18,4000);cameraRig=createCameraRig(camera);
  const hemi=new T.HemisphereLight(0xc8d6e8,0x66503b,1.35);scene.add(hemi);
  const sun=new T.DirectionalLight(0xffd5a1,3);sun.position.set(-35,29,52);sun.castShadow=true;
  sun.shadow.mapSize.set(coarse?1024:2048,coarse?1024:2048);Object.assign(sun.shadow.camera,{left:-12,right:12,top:12,bottom:-12,near:1,far:120});sun.shadow.normalBias=.015;sun.shadow.bias=-.00015;sun.target.position.set(0,2,3);scene.add(sun,sun.target);
  const fill=new T.DirectionalLight(0xc6d9f1,.85);fill.position.set(8,10,-12);scene.add(fill);
  const rim=new T.DirectionalLight(0xe8bb78,2);rim.position.set(12,14,40);scene.add(rim);
  const divine=new T.DirectionalLight(0xd5e1ff,1.25);divine.position.set(-15,40,8);divine.target.position.set(0,22,38);scene.add(divine,divine.target);lights={sun,fill,rim,hemi,divine};
  // Reuse the approved material response with a modest, locally rendered light
  // environment. No network HDR or texture dependencies are introduced.
  const reflectionScene=new T.Scene();reflectionScene.background=new T.Color(0x514234);
  const shell=new T.Mesh(new T.BoxGeometry(100,100,100),new T.MeshBasicMaterial({color:0x675746,side:T.BackSide}));reflectionScene.add(shell);
  for(const [pos,scale,color] of [[[-49,20,15],[1,40,55],0xffe9c8],[[20,49,0],[50,1,45],0xd8e1ea],[[49,10,-20],[1,35,45],0x748aa5]]){const o=new T.Mesh(new T.BoxGeometry(...scale),new T.MeshBasicMaterial({color}));o.position.set(...pos);reflectionScene.add(o);}
  const pmrem=new T.PMREMGenerator(renderer);envTarget=pmrem.fromScene(reflectionScene,.04);scene.environment=envTarget.texture;scene.environmentIntensity=.45;pmrem.dispose();reflectionScene.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});
  const quality=coarse?'low':'high';surroundings=await createSurroundings({quality});scene.add(surroundings.root);
  faceoff=createFaceoffCameras(surroundings.infantry.metadata.pairs[0]);
  assembly=await createAssembly({onProgress});scene.add(assembly.root);
  assembly.krishna.root.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])krishnaMaterials.add(m);});
  krishnaMaterials.forEach(m=>{m.alphaHash=true;m.needsUpdate=true;});
  assembly.setMoment(bowIsLowered(director.entry));for(let i=0;i<100;i++)assembly.update(i/25,.04,true);
  arjunNeck=assembly.arjun.root.getObjectByName('Head');
  prayer=createPrayerPose(assembly.arjun,{THREE:T,floorY:.12});
  travel=createRathMotion(assembly,{renderer,distance:9,duration:10.5,autoplay:false});travel.setTravel(director.index===0?{progress:0,playing:false}:false);
  teaching=director.entry.id==='18.4.4'?1:prayerFor(director.entry);teacherTurn=director.entry.chapter>=1?1:0;
  onProgress('Preparing the universal form…');await new Promise(requestAnimationFrame);
  vision=await createVishvarupa({quality});scene.add(vision.root);
  vision.root.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});
  cosmos=createCosmos({quality});cosmos.bindFigure(vision);scene.add(cosmos.root);
  // Compile every material, including the initially hidden universal form,
  // before entry so its first reveal does not stall between rendered frames.
  await renderer.compileAsync(scene,camera);
  // Shadows stay concentrated on the familiar chariot and the planted horses.
  ready=true;dayValue=daylightFor(director.entry,lightingMode);resize();
  applyState(director.state,0);updateActors(0,director.state);placeCamera(director.state,1);renderer.shadowMap.needsUpdate=true;
  renderer.render(scene,camera);onReady();wake();
}

function setPause(v){paused=v;sound.mute(paused||modal||intro||document.hidden);wake();}
function setMotion(v){gentleCamera=v;if(v)skipArrival();else projectLayout();if(intro)cameraRig?.reinitialize();wake();}
const observer=new ResizeObserver(resize);observer.observe(viewport);
const visibility=()=>{sound.mute(document.hidden||paused||modal||intro);if(document.hidden){cancelAnimationFrame(raf);raf=0;}else wake();};
document.addEventListener('visibilitychange',visibility);
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;cancelAnimationFrame(raf);raf=0;sound.mute(true);onError('The scene was interrupted. You can keep reading or reload.');});
canvas.addEventListener('webglcontextrestored',()=>location.reload());
initialize().catch(e=>{console.error(e);onError('The scene could not load. You can keep reading or reload.');});
addEventListener('pagehide',e=>{if(!e.persisted){disposed=true;cancelAnimationFrame(raf);observer.disconnect();unbind();document.removeEventListener('visibilitychange',visibility);prayer?.dispose();travel?.dispose();surroundings?.dispose();renderer?.dispose();envTarget?.dispose();}});
return {wake,resize,setPause,setMotion,focusPassage,chooseCamera,panCamera,enter,skipArrival,
 setEnding(frame){
   if(!ready)return;
   if(frame&&!endingFrame){endingStartPoint.copy(camera.position);endingStartAim.set(0,0,-1).applyQuaternion(camera.quaternion).multiplyScalar(Math.max(4,camera.position.distanceTo(aim))).add(camera.position);focusPassage();}
   if(endingFrame?.field&&frame&&!frame.field)focusPassage();
   endingFrame=frame;wake();
 },
 setReadingLayout(next){let changed=false;for(const key of ['left','top','bottom']){const n=Math.max(0,Number(next[key])||0);if(Math.abs(targetLayout[key]-n)>.1){targetLayout[key]=n;changed=true;}}if(changed)wake();},
 setOpening(index){openingIndex=Number.isInteger(index)&&index>=0&&index<openingShots.length?index:null;openingProgress=0;openingPlaying=true;focusPassage();projectLayout();},
 setOpeningProgress(value){openingProgress=T.MathUtils.clamp(value,0,1);},
 setOpeningPlaying(value){if(openingPlaying!==value){openingPlaying=value;wake();}},
 setLighting(mode){if(['story','dawn','day','dusk','night'].includes(mode)){lightingMode=mode;wake();}},
 setIntro(v){intro=v;if(v)cameraRig?.reinitialize();if(v&&travel){if(director.index===0)travel.setTravel({progress:0,playing:false});else skipArrival();}resize();wake();},
 setModal(v){modal=v;sound.mute(v||paused||intro||document.hidden);wake();},get ready(){return ready;}};
}
