import * as T from './vendor/three.module.min.js';
import {createHorse} from './horse.js';
import {V,mesh,curve,thread,band,mergeStatic} from './geometry.js';

// The approved horse is an immutable dependency. This module owns only layout,
// harness and coordination; it never changes proportions, skinning or hair.
export const TEAM_POSITIONS=[-2.16,-.72,.72,2.16];
const PHASES=[0,1.7,3.9,6.1];

// Rounded rectangular leather, with stable buffers for moving rein endpoints.
function strap(parent,material,points,width=.026,thickness=.008,segments=72){
  const path=curve(points),profile=[[-.8,-1],[.8,-1],[1,-.6],[1,.6],[.8,1],[-.8,1],[-1,.6],[-1,-.6]];
  const g=new T.BufferGeometry(),positions=new Float32Array((segments+1)*8*3),ix=[];
  for(let i=0;i<segments;i++)for(let j=0;j<8;j++){
    const a=i*8+j,b=i*8+(j+1)%8,c=a+8,d=b+8;ix.push(a,b,c,b,d,c);
  }
  for(let j=1;j<7;j++){ix.push(0,j+1,j);const o=segments*8;ix.push(o,o+j,o+j+1);}
  g.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));g.setIndex(ix);
  const o=mesh(g,material,parent);o.frustumCulled=false;o.userData.flex=true;
  const p=V(),tangent=V(),up=V(),right=V(),a=V(),b=V();
  function refresh(){
    for(let i=0;i<=segments;i++){
      const t=i/segments;path.getPoint(t,p);path.getPoint(Math.max(0,t-.001),a);path.getPoint(Math.min(1,t+.001),b);
      tangent.subVectors(b,a).normalize();up.set(0,1,0).addScaledVector(tangent,-tangent.y).normalize();
      if(up.lengthSq()<.01)up.set(1,0,0);right.crossVectors(tangent,up).normalize();
      for(let j=0;j<8;j++){
        const k=(i*8+j)*3,u=profile[j][0]*width*.5,v=profile[j][1]*thickness*.5;
        positions[k]=p.x+up.x*u+right.x*v;positions[k+1]=p.y+up.y*u+right.y*v;positions[k+2]=p.z+up.z*u+right.z*v;
      }
    }
    g.attributes.position.needsUpdate=true;g.computeVertexNormals();
  }
  refresh();return {mesh:o,path,refresh};
}

export async function createHorseTeam({onProgress=()=>{}}={}){
  const root=new T.Group();root.name='Geeta · Four-horse team';
  const horses=[];
  // Yield between sculptures so the loading status can paint on smaller devices.
  for(let i=0;i<4;i++){
    const horse=await createHorse({phase:PHASES[i]});horse.root.position.x=TEAM_POSITIONS[i];
    // Immutable geometry can share GPU buffers; each horse keeps its own bones,
    // morph influence, materials and state. No decimation or sculpture edits.
    if(i){
      for(const part of ['body','mane']){horse[part].geometry.dispose();horse[part].geometry=horses[0][part].geometry;}
      const oldMap=horse.materials.coat.bumpMap;
      for(const material of Object.values(horse.materials))if(material.bumpMap===oldMap)material.bumpMap=horses[0].materials.coat.bumpMap;
      oldMap.dispose();
    }
    root.add(horse.root);horses.push(horse);onProgress(i+1,4);
    if(typeof requestAnimationFrame==='function')await new Promise(requestAnimationFrame);
  }
  const harness=new T.Group(),hardware=new T.Group();harness.name='Reins, traces and rear coupling';harness.add(hardware);root.add(harness);
  const leather=new T.MeshStandardMaterial({color:'#392326',roughness:.70});
  const brass=new T.MeshStandardMaterial({color:'#b99653',roughness:.35,metalness:.78});
  const wood=new T.MeshStandardMaterial({color:'#3e231a',roughness:.49,metalness:.04});
  const seam=new T.MeshStandardMaterial({color:'#a78b61',roughness:.84});
  function axle(x,y,z,length,radius,material){
    const o=mesh(new T.CylinderGeometry(radius,radius,length,24),material,hardware);o.rotation.z=Math.PI/2;o.position.set(x,y,z);return o;
  }
  // Four singletrees attach to a common evener, clear of both hooves and tails.
  axle(0,1.40,-2.95,4.65,.064,wood);
  for(const x of [-2.30,0,2.30])axle(x,1.40,-2.95,x? .085:.24,.073,brass);
  thread(hardware,brass,[[0,1.40,-2.95],[0,1.40,-3.10],[0,1.40,-3.22]],.030,12);
  band(hardware,brass,V(0,1.40,-3.31),V(0,1,0),.093,.017);
  const anchors={tow:new T.Object3D(),reinRest:new T.Object3D()};
  anchors.tow.name='Chariot tow coupling';anchors.tow.position.set(0,1.40,-3.31);
  anchors.reinRest.name='Rein handoff';anchors.reinRest.position.set(0,1.48,-3.10);root.add(...Object.values(anchors));
  root.updateMatrixWorld(true);
  const reins=[],traces=[],restLoops=new T.Group();harness.add(restLoops);
  const local=anchor=>root.worldToLocal(anchor.getWorldPosition(V()));
  for(let i=0;i<4;i++){
    const x=TEAM_POSITIONS[i],horse=horses[i];
    axle(x,1.40,-2.40,1.22,.038,wood);
    for(const s of [-1,1]){
      axle(x+s*.585,1.40,-2.40,.08,.047,brass);
      band(hardware,brass,V(x+s*.61,1.40,-2.38),V(0,1,0),.035,.007);
    }
    band(hardware,brass,V(x,1.40,-2.47),V(0,1,0),.07,.011);
    thread(hardware,brass,[[x,1.40,-2.51],[x,1.40,-2.68],[x,1.40,-2.88]],.019,12);
    band(hardware,brass,V(x,1.40,-2.95),V(0,1,0),.074,.011);
    for(const s of [-1,1]){
      const side=s<0?'Left':'Right';
      const tracePoints=[local(horse.anchors['trace'+side]),V(x+s*.60,1.88,.14),V(x+s*.64,1.69,-.85),V(x+s*.64,1.46,-1.82),V(x+s*.61,1.40,-2.38)];
      const trace=strap(harness,leather,tracePoints,.040,.012,56);trace.mesh.name=`Horse ${i+1} · ${side} trace`;traces.push(trace);
      // A restrained stitched edge, above the leather rather than coplanar.
      const c=trace.path;
      for(let k=2;k<54;k+=2){
        const a=c.getPoint(k/56),b=c.getPoint((k+.6)/56);a.y+=.014;b.y+=.014;a.x+=s*.007;b.x+=s*.007;
        thread(hardware,seam,[a,a.clone().lerp(b,.5),b],.0009,2);
      }
      const end=V((i-1.5)*.032+s*.012,1.48,-3.10);
      const points=[local(horse.anchors['bit'+side]),V(x+s*.54,2.86,1.24),V(x+s*.64,2.89,.56),V(x+s*.64,2.59,-.80),V(x+s*.64,2.49,-2.12),V(x*.57+s*.24,1.85,-2.66),end];
      const rein=strap(harness,leather,points,.021,.007,80);rein.mesh.name=`Horse ${i+1} · ${side} rein`;
      reins.push({...rein,anchor:horse.anchors['bit'+side],restEnd:end.clone(),horse:i,side:s});
      const loop=[];
      for(let j=0;j<=48;j++){const t=j/48*Math.PI*2;loop.push([end.x+.044*Math.sin(t),1.34+.14*Math.cos(t),-3.10-.026*Math.sin(t)]);}
      thread(restLoops,leather,loop,.005,48);
    }
  }
  mergeStatic(hardware);mergeStatic(restLoops); // Dynamic straps remain separate.
  let attention=false,transitionAge=0,driverAnchor=null;
  const inverse=new T.Matrix4();
  function refreshReins(){
    root.updateWorldMatrix(true,true);inverse.copy(root.matrixWorld).invert();
    for(const rein of reins){
      rein.anchor.getWorldPosition(rein.path.points[0]).applyMatrix4(inverse);
      const end=rein.path.points.at(-1);
      if(driverAnchor){
        // Caller provides a world-space target, including parented/moving raths.
        end.copy(driverAnchor).applyMatrix4(inverse);end.x+=(rein.horse-1.5)*.024+rein.side*.018;
        const guide=rein.path.points.at(-2);guide.set(TEAM_POSITIONS[rein.horse]*.57+rein.side*.24,(2.49+end.y)*.5-.08,-2.66);
      }else{end.copy(rein.restEnd);rein.path.points.at(-2).set(TEAM_POSITIONS[rein.horse]*.57+rein.side*.24,1.85,-2.66);}
      rein.refresh();
    }
  }
  function update(time,dt,animated=true){
    if(!animated)return;
    transitionAge+=Math.max(0,dt);
    for(let i=0;i<4;i++){
      if(transitionAge>=i*.18)horses[i].setLookAround(attention);
      horses[i].update(time,dt,true);
    }
    refreshReins();
  }
  update(0,0,true);
  return {root,horses,harness,reins,traces,anchors,
    setLookAround(value){attention=!!value;transitionAge=0;},
    setDriverAnchor(worldPosition){driverAnchor=worldPosition?.clone()??null;restLoops.visible=!driverAnchor;refreshReins();},
    getPose:()=>({attention,transitionAge}),update,
  };
}
