import * as T from '../vendor/three.module.min.js';

// Full orbit, ground-plane travel and pinch share one camera model. The model
// is independent of DOM events, so pointer gestures and keyboard agree.
export function createExploration(){
  let active=false,yaw=0,pitch=.25,radius=18;
  const aim=new T.Vector3(),offset=new T.Vector3(),forward=new T.Vector3(),right=new T.Vector3();
  const currentAim=new T.Vector3();let currentYaw=0,currentPitch=.25,currentRadius=18;
  function capture(position,target){
    aim.copy(target);offset.copy(position).sub(aim);radius=T.MathUtils.clamp(offset.length(),4,240);
    yaw=Math.atan2(offset.x,offset.z);pitch=T.MathUtils.clamp(Math.asin(offset.y/Math.max(offset.length(),.01)),-1.2,1.35);
    currentAim.copy(aim);currentYaw=yaw;currentPitch=pitch;currentRadius=radius;active=true;
  }
  function orbit(dx,dy){yaw-=dx*.005;pitch=T.MathUtils.clamp(pitch+dy*.004,-1.2,1.35);}
  function zoom(factor){if(Number.isFinite(factor)&&factor>0)radius=T.MathUtils.clamp(radius*factor,4,240);}
  function pan(dx,dy){
    right.set(Math.cos(yaw),0,-Math.sin(yaw));forward.set(-Math.sin(yaw),0,-Math.cos(yaw));
    aim.addScaledVector(right,dx).addScaledVector(forward,dy);aim.x=T.MathUtils.clamp(aim.x,-150,150);aim.z=T.MathUtils.clamp(aim.z,-150,180);
  }
  function dragPan(dx,dy,height=700){const scale=radius*.85/Math.max(height,160);pan(-dx*scale,dy*scale);}
  function update(position,target,dt,immediate=false){
    if(!active)return false;
    const k=immediate?1:1-Math.exp(-Math.max(0,dt)*13);
    currentAim.lerp(aim,k);currentYaw=T.MathUtils.lerp(currentYaw,yaw,k);currentPitch=T.MathUtils.lerp(currentPitch,pitch,k);currentRadius=T.MathUtils.lerp(currentRadius,radius,k);
    target.copy(currentAim);position.set(target.x+Math.sin(currentYaw)*Math.cos(currentPitch)*currentRadius,
      Math.max(.9,target.y+Math.sin(currentPitch)*currentRadius),target.z+Math.cos(currentYaw)*Math.cos(currentPitch)*currentRadius);
    return true;
  }
  return {capture,orbit,zoom,pan,dragPan,update,reset(){active=false;},get active(){return active;},get radius(){return radius;},
    get settling(){return active&&(Math.abs(yaw-currentYaw)+Math.abs(pitch-currentPitch)+Math.abs(radius-currentRadius)+aim.distanceTo(currentAim)>.0002);}};
}

// Extend the lower frustum behind the dialogue; preserve the original shot in
// the available area above it, including the crown in Chapter XI.
export function configureReadingFrustum(camera,width,height,reserve=0){
  const r=T.MathUtils.clamp(reserve,0,height*.46),available=Math.max(1,height-r);
  camera.aspect=width/available;camera.fov=camera.aspect<.8?57:46;
  if(r>0){camera.setViewOffset(width,available,0,0,width,height);camera.aspect=width/available;}
  else camera.clearViewOffset();
  camera.updateProjectionMatrix();return camera.aspect;
}

export function bindExploration(canvas,{begin,model,wake,enabled=()=>true,onReset=()=>{},onAdvance=()=>{},onTogglePlayback=()=>{}}){
  const pointers=new Map(),listeners=[];
  const listen=(name,handler,options)=>{canvas.addEventListener(name,handler,options);listeners.push([name,handler,options]);};
  const points=()=>[...pointers.values()];
  listen('pointerdown',e=>{if(!enabled())return;e.preventDefault();canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,pan:e.button===1||e.button===2||e.shiftKey});});
  listen('pointermove',e=>{
    const old=pointers.get(e.pointerId);if(!old||!enabled())return;
    const before=points(),dx=e.clientX-old.x,dy=e.clientY-old.y;
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,pan:old.pan||e.shiftKey});
    if(Math.abs(dx)+Math.abs(dy)<.01)return;begin();
    if(pointers.size===1){if(old.pan||e.shiftKey)model.dragPan(dx,dy,canvas.clientHeight);else model.orbit(dx,dy);}
    else {
      const after=points(),a=before[0],b=before[1],c=after[0],d=after[1];
      const previousGap=Math.hypot(a.x-b.x,a.y-b.y),gap=Math.hypot(c.x-d.x,c.y-d.y);
      if(gap>8&&previousGap>8)model.zoom(previousGap/gap);
      model.dragPan((c.x+d.x-a.x-b.x)/2,(c.y+d.y-a.y-b.y)/2,canvas.clientHeight);
    }wake();
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])listen(type,e=>pointers.delete(e.pointerId));
  listen('contextmenu',e=>e.preventDefault());
  listen('wheel',e=>{if(!enabled())return;e.preventDefault();begin();model.zoom(Math.exp(T.MathUtils.clamp(e.deltaY,-250,250)*.0015));wake();},{passive:false});
  listen('keydown',e=>{
    if(!enabled())return;const k=e.key.toLowerCase();
    if(!['arrowleft','arrowright','arrowup','arrowdown','w','a','s','d','+','=','-','0',' ','enter'].includes(k))return;
    e.preventDefault();e.stopPropagation();
    if(k==='0'){onReset();return;}if(k===' '){onTogglePlayback();return;}if(k==='enter'){onAdvance();return;}
    begin();const step=Math.max(.5,model.radius*.055);
    if(k==='a')model.pan(-step,0);if(k==='d')model.pan(step,0);if(k==='w')model.pan(0,step);if(k==='s')model.pan(0,-step);
    if(k==='arrowleft')model.orbit(-24,0);if(k==='arrowright')model.orbit(24,0);if(k==='arrowup')model.orbit(0,-14);if(k==='arrowdown')model.orbit(0,14);
    if(k==='+'||k==='=')model.zoom(.88);if(k==='-')model.zoom(1/.88);wake();
  });
  return ()=>{listeners.forEach(([n,h,o])=>canvas.removeEventListener(n,h,o));pointers.clear();};
}
