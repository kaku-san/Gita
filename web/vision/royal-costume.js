import * as T from './vendor/three.module.min.js';
import {V,TAU,mesh,thread,surface,sweep,beads,mergeStatic} from './geometry.js';

// Small jewellery carries smooth normals at a resolution appropriate to its
// screen size; the coherent body keeps the majority of the geometry budget.
export function rounded(parent,mat,p,r){const large=Math.max(...r)>.09;const o=mesh(new T.SphereGeometry(1,large?20:10,large?14:8),mat,parent);o.position.copy(p);o.scale.set(...r);return o;}
export function ring(parent,mat,c,axis,r,width=.022){const o=mesh(new T.TorusGeometry(r,width,6,30),mat,parent);o.position.copy(c);o.quaternion.setFromUnitVectors(V(0,0,1),axis.clone().normalize());return o;}
const ell=rounded,band=ring;

export const palette={gold:0xb99653,pale:0xd6bd7c,ivory:0xe6ddbd,saffron:0xc67924,burgundy:0x692532,blue:0x294b72,hair:0x211b19};
export function materials(){return {
  gold:new T.MeshStandardMaterial({color:palette.gold,metalness:.78,roughness:.48}),
  pale:new T.MeshStandardMaterial({color:palette.pale,metalness:.71,roughness:.47}),
  ivory:new T.MeshStandardMaterial({color:palette.ivory,roughness:.85,side:T.DoubleSide}),
  saffron:new T.MeshStandardMaterial({color:palette.saffron,roughness:.82,side:T.DoubleSide}),
  burgundy:new T.MeshStandardMaterial({color:palette.burgundy,roughness:.82,side:T.DoubleSide}),
  hair:new T.MeshStandardMaterial({color:palette.hair,roughness:.86}),
  hairLight:new T.MeshStandardMaterial({color:0x3a2c23,roughness:.9}),
  wood:new T.MeshStandardMaterial({color:0x64472d,roughness:.74}),
  iron:new T.MeshStandardMaterial({color:0x6a6a60,metalness:.82,roughness:.55}),
  garnet:new T.MeshStandardMaterial({color:0x672c37,metalness:.32,roughness:.4}),
};}

// Cloth is formed as full three-dimensional wraps, with overlapping front and
// back tucks. Folds change continuously around the legs rather than facing only
// the museum camera.
export function dhoti(parent,m,{colour='ivory',long=true,regal=false}={}){
  const cloth=m[colour],bottom=long?.34:.74;
  for(const s of [-1,1]){
    mesh(surface((u,v)=>{
      const a=u*TAU,cy=1.62-(1.62-bottom)*v;
      const cx=s*(.20+.025*Math.sin(v*Math.PI));
      const fold=(.012+.012*Math.sin(v*Math.PI))*Math.sin(10*a+v*3)+.007*Math.sin(19*a-v*5);
      const rx=.248-.095*v+.028*Math.sin(v*Math.PI)+fold;
      const rz=.273-.114*v+.03*Math.sin(v*Math.PI)+fold*.68;
      return [cx+Math.cos(a)*rx,cy+.016*Math.sin(4*a+v*4)*Math.sin(v*Math.PI),Math.sin(a)*rz+.03];
    },72,40),cloth,parent);
    // Rounded gathered hems terminate above the feet.
    const hem=[];for(let j=0;j<=96;j++){const a=j/96*TAU;hem.push([s*.20+Math.cos(a)*(.153+.012*Math.sin(10*a+3)),bottom,Math.sin(a)*(.159+.008*Math.sin(10*a+3))+.03]);}
    thread(parent,regal?m.gold:m.saffron,hem,regal?.011:.008,96);
  }
  mesh(surface((u,v)=>{
    const a=u*TAU,y=1.81-v*.53;
    const rx=.291+.14*Math.sin(v*Math.PI*.8),rz=.205+.08*Math.sin(v*Math.PI*.9);
    const f=.015*Math.sin(13*a-v*4)+.006*Math.sin(27*a+v*5);
    return [Math.cos(a)*(rx+f),y+.055*Math.sin(a+.6)*v,Math.sin(a)*(rz+f)];
  },96,28),cloth,parent);
  // A fan of tucked fabric falls down the front; its curled lip exposes real thickness.
  mesh(surface((u,v)=>{
    const w=.23*(1-.42*v),x=(u-.5)*2*w;
    return [x,1.74-v*(1.74-bottom-.02)+.045*Math.sin(u*Math.PI)*v,.242+.06*Math.sin(v*Math.PI)+v*.025+.024*Math.cos(u*TAU*5+.5*v)*(1-.3*v)];
  },64,50),cloth,parent);
  for(const edge of [0,1]){
    const p=[];for(let i=0;i<=54;i++){const v=i/54,w=.23*(1-.42*v);p.push([(edge-.5)*2*w,1.74-v*(1.74-bottom-.02),.250+.06*Math.sin(v*Math.PI)+v*.025+.024*Math.cos(edge*TAU*5+.5*v)*(1-.3*v)]);}
    thread(parent,regal?m.gold:m.saffron,p,regal?.007:.005,58);
  }
  // Rear tuck leaves the cloth recognisable during orbit.
  mesh(surface((u,v)=>[(u-.5)*(.29-.1*v),1.75-v*.83,-.239-.045*Math.sin(v*Math.PI)-.024*Math.cos(u*TAU*4)] ,36,36),cloth,parent);
  const sash=[];for(let j=0;j<=128;j++){const a=j/128*TAU;sash.push([Math.cos(a)*.315,1.775+.028*Math.sin(a),Math.sin(a)*.235]);}
  thread(parent,regal?m.gold:m.saffron,sash,regal?.029:.027,128);
  if(regal){
    const dots=sash.filter((_,i)=>i%4===0).map(p=>V(p[0]*1.017,p[1],p[2]*1.035));beads(parent,m.pale,dots,.014);
    medallion(parent,m,V(0,1.76,.262),.065);
  }else{
    ell(parent,m.saffron,V(.12,1.75,.24),[.075,.041,.032]);
    thread(parent,m.saffron,[[.12,1.76,.25],[.20,1.62,.30],[.15,1.42,.33]],.021,28);
  }
}

export function medallion(parent,m,pos,r=.07){
  const g=new T.Group();g.position.copy(pos);parent.add(g);
  ell(g,m.gold,V(),[r,r,.025]);band(g,m.pale,V(0,0,.023),V(0,0,1),r*.79,.007);
  ell(g,m.garnet,V(0,0,.031),[r*.31,r*.42,.018]);
  const ps=[];for(let i=0;i<10;i++){const a=i/10*TAU;ps.push([Math.cos(a)*r*.8,Math.sin(a)*r*.8,.025]);}beads(g,m.pale,ps,r*.1);
  return g;
}

export function sacredThread(parent,m,{three=false}={}){
  for(let i=0;i<(three?3:1);i++){
    const d=i*.007;
    thread(parent,m.ivory,[[-.36+d,2.64,.078],[-.25+d,2.43,.271],[0+d,2.17,.288],[.35+d,1.91,.247],[.408,1.99,-.10],[.22,2.19,-.251],[-.05,2.46,-.25],[-.36+d,2.64,-.015],[-.36+d,2.64,.078]],.009,98);
  }
}

export function drape(parent,m,{colour='burgundy',gold=true}={}){
  // A broad, softly pleated shoulder cloth hangs behind the right arm and
  // curves across the front at the waist; every edge is a continuous curve.
  const path=new T.CatmullRomCurve3([V(-.38,1.16,-.30),V(-.40,1.8,-.33),V(-.43,2.36,-.24),V(-.40,2.64,.00),V(-.33,2.52,.21),V(-.13,2.18,.315),V(.24,1.96,.31),V(.42,1.68,.15),V(.44,1.22,-.01)]);
  const point=(u,v)=>{const p=path.getPointAt(v);const w=.12+.04*Math.sin(v*Math.PI);p.x+=(u-.5)*w*2;p.z+=.018*Math.cos(u*TAU*4)*(Math.sin(v*Math.PI)*.4+.6);return p.toArray();};
  mesh(surface(point,40,100),m[colour],parent);
  if(gold)for(const u of [.035,.965]){const pts=[];for(let i=0;i<=100;i++)pts.push(point(u,i/100));thread(parent,m.gold,pts,.007,100);}
  for(const v of [.01,.99]){
    for(let j=0;j<11;j++){const p=V(...point(j/10,v));thread(parent,gold?m.gold:m.ivory,[p,p.clone().add(V(.008,-.07,.005))],.004,5);}
  }
}

export function hair(parent,m,{topknot=false,beard=false}={}){
  const cap=(u,v)=>{
    const a=u*TAU;
    // Front hairline remains above the forehead, sides and back below the ears.
    const limit=.99+1.40*(.5-.5*Math.sin(a));
    const p=.028+v*limit;
    const wave=1+.023*Math.cos(19*a+p*5);
    return [Math.cos(a)*Math.sin(p)*.212*wave,3.135+Math.cos(p)*.302,Math.sin(a)*Math.sin(p)*.211*wave];
  };
  mesh(surface(cap,80,40),m.hair,parent);
  for(let j=0;j<24;j++){
    const pts=[];for(let i=0;i<=28;i++)pts.push(cap((j/24+.012*Math.sin(i/28*Math.PI))%1,.18+i/28*.80));
    thread(parent,j%5===0?m.hairLight:m.hair,pts,topknot?.008:.006,28);
  }
  if(topknot){
    ell(parent,m.hair,V(0,3.53,-.03),[.177,.175,.155]);
    for(let k=0;k<13;k++){
      const pts=[];for(let j=0;j<=48;j++){const a=j/48*TAU,yy=3.46+k*.014+.04*Math.sin(a*2+k*.8);pts.push([Math.cos(a)*(.13+.018*Math.sin(k)),yy,-.03+Math.sin(a)*.13]);}
      thread(parent,k%4===0?m.hairLight:m.hair,pts,.014,50);
    }
    band(parent,m.saffron,V(0,3.445,-.03),V(0,1,0),.137,.009);
    // Short sculpted locks sweep down the nape, following the back of the neck.
    for(let j=0;j<11;j++){const x=(j-5)*.034;thread(parent,j%4===0?m.hairLight:m.hair,[[x,3.20,-.20],[x*1.18,3.01,-.239],[x*1.20,2.76,-.18],[x*.98,2.66,-.16]],.017,38);}
  }
  if(beard){
    mesh(surface((u,v)=>{
      const a=(u-.5)*Math.PI*1.18,rr=(1-v)*.188+.018;
      return [Math.sin(a)*rr,3.012-v*.238+.025*Math.cos(a),.149+Math.cos(a)*(.087*(1-v)+.062)+.008*Math.cos(u*TAU*12)];
    },72,44),m.hair,parent);
    for(let j=0;j<21;j++){const a=(j/20-.5)*Math.PI*1.12;thread(parent,j%5===0?m.hairLight:m.hair,[[Math.sin(a)*.195,3.025,.149+Math.cos(a)*.087],[Math.sin(a)*.125,2.91,.209],[Math.sin(a)*.022,2.783,.21]],.006,24);}
    for(const s of [-1,1])thread(parent,m.hair,[[s*.006,3.064,.233],[s*.07,3.05,.24],[s*.12,3.035,.215]],.014,26);
  }
}

export function tilak(parent,m,{white=true}={}){
  const mat=white?m.ivory:m.burgundy;
  for(const s of [-1,1])thread(parent,mat,[[s*.030,3.31,.179],[s*.021,3.255,.210],[s*.015,3.228,.22],[0,3.218,.22]],.005,18);
  thread(parent,m.burgundy,[[0,3.29,.195],[0,3.242,.22]],.004,8);
}

export function ornaments(parent,m,{royal=false}={}){
  const neck=[];for(let j=0;j<=90;j++){const a=j/90*TAU;neck.push([Math.cos(a)*.205,2.71-.20*Math.max(0,Math.sin(a)),Math.sin(a)*.237]);}
  thread(parent,royal?m.gold:m.wood,neck,royal?.010:.007,90);
  const ps=neck.filter((_,i)=>i%3===0);beads(parent,royal?m.pale:m.wood,ps,royal?.015:.019);
  if(royal){
    medallion(parent,m,V(0,2.475,.253),.072);
    const chain=[];for(let j=0;j<=96;j++){const a=j/96*TAU;chain.push([Math.cos(a)*.30,2.56-.28*Math.max(0,Math.sin(a)),Math.sin(a)*.28]);}
    thread(parent,m.gold,chain,.009,96);beads(parent,m.pale,chain.filter((_,i)=>i%3===0),.012);
    for(const s of [-1,1]){
      band(parent,m.gold,V(s*.585,2.325,.014),V(s*.20,-.34,.03),.125,.019);
      band(parent,m.pale,V(s*.687,1.89,.10),V(s*.06,-.4,.09),.083,.017);
      medallion(parent,m,V(s*.574,2.31,.117),.033);
      const e=band(parent,m.gold,V(s*.267,3.00,.006),V(0,0,1),.059,.010);e.scale.set(.73,1,1);
      ell(parent,m.pale,V(s*.267,2.935,.009),[.016,.022,.018]);
    }
  }
}

export function crown(parent,m){
  const shape=(u,v)=>{
    const a=u*TAU,r=.220*(1-v)+.026*v+.044*Math.sin(v*Math.PI);
    return [Math.cos(a)*r*(1+.035*Math.cos(a*12)),3.345+v*.53,Math.sin(a)*r*.90];
  };
  mesh(surface(shape,96,56),m.gold,parent);
  for(const v of [0,.09,.2,.82,.96]){
    const pts=[];for(let j=0;j<=128;j++)pts.push(shape(j/128,v));thread(parent,m.pale,pts,v<.3?.009:.007,128);
  }
  for(let k=0;k<16;k++){
    const a=k/16*TAU,pts=[];for(let j=0;j<=52;j++){const v=j/52,p=V(...shape(k/16,v));p.add(V(Math.cos(a)*.008,0,Math.sin(a)*.008));pts.push(p);}
    thread(parent,m.pale,pts,.008,52);
    const pp=V(...shape(k/16,.135));pp.x*=1.033;pp.z*=1.033;ell(parent,m.garnet,pp,[.017,.024,.018]);
  }
  const finial=ell(parent,m.pale,V(0,3.91,0),[.048,.058,.048]);
  medallion(parent,m,V(0,3.426,.219),.054);
}

export function finish(root,humanoid,metadata){
  root.updateMatrixWorld(true);
  return {root,metadata,update(time,dt,animated=true){
    if(!animated)return;
    // Time is intentionally not applied to the root: accessories remain in
    // the sculpted grasp. The shared humanoid currently supplies subtle idle.
    if(humanoid?.update)humanoid.update(time,dt,true);
  }};
}
