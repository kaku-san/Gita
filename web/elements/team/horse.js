import * as T from './vendor/three.module.min.js';
import {V,TAU,clamp,lerp,mesh,ell,curve,thread,surface,sweep,band,beads,mergeStatic} from './geometry.js';

const smooth=(a,b,x)=>T.MathUtils.smoothstep(x,a,b);
function weightsAt(y,z){
  const n=smooth(2.07,2.63,y)*smooth(-.02,.48,z);
  const h=Math.max(smooth(-.10,.09,.80*(z-1.16)+.57*(y-3.27)),smooth(1.30,1.48,z))*smooth(2.50,2.70,y)*smooth(.88,1.16,z);
  return [(1-n)*(1-h),n*(1-h),h,0];
}
let source;
async function loadSource(){
  if(!source)source=(async()=>{
    const urls=['horse.json','horse.bin','tack.json'].map(n=>new URL('./skin/'+n+'?v=4',import.meta.url));
    const responses=await Promise.all(urls.map(u=>fetch(u)));
    if(responses.some(r=>!r.ok))throw new Error('Horse sculpture could not be loaded');
    const [meta,bytes,tack]=await Promise.all([responses[0].json(),responses[1].arrayBuffer(),responses[2].json()]);
    if(bytes.byteLength!==meta.bytes)throw new Error('Incomplete horse sculpture');
    const g=new T.BufferGeometry(),n=meta.vertices;
    g.setAttribute('position',new T.BufferAttribute(new Float32Array(bytes,0,n*3),3));
    g.setAttribute('normal',new T.BufferAttribute(new Float32Array(bytes,n*12,n*3),3));
    g.setIndex(new T.BufferAttribute(new Uint32Array(bytes,n*24,meta.indices),1));
    return {geometry:g,tack};
  })().catch(e=>{source=null;throw e;});
  return source;
}

export async function createHorse({phase=0}={}){
  const {geometry,tack}=await loadSource(),root=new T.Group();root.name='Geeta · White horse';
  const mat=(color,roughness=.55,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
  const materials={coat:mat('#f0eee6',.67),hair:mat('#dce0da',.43),hairLight:mat('#f3f2e9',.42),hairShade:mat('#cbd1ca',.52),
    hoof:mat('#49413a',.65),coronet:mat('#b2a89a',.68),leather:mat('#422529',.6),gold:mat('#b99653',.31,.77),
    stitch:mat('#b3a184',.86),eye:mat('#161513',.17),lid:mat('#8b847a',.72),nostril:mat('#6b6260',.89),innerEar:mat('#afa29b',.88)};
  materials.innerEar.side=T.DoubleSide;materials.coat.vertexColors=true;materials.hair.side=T.DoubleSide;materials.hairLight.side=T.DoubleSide;
  const base=new T.Bone(),neck=new T.Bone(),head=new T.Bone();base.name='base';neck.name='neck';head.name='head';
  neck.position.set(...tack.neckPivot);head.position.copy(V(...tack.headPivot).sub(neck.position));base.add(neck);neck.add(head);root.add(base);
  const bodyGeometry=geometry.clone(),p=bodyGeometry.attributes.position,indices=[],weights=[],colors=[],breath=[],uv=[];
  const ivory=new T.Color('#ecebe5'),muzzle=new T.Color('#b9b3aa'),legTone=new T.Color('#d1ccc3'),c=new T.Color();
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    indices.push(0,1,2,0);weights.push(...weightsAt(y,z));
    uv.push((Math.atan2(x,y-1.98)/TAU+.5)*3,z*1.3);
    c.copy(ivory).lerp(muzzle,smooth(1.55,1.82,z)*(1-smooth(2.88,3.09,y))*.40).lerp(legTone,(1-smooth(.17,.53,y))*.45);
    const variation=.989+.011*Math.sin(x*17+Math.sin(z*9))*Math.sin(y*19-z*13);
    c.multiplyScalar(variation);colors.push(c.r,c.g,c.b);
    const b=Math.exp(-(((z+.14)/.82)**2+((y-1.73)/.45)**2))*smooth(1.17,1.50,y)*(1-smooth(.35,.85,z));
    breath.push(x*.012*b,.006*b,0);
  }
  bodyGeometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));
  bodyGeometry.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
  bodyGeometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));bodyGeometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
  bodyGeometry.morphAttributes.position=[new T.Float32BufferAttribute(breath,3)];bodyGeometry.morphTargetsRelative=true;
  const body=new T.SkinnedMesh(bodyGeometry,materials.coat);body.name='Continuous horse anatomy';body.castShadow=body.receiveShadow=true;root.add(body);
  root.updateMatrixWorld(true);body.bind(new T.Skeleton([base,neck,head]));body.frustumCulled=false;

  function rigHair(g,material,name){
    const p=g.attributes.position,si=[],sw=[];
    for(let i=0;i<p.count;i++){si.push(0,1,2,0);sw.push(...weightsAt(p.getY(i),p.getZ(i)));}
    g.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));
    const o=new T.SkinnedMesh(g,material);o.name=name;o.castShadow=o.receiveShadow=true;o.frustumCulled=false;root.add(o);o.bind(body.skeleton);return o;
  }

  // Detail parts are authored in standing coordinates, then attached without a jump.
  const headDetails=new T.Group(),neckDetails=new T.Group(),staticDetails=new T.Group();
  root.add(headDetails,neckDetails,staticDetails);
  function fittedBand(parent,rows){
    const nu=rows[0].length-1,positions=rows.flat(2),ix=[];
    for(let j=0;j<2;j++)for(let i=0;i<nu;i++){const a=j*(nu+1)+i;ix.push(a,a+1,a+nu+1,a+1,a+nu+2,a+nu+1);}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(ix);g.computeVertexNormals();
    const o=mesh(g,materials.leather,parent);o.material.side=T.DoubleSide;
    for(const row of [rows[0],rows[2]])thread(parent,materials.gold,row,.0025,nu);
    for(let i=2;i<nu-1;i+=3){
      const a=V(...rows[0][i]).lerp(V(...rows[2][i]),.22),b=V(...rows[0][i+1]).lerp(V(...rows[2][i+1]),.22);
      const centre=rows[1].reduce((v,p)=>v.add(V(...p)),V()).multiplyScalar(1/rows[1].length);
      const dir=V(...rows[1][i]).sub(centre).normalize();a.addScaledVector(dir,.003);b.addScaledVector(dir,.003);
      thread(parent,materials.stitch,[a,a.clone().lerp(b,.5),b],.0009,3);
    }
  }
  fittedBand(headDetails,tack.nose);fittedBand(headDetails,tack.crown);fittedBand(staticDetails,tack.girth);
  for(const s of [-1,1]){
    const pts=tack['cheek'+s];thread(headDetails,materials.leather,pts,.017,44);
    thread(headDetails,materials.gold,pts.map(p=>[p[0]+s*.011,p[1],p[2]]),.0025,44);
    const eye=V(...tack['eye'+s]);
    const eyelid=ell(headDetails,materials.lid,eye,[.010,.027,.043]);eyelid.rotation.x=-.35;
    const pupil=ell(headDetails,materials.eye,eye.clone().add(V(s*.006,0,.002)),[.007,.020,.033]);pupil.rotation.x=-.35;
    const rows=tack['nostrilPatch'+s],n=rows[0].length,ix=[],col=[];
    for(let j=0;j<rows.length;j++)for(let i=0;i<n;i++){
      const edge=smooth(.65,1,j/(rows.length-1)),c=new T.Color('#363230').lerp(new T.Color('#aaa59c'),edge*.82);col.push(c.r,c.g,c.b);
      if(j<rows.length-1&&i<n-1){const a=j*n+i;ix.push(a,a+n,a+1,a+1,a+n,a+n+1);}
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(rows.flat(2),3));g.setAttribute('color',new T.Float32BufferAttribute(col,3));g.setIndex(ix);g.computeVertexNormals();
    const noseMaterial=materials.nostril.clone();noseMaterial.color.set('#ffffff');noseMaterial.vertexColors=true;noseMaterial.side=T.DoubleSide;
    mesh(g,noseMaterial,headDetails);
    thread(headDetails,materials.lid,tack['mouth'+s],.0022,26);
    band(headDetails,materials.gold,V(...tack['bit'+s]),V(1,0,0),.036,.005);
  }
  // Discrete brow ornament, in the same metal family as the rath.
  const brow=V(...tack.crown[1][Math.round((tack.crown[1].length-1)/2)]);
  ell(headDetails,materials.gold,brow.clone().add(V(0,.005,.007)),[.040,.015,.045]);

  // A leather breast collar with stitched edges; no saddle on a chariot horse.
  const bc=curve(tack.breast);
  mesh(surface((u,v)=>{const q=bc.getPoint(u);q.y+=(v-.5)*.065;q.z+=.003*Math.sin(v*Math.PI);return q.toArray();},64,4),materials.leather,staticDetails);
  for(const o of [-.0325,.0325])thread(staticDetails,materials.gold,tack.breast.map(p=>[p[0],p[1]+o,p[2]+.004]),.003,60);
  for(const s of [-1,1]){
    const corner=s<0?tack.breast[0]:tack.breast.at(-1);
    thread(staticDetails,materials.leather,[corner,...tack['shoulder'+s]],.015,42);
    band(staticDetails,materials.gold,V(...tack['trace'+s]),V(1,0,0),.040,.005);
  }

  for(const s of [-1,1]){
    const cp=tack['cheek'+s];beads(headDetails,materials.gold,[cp[1],cp[3],cp[4]].map(p=>V(...p).add(V(s*.012,0,0))),.004);
    const trace=V(...tack['trace'+s]);
    const buckle=new T.Group();buckle.position.copy(trace).add(V(s*.008,0,-.042));
    const pts=[V(0,-.031,-.022),V(0,.031,-.022),V(0,.031,.022),V(0,-.031,.022),V(0,-.031,-.022)];
    thread(buckle,materials.gold,pts,.004,28);thread(buckle,materials.gold,[[0,-.027,0],[0,0,0],[0,.027,0]],.0028,8);staticDetails.add(buckle);
  }

  // Low, rounded horn walls follow the pastern. No exposed rings or bucket caps.
  const hoofs=[];
  for(const [x,z] of tack.feet){
    function hoofPoint(u,v){
      const a=u*TAU,k=Math.sin(a),rx=lerp(.085,.056,v),rz=lerp(k>0?.121:.065,k>0?.071:.050,v);
      return [x+Math.cos(a)*rx,.004+(.119-.01*k)*v,z-.027*v+k*rz];
    }
    const g=surface(hoofPoint,56,16),h=mesh(g,materials.hoof,staticDetails);hoofs.push(h);
    const cap=surface((u,v)=>{const p=hoofPoint(u,1);return [lerp(x,p[0],v),lerp(.123,p[1],v),lerp(z-.027,p[2],v)];},56,4);
    const top=mesh(cap,materials.hoof,staticDetails);top.material.side=T.DoubleSide;
    const sole=surface((u,v)=>{const p=hoofPoint(u,0);return [lerp(x,p[0],v),.004,lerp(z,p[2],v)];},56,3);mesh(sole,materials.hoof,staticDetails);
  }

  // Fine longitudinal variation is shaded into flowing masses, not thick tubes.
  function hairTexture(){
    const w=256,h=512,data=new Uint8Array(w*h*4),strands=[];
    let seed=9753;for(let i=0;i<w;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;strands.push(seed/4294967296);}
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const warp=2.8*Math.sin(y/h*8+x*.025),u=(x+warp+w)%w,i=Math.floor(u),f=u-i;
      const val=115+42*lerp(strands[i],strands[(i+1)%w],f)+4*Math.sin(y*.034+x*.6),k=(y*w+x)*4;
      data[k]=data[k+1]=data[k+2]=val;data[k+3]=255;
    }
    const map=new T.DataTexture(data,w,h);map.wrapS=map.wrapT=T.RepeatWrapping;map.generateMipmaps=true;map.minFilter=T.LinearMipmapLinearFilter;map.magFilter=T.LinearFilter;map.anisotropy=4;map.needsUpdate=true;return map;
  }
  const hairMap=hairTexture();
  for(const m of [materials.hair,materials.hairLight,materials.hairShade]){m.bumpMap=hairMap;m.bumpScale=.0017;m.roughness=.62;}
  materials.coat.bumpMap=hairMap;materials.coat.bumpScale=.00065;materials.coat.roughness=.73;
  const outer=tack.maneOuter,inner=tack.maneInner,nu=outer.length,nv=outer[0].length,N=nu*nv;
  const pos=[...outer.flat(2),...inner.flat(2)],muv=[],ix=[];
  for(let layer=0;layer<2;layer++)for(let u=0;u<nu;u++)for(let v=0;v<nv;v++)muv.push(u/(nu-1),v/(nv-1));
  function quad(a,b,c,d){ix.push(a,b,c,b,d,c);}
  for(let u=0;u<nu-1;u++)for(let v=0;v<nv-1;v++){
    const a=u*nv+v,b=a+1,c=a+nv,d=c+1;
    quad(a,b,c,d);quad(N+a,N+c,N+b,N+d);
  }
  for(let u=0;u<nu-1;u++){
    let a=u*nv,b=(u+1)*nv;quad(a,b,a+N,b+N);
    a=u*nv+nv-1;b=(u+1)*nv+nv-1;quad(a,a+N,b,b+N);
  }
  for(let v=0;v<nv-1;v++){
    let a=v,b=v+1;quad(a,a+N,b,b+N);
    a=(nu-1)*nv+v;b=a+1;quad(a,b,a+N,b+N);
  }
  const maneGeo=new T.BufferGeometry();maneGeo.setAttribute('position',new T.Float32BufferAttribute(pos,3));maneGeo.setAttribute('uv',new T.Float32BufferAttribute(muv,2));maneGeo.setIndex(ix);maneGeo.computeVertexNormals();
  const mane=rigHair(maneGeo,materials.hair,'Closed mane');
  const hairStrands=new T.Group();root.add(hairStrands);
  function manePoint(u,v){
    const uf=u*(nu-1),vf=v*(nv-1),i=Math.min(nu-2,Math.floor(uf)),j=Math.min(nv-2,Math.floor(vf));
    return V(...outer[i][j]).lerp(V(...outer[i][j+1]),vf-j).lerp(V(...outer[i+1][j]).lerp(V(...outer[i+1][j+1]),vf-j),uf-i);
  }
  for(let i=0;i<112;i++){
    const u=(i+.5)/112,pts=[];
    for(let j=0;j<=32;j++){
      const v=j/32,p=manePoint(u,v);p.x+=.003*Math.sin(v*Math.PI);pts.push(p);
    }
    thread(hairStrands,i%5?materials.hairShade:materials.hairLight,pts,.00085,38);
  }
  mergeStatic(hairStrands);
  for(const o of [...hairStrands.children])if(o.isMesh){
    const hair=rigHair(o.geometry,o.material,'Mane strands');o.removeFromParent();
  }
  hairStrands.removeFromParent();
  for(let i=0;i<tack.forelock.length;i+=3){
    const pts=tack.forelock[i];
    sweep(headDetails,materials.hair,pts,t=>.001+.023*Math.sin(Math.PI*(.20+.80*t))**.65,{segments:30,sides:14,ellipse:.40});
  }

  // Cupped ears remain independently articulated on the head bone.
  const ears=[];
  for(const s of [-1,1]){
    const ear=new T.Group();ear.position.set(s*.108,3.458,1.208);ear.rotation.z=-s*.10;
    mesh(surface((u,v)=>{
      const a=u*TAU,w=.048*Math.sin(Math.PI*v)**.75;
      return [Math.cos(a)*w+s*.012*v*v,v*.246,.017*v+Math.sin(a)*w*.43];
    },32,30),materials.hairLight,ear);
    mesh(surface((u,v)=>{
      const t=.12+v*.76,w=.034*Math.sin(Math.PI*t)**.8;
      const outer=.048*Math.sin(Math.PI*t)**.75;
      return [(u*2-1)*w+s*.012*t*t,t*.246,.017*t+outer*.43*Math.sqrt(Math.max(0,1-((u*2-1)*w/outer)**2))+.002];
    },14,24),materials.innerEar,ear);
    mergeStatic(ear);root.add(ear);head.attach(ear);ears.push(ear);
  }
  ell(staticDetails,materials.hair,V(0,2.15,-1.52),[.065,.084,.083]);
  const tail=new T.Group();tail.position.set(0,2.16,-1.545);root.add(tail);
  const tailPath=[[0,0,0],[.02,-.21,-.15],[.07,-.69,-.29],[.12,-1.20,-.27],[.14,-1.87,-.18]];
  const tailRadius=t=>.001+.141*Math.sin(Math.PI*(.10+.90*t))**.75;
  sweep(tail,materials.hair,tailPath,tailRadius,{segments:90,sides:56,ellipse:.82,fold:.004});
  const tc=curve(tailPath),frames=tc.computeFrenetFrames(64,false);
  for(let i=0;i<11;i++){
    const a=i/11*TAU,pts=[];
    for(let j=0;j<=36;j++){
      const t=j/36,p=tc.getPointAt(t),f=frames.normals[Math.round(t*64)],b=frames.binormals[Math.round(t*64)];
      const r=tailRadius(t)*.93+.005*Math.sin(t*11+i)*Math.sin(t*Math.PI);
      p.addScaledVector(f,Math.cos(a)*r).addScaledVector(b,Math.sin(a)*r*.82);pts.push(p);
    }
    sweep(tail,i%5?materials.hair:materials.hairLight,pts,t=>.0006+.013*Math.sin(Math.PI*t)**.65,{segments:54,sides:10,ellipse:.33});
  }
  mergeStatic(tail);mergeStatic(headDetails);mergeStatic(neckDetails);mergeStatic(staticDetails);
  head.attach(headDetails);neck.attach(neckDetails);
  // Attachments use local metres; all positions remain inspectable in world space.
  const anchors={};
  for(const [name,pos,parent] of [['bitLeft',tack['bit-1'],head],['bitRight',tack.bit1,head],['traceLeft',tack['trace-1'],base],['traceRight',tack.trace1,base]]){
    const a=new T.Object3D();a.name=name;a.position.set(...pos);root.add(a);parent.attach(a);anchors[name]=a;
  }
  let looking=false,look=0;
  const restEarZ=ears.map(o=>o.rotation.z);
  function update(time,dt,animated=true){
    if(!animated)return;
    const t=time+phase,delta=clamp(dt,0,.05);look=lerp(look,looking?1:0,1-Math.exp(-delta*2.5));
    body.morphTargetInfluences[0]=.5+.5*Math.sin(t*1.32);
    neck.rotation.set(.005*Math.sin(t*.79),.050*look+.003*Math.sin(t*.47),.004*Math.sin(t*.55));
    head.rotation.set(.009*Math.sin(t*.83)-.010*look,.080*look,.006*Math.sin(t*.62));
    ears.forEach((o,i)=>{const flick=Math.max(0,Math.sin(t*.67+i*2.4))**24;o.rotation.x=-.06+flick*.20;o.rotation.z=restEarZ[i]+(i?1:-1)*flick*.13;o.rotation.y=(i?1:-1)*(.04+.05*Math.sin(t*.43+i));});
    tail.rotation.z=.040*Math.sin(t*.70);tail.rotation.x=.022*Math.sin(t*.53);root.updateMatrixWorld(true);
  }
  update(0,0,true);
  return {root,body,mane,rig:{base,neck,head,ears,tail},materials,anchors,hoofs,
    setLookAround:value=>{looking=!!value;},getPose:()=>({looking,look}),update};
}
