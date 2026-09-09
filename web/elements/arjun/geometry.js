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


export {V,TAU,clamp,lerp,rnd,grain,mesh,ell,curve,thread,surface,sweep,band,beads,ringPoints,skinGeometry,mergeStatic};
