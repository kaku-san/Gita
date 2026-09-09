import * as T from './vendor/three.module.min.js';
export const animalsV=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),animalsTau=Math.PI*2;
export function animalsSurface(fn,nu=24,nv=16){
 const p=[],ix=[];
 for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++)p.push(...fn(i/nu,j/nv));
 for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=j*(nu+1)+i,b=a+1,c=a+nu+1,d=c+1;ix.push(a,c,b,b,c,d);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();return g;
}
export function animalsSweep(points,radius,segments=20,sides=8,ellipse=1){
 const c=new T.CatmullRomCurve3(points.map(p=>Array.isArray(p)?animalsV(...p):p),false,'centripetal');
 const f=c.computeFrenetFrames(segments,false);
 return animalsSurface((u,t)=>{const a=u*animalsTau,i=Math.min(segments,Math.round(t*segments)),p=c.getPointAt(t),r=typeof radius==='function'?radius(t):radius;
  return p.addScaledVector(f.normals[i],Math.cos(a)*r).addScaledVector(f.binormals[i],Math.sin(a)*r*ellipse).toArray();},sides,segments);
}
export function animalsEllipsoid(c,r,segments=16,rings=10){const g=new T.SphereGeometry(1,segments,rings);g.scale(...r);g.translate(...c);return g;}
export function animalsBox(c,s){const g=new T.BoxGeometry(...s);g.translate(...c);return g;}
export function animalsTube(a,b,r,sides=8){return animalsSweep([a,b],r,1,sides);}
export function animalsTransform(g,position=[0,0,0],scale=1,rotation=[0,0,0]){
 const m=new T.Matrix4().compose(animalsV(...position),new T.Quaternion().setFromEuler(new T.Euler(...rotation)),Array.isArray(scale)?animalsV(...scale):animalsV(scale,scale,scale));return g.clone().applyMatrix4(m);
}
export class AnimalsBuilder{
 constructor(){this.parts=[];}
 add(g,color='#ffffff',{bone=0,rig=null,roughness=.79,metalness=0,tint=0,colorAt=null}={}){
  this.parts.push({g,color:new T.Color(color),bone,rig,roughness,metalness,tint,colorAt});return this;
 }
 build(){
  const sizes=this.parts.reduce((a,{g})=>[a[0]+g.attributes.position.count,a[1]+(g.index?.count??g.attributes.position.count)],[0,0]);
  const p=new Float32Array(sizes[0]*3),n=new Float32Array(sizes[0]*3),c=new Float32Array(sizes[0]*3),bone=new Float32Array(sizes[0]*4),weight=new Float32Array(sizes[0]*4),surf=new Float32Array(sizes[0]*2),tint=new Float32Array(sizes[0]),ix=new Uint32Array(sizes[1]);let vo=0,io=0;
  for(const s of this.parts){const g=s.g,ps=g.attributes.position,ns=g.attributes.normal;
   for(let i=0;i<ps.count;i++){const j=vo+i,x=ps.getX(i),y=ps.getY(i),z=ps.getZ(i);p.set([x,y,z],j*3);n.set([ns.getX(i),ns.getY(i),ns.getZ(i)],j*3);
    const col=s.colorAt?s.colorAt(x,y,z,s.color.clone()):s.color;c.set([col.r,col.g,col.b],j*3);
    const r=s.rig?s.rig(x,y,z):[[s.bone,0,0,0],[1,0,0,0]];bone.set(r[0],j*4);weight.set(r[1],j*4);surf.set([s.roughness,s.metalness],j*2);tint[j]=s.tint;
   }
   for(let i=0;i<(g.index?.count??ps.count);i++)ix[io++]=vo+(g.index?g.index.getX(i):i);vo+=ps.count;
  }
  const g=new T.BufferGeometry();
  for(const [name,data,size] of [['position',p,3],['normal',n,3],['color',c,3],['animalsBones',bone,4],['animalsWeights',weight,4],['animalsSurface',surf,2],['animalsTintMask',tint,1]])g.setAttribute(name,new T.BufferAttribute(data,size));
  g.setIndex(new T.BufferAttribute(ix,1));g.computeBoundingBox();g.computeBoundingSphere();
  g.userData.partTriangles=this.parts.map(s=>({color:s.color.getHexString(),triangles:(s.g.index?.count??s.g.attributes.position.count)/3}));
  for(const s of this.parts)s.g.dispose();this.parts.length=0;return g;
 }
}
