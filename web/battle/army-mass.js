import * as T from './vendor/three.module.min.js';

// World-space ranks, in metres. Near soldiers have individual billboard centers;
// far soldiers repeat on short strips whose centers retain their actual depth.
// There are no textures, asset requests, per-soldier matrices, or scene changes.
const TAU = Math.PI * 2;
const clamp = (x, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return x - Math.floor(x); };
const RESERVES = [{ x: -58, z: -6, radius: 8 }, { x: 64, z: 14, radius: 8 }];

const VERTEX = `
attribute vec3 aCenter;
attribute vec4 aSpan;
attribute vec3 aSeed;
varying vec2 vLocal;
varying float vSpacing;
varying float vRow;
varying float vFaction;
varying float vDistance;
varying float vDetailed;
void main() {
  vec4 center = modelMatrix * vec4(aCenter, 1.0);
  vec2 toward = cameraPosition.xz - center.xz;
  float len = length(toward);
  vec2 right = len > 0.01 ? vec2(toward.y, -toward.x) / len : vec2(1.0,0.0);
  vec4 world = center;
  world.xz += right * position.x * aSpan.x;
  world.y += position.y * aSpan.y + position.x * aSeed.z;
  vLocal = vec2(aSpan.z + uv.x * aSpan.w, uv.y * aSpan.y);
  vSpacing = aSpan.x / aSpan.w;
  vRow = aSeed.x;
  vFaction = aSeed.y;
  vDetailed = aSpan.w < 1.5 ? 1.0 : 0.0;
  vDistance = length(cameraPosition.xyz - world.xyz);
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

const SHARED = `
uniform float uTime;
uniform float uVision;
uniform float uNight;
uniform vec3 uClothA;
uniform vec3 uClothB;
uniform vec3 uHaze;
varying vec2 vLocal;
varying float vSpacing;
varying float vRow;
varying float vFaction;
varying float vDistance;
varying float vDetailed;
float rnd(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7))) * 43758.5453); }
float capsule(vec2 p,vec2 a,vec2 b,float r) {
  vec2 q=p-a,d=b-a; return length(q-d*clamp(dot(q,d)/dot(d,d),0.0,1.0))-r;
}
float ellipse(vec2 p,vec2 c,vec2 r) { return (length((p-c)/r)-1.0)*min(r.x,r.y); }
vec3 atmosphere(vec3 color) {
  // Independent long-distance aerial perspective. The host's short local fog
  // cannot turn the surrounding army into an empty field at 248 metres.
  float haze = smoothstep(250.0,1800.0,vDistance)*0.34;
  color = mix(color,color*vec3(.23,.32,.49),uNight*.86);
  color = mix(color,uHaze,haze);
  return mix(color,vec3(0.0030,0.0034,0.0044),uVision);
}
`;

const SOLDIER_FRAGMENT = SHARED + `
void main() {
  float unit=floor(vLocal.x), seed=rnd(vec2(unit,vRow));
  float stature=0.95+0.095*rnd(vec2(unit+7.0,vRow));
  vec2 p=vec2((fract(vLocal.x)-0.5)*vSpacing,vLocal.y/stature);
  float lateral=(seed-0.5)*0.11;
  p.x-=lateral;
  float ripple=sin(uTime*0.85+vRow*0.071+unit*0.13);
  p.x-=0.013*ripple*smoothstep(0.75,1.48,p.y);
  float d=10.0;
  vec3 color=vec3(0.26,0.19,0.105);
  vec3 cloth=mix(uClothA,uClothB,vFaction);
  float tint=0.90+seed*0.17;
  // Separated feet and two tapered leg silhouettes remain human at distance.
  float legs=min(capsule(p,vec2(-.105,.90),vec2(-.160,.075),.046),
                 capsule(p,vec2(.105,.90),vec2(.174,.075),.046));
  if(legs<d){d=legs;color=vec3(.265,.164,.092)*tint;}
  float feet=min(ellipse(p,vec2(-.162,.048),vec2(.074,.045)),ellipse(p,vec2(.177,.048),vec2(.074,.045)));
  if(feet<d){d=feet;color=vec3(.10,.068,.036);}
  float waist=abs(p.x)-mix(.206,.157,clamp((p.y-.61)/.39,0.0,1.0));
  waist=max(waist,max(.61-p.y,p.y-1.0));
  if(waist<d){d=waist;color=cloth*(.87+.10*cos(p.x*57.0));}
  float torso=abs(p.x)-mix(.151,.215,clamp((p.y-1.0)/.44,0.0,1.0));
  torso=max(torso,max(.97-p.y,p.y-1.44));
  if(torso<d){d=torso;color=vec3(.32,.235,.119)*tint*(.94+.08*cos(p.x*8.0));}
  float neck=capsule(p,vec2(0,1.43),vec2(0,1.59),.044);
  if(neck<d){d=neck;color=vec3(.34,.205,.112)*tint;}
  float head=ellipse(p,vec2(0,1.661),vec2(.086,.124));
  if(head<d){d=head;color=vec3(.37,.235,.139)*tint;}
  float helmet=ellipse(p,vec2(0,1.741),vec2(.101,.075));
  helmet=max(helmet,1.712-p.y);
  if(helmet<d){d=helmet;color=mix(vec3(.40,.31,.175),cloth,.25)*tint;}
  float arms=min(capsule(p,vec2(-.21,1.405),vec2(-.28,1.13),.055),
                 capsule(p,vec2(.21,1.405),vec2(.28,1.15),.055));
  if(vDetailed>.5) arms=min(arms,min(capsule(p,vec2(-.28,1.13),vec2(-.255,1.31),.037),
                   capsule(p,vec2(.28,1.15),vec2(.245,1.28),.037)));
  if(arms<d){d=arms;color=vec3(.32,.194,.108)*tint;}
  // A shoulder-height dhal and a slender 2.6-metre spear are explicit shapes,
  // rather than large dots or a repeating generic triangle.
  float shield=ellipse(p,vec2(.244,1.218),vec2(.222,.237));
  if(shield<d){d=shield;color=vec3(.16,.119,.061)*(1.0+.20*clamp((p.y-1.0)*2.0,0.0,1.0));}
  float boss=ellipse(p,vec2(.244,1.218),vec2(.036,.039));
  if(boss<d){d=boss;color=vec3(.42,.335,.177);}
  float spearX=-.292+.051*(p.y-.6)+.008*ripple*max(0.0,p.y-1.25);
  float spear=max(abs(p.x-spearX)-.010,max(.47-p.y,p.y-2.48));
  if(spear<d){d=spear;color=vec3(.17,.109,.049);}
  float tip=max(abs(p.x-(-.292+.051*(2.49-.6)))-max(0.0,(2.64-p.y))*.21,max(2.46-p.y,p.y-2.64));
  if(tip<d){d=tip;color=vec3(.43,.435,.363);}
  // Opaque depth-tested silhouettes keep distant ranks behind nearer people.
  float aa=max(fwidth(d)*.65,.0005);
  if(d>aa*.12)discard;
  color*=mix(.91,1.08,clamp(.5-p.x*.75,0.0,1.0));
  gl_FragColor=vec4(atmosphere(color),1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const FLAG_FRAGMENT = SHARED + `
void main(){
  vec2 p=vec2((fract(vLocal.x)-.5)*vSpacing,vLocal.y);
  float seed=rnd(vec2(vLocal.x,vRow));
  float pole=max(abs(p.x+.30)-.021,max(-p.y,p.y-5.42));
  float wave=sin(uTime*1.05+vRow*.53+p.x*5.0)*.11;
  float banner=max(abs(p.x-.22)-.53,max(3.76+wave-p.y,p.y-5.23-wave*.35));
  banner=max(banner, p.x-.75+(.16*sin((p.y-3.7)*4.0)));
  float d=min(pole,banner);if(d>0.0)discard;
  vec3 color=pole<banner?vec3(.21,.143,.073):mix(uClothA,uClothB,vFaction)*(.88+.12*cos(p.x*8.0+uTime));
  gl_FragColor=vec4(atmosphere(color),1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const DUST_FRAGMENT = SHARED + `
void main(){
  vec2 uv=vec2(fract(vLocal.x),vLocal.y/7.0);
  float edges=pow(max(0.0,sin(uv.x*3.14159)*sin(uv.y*3.14159)),1.8);
  float swirl=.62+.24*sin(uv.x*21.0+uv.y*5.0+uTime*.12+vRow)+.12*sin(uv.x*47.0-uv.y*9.0);
  float alpha=edges*max(.15,swirl)*.030*(1.0-uVision);
  if(alpha<.001)discard;
  gl_FragColor=vec4(vec3(.48,.398,.270),alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

function makeBatch(name, entries, material) {
  const g = new T.InstancedBufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute([-.5,0,0,.5,0,0,.5,1,0,-.5,1,0],3));
  g.setAttribute('uv', new T.Float32BufferAttribute([0,0,1,0,1,1,0,1],2));
  g.setIndex([0,1,2,0,2,3]);
  const centers = new Float32Array(entries.length * 3), spans = new Float32Array(entries.length * 4), seeds = new Float32Array(entries.length * 3);
  const bounds = new T.Box3();
  for (let i=0;i<entries.length;i++) {
    const e=entries[i]; centers.set([e.x,e.y,e.z],i*3); spans.set([e.width,e.height,e.unit,e.units],i*4); seeds.set([e.row,e.faction,e.slope],i*3);
    bounds.expandByPoint(new T.Vector3(e.x-e.width*.5,e.y-Math.abs(e.slope)*.5,e.z-e.width*.5));
    bounds.expandByPoint(new T.Vector3(e.x+e.width*.5,e.y+e.height+Math.abs(e.slope)*.5,e.z+e.width*.5));
  }
  g.setAttribute('aCenter',new T.InstancedBufferAttribute(centers,3));
  g.setAttribute('aSpan',new T.InstancedBufferAttribute(spans,4));
  g.setAttribute('aSeed',new T.InstancedBufferAttribute(seeds,3));
  g.instanceCount=entries.length; g.boundingBox=bounds; g.boundingSphere=bounds.getBoundingSphere(new T.Sphere());
  const mesh=new T.Mesh(g,material); mesh.name=name; mesh.frustumCulled=true; mesh.castShadow=false; mesh.receiveShadow=false;
  return mesh;
}

/** Add surrounding armies without modifying detailed fighters, animals or terrain.
 * Vision=1 darkens figures to near-black and removes dust; Vision=0 restores the
 * exact initial uniforms. No built-in scene fog is used by this distant layer.
 */
export function createArmyMass({quality='high',groundHeight=()=>0}={}) {
  const low=quality==='low', extent=1100, spacing=low?1.40:1.22, rowSpacing=low?2.30:2.0, detailRadius=low?170:220;
  const stripCapacity=low?32:24, columns=Math.floor(extent*2/spacing), rows=Math.floor(extent*2/rowSpacing);
  const near=[],far=[],flags=[],dust=[];
  const ground=(x,z)=>{const h=groundHeight(x,z);return Number.isFinite(h)?h:0;};
  const sectors=Array.from({length:16},(_,i)=>({sector:i,fromDegrees:i*22.5,toDegrees:(i+1)*22.5,representedSoldiers:0,
    bands:[0,0,0,0],nearestRadius:Infinity,farthestRadius:0}));
  const radialBands=[[42,220],[220,500],[500,1000],[1000,1600]];
  const extents={minX:Infinity,maxX:-Infinity,minZ:Infinity,maxZ:-Infinity};
  let represented=0, reserveViolations=0, centerViolations=0, nearestRadius=Infinity, farthestRadius=0;
  const allowed=(x,z,sideFront)=>{
    if(Math.abs(x)<sideFront && Math.abs(z)<95+7*Math.sin(x*.026)+2*Math.sin(x*.14))return false;
    if(x*x+z*z<42*42)return false;
    if(Math.abs(x)<80&&Math.abs(z)<35)for(const p of RESERVES)if((x-p.x)**2+(z-p.z)**2<(p.radius+.65)**2)return false;
    return true;
  };
  function record(x,z,n) {
    const r=Math.hypot(x,z), angle=(Math.atan2(z,x)+TAU)%TAU, sector=sectors[Math.min(15,Math.floor(angle/TAU*16))];
    represented+=n;sector.representedSoldiers+=n;sector.nearestRadius=Math.min(sector.nearestRadius,r);sector.farthestRadius=Math.max(sector.farthestRadius,r);
    const band=r<220?0:r<500?1:r<1000?2:3;sector.bands[band]+=n;
    nearestRadius=Math.min(nearestRadius,r);farthestRadius=Math.max(farthestRadius,r);
    extents.minX=Math.min(extents.minX,x-(n-1)*spacing*.5);extents.maxX=Math.max(extents.maxX,x+(n-1)*spacing*.5);extents.minZ=Math.min(extents.minZ,z);extents.maxZ=Math.max(extents.maxZ,z);
  }
  function entry(x,z,width,unit,units,row,faction,height=2.78) {
    const y=ground(x,z)+.014, half=width*.5;
    return {x,y,z,width,height,unit,units,row,faction,slope:width>2?ground(x+half,z)-ground(x-half,z):0};
  }
  for(let row=0;row<rows;row++) {
    // One two-metre lane between broad companies, rather than isolated squares.
    if(row%54===53)continue;
    const rowBlock=Math.floor(row/54), z=-extent+(row+.5)*rowSpacing+(hash(rowBlock+71)-.5)*.62;
    const sideFront=50+6*Math.sin(z*.041)+2.6*Math.sin(z*.19);
    const stagger=(row%2)*spacing*.5+(hash(row+32)-.5)*.20;
    let runStart=-1,runCount=0,runFaction=0;
    const flush=()=>{
      if(!runCount)return;
      const x=-extent+(runStart+runCount*.5)*spacing+stagger;
      far.push(entry(x,z,runCount*spacing,runStart,runCount,row,runFaction));
      record(x,z,runCount);runCount=0;runStart=-1;
    };
    for(let col=0;col<columns;col++) {
      const x=-extent+(col+.5)*spacing+stagger;
      if(col%128>=126||!allowed(x,z,sideFront)){flush();continue;}
      const radius=Math.hypot(x,z), faction=x>0?1:0;
      if(radius<detailRadius){
        flush();
        const jx=x+(hash(col*3+row*11)-.5)*.11,jz=z+(hash(col*5+row*17)-.5)*.16;
        near.push(entry(jx,jz,spacing,col,1,row,faction));record(jx,jz,1);
        if(jx*jx+jz*jz<42*42)centerViolations++;
        for(const p of RESERVES)if((jx-p.x)**2+(jz-p.z)**2<p.radius*p.radius)reserveViolations++;
      }else{
        if(runCount&&(faction!==runFaction||runCount>=stripCapacity))flush();
        if(!runCount){runStart=col;runFaction=faction;}runCount++;
      }
      if(row%24===11&&col%64===31&&radius>74)flags.push(entry(x,z,1.70,col,1,row,faction,5.5));
    }
    flush();
  }
  near.sort((a,b)=>(a.x*a.x+a.z*a.z)-(b.x*b.x+b.z*b.z));
  far.sort((a,b)=>(a.x*a.x+a.z*a.z)-(b.x*b.x+b.z*b.z));
  for(let z=-975;z<=975;z+=150)for(let x=-975;x<=975;x+=150){
    if(Math.hypot(x,z)<230||hash(x+z*19)<.25)continue;
    dust.push(entry(x,z,100+hash(x-z*3)*38,0,1,x*.1+z*.03,x>0?1:0,7));
  }
  const root=new T.Group();root.name='Continuous surrounding army mass';
  const uniforms={uTime:{value:0},uVision:{value:0},uNight:{value:0},uClothA:{value:new T.Color(0x526669)},uClothB:{value:new T.Color(0x8e4430)},uHaze:{value:new T.Color(0x989b88)}};
  const material=(name,fragmentShader,transparent=false)=>{
    const m=new T.ShaderMaterial({name,uniforms,vertexShader:VERTEX,fragmentShader,side:T.DoubleSide,
      transparent,depthWrite:!transparent,depthTest:true,toneMapped:true,fog:false});
    m.forceSinglePass=true;return m;
  };
  const soldierMaterial=material('Depth-tested individual soldier silhouettes',SOLDIER_FRAGMENT);
  const flagMaterial=material('Standards through the depth of the army',FLAG_FRAGMENT);
  const dustMaterial=material('Very light moving battlefield dust',DUST_FRAGMENT,true);
  const meshes=[makeBatch('Individual near army ranks',near,soldierMaterial),makeBatch('Repeated distant army ranks',far,soldierMaterial),
    makeBatch('Army standards',flags,flagMaterial),makeBatch('Subtle distant dust',dust,dustMaterial)];
  meshes[3].renderOrder=3;for(const m of meshes)root.add(m);
  const worldBounds=new T.Box3();for(const m of meshes)worldBounds.union(m.geometry.boundingBox);
  const triangles=meshes.reduce((s,m)=>s+m.geometry.instanceCount*2,0);
  const bufferBytes=meshes.reduce((sum,m)=>sum+Object.values(m.geometry.attributes).reduce((s,a)=>s+a.array.byteLength,0)+(m.geometry.index?.array.byteLength||0),0);
  const metadata={version:1,quality:low?'low':'high',units:'metres',representedSoldiers:represented,
    distinctNearSoldiers:near.length,distantRepresentedSoldiers:represented-near.length,distantFormationStrips:far.length,
    flags:flags.length,dustPatches:dust.length,draws:meshes.length,triangles,bufferBytes,perSoldierMatrices:0,
    fieldExtents:extents,worldBoundingBox:{min:worldBounds.min.toArray(),max:worldBounds.max.toArray()},nearestRadius,farthestRadius,
    nominalSoldierHeight:1.80,soldierHeightRange:[1.725,1.898],spearHeightRange:[2.51,2.76],
    spacing:{acrossRank:spacing,betweenRanks:rowSpacing},detailRadius,stripCapacity,
    formation:'Broad staggered Cartesian ranks with narrow company lanes, irregular side fronts near x ±50, front and rear closure near z ±95; no circular ranks.',
    centralExclusionRadius:42,reserves:RESERVES,centerViolations,reserveViolations,
    angularSectors:sectors,radialBands,
    coverageMethod:'All represented strip counts are accumulated by world-center angular sector and radial band; individual near soldiers use their true jittered centers.',
    vision:'1 = near-black figures and zero dust; 0 = exact original uniforms.',
    haze:{start:250,end:1800,maximumBlend:.34,usesHostFog:false},
    capacities:meshes.map(m=>({name:m.name,instances:m.geometry.instanceCount,triangles:m.geometry.instanceCount*2}))};
  root.userData.armyMass=metadata;
  let elapsed=0,disposed=false;
  return {root,metadata,
    update(time,dt,animated=true){if(disposed||!animated)return;if(Number.isFinite(time))elapsed=Math.max(0,time);else if(Number.isFinite(dt))elapsed+=clamp(dt,0,.1);uniforms.uTime.value=elapsed;},
    setTimeOfDay(night,haze){uniforms.uNight.value=clamp(night);uniforms.uHaze.value.copy(haze);},
    setVision(value){uniforms.uVision.value=clamp(Number.isFinite(value)?value:0);},
    dispose(){if(disposed)return;disposed=true;for(const m of meshes)m.geometry.dispose();soldierMaterial.dispose();flagMaterial.dispose();dustMaterial.dispose();root.clear();}
  };
}
