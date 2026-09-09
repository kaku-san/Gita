import * as T from './vendor/three.module.min.js';

const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),TAU=Math.PI*2;
const clamp=T.MathUtils.clamp,lerp=T.MathUtils.lerp;
let seed=3421;
const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};

function grain(kind){
  const n=128,data=new Uint8Array(n*n*4);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const a=(y*n+x)*4;
    const q=kind==='cloth'?130+22*Math.sin(x*Math.PI)+15*Math.sin(y*Math.PI*.5)+rnd()*32:150+rnd()*38;
    data[a]=data[a+1]=data[a+2]=q;data[a+3]=255;
  }
  const t=new T.DataTexture(data,n,n);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(kind==='cloth'?12:5,kind==='cloth'?12:5);t.needsUpdate=true;return t;
}

function mesh(g,m,parent){const o=new T.Mesh(g,m);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function ell(parent,mat,p,r){const m=mesh(new T.SphereGeometry(1,24,16),mat,parent);m.position.copy(p);m.scale.set(...r);return m;}
function curve(points){return new T.CatmullRomCurve3(points.map(p=>Array.isArray(p)?V(...p):p),false,'centripetal');}
function thread(parent,mat,pts,r=.004,segments=42){return mesh(new T.TubeGeometry(curve(pts),segments,r,7,false),mat,parent);}
function surface(fn,nu=64,nv=48){
  const pos=[],uv=[],idx=[];
  for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++){pos.push(...fn(i/nu,j/nv));uv.push(i/nu,j/nv);}
  for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=j*(nu+1)+i,b=a+1,c=a+nu+1,d=c+1;idx.push(a,c,b,b,c,d);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
function sweep(parent,mat,pts,radius,{segments=75,sides=48,fold=0,ellipse=.90}={}){
  const c=curve(pts),frames=c.computeFrenetFrames(segments,false);
  const g=surface((u,t)=>{
    const i=Math.min(segments,Math.round(t*segments)),a=u*TAU,p=c.getPointAt(t);
    let rr=typeof radius==='function'?radius(t):radius;
    rr+=fold*(.55*Math.cos(11*a+t*7)+.27*Math.sin(19*a-t*9)+.18*Math.cos(5*a+t*16));
    p.addScaledVector(frames.normals[i],Math.cos(a)*rr).addScaledVector(frames.binormals[i],Math.sin(a)*rr*ellipse);
    return p.toArray();
  },sides,segments);
  return mesh(g,mat,parent);
}
function band(parent,mat,c,axis,r,width=.022){
  const g=new T.TorusGeometry(r,width,10,64),o=mesh(g,mat,parent);o.position.copy(c);o.quaternion.setFromUnitVectors(V(0,0,1),axis.clone().normalize());return o;
}
function beads(parent,mat,points,r=.008){
  const g=new T.SphereGeometry(1,8,6),o=new T.InstancedMesh(g,mat,points.length),dummy=new T.Object3D();
  points.forEach((p,i)=>{dummy.position.copy(Array.isArray(p)?V(...p):p);dummy.scale.setScalar(r);dummy.updateMatrix();o.setMatrixAt(i,dummy.matrix);});
  o.castShadow=true;o.receiveShadow=true;o.instanceMatrix.needsUpdate=true;parent.add(o);return o;
}
function ringPoints(c,axis,r,n=36){
  const q=new T.Quaternion().setFromUnitVectors(V(0,0,1),axis.clone().normalize());
  return Array.from({length:n},(_,i)=>V(Math.cos(i/n*TAU)*r,Math.sin(i/n*TAU)*r,0).applyQuaternion(q).add(c));
}

async function skinGeometry(name){
  const [a,b]=await Promise.all([fetch(new URL(`./skin/${name}.json`,import.meta.url)),fetch(new URL(`./skin/${name}.bin`,import.meta.url))]);
  if(!a.ok||!b.ok)throw new Error('Unable to load the character surface.');
  const meta=await a.json(),buf=await b.arrayBuffer(),count=meta.vertices;
  if(buf.byteLength!==meta.bytes)throw new Error('Incomplete character surface.');
  const g=new T.BufferGeometry();
  g.setAttribute('position',new T.BufferAttribute(new Float32Array(buf,0,count*3),3));
  g.setAttribute('normal',new T.BufferAttribute(new Float32Array(buf,count*12,count*3),3));
  g.setIndex(new T.BufferAttribute(new Uint32Array(buf,count*24,meta.indices),1));
  return g;
}

// Merge static ornament surfaces by material, preserving the articulated groups.
function mergeStatic(group){
  group.updateMatrixWorld(true);const inv=group.matrixWorld.clone().invert(),sets=new Map(),remove=[];
  group.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||o.isSkinnedMesh||o.userData.flex)return;const m=o.material;if(Array.isArray(m))return;
    if(!sets.has(m))sets.set(m,[]);
    const g=o.geometry.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(inv,o.matrixWorld));sets.get(m).push(g);remove.push(o);
  });
  for(const [mat,gs] of sets){
    let nv=0,ni=0;for(const g of gs){nv+=g.attributes.position.count;ni+=g.index?g.index.count:g.attributes.position.count;}
    const ps=new Float32Array(nv*3),ns=new Float32Array(nv*3),us=new Float32Array(nv*2),ix=new Uint32Array(ni);let vo=0,io=0;
    for(const g of gs){const n=g.attributes.position.count;ps.set(g.attributes.position.array,vo*3);ns.set(g.attributes.normal.array,vo*3);if(g.attributes.uv)us.set(g.attributes.uv.array,vo*2);for(let j=0;j<(g.index?g.index.count:n);j++)ix[io++]=(g.index?g.index.array[j]:j)+vo;vo+=n;g.dispose();}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(ps,3));g.setAttribute('normal',new T.BufferAttribute(ns,3));g.setAttribute('uv',new T.BufferAttribute(us,2));g.setIndex(new T.BufferAttribute(ix,1));mesh(g,mat,group);
  }
  for(const o of remove){o.removeFromParent();o.geometry.dispose();}
}

export async function createKrishna(){
  const [bodyG,handG,footG]=await Promise.all(['body','hand','foot'].map(skinGeometry));
  const root=new T.Group();root.name='Krishna';
  const clothMap=grain('cloth'),goldMap=grain('gold');
  const M={
    skin:new T.MeshPhysicalMaterial({color:0x29456e,roughness:.58,metalness:.015,clearcoat:.035,clearcoatRoughness:.75}),
    gold:new T.MeshStandardMaterial({color:0xc79b45,metalness:.83,roughness:.32,bumpMap:goldMap,bumpScale:.0012}),
    paleGold:new T.MeshStandardMaterial({color:0xf0d390,metalness:.75,roughness:.30}),
    oldGold:new T.MeshStandardMaterial({color:0x654019,metalness:.70,roughness:.42}),
    saffron:new T.MeshPhysicalMaterial({color:0xc67317,roughness:.70,metalness:0,sheen:1,sheenColor:0xffb641,sheenRoughness:.52,bumpMap:clothMap,bumpScale:.0015,side:T.DoubleSide}),
    saffronLight:new T.MeshPhysicalMaterial({color:0xe49b2b,roughness:.63,metalness:0,sheen:1,sheenColor:0xffd16f,sheenRoughness:.5,bumpMap:clothMap,bumpScale:.0016,side:T.DoubleSide}),
    border:new T.MeshPhysicalMaterial({color:0xab762b,metalness:.48,roughness:.52,side:T.DoubleSide,bumpMap:clothMap,bumpScale:.001}),
    ruby:new T.MeshPhysicalMaterial({color:0x63182a,metalness:.25,roughness:.18,clearcoat:1}),
    sapphire:new T.MeshPhysicalMaterial({color:0x113960,metalness:.35,roughness:.12,clearcoat:1}),
    pearl:new T.MeshPhysicalMaterial({color:0xe7ddc3,metalness:.04,roughness:.29,clearcoat:.35}),
    hair:new T.MeshStandardMaterial({color:0x141115,roughness:.56}),
    hairLight:new T.MeshStandardMaterial({color:0x32251f,roughness:.55}),
    feather:new T.MeshStandardMaterial({color:0x375d3f,roughness:.6,side:T.DoubleSide}),
    featherGold:new T.MeshStandardMaterial({color:0x8a8b3f,roughness:.5,metalness:.14,side:T.DoubleSide}),
    teal:new T.MeshPhysicalMaterial({color:0x11797c,roughness:.42,metalness:.38}),
    darkEye:new T.MeshPhysicalMaterial({color:0x071f3e,roughness:.36,metalness:.15}),
    wood:new T.MeshStandardMaterial({color:0x292526,roughness:.72}),
  };
  const skin=new T.SkinnedMesh(bodyG,M.skin);skin.castShadow=skin.receiveShadow=true;root.add(skin);
  const R0=V(-.405,2.015,.005),R1=V(-.64,1.64,.20),R2=V(-.79,1.92,.50);
  const L0=V(.405,2.015,.005),L1=V(.55,1.57,.18),L2=V(.41,1.16,.48);
  const base=new T.Bone(),shoulder=new T.Bone(),elbow=new T.Bone(),wrist=new T.Bone(),neck=new T.Bone();
  base.name='Body';shoulder.name='Speaking shoulder';elbow.name='Speaking elbow';wrist.name='Speaking wrist';neck.name='Head';
  shoulder.position.copy(R0);elbow.position.copy(R1.clone().sub(R0));wrist.position.copy(R2.clone().sub(R1));neck.position.set(0,2.24,0);
  base.add(shoulder,neck);shoulder.add(elbow);elbow.add(wrist);skin.add(base);
  const skeleton=new T.Skeleton([base,shoulder,elbow,wrist,neck]);
  const pos=bodyG.attributes.position,weights=[],indices=[];const p=V();
  // Project the drape and necklaces onto the actual front of the sculpted body.
  const frontGrid=new Map(),cell=.014;
  for(let i=0;i<pos.count;i++){const x=Math.round(pos.getX(i)/cell),y=Math.round(pos.getY(i)/cell),key=x+','+y,z=pos.getZ(i);frontGrid.set(key,Math.max(frontGrid.get(key)??-.5,z));}
  const frontCache=new Map();
  function frontAt(ix,iy){const k=ix+','+iy;if(frontCache.has(k))return frontCache.get(k);let z=-.25;for(let a=-2;a<=2;a++)for(let b=-2;b<=2;b++)z=Math.max(z,frontGrid.get((ix+a)+','+(iy+b))??-.25);frontCache.set(k,z);return z;}
  function bodyFront(x,y){x/=cell;y/=cell;const ix=Math.floor(x),iy=Math.floor(y);return lerp(lerp(frontAt(ix,iy),frontAt(ix+1,iy),x-ix),lerp(frontAt(ix,iy+1),frontAt(ix+1,iy+1),x-ix),y-iy);}
  function distSegment(p,a,b){const d=b.clone().sub(a),t=clamp(p.clone().sub(a).dot(d)/d.lengthSq(),0,1);return {t,d:p.distanceTo(a.clone().addScaledVector(d,t))};}
  for(let i=0;i<pos.count;i++){
    p.fromBufferAttribute(pos,i);let b0=0,b1=0,w=0;
    if(p.y>2.20){b1=4;w=T.MathUtils.smoothstep(p.y,2.20,2.33);}
    else if(p.x<-.30){
      const a=distSegment(p,R0,R1),b=distSegment(p,R1,R2);
      if(b.d<a.d&&p.x<-.50){b0=2;b1=3;w=T.MathUtils.smoothstep(b.t,.80,1);if(b.t<.17){b0=1;b1=2;w=lerp(.5,1,b.t/.17);}}
      else{b0=0;b1=1;w=T.MathUtils.smoothstep(a.t,-.04,.28)*T.MathUtils.smoothstep(-p.x,.30,.46);if(a.t>.83){b0=1;b1=2;w=T.MathUtils.smoothstep(a.t,.83,1)*.5;}}
    }
    indices.push(b0,b1,0,0);weights.push(1-w,w,0,0);
  }
  bodyG.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));bodyG.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));skin.bind(skeleton);
  const breathe=Float32Array.from(pos.array);
  for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);const f=Math.exp(-(((y-1.82)/.29)**2))*Math.exp(-((x/.35)**6));breathe[i*3]+=x*.012*f;breathe[i*3+2]+=(z+.13)*.018*f;}
  bodyG.morphAttributes.position=[new T.BufferAttribute(breathe,3)];skin.updateMorphTargets();
  const rightHand=mesh(handG,M.skin,wrist);rightHand.rotation.z=.13;rightHand.rotation.y=-.30;
  const leftHand=mesh(handG.clone(),M.skin,root);leftHand.position.copy(L2);leftHand.rotation.set(2.15,.3,-.12);leftHand.scale.x=-1;
  const still=new T.Group();root.add(still);
  const head=new T.Group();root.add(head);
  const rightUpper=new T.Group(),rightWrist=new T.Group();root.add(rightUpper,rightWrist);

  // A relaxed seated pose, with the weight carried by the seat and two planted feet.
  const legRadius=t=>t<.38?lerp(.192,.167,t/.38):lerp(.167,.068,(t-.38)/.62);
  sweep(still,M.saffron,[[.15,1.12,-.01],[.30,1.10,.25],[.39,.98,.49],[.39,.64,.55],[.33,.235,.57]],legRadius,{fold:.009,ellipse:.92,segments:94});
  sweep(still,M.saffronLight,[[-.15,1.12,.015],[-.29,1.08,.28],[-.36,.95,.53],[-.34,.61,.60],[-.29,.23,.65]],legRadius,{fold:.010,ellipse:.93,segments:94});
  mesh(surface((u,v)=>{const side=u*2-1,w=lerp(.26,.39,v),crease=.018*Math.cos(u*TAU*7+v*4)*v;return [side*w,1.29-.29*v-.08*Math.sin(u*Math.PI)*Math.sin(v*Math.PI)+crease,.05+.57*v];},72,72),M.saffronLight,still);
  const waist=mesh(surface((u,v)=>{const a=u*TAU,y=lerp(1.10,1.30,v),r=.28+.031*Math.sin(v*Math.PI)+.007*Math.sin(a*22);return [Math.sin(a)*r,y,Math.cos(a)*(.201+.018*Math.sin(v*Math.PI))];},96,24),M.saffron,still);
  for(const [x,y,z,rot] of [[.33,.158,.655,.16],[-.29,.158,.735,-.13]]){const f=mesh(footG.clone(),M.skin,still);f.position.set(x,y,z);f.rotation.y=rot;}
  const apron=(u,v)=>{const w=lerp(.11,.145,v),x=(u-.5)*2*w,yy=lerp(1.285,.205,v)+.018*Math.sin(u*Math.PI*2),zz=.225+.475*T.MathUtils.smoothstep(v,0,.28)-.03*T.MathUtils.smoothstep(v,.55,1)+.019*Math.cos(u*Math.PI*12+v*2)*(.25+v);return [x,yy,zz];};
  mesh(surface(apron,56,80),M.saffronLight,still);
  for(const side of [.03,.97]){
    mesh(surface((u,v)=>apron(side+(u-.5)*.075,v),8,80),M.border,still);
    const ps=Array.from({length:65},(_,i)=>V(...apron(side,i/64)).add(V(0,0,.003)));
    beads(still,M.paleGold,ps,.0028);
  }

  // A continuous shoulder drape with its border woven into the surface.
  const frontDrape=(u,v)=>{
    const cx=lerp(.335,-.09,v),x=cx+(u-.5)*(.255-.04*v);
    const y=lerp(2.125,1.255,v)+.012*Math.cos(u*TAU);
    const z=bodyFront(x,y)+.027+.011*Math.sin(u*TAU*4+v*2)+.005*Math.cos(u*TAU*7);
    return [x,y,z];
  };
  mesh(surface(frontDrape,52,100),M.saffronLight,still);
  for(const edge of [.038,.962]){
    mesh(surface((u,v)=>frontDrape(edge+(u-.5)*.070,v),8,100),M.border,still);
    beads(still,M.paleGold,Array.from({length:92},(_,i)=>V(...frontDrape(edge,i/91)).add(V(0,0,.005))),.0029);
  }
  const backDrape=(u,v)=>{const y=lerp(2.10,.64,v),x=.33+Math.sin(v*Math.PI*.8)*.16+(u-.5)*lerp(.32,.53,v),z=-.11-.17*Math.sin(v*Math.PI*.83)+.028*Math.sin(u*TAU*4+v*3)*v;return [x,y+.03*Math.sin(u*TAU)*v,z];};
  const back=mesh(surface(backDrape,48,90),M.saffron,still);back.userData.flex=true;
  const backOriginal=Float32Array.from(back.geometry.attributes.position.array);
  for(const edge of [.025,.975])mesh(surface((u,v)=>backDrape(edge+(u-.5)*.035,v),5,70),M.border,still);
  // Shoulder turn unites front and rear fabric over the shoulder.
  mesh(surface((u,v)=>{const a=frontDrape(u,0),b=backDrape(u,0);return [lerp(a[0],b[0],v),lerp(a[1],b[1],v)+Math.sin(v*Math.PI)*.09,lerp(a[2],b[2],v)];},48,40),M.saffronLight,still);

  // Waist chain, necklaces, pearls and their central pendants.
  for(const yy of [1.246,1.220]){
    const pts=Array.from({length:81},(_,i)=>{const a=i/80*TAU;return V(Math.sin(a)*.301,yy-.018*Math.cos(a),Math.cos(a)*.224);});
    thread(still,M.gold,pts,.0065,100);
  }
  const buckle=ell(still,M.gold,V(0,1.225,.240),[.047,.050,.013]);ell(still,M.ruby,V(0,1.227,.253),[.019,.028,.006]);
  function jewelFront(x,y){let z=bodyFront(x,y)+.022;const v=clamp((2.125-y)/.87,0,1),cx=lerp(.335,-.09,v),u=(x-cx)/(.255-.04*v)+.5;if(u>=0&&u<=1)z=Math.max(z,frontDrape(u,v)[2]+.014);return z;}
  for(let k=0;k<3;k++){
    const pts=[];
    for(let i=0;i<=56;i++){const t=i/56,a=lerp(-1,1,t),x=a*(.245+k*.006),y=2.115-(.255+k*.087)*Math.sqrt(1-a*a),z=jewelFront(x,y);pts.push(V(x,y,z));}
    thread(still,k===1?M.paleGold:M.gold,pts,k===1?.0028:.004,90);
    if(k!==1)beads(still,k===0?M.gold:M.pearl,pts,.0065+(k===2?.002:0));
    else{const z=jewelFront(0,1.771);ell(still,M.gold,V(0,1.771,z),[.027,.040,.008]);ell(still,M.sapphire,V(0,1.775,z+.009),[.014,.024,.006]);}
  }
  const flowerChain=[];
  for(let i=0;i<75;i++){const t=i/74,a=lerp(-1,1,t),x=a*.233,y=2.075-.525*Math.sqrt(1-a*a);flowerChain.push(V(x,y,jewelFront(x,y)+.010));}
  beads(still,M.pearl,flowerChain,.0105);
  beads(still,M.ruby,flowerChain.filter((_,i)=>i%12<2),.0118);

  function armJewels(group,a,b){
    const axis=b.clone().sub(a).normalize(),c=a.clone().lerp(b,.34),r=.120;
    band(group,M.gold,c,axis,r,.012);band(group,M.paleGold,c.clone().addScaledVector(axis,.024),axis,r-.003,.0045);band(group,M.paleGold,c.clone().addScaledVector(axis,-.022),axis,r+.001,.0045);
    beads(group,M.paleGold,ringPoints(c,axis,r+.007,32),.007);
    const front=c.clone().add(V(0,0,r));ell(group,M.gold,front,[.042,.06,.011]);ell(group,M.ruby,front.clone().add(V(0,0,.012)),[.018,.028,.007]);
  }
  armJewels(rightUpper,R0,R1);armJewels(still,L0,L1);
  function bracelets(group,a,b){const axis=b.clone().sub(a).normalize();for(let i=0;i<5;i++){const c=b.clone().addScaledVector(axis,-.01-i*.017);band(group,i%2?M.paleGold:M.gold,c,axis,.049+i*.0014,i%2?.004:.006);if(i===2)beads(group,M.paleGold,ringPoints(c,axis,.053,22),.005);}}
  bracelets(rightWrist,R1,R2);bracelets(still,L1,L2);

  // Sculpted hair masses, with finer strands following the same flow.
  mesh(surface((u,v)=>{const a=.87+u*(TAU-1.74),th=.1+v*2.55;return [.207*Math.sin(th)*Math.sin(a),2.555+.287*Math.cos(th),-.014+.196*Math.sin(th)*Math.cos(a)];},72,50),M.hair,head);
  mesh(surface((u,t)=>{const a=1.05+u*(TAU-2.1),r=.216+.041*Math.sin(t*Math.PI)+.024*t+.007*Math.sin(a*22+t*7);return [Math.sin(a)*r,lerp(2.71,2.04,t)+.025*Math.sin(a*5)*t,Math.cos(a)*r-.024];},100,70),M.hair,head);
  for(let i=0;i<36;i++){
    const a=lerp(.89,TAU-.89,i/35),rr=.207+(.018*rnd()),endY=2.03+rnd()*.13;
    const points=[];
    for(let j=0;j<9;j++){const t=j/8,aa=a+.09*Math.sin(t*9+i),r=rr+.055*Math.sin(t*Math.PI)+.027*t;
      points.push([Math.sin(aa)*r,lerp(2.73,endY,t),Math.cos(aa)*r-.02+.02*Math.sin(t*7+i)]);}
    sweep(head,M.hair,points,t=>.030*Math.pow(Math.sin(Math.PI*Math.min(.999,t+.02)),.35)+.002,{sides:12,segments:48,ellipse:.66});
    for(let k=0;k<2;k++)thread(head,k===0?M.hairLight:M.hair,points.map((p,j)=>[p[0]+.008*(k?1:-1),p[1],p[2]+.012]),.0010,42);
  }
  // Earrings: small hoops supporting bell-shaped gold drops.
  for(const sign of [-1,1]){
    const x=sign*.205;
    band(head,M.gold,V(x,2.400,.011),V(0,0,1),.027,.0048);
    const bell=mesh(new T.LatheGeometry([new T.Vector2(.027,0),new T.Vector2(.029,.008),new T.Vector2(.019,.026),new T.Vector2(.007,.036)],40),M.gold,head);bell.position.set(x,2.319,.012);
    beads(head,M.pearl,ringPoints(V(x,2.32,.012),V(0,1,0),.026,11),.0045);
    ell(head,M.ruby,V(x,2.360,.036),[.007,.011,.004]);
  }

  // The crown has a formed metal shell, chased relief and a frontal crest.
  const crownPts=[[.205,2.693],[.219,2.715],[.215,2.753],[.199,2.782],[.191,2.833],[.166,2.892],[.128,2.952],[.082,3.012],[.027,3.054],[.006,3.060]].map(p=>new T.Vector2(...p));
  mesh(new T.LatheGeometry(crownPts,96),M.gold,head);
  for(const [y,r] of [[2.709,.218],[2.753,.216],[2.795,.197],[2.855,.184],[2.925,.144]]){
    band(head,M.paleGold,V(0,y,0),V(0,1,0),r,.0036);
    beads(head,M.paleGold,ringPoints(V(0,y+.006,0),V(0,1,0),r+.002,Math.round(r*TAU/.013)),.0039);
  }
  for(let i=0;i<24;i++){
    const a=i/24*TAU,points=[];
    for(let j=0;j<=25;j++){const t=j/25,rr=lerp(.199,.016,t),ang=a+.13*Math.sin(t*Math.PI);points.push([Math.sin(ang)*rr,2.79+t*.261,Math.cos(ang)*rr]);}
    thread(head,i%2?M.paleGold:M.oldGold,points,.003,35);
    const pos=V(Math.sin(a)*.217,2.730,Math.cos(a)*.217),jewel=ell(head,i%3?M.ruby:M.sapphire,pos,[.008,.012,.0035]);jewel.rotation.y=a;
  }
  // Repeated leaf-shaped raised ornament around the lower shell.
  for(let i=0;i<18;i++){
    const a=i/18*TAU,rr=.206,pts=[];
    for(let j=0;j<=32;j++){const t=j/32*TAU,w=.018*Math.sin(t),h=.026*Math.cos(t);pts.push([Math.sin(a)*rr+Math.cos(a)*w,2.786+h,Math.cos(a)*rr-Math.sin(a)*w]);}
    thread(head,M.paleGold,pts,.0025,34);
  }
  const crest=[];
  for(let i=0;i<=80;i++){const a=i/80*TAU;crest.push([Math.sin(a)*.092*(.78+.22*Math.cos(a)),2.895+.155*Math.cos(a),.197-.063*Math.max(0,Math.cos(a))]);}
  const crestFill=mesh(surface((u,v)=>{const a=u*TAU;return [Math.sin(a)*.092*(.78+.22*Math.cos(a))*v,2.895+.155*Math.cos(a)*v,.204-.063*Math.max(0,Math.cos(a))*v+.008*(1-v)];},72,24),M.gold,head);crestFill.material.side=T.DoubleSide;
  thread(head,M.oldGold,crest,.011,110);thread(head,M.paleGold,crest,.005,110);beads(head,M.paleGold,crest.filter((_,i)=>i%2===0),.0055);
  const crestPlate=ell(head,M.gold,V(0,2.865,.194),[.062,.106,.012]);
  ell(head,M.oldGold,V(0,2.874,.211),[.032,.051,.009]);ell(head,M.sapphire,V(0,2.874,.220),[.024,.039,.009]);
  for(const sign of [-1,1])for(let i=0;i<4;i++){
    const y=2.817+i*.029,pts=[];for(let j=0;j<=28;j++){const a=j/28*TAU;pts.push([sign*(.035+.015*Math.sin(a)),y+.019*Math.cos(a),.210]);}thread(head,M.paleGold,pts,.0022,28);
  }
  const brow=[];for(let i=0;i<55;i++){const x=lerp(-.198,.198,i/54),f=Math.sqrt(Math.max(0,1-(x/.21)**2));brow.push([x,2.699-.052*f,.168*f+.04]);}
  thread(head,M.gold,brow,.007,65);beads(head,M.pearl,brow.filter((_,i)=>i%3===0),.005);
  // A restrained tilak keeps the face intentionally minimal.
  thread(head,M.paleGold,[[-.009,2.642,.174],[-.009,2.616,.179],[0,2.600,.180],[.009,2.616,.179],[.009,2.642,.174]],.0025,30);

  const featherRoot=new T.Group();head.add(featherRoot);
  featherRoot.position.set(-.061,3.012,-.029);featherRoot.rotation.z=.26;featherRoot.rotation.y=-.20;
  const quill=curve([[0,0,0],[.002,.20,.005],[-.016,.40,.025],[-.031,.57,.027]]);
  thread(featherRoot,M.featherGold,[[0,0,0],[.002,.20,.005],[-.016,.40,.025],[-.031,.57,.027]],.002,65);
  for(let i=0;i<76;i++){
    const t=.19+i/75*.79,y=t*.57,w=.104*Math.pow(Math.sin((t-.15)/.85*Math.PI),.65),cx=-.03*t*t;
    for(const sign of [-1,1]){
      const pts=[[cx,y,.02*t],[cx+sign*w*.45,y+.026,.016],[cx+sign*w*.91,y+.057,.02],[cx+sign*w,y+.071,.017]];
      thread(featherRoot,i%4===0?M.featherGold:M.feather,pts,.00125,15);
    }
  }
  const spot=V(-.010,.351,.033);
  ell(featherRoot,M.featherGold,spot,[.061,.088,.004]);
  ell(featherRoot,M.teal,spot.clone().add(V(0,.004,.005)),[.048,.065,.004]);
  ell(featherRoot,M.darkEye,spot.clone().add(V(.002,.008,.010)),[.031,.044,.004]);
  ell(featherRoot,M.sapphire,spot.clone().add(V(.008,.015,.014)),[.015,.022,.003]);

  // A low, restrained seat locates the body in space.
  const seat=mesh(new T.CylinderGeometry(.53,.50,.17,96),M.wood,still);seat.position.set(0,.733,.035);seat.scale.z=.74;
  const cushion=ell(still,M.saffron,V(0,.86,.035),[.505,.095,.355]);
  for(const yy of [.66,.796]){const ring=band(still,M.oldGold,V(0,yy,.035),V(0,1,0),.515,.007);ring.scale.y=.74;}

  mergeStatic(still);mergeStatic(head);mergeStatic(rightUpper);mergeStatic(rightWrist);
  root.updateMatrixWorld(true);neck.attach(head);shoulder.attach(rightUpper);wrist.attach(rightWrist);
  let gesture=0,gestureTarget=0;
  const baseFeather=featherRoot.rotation.z;
  return {
    root,materials:M,
    setGesture(open){gestureTarget=open?1:0;},
    update(time,dt,animated=true){
      if(!animated)return;
      gesture=lerp(gesture,gestureTarget,1-Math.exp(-dt*2.2));
      shoulder.rotation.z=-.065*gesture+.008*Math.sin(time*.6);
      shoulder.rotation.x=-.045*gesture;
      elbow.rotation.x=lerp(.24,-.16,gesture)+.008*Math.sin(time*.85);
      elbow.rotation.z=.055*gesture;
      wrist.rotation.y=-.15*gesture;
      wrist.rotation.x=.12*gesture+.010*Math.sin(time*.7);
      neck.rotation.y=.055*Math.sin(time*.30)+.023*gesture;
      neck.rotation.z=-.013+.011*Math.sin(time*.40);
      skin.morphTargetInfluences[0]=.5+.5*Math.sin(time*1.35);
      // The cloth moves only at the free end; its shoulder stays anchored.
      const p=back.geometry.attributes.position;
      for(let i=0;i<p.count;i++){
        const yy=backOriginal[i*3+1],f=clamp((1.85-yy)/1.3,0,1)**2;
        p.setXYZ(i,backOriginal[i*3]+Math.sin(time*.85+yy*2)*.011*f,yy,backOriginal[i*3+2]+Math.sin(time*.95+backOriginal[i*3]*4)*.017*f);
      }
      p.needsUpdate=true;
      // Feather is merged with the crown; head movement carries its silhouette.
    },
  };
}
