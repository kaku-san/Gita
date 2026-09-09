// Numeric integration checks. No browser or renderer is launched.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from '../web/vendor/three.module.min.js';
import {createSurroundings,groundHeight} from '../web/surroundings.js';

globalThis.fetch=async url=>{try{return new Response(await readFile(new URL(url)),{status:200});}catch{return new Response('',{status:404});}};
const approved=JSON.parse(await readFile(new URL('./approved-vishvarupa.json',import.meta.url)));
for(const [path,hash] of Object.entries(approved.files))assert.equal(createHash('sha256').update(await readFile(new URL('../web/'+path,import.meta.url))).digest('hex'),hash,'Approved scene changed: '+path);
for(const x of [-2.3,0,2.3])for(const z of [-3,0,10])assert.equal(groundHeight(x,z),-.027,'Hero floor remains level');
const rows=[];
for(const quality of ['high','low']){
  const field=await createSurroundings({quality});
  const compiled=new Map(),geometries=new Set(),materials=new Set();
  let triangles=0,drawObjects=0,instances=0;
  field.root.traverse(o=>{
    assert(!o.isCamera&&!o.isLight&&!o.isScene,'Environment does not own scene or lighting');
    if(o.geometry){
      drawObjects++;const g=o.geometry;
      if(o.isMesh)triangles+=(g.index?.count??g.attributes.position.count)/3*(o.isInstancedMesh?o.count:g.isInstancedBufferGeometry?g.instanceCount:1);
      if(!geometries.has(g)){
        for(const a of Object.values(g.attributes))for(const value of a.array)assert(Number.isFinite(value),'Finite geometry: '+o.name);
        if(g.index)for(const value of g.index.array)assert(value>=0&&value<g.attributes.position.count,'Valid index: '+o.name);
        geometries.add(g);
      }
    }
    if(o.isInstancedMesh){instances+=o.count;for(const n of o.instanceMatrix.array)assert(Number.isFinite(n));}
    else if(o.geometry?.isInstancedBufferGeometry)instances+=o.geometry.instanceCount;
    if(o.material)for(const material of Array.isArray(o.material)?o.material:[o.material]){
      if(materials.has(material))continue;materials.add(material);
      if(material.isMeshStandardMaterial){
        const shader={vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader,uniforms:{}};
        material.onBeforeCompile(shader);compiled.set(material,shader);
      }
    }
  });
  function motionSignature(){
    const hash=createHash('sha256');
    const data=a=>hash.update(Buffer.from(a.buffer,a.byteOffset,a.byteLength));
    const values=uniforms=>{for(const {value} of Object.values(uniforms??{})){
      if(typeof value==='number')hash.update(String(value));
      else if(value?.isDataTexture&&value.image?.data)data(value.image.data);
    }};
    field.root.traverse(o=>{
      hash.update(JSON.stringify([o.position.toArray(),o.quaternion.toArray(),o.scale.toArray(),o.visible]));
      if(o.instanceMatrix)data(o.instanceMatrix.array);
      if(o.geometry)for(const [name,a] of Object.entries(o.geometry.attributes))if(name==='position'||name.startsWith('a'))data(a.array);
    });
    for(const m of materials){values(m.uniforms);values(compiled.get(m)?.uniforms);}
    return hash.digest('hex');
  }
  const first=motionSignature();
  for(let i=1;i<=12;i++)field.update(i/30,1/30,true);
  assert.notEqual(motionSignature(),first,'Battlefield advances');
  const frozen=motionSignature();field.update(200,.1,false);assert.equal(motionSignature(),frozen,'Pause freezes all environment motion');
  const colors=[...materials].filter(m=>m.color).map(m=>[m,m.color.clone(),m.opacity]);
  field.setVision(1);field.setVision(0);
  for(const [m,color,opacity] of colors){assert(m.color.equals(color),'Vision restores base color');assert.equal(m.opacity,opacity,'Vision restores opacity');}
  assert(field.metadata.groundRadius>=2200,'Expanded ground supports the complete field');
  assert(field.metadata.horizon.nearestRadius>1556,'Horizon lies beyond all army corners');
  assert(field.metadata.recommendedCameraFar>field.metadata.skyRadius,'Far plane contains the sky');
  const framing=[];
  for(const [name,v] of Object.entries(field.metadata.fieldViews)){
    const camera=new T.PerspectiveCamera(57,390/844,.18,4000),distance=v.distance*1.25;
    camera.position.set(v.aim[0]+Math.sin(v.yaw)*Math.cos(v.pitch)*distance,v.aim[1]+Math.sin(v.pitch)*distance,v.aim[2]+Math.cos(v.yaw)*Math.cos(v.pitch)*distance);
    assert(camera.position.y>groundHeight(camera.position.x,camera.position.z)+1.5,'Field camera above terrain');
    camera.lookAt(new T.Vector3(...v.aim));camera.updateMatrixWorld(true);
    const height=name==='elephants'?5.8:name==='cavalry'?4:1.9;
    const top=new T.Vector3(v.aim[0],groundHeight(v.aim[0],v.aim[2])+height,v.aim[2]).project(camera);
    const bottom=new T.Vector3(v.aim[0],groundHeight(v.aim[0],v.aim[2]),v.aim[2]).project(camera);
    const pixels=Math.abs(top.y-bottom.y)*422;
    if(name!=='wide')assert(pixels>90,'Readable subject height on phone: '+name);
    else {
      const chariot=new T.Vector3(0,3.6,1.8).project(camera);
      assert(Math.abs(chariot.x)<.10&&Math.abs(chariot.y)<.10,'The chariot stays at the center of the whole field');
      const flanks=[new T.Vector3(-62,1.8,-190),new T.Vector3(64,1.8,-190)].map(p=>p.project(camera));
      assert(flanks.every(p=>Math.abs(p.x)<1&&Math.abs(p.y)<1),'Both armies visible in the wide phone view');
    }
    framing.push({view:name,subjectHeightPixels:Math.round(pixels),phone:[390,844]});
  }
  let disposedGeometry=0,disposedMaterial=0;
  for(const g of geometries)g.addEventListener('dispose',()=>disposedGeometry++);
  for(const m of materials)m.addEventListener('dispose',()=>disposedMaterial++);
  field.dispose();field.dispose();
  assert.equal(disposedGeometry,geometries.size,'Dispose geometry exactly once');
  assert.equal(disposedMaterial,materials.size,'Dispose material exactly once');
  rows.push({quality,triangles,drawObjects,instances,representedArmy:field.mass.metadata.representedSoldiers,framing});
}
const report={passed:true,checks:['Approved Vishvarupa and story hashes','Level hero floor','Finite attributes and instances','Valid indices','Shader hook composition','Battlefield motion','Pause','Vision color and opacity restoration','Phone subject size and terrain clearance','Central chariot and both flanks in wide view','Expanded world bounds','Repeated disposal'],browserQA:'not performed',variants:rows};
await writeFile(new URL('./battlefield-validation.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
