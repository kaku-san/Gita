import * as T from './vendor/three.module.min.js';
import {animalsV as V,animalsTau as TAU,animalsSurface as surface,animalsSweep as sweep,animalsEllipsoid as ell,animalsBox as box,animalsTube as tube,animalsTransform as transform,AnimalsBuilder} from './animals-geometry.js';

const clamp=T.MathUtils.clamp,lerp=T.MathUtils.lerp,smooth=(a,b,x)=>T.MathUtils.smoothstep(x,a,b),BONES=24;
const HORSE_FEET=[[-.32,.875],[.32,.945],[-.32,-1.17],[.32,-1.05]];
const ELEPHANT_FEET=[[-.76,1.01],[.76,1.01],[-.76,-1.48],[.76,-1.48]];
const PALETTE={skin:'#ac7953',bronze:'#a08b5e',gold:'#c1a05f',steel:'#a6b7b4',leather:'#322c27',red:'#792f31',cloth:'#b3a582',dark:'#282725',ivory:'#ddd2b0'};
const EYE='#171717';
async function animalsLoad(name){
 const base=new URL(`./animals-skin/${name}`,import.meta.url);
 const [mr,br]=await Promise.all([fetch(`${base}.json`),fetch(`${base}.bin`)]);
 if(!mr.ok||!br.ok)throw Error(`Battle animals: missing sculpture ${name}`);
 const [m,b]=await Promise.all([mr.json(),br.arrayBuffer()]);
 if(b.byteLength!==m.bytes)throw Error(`Battle animals: incomplete ${name}`);
 const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(new Float32Array(b,0,m.vertices*3),3));g.setAttribute('normal',new T.BufferAttribute(new Float32Array(b,m.vertices*12,m.vertices*3),3));g.setIndex(new T.BufferAttribute(new Uint32Array(b,m.vertices*24,m.indices),1));return g;
}
function animalsHorseJoints(i){const [x,z]=HORSE_FEET[i];return i<2?[
 V(x,1.76,.62),V(x,1.24,.80+(z-.91)),V(x,.85,.837+(z-.91)),V(x,.20,z-.035)
 ]:[V(x,1.69,-1.03),V(x,1.13,-1.02+(z+1.11)),V(x,.76,-1.30+(z+1.11)),V(x,.20,z-.06)];}
function animalsLegRig(y,joints,start,blendStart){
 if(y>=blendStart+.28)return [[0,0,0,0],[1,0,0,0]];
 if(y>blendStart){const w=smooth(blendStart,blendStart+.28,y);return [[0,start,0,0],[w,1-w,0,0]];}
 for(let j=1;j<joints.length;j++){
  const yy=joints[j].y;
  if(y>yy+.10)return [[start+j-1,0,0,0],[1,0,0,0]];
  if(y>yy-.10){const w=smooth(yy-.10,yy+.10,y);return [[start+j-1,start+j,0,0],[w,1-w,0,0]];}
 }
 return [[start+3,0,0,0],[1,0,0,0]];
}
function animalsHorseRig(x,y,z){
 if(y<1.98&&(z>.28||z<-.65)){
  const i=(z<-.65?2:0)+(x>0?1:0);return animalsLegRig(y,animalsHorseJoints(i),5+i*4,1.65);
 }
 const nw=smooth(2.1,2.7,y)*smooth(.08,.62,z),hw=Math.max(smooth(1.12,1.50,z),smooth(3.22,3.44,y)*smooth(.95,1.24,z));
 return [[0,1,2,0],[(1-nw)*(1-hw),nw*(1-hw),hw,0]];
}
function animalsRider(builder,sources,{position=[0,1.35,-.18],scale=1,cloth=PALETTE.red,mahout=false,bone=0,detail=true}={}){
 const add=(g,col=PALETTE.gold,opts={})=>builder.add(transform(g,position,scale),col,{bone,...opts});
 const body=sources.rider.clone();
 add(body,PALETTE.skin,{colorAt:(x,y,z,c)=>{
  const ly=(y-position[1])/scale;
  return c.set(ly<.45?PALETTE.leather:ly<1.20?PALETTE.cloth:ly<2.11?(mahout?cloth:PALETTE.bronze):PALETTE.skin);
 }});
 add(transform(sources.head,[0,2.58,0]),PALETTE.skin);
 // The approved continuous rider anatomy carries fitted armour and divided cloth.
 add(surface((u,v)=>{const a=u*TAU,fold=.009*Math.cos(a*14+v*3);return [(.347+.074*v+fold)*Math.cos(a),1.19+.80*v,(.26+fold)*Math.sin(a)];},detail?32:20,detail?12:7),mahout?cloth:PALETTE.bronze,{metalness:mahout?0:.45,roughness:.60});
 add(surface((u,v)=>{const a=u*TAU;return [.372*Math.cos(a),1.19+.105*v,.282*Math.sin(a)];},24,3),cloth);
 for(const s of [-1,1]){
  add(sweep([[s*.22,1.03,0],[s*.44,.87,.14],[s*.59,.70,.23],[s*.655,.22,.24]],t=>.16-.075*t,detail?18:10,detail?12:8),PALETTE.cloth);
  add(ell([s*.69,1.22,.14],[.085,.11,.07],10,7),PALETTE.skin);
  add(ell([s*.66,.07,.32],[.095,.075,.19],12,7),PALETTE.leather);
  if(!mahout)add(ell([s*.445,1.99,0],[.17,.10,.27],12,7),PALETTE.bronze,{metalness:.55});
  // Small dark eyes are distinct from the helmet, even at the focal LOD.
  add(ell([s*.084,2.606,.180],[.026,.012,.012],8,5),EYE);
  add(tube([s*.034,2.65,.170],[s*.13,2.64,.158],.012,6),PALETTE.dark);
 }
 add(ell([0,2.477,.19],[.065,.011,.014],8,5),'#714c39');
 // Rounded cap with a projecting brow, nasal strip and restrained plume.
 add(surface((u,v)=>{const a=u*TAU,p=.01+v*1.57;return [.231*Math.sin(p)*Math.cos(a),2.59+.305*Math.cos(p),.211*Math.sin(p)*Math.sin(a)-.014];},detail?28:16,detail?13:8),mahout?cloth:PALETTE.bronze,{metalness:mahout?0:.5,roughness:.54});
 if(!mahout){
  add(sweep([[-.21,2.62,.075],[-.15,2.66,.19],[0,2.675,.215],[.15,2.66,.19],[.21,2.62,.075]],.021,15,6),PALETTE.gold,{metalness:.6});
  add(tube([0,2.67,.216],[0,2.52,.211],.014,6),PALETTE.gold,{metalness:.5});
  add(sweep([[0,2.87,-.03],[0,3.11,-.09],[.035,3.23,-.20],[.085,3.15,-.35]],t=>.005+.072*Math.sin(Math.PI*t)**.6,14,8,.40),cloth);
 }
 if(mahout){
  add(sweep([[.70,1.25,.14],[.72,1.61,.17],[.68,1.84,.23]],.016,12,6),PALETTE.leather);
 }else{
  // Lance passes through the closed hand; pennant and steel head read above riders.
  add(tube([-.70,1.12,.14],[-.83,4.22,.22],.018,8),PALETTE.leather);
  add(sweep([[-.83,4.15,.22],[-.84,4.36,.23],[-.85,4.58,.235]],t=>.0004+.063*Math.sin(t*Math.PI),10,4,.27),PALETTE.steel,{metalness:.8,roughness:.29});
  const p=[[-.823,4.02,.222],[-.16,3.94,.22],[-.49,3.78,.23],[-.807,3.79,.22]];
  const flag=new T.BufferGeometry();flag.setAttribute('position',new T.Float32BufferAttribute(p.flat(),3));flag.setIndex([0,1,2,0,2,3]);flag.computeVertexNormals();add(flag,cloth);
  add(ell([.70,1.58,.11],[.028,.36,.32],16,12),cloth);
  add(ell([.734,1.58,.11],[.019,.09,.09],12,8),PALETTE.gold,{metalness:.7});
 }
}
function animalsHorseGeometry(sources,tack,high){
 const b=new AnimalsBuilder();
 b.add(sources.horse.clone(),'#d6d0bd',{rig:animalsHorseRig,tint:1,colorAt:(x,y,z,c)=>c.multiplyScalar(.88+.12*smooth(.14,1.10,y)).lerp(new T.Color('#71695f'),smooth(1.55,1.82,z)*(1-smooth(2.84,3.0,y))*.45)});
 const add=(g,c,options={})=>b.add(g,c,options);
 // Hooves are rigid level caps, with all four contacts driven independently.
 HORSE_FEET.forEach(([x,z],i)=>{
  add(surface((u,v)=>{const a=u*TAU,k=Math.sin(a);return [x+Math.cos(a)*lerp(.086,.058,v),.007+.118*v,z-.027*v+k*lerp(k>0?.122:.069,k>0?.074:.052,v)];},high?24:14,4),PALETTE.leather,{bone:8+i*4});
 });
 for(const s of [-1,1]){
  add(ell(tack[`eye${s}`],[.013,.030,.043],12,8),'#716b60',{bone:2});
  const eye=[...tack[`eye${s}`]];eye[0]+=s*.009;add(ell(eye,[.008,.021,.031],12,8),EYE,{bone:2});
  const nost=tack[`nostrilPatch${s}`][1];add(sweep(nost,.012,12,6), '#504b45',{bone:2});
  add(sweep(tack[`cheek${s}`],.018,high?18:10,6),PALETTE.leather,{bone:2});
  add(sweep(tack[`mouth${s}`],.004,10,4),'#706252',{bone:2});
  const ear=surface((u,v)=>{const a=u*TAU,w=.049*Math.sin(Math.PI*v)**.75;return [s*.108+Math.cos(a)*w+s*.018*v*v,3.458+.246*v,1.208+.017*v+Math.sin(a)*w*.43];},high?16:10,high?14:8);
  add(ear,'#dbd4c0',{bone:2,tint:1});
  const cheek=tack[`cheek${s}`];add(sweep([cheek[0],[s*.56,2.79,.8],[s*.70,2.70,.25],[s*.70,2.57,-.04]],.009,high?24:12,5),PALETTE.leather,{rig:animalsHorseRig});
 }
 for(const key of ['nose','crown']){
  const rows=tack[key],N=rows[0].length;
  add(surface((u,v)=>{const f=u*(N-1),i=Math.min(N-2,Math.floor(f)),row=v<.5?0:1,k=v<.5?v*2:(v-.5)*2;return V(...rows[row][i]).lerp(V(...rows[row][i+1]),f-i).lerp(V(...rows[row+1][i]).lerp(V(...rows[row+1][i+1]),f-i),k).toArray();},high?36:20,2),PALETTE.leather,{bone:2});
 }
 add(sweep(tack.breast,.025,high?24:14,6),PALETTE.leather);
 // The flowing closed mane follows the approved sculpted guides; broad ribbons
 // retain a coherent hair mass at distance, with no wire-like strand pile.
 const outer=tack.maneOuter,nu=outer.length,nv=outer[0].length;
 function mp(u,v){const a=u*(nu-1),j=Math.min(nu-2,Math.floor(a)),d=v*(nv-1),k=Math.min(nv-2,Math.floor(d));return V(...outer[j][k]).lerp(V(...outer[j][k+1]),d-k).lerp(V(...outer[j+1][k]).lerp(V(...outer[j+1][k+1]),d-k),a-j).toArray();}
 add(surface(mp,high?28:15,high?20:10),'#37322a',{bone:4});
 for(let i=0;i<(high?13:5);i++){
  const u=(i+.5)/(high?13:5);add(sweep(Array.from({length:12},(_,j)=>{const p=mp(u,j/11);p[0]+=.005;return p;}),.0035,12,4),'#625644',{bone:4});
 }
 for(let i=0;i<tack.forelock.length;i+=high?5:10)add(sweep(tack.forelock[i],t=>.003+.017*Math.sin(Math.PI*t),high?14:9,6,.40),'#393229',{bone:2});
 const tail=[[0,2.16,-1.55],[.01,1.92,-1.71],[.08,1.45,-1.83],[.12,.92,-1.86],[.17,.31,-1.75]];
 add(sweep(tail,t=>.004+.13*Math.sin(Math.PI*(.10+.9*t))**.8,high?36:20,high?14:9,.78),'#332d26',{bone:3});
 for(let i=0;i<(high?7:3);i++)add(sweep(tail.map((p,j)=>[p[0]+.04*Math.sin(i*TAU/7)*Math.sin(j*Math.PI/4),p[1],p[2]-.025*Math.cos(i*TAU/7)]),.009,high?24:16,4),'#665944',{bone:3});
 function blanket(u,v){const a=(u-.5)*Math.PI*1.12;return [Math.sin(a)*(.545+.012*Math.sin(v*24)),1.99+Math.cos(a)*.49,-.76+v*1.01];}
 add(surface(blanket,high?32:18,high?18:9),PALETTE.red);
 for(const v of [0,1])add(sweep(Array.from({length:25},(_,i)=>blanket(i/24,v)),.014,24,6),PALETTE.gold,{metalness:.55});
 add(ell([0,2.39,-.24],[.315,.085,.39],20,10),PALETTE.leather);
 add(sweep([[-.28,2.40,-.57],[0,2.51,-.64],[.28,2.40,-.57]],.041,18,8),PALETTE.leather);
 for(const s of [-1,1]){
  add(sweep([[s*.33,2.38,-.22],[s*.57,2.03,-.05],[s*.675,1.42,.06]],.018,12,6),PALETTE.leather);
  add(sweep([[s*.605,1.53,.08],[s*.61,1.40,.14],[s*.725,1.40,.14],[s*.73,1.53,.08]],.012,12,6),PALETTE.gold,{metalness:.5});
 }
 animalsRider(b,sources,{detail:high});return b.build();
}
function animalsElephantRig(x,y,z){
 if(z>2.08&&y<3.24){
  if(y>2.5){const w=smooth(2.5,3.15,y);return [[1,2,0,0],[w,1-w,0,0]];}
  if(y>1.45){const w=smooth(1.45,2.5,y);return [[2,3,0,0],[w,1-w,0,0]];}
  const w=smooth(.58,1.45,y);return [[3,4,0,0],[w,1-w,0,0]];
 }
 if(y<2.60&&(z>.45||z<-.9)){
  const i=(z<-.9?2:0)+(x>0?1:0),[lx,lz]=ELEPHANT_FEET[i];
  return animalsLegRig(y,[V(lx,2.45,lz-.18),V(lx,1.57,lz-.08),V(lx,.87,lz-.035),V(lx,.16,lz)],8+i*4,2.22);
 }
 const w=smooth(1.15,1.95,z)*smooth(2.38,2.9,y);return [[0,1,0,0],[1-w,w,0,0]];
}
function animalsElephantGeometry(sources,high){
 const b=new AnimalsBuilder(),add=(g,c,opts={})=>b.add(g,c,opts);
 add(sources.elephant.clone(),'#827b6d',{rig:animalsElephantRig,tint:1,colorAt:(x,y,z,c)=>c.multiplyScalar(.92+.06*Math.sin(y*23+z*5)*Math.sin(x*19)+.07*smooth(1,3.3,y))});
 // Small Asian ears: a curved double skin, with a folded rim and drooping lobe.
 for(const s of [-1,1]){
  const outline=[[s*.50,3.45,1.55],[s*.86,3.65,1.48],[s*1.25,3.45,1.25],[s*1.52,3.00,1.07],[s*1.40,2.56,1.09],[s*1.15,2.16,1.25],[s*.89,2.25,1.43],[s*.57,2.63,1.59],[s*.50,3.45,1.55]];
  const curve=new T.CatmullRomCurve3(outline.map(p=>V(...p)),true,'centripetal');
  const center=V(s*.78,2.95,1.53);
  for(const back of [false,true])add(surface((u,v)=>{const edge=curve.getPoint(u),p=center.clone().lerp(edge,v);p.z+=(back?-.024:.024)*Math.sin(v*Math.PI)+.11*Math.sin(v*Math.PI)*Math.sin(u*TAU);return p.toArray();},high?40:24,high?13:7),back?'#6e6a60':'#968775',{bone:s<0?6:7});
  add(sweep(outline,.024,high?40:24,6),'#827969',{bone:s<0?6:7});
  if(high)for(let j=1;j<6;j++)add(sweep([center.toArray(),center.clone().lerp(curve.getPoint(j/7),.5).add(V(0,0,.014)).toArray(),curve.getPoint(j/7).toArray()],.008,12,4),'#776f64',{bone:s<0?6:7});
  // Long graceful tusks grow from the maxilla, sweeping upward at the tips.
  add(sweep([[s*.38,2.54,2.02],[s*.50,2.30,2.47],[s*.61,2.18,2.99],[s*.66,2.36,3.45],[s*.60,2.57,3.69]],t=>.007+.13*(1-t)**.9,high?32:20,high?14:10),PALETTE.ivory,{bone:1,roughness:.4});
  add(ell([s*.575,3.10,1.89],[.043,.075,.105],14,9),'#686259',{bone:1});
  add(ell([s*.604,3.10,1.911],[.016,.030,.046],12,8),EYE,{bone:1});
  add(sweep([[s*.57,3.20,1.80],[s*.61,3.18,1.93],[s*.58,3.14,2.00]],.031,12,6),'#706b61',{bone:1});
 }
 // Horizontal trunk folds follow its own articulated sections.
 if(high)for(let j=0;j<15;j++){
  const t=j/14,y=2.71-1.85*t,z=2.31+.35*t,r=.29-.14*t;
  add(sweep(Array.from({length:9},(_,i)=>{const a=-.9+i/8*1.8;return [Math.sin(a)*r,y+.022*Math.cos(a),z+Math.cos(a)*r];}),.008,12,4),'#6d675e',{rig:animalsElephantRig});
 }
 for(let i=0;i<4;i++){const [x,z]=ELEPHANT_FEET[i];for(let k=-1;k<=1;k++)add(ell([x+k*.14,.15,z+.285-Math.abs(k)*.025],[.072,.092,.039],10,6),'#bbb19a',{bone:11+i*4,roughness:.7});}
 add(sweep([[0,2.62,-2.23],[.035,2.14,-2.48],[.09,1.51,-2.57],[.15,.95,-2.62]],t=>.055-.031*t,high?24:16,8),'#7b7467',{bone:5});
 add(sweep([[.15,1.12,-2.61],[.14,.80,-2.64],[.17,.52,-2.60]],t=>.009+.065*Math.sin(Math.PI*t),14,8),'#3c3931',{bone:5});
 function cloth(u,v){const a=(u-.5)*Math.PI*1.12,z=-1.82+2.63*v,fold=.018*Math.cos(v*36)*Math.abs(Math.sin(a));return [(1.115+fold)*Math.sin(a),2.59+Math.cos(a)*1.072,z];}
 add(surface(cloth,high?42:24,high?30:16),PALETTE.red);
 for(const u of [0,1])add(sweep(Array.from({length:30},(_,j)=>cloth(u,j/29)),.038,30,8),PALETTE.gold,{metalness:.58});
 for(const v of [0,1])add(sweep(Array.from({length:30},(_,j)=>cloth(j/29,v)),.029,30,8),PALETTE.gold,{metalness:.55});
 for(const s of [-1,1])for(let j=0;j<7;j++){
  const z=-1.67+j*.36;
  add(ell([s*1.105,2.42,z],[.019,.115,.085],10,7),PALETTE.gold,{metalness:.55});
  add(sweep([[s*1.10,2.18,z],[s*1.12,1.99,z]],.014,3,6),PALETTE.gold);
 }
 // Caparison covers the brow while leaving the twin domed forehead visible.
 add(surface((u,v)=>{const x=(u-.5)*.76,y=2.69+v*.86,z=2.20-.09*v-.25*(x/.5)**2;return [x,y,z];},high?20:12,high?20:12),PALETTE.red,{bone:1});
 for(const s of [-1,1])add(sweep([[s*.35,2.77,2.12],[s*.37,3.10,2.07],[s*.35,3.48,2.04]],.027,16,7),PALETTE.gold,{bone:1,metalness:.6});
 add(ell([0,3.08,2.20],[.13,.15,.031],16,10),PALETTE.gold,{bone:1,metalness:.65});
 // Howdah is engineered timber with a thick padded floor, four posts, pierced
 // rails, a vaulted textile canopy, and a central brass finial.
 add(box([0,3.78,-.50],[1.48,.21,1.87]),PALETTE.leather);
 add(box([0,3.94,-.50],[1.39,.16,1.77]),PALETTE.red);
 for(const x of [-.69,.69])for(const z of [-1.32,.32]){
  add(tube([x,3.85,z],[x,5.36,z],.050,10),PALETTE.gold,{metalness:.45});
  add(ell([x,5.38,z],[.077,.085,.077],10,7),PALETTE.gold,{metalness:.6});
 }
 for(const x of [-.69,.69]){
  for(const y of [4.12,4.57])add(tube([x,y,-1.32],[x,y,.32],.038,8),PALETTE.gold,{metalness:.5});
  for(let j=0;j<6;j++)add(tube([x,4.12,-1.23+j*.29],[x,4.57,-1.23+j*.29],.018,6),PALETTE.gold,{metalness:.45});
 }
 for(const z of [-1.32,.32])for(const y of [4.12,4.57])add(tube([-.69,y,z],[.69,y,z],.038,8),PALETTE.gold,{metalness:.5});
 add(surface((u,v)=>{const x=(u-.5)*1.74,z=-1.46+1.92*v;return [x,5.33+.34*Math.sin(u*Math.PI)-.045*Math.cos(v*6*Math.PI)*Math.sin(u*Math.PI),z];},high?28:16,high?18:10),PALETTE.red);
 for(const z of [-1.46,.46])add(sweep(Array.from({length:20},(_,i)=>{const u=i/19;return [(u-.5)*1.74,5.33+.34*Math.sin(u*Math.PI),z];}),.027,20,7),PALETTE.gold,{metalness:.5});
 add(ell([0,5.71,-.50],[.085,.11,.085],12,8),PALETTE.gold,{metalness:.7});
 add(tube([0,5.78,-.50],[0,5.91,-.50],.016,6),PALETTE.gold,{metalness:.6});
 animalsRider(b,sources,{position:[0,2.86,1.14],scale:.72,mahout:true,cloth:PALETTE.cloth,detail:high});
 animalsRider(b,sources,{position:[0,3.23,-.47],scale:.70,detail:high});
 return b.build();
}

function animalsPivot(pivot,axis,angle,translation=V()){
 const q=new T.Quaternion().setFromAxisAngle(axis,angle),p=V(...pivot),r=p.clone().applyQuaternion(q);
 return new T.Matrix4().compose(p.sub(r).add(translation),q,V(1,1,1));
}
function animalsSegmentMatrix(a,b,c,d){
 const q=new T.Quaternion().setFromUnitVectors(b.clone().sub(a).normalize(),d.clone().sub(c).normalize());
 return new T.Matrix4().compose(c.clone().sub(a.clone().applyQuaternion(q)),q,V(1,1,1));
}
function animalsSolveLeg(rest,start,end){
 const points=rest.map(p=>p.clone().add(start.clone().sub(rest[0]))),lengths=rest.slice(1).map((p,i)=>p.distanceTo(rest[i]));
 const max=lengths.reduce((a,b)=>a+b,0),distance=start.distanceTo(end);
 if(distance>max-.0001){
  const dir=end.clone().sub(start).normalize();points[0].copy(start);
  for(let j=1;j<points.length;j++)points[j].copy(points[j-1]).addScaledVector(dir,lengths[j-1]);
 }else{
  for(let n=0;n<28;n++){
   points.at(-1).copy(end);
   for(let j=points.length-2;j>=0;j--)points[j].sub(points[j+1]).normalize().multiplyScalar(lengths[j]).add(points[j+1]);
   points[0].copy(start);
   for(let j=1;j<points.length;j++)points[j].sub(points[j-1]).normalize().multiplyScalar(lengths[j-1]).add(points[j-1]);
   if(points.at(-1).distanceTo(end)<.00002)break;
  }
 }
 return points;
}
function animalsPath(a,t){
 if(a.kind==='elephant')return {x:a.x,z:a.z,yaw:a.yaw,speed:0};
 const w=.09,angle=t*w+a.pathPhase,base=a.pathPhase,rx=1.10,rz=2.55;
 const dx=rx*w*Math.cos(angle),dz=-rz*w*Math.sin(angle);
 return {x:a.x+rx*(Math.sin(angle)-Math.sin(base)),z:a.z+rz*(Math.cos(angle)-Math.cos(base)),yaw:Math.atan2(dx,dz),speed:Math.hypot(dx,dz)};
}
function animalsGroundWorld(a,local,path,ground){
 const s=Math.sin(path.yaw),c=Math.cos(path.yaw),x=path.x+a.scale*(c*local.x+s*local.z),z=path.z+a.scale*(-s*local.x+c*local.z);
 return V(x,ground(x,z),z);
}
function animalsContact(a,leg,t,ground){
 const period=2.9,stance=.70,offset=[0,.50,.75,.25][leg],phase=((t/period+offset+a.phase)%1+1)%1,begin=t-phase*period;
 const foot=HORSE_FEET[leg];
 function anchor(start){const path=animalsPath(a,start+period*stance*.5);return animalsGroundWorld(a,V(foot[0],0,foot[1]),path,ground);}
 const first=anchor(begin);
 if(phase<stance)return {world:first,stance:true,phase};
 const next=anchor(begin+period),u=(phase-stance)/(1-stance),e=u*u*(3-2*u),p=first.lerp(next,e);
 p.y=ground(p.x,p.z)+.15*a.scale*Math.sin(Math.PI*u);return {world:p,stance:false,phase};
}
function animalsInstallRig(material,texture,rows,vision,{depth=false}={}){
 const declarations=`
 uniform sampler2D animalsBoneTexture;
 attribute vec4 animalsBones;
 attribute vec4 animalsWeights;
 attribute float animalsRigIndex;
 mat4 animalsBone(float boneIndex){
  float y=(animalsRigIndex+0.5)/${rows.toFixed(1)};
  float x=boneIndex*4.0;
  return mat4(texture2D(animalsBoneTexture,vec2((x+0.5)/96.0,y)),
   texture2D(animalsBoneTexture,vec2((x+1.5)/96.0,y)),
   texture2D(animalsBoneTexture,vec2((x+2.5)/96.0,y)),
   texture2D(animalsBoneTexture,vec2((x+3.5)/96.0,y)));
 }
 mat4 animalsSkin(){return animalsWeights.x*animalsBone(animalsBones.x)+animalsWeights.y*animalsBone(animalsBones.y)+animalsWeights.z*animalsBone(animalsBones.z)+animalsWeights.w*animalsBone(animalsBones.w);}
 `;
 material.onBeforeCompile=shader=>{
  shader.uniforms.animalsBoneTexture={value:texture};shader.uniforms.animalsVision=vision;
  let prefix=declarations;
  if(!depth)prefix+=`attribute vec2 animalsSurface; attribute float animalsTintMask; attribute vec3 animalsCoat;
   varying vec2 vAnimalsSurface; varying vec3 vAnimalsCoat; varying float vAnimalsTintMask;`;
  shader.vertexShader=prefix+'\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`vec3 transformed=(animalsSkin()*vec4(position,1.0)).xyz;${depth?'':'vAnimalsSurface=animalsSurface; vAnimalsCoat=animalsCoat; vAnimalsTintMask=animalsTintMask;'}`);
  shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>','vec3 objectNormal=mat3(animalsSkin())*normal;');
  if(!depth){
   shader.fragmentShader='uniform float animalsVision; varying vec2 vAnimalsSurface; varying vec3 vAnimalsCoat; varying float vAnimalsTintMask;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n diffuseColor.rgb *= mix(vec3(1.0),vAnimalsCoat,vAnimalsTintMask); diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.002,.003,.009),animalsVision);');
   shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','float roughnessFactor=mix(vAnimalsSurface.x,.96,animalsVision);');
   shader.fragmentShader=shader.fragmentShader.replace('#include <metalnessmap_fragment>','float metalnessFactor=vAnimalsSurface.y*(1.0-animalsVision*.95);');
   shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n totalEmissiveRadiance += animalsVision*vec3(.001,.0015,.004);');
  }
 };
 material.customProgramCacheKey=()=>`battle-animals-rig-v3-${rows}-${depth}`;
}
function animalsBatch(root,geometry,animals,vision){
 const rows=animals.length,data=new Float32Array(BONES*16*rows),texture=new T.DataTexture(data,BONES*4,rows,T.RGBAFormat,T.FloatType);
 texture.minFilter=texture.magFilter=T.NearestFilter;texture.generateMipmaps=false;texture.needsUpdate=true;
 const ids=new Float32Array(rows),coats=new Float32Array(rows*3);
 animals.forEach((a,i)=>{ids[i]=i;const c=new T.Color(a.coat);coats.set([c.r,c.g,c.b],i*3);});
 geometry.setAttribute('animalsRigIndex',new T.InstancedBufferAttribute(ids,1));geometry.setAttribute('animalsCoat',new T.InstancedBufferAttribute(coats,3));
 const material=new T.MeshStandardMaterial({color:'#ffffff',vertexColors:true,roughness:.8,metalness:0,side:T.DoubleSide});
 animalsInstallRig(material,texture,rows,vision);
 const mesh=new T.InstancedMesh(geometry,material,rows);mesh.name=`${animals[0].kind} ${animals[0].lod} · continuous anatomy and mounted equipment`;
 mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
 const depth=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,side:T.DoubleSide}),distance=new T.MeshDistanceMaterial({side:T.DoubleSide});
 animalsInstallRig(depth,texture,rows,vision,{depth:true});animalsInstallRig(distance,texture,rows,vision,{depth:true});mesh.customDepthMaterial=depth;mesh.customDistanceMaterial=distance;root.add(mesh);
 return {mesh,animals,geometry,material,depth,distance,texture,data};
}
function animalsShadowBatch(root,animals,ground,vision){
 const geometry=new T.PlaneGeometry(1,1),material=new T.ShaderMaterial({transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,uniforms:{animalsVision:vision},
  vertexShader:'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);}',
  fragmentShader:'varying vec2 vUv; uniform float animalsVision; void main(){float r=length((vUv-.5)*2.);float a=pow(max(0.,1.-r*r),2.)*.27*(1.-animalsVision*.72);gl_FragColor=vec4(.105,.077,.047,a);}'
 });
 const mesh=new T.InstancedMesh(geometry,material,animals.length);mesh.name='Animal contact shadows';mesh.frustumCulled=false;mesh.renderOrder=1;root.add(mesh);return {mesh,geometry,material};
}
function animalsConfiguration(quality){
 const elephants=[[-16,30,.03],[20,40,-.30],[-18,-18,.10],[34,-22,-.15],[-48,70,.22],[44,94,-.2],[-63,110,.2],[65,142,-.25]];
 const cavalry=[[-24,60],[-23,43],[-27,77],[-23,-11],[-27,-22],[-22,-33],
  [-28,51],[-20,70],[-26,92],[-21,101],[-28,-9],[-22,-23],
  [26,67],[31,77],[26,88],[32,101],[26,114],[31,126],[27,139],[32,148],
  [-27,112],[-21,124],[-28,135],[-22,147],[-38,119],[-43,135],[-34,154],[-46,166],
  [41,119],[47,133],[40,150],[49,162]];
 const result=[];
 elephants.slice(0,quality==='high'?8:6).forEach(([x,z,yaw],i)=>result.push({id:`elephant-${i+1}`,kind:'elephant',x,z,yaw,scale:i<4?1:.96,phase:i*.37,pathPhase:0,lod:quality==='high'&&i<4?'high':'low',coat:['#bcb8aa','#a8a697','#b6b1a0','#b0aca1'][i%4]}));
 cavalry.slice(0,quality==='high'?32:24).forEach(([x,z],i)=>result.push({id:`cavalry-${i+1}`,kind:'horse',x,z,yaw:Math.PI,scale:.85+(i%3-1)*.022,phase:(i*.217)%1,pathPhase:Math.PI*.5+(i%2)*Math.PI,lod:quality==='high'&&i<6?'high':'low',coat:['#eee8d4','#7b5035','#aaa999','#685347','#c0b9a4','#876448','#626466','#97623b'][i%8]}));
 return result;
}

/** Build the equipped battle animals. Coordinates are metres, +Z anatomy faces
 * forward; terrain is supplied by the parent. All GPU skinning geometry is shared
 * per LOD. update(...,false) freezes roots, feet, cloth, trunk and ears exactly.
 */
export async function createBattleAnimals({quality='high',groundHeight=(x,z)=>0}={}){
 quality=quality==='high'?'high':'low';
 const root=new T.Group();root.name='Geeta · Mounted cavalry and war elephants';
 const ground=(x,z)=>{const y=groundHeight(x,z);return Number.isFinite(y)?y:0;};
 const configs=animalsConfiguration(quality),vision={value:0},batches=[],resources=[];
 const levels=quality==='high'?['high','low']:['low'];
 const tackResponse=await fetch(new URL('./animals-skin/horse-tack.json',import.meta.url));if(!tackResponse.ok)throw Error('Battle animals: missing approved horse tack');const tack=await tackResponse.json();
 for(const lod of levels){
  const [horse,elephant,rider,head]=await Promise.all(['horse','elephant','rider','head'].map(name=>animalsLoad(`${name}-${lod}`)));
  const sources={horse,elephant,rider,head};
  for(const kind of ['horse','elephant']){
   const list=configs.filter(a=>a.kind===kind&&a.lod===lod);if(!list.length)continue;
   const geometry=kind==='horse'?animalsHorseGeometry(sources,tack,lod==='high'):animalsElephantGeometry(sources,lod==='high');
   batches.push(animalsBatch(root,geometry,list,vision));
  }
  for(const g of Object.values(sources))g.dispose();
 }
 const shadows=animalsShadowBatch(root,configs,ground,vision),dummy=new T.Object3D(),inverse=new T.Matrix4();
 let elapsed=0,disposed=false,lastTime=null;const motionSamples=[];
 function pose(){
  motionSamples.length=0;
  for(const batch of batches){
   batch.animals.forEach((a,index)=>{
    const path=animalsPath(a,elapsed),groundY=ground(path.x,path.z);
    dummy.position.set(path.x,groundY,path.z);dummy.rotation.set(0,path.yaw,0);dummy.scale.setScalar(a.scale);dummy.updateMatrix();batch.mesh.setMatrixAt(index,dummy.matrix);inverse.copy(dummy.matrix).invert();
    const m=Array.from({length:BONES},()=>new T.Matrix4());
    const bodyY=a.kind==='horse'?-.105+.009*Math.sin(elapsed*TAU/2.9+a.phase*TAU):-.045+.007*Math.sin(elapsed*.67+a.phase);
    const shift=a.kind==='horse'?0:.017*Math.sin(elapsed*.33+a.phase);
    m[0].makeTranslation(shift,bodyY,0);
    if(a.kind==='horse'){
     m[1]=animalsPivot([0,2.14,.47],V(1,0,0),.008*Math.sin(elapsed*1.4+a.phase),V(0,bodyY,0));
     m[2]=animalsPivot([0,3.22,1.18],V(1,0,0),.016*Math.sin(elapsed*1.3+a.phase),V(0,bodyY,0));
     m[3]=animalsPivot([0,2.16,-1.55],V(0,0,1),.10*Math.sin(elapsed*1.14+a.phase),V(0,bodyY,0));
     m[4]=animalsPivot([0,3.25,.98],V(0,0,1),.018*Math.sin(elapsed*1.6+a.phase),V(0,bodyY,0));
    }else{
     m[1]=animalsPivot([0,2.86,1.36],V(1,0,0),.006*Math.sin(elapsed*.48+a.phase),V(shift,bodyY,0));
     m[2]=animalsPivot([0,2.73,2.30],V(0,0,1),.025*Math.sin(elapsed*.43+a.phase),V(shift,bodyY,0));
     m[3]=animalsPivot([0,2.12,2.49],V(0,0,1),.052*Math.sin(elapsed*.43+a.phase+.3),V(shift,bodyY,0));
     m[4]=animalsPivot([.03,1.12,2.64],V(1,0,0),.060*Math.sin(elapsed*.55+a.phase),V(shift,bodyY,0));
     m[5]=animalsPivot([0,2.62,-2.23],V(0,0,1),.055*Math.sin(elapsed*.62+a.phase),V(shift,bodyY,0));
     for(const s of [-1,1])m[s<0?6:7]=animalsPivot([s*.54,3.13,1.52],V(0,1,0),s*.060*Math.sin(elapsed*.74+a.phase),V(shift,bodyY,0));
    }
    const feet=a.kind==='horse'?HORSE_FEET:ELEPHANT_FEET;
    for(let leg=0;leg<4;leg++){
     const [x,z]=feet[leg];let contact;
     if(a.kind==='horse')contact=animalsContact(a,leg,elapsed,ground);
     else contact={world:animalsGroundWorld(a,V(x,0,z),path,ground),stance:true,phase:0};
     const foot=contact.world.clone().applyMatrix4(inverse);
     const rest=a.kind==='horse'?animalsHorseJoints(leg):[V(x,2.45,z-.18),V(x,1.57,z-.08),V(x,.87,z-.035),V(x,.16,z)];
     const target=foot.clone().add(rest.at(-1).clone().sub(V(x,0,z))),start=rest[0].clone().applyMatrix4(m[0]),points=animalsSolveLeg(rest,start,target),base=(a.kind==='horse'?5:8)+leg*4;
     for(let j=0;j<3;j++)m[base+j]=animalsSegmentMatrix(rest[j],rest[j+1],points[j],points[j+1]);
     // The final hoof/foot matrix remains level and exactly on the terrain, while
     // pastern and fetlock skin blend to its independent contact transform.
     m[base+3].makeTranslation(foot.x-x,foot.y,foot.z-z);
     const actual=V(x,0,z).applyMatrix4(m[base+3]).applyMatrix4(dummy.matrix);
     motionSamples.push({id:a.id,leg,stance:contact.stance,world:actual.toArray(),terrain:ground(actual.x,actual.z),solveError:points.at(-1).distanceTo(target)*a.scale});
    }
    m.forEach((matrix,j)=>matrix.toArray(batch.data,(index*BONES+j)*16));
   });
   batch.mesh.instanceMatrix.needsUpdate=true;batch.texture.needsUpdate=true;
  }
  configs.forEach((a,i)=>{const p=animalsPath(a,elapsed);dummy.position.set(p.x,ground(p.x,p.z)+.025,p.z);dummy.rotation.set(-Math.PI/2,0,-p.yaw);dummy.scale.set(a.kind==='horse'?1.40:3.05,a.kind==='horse'?3.42:5.25,1);dummy.updateMatrix();shadows.mesh.setMatrixAt(i,dummy.matrix);});
  shadows.mesh.instanceMatrix.needsUpdate=true;root.updateMatrixWorld(true);
 }
 function update(time,dt,animated=true){
  if(disposed||!animated){lastTime=Number.isFinite(time)?time:lastTime;return;}
  if(Number.isFinite(dt))elapsed+=clamp(dt,0,.20);
  else if(Number.isFinite(time)){elapsed+=lastTime===null?Math.max(0,time):Math.max(0,Math.min(.20,time-lastTime));}
  lastTime=Number.isFinite(time)?time:lastTime;pose();
 }
 function setVision(amount){vision.value=Number.isFinite(amount)?clamp(amount,0,1):0;}
 const metadata={version:2,quality,counts:{elephants:configs.filter(a=>a.kind==='elephant').length,cavalry:configs.filter(a=>a.kind==='horse').length,riders:configs.filter(a=>a.kind==='horse').length+configs.filter(a=>a.kind==='elephant').length*2},
  dimensions:{horseHeadHeight:3.15,mountedRiderHeight:4.03,lanceHeight:5.04,elephantShoulderHeight:3.60,elephantHowdahHeight:5.91},
  bounds:{min:[-68,-.20,-43],max:[71,6.65,174]},
  focalCameraAnchors:{elephant:{target:[-16,3.2,30],camera:[-5,7.6,19]},cavalry:{target:[-24,2.2,60],camera:[-13,5.4,48]},rearElephant:{target:[-18,3.1,-18],camera:[-8,6,-6]}},
  placements:configs.map(a=>({id:a.id,type:a.kind,x:a.x,z:a.z,scale:a.scale,lod:a.lod})),
  tracks:configs.map(a=>({id:a.id,minX:a.x-(a.kind==='horse'?5:2.2),maxX:a.x+(a.kind==='horse'?5:2.2),minZ:a.z-(a.kind==='horse'?7.5:4),maxZ:a.z+(a.kind==='horse'?7.5:4)})),
  protectedAreas:[{minX:-7,maxX:7,minZ:-12,maxZ:20},{minX:5,maxX:25,minZ:-32,maxZ:16}],
  geometryShared:true,rig:'CPU terrain-aware IK -> instanced bone texture; four independently planted contacts per animal',
  drawCalls:batches.length+1,renderedTriangles:batches.reduce((n,b)=>n+b.geometry.index.count/3*b.animals.length,0)+configs.length*2,
  sourceTriangles:batches.reduce((n,b)=>n+b.geometry.index.count/3,0),motion:'Cavalry walks compact closed elliptical patrols. Elephants stay planted with slow independent ear/trunk movement and weight transfer.'};
 root.userData.battleAnimals=metadata;pose();
 function dispose(){if(disposed)return;disposed=true;for(const b of batches){b.geometry.dispose();b.material.dispose();b.depth.dispose();b.distance.dispose();b.texture.dispose();}shadows.geometry.dispose();shadows.material.dispose();root.removeFromParent();root.clear();}
 return {root,update,setVision,metadata,dispose,
  inspect:()=>({elapsed,vision:vision.value,contacts:motionSamples.map(s=>({...s,world:[...s.world]})),boneTextures:batches.map(b=>b.data),instanceMatrices:batches.map(b=>b.mesh.instanceMatrix.array)})};
}
