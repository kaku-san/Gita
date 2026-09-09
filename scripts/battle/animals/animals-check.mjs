import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const here=path.dirname(fileURLToPath(import.meta.url));
globalThis.fetch=async url=>{try{const p=fileURLToPath(url),bytes=await fs.readFile(p);return {ok:true,json:async()=>JSON.parse(bytes),arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};}catch{return {ok:false};}};
const {createBattleAnimals}=await import('../../../web/battle/animals.js');
const T=await import('../../../web/vendor/three.module.min.js');
const report=[];
for(const quality of ['high','low']){
 const ground=(x,z)=>.09*Math.sin(x*.15)+.06*Math.cos(z*.09);
 const result=await createBattleAnimals({quality,groundHeight:ground});
 let vertices=0,meshes=0,rigAttributeError=0,maxContactError=0,maxSolveError=0,maxSkate=0;
 result.root.traverse(o=>{if(!o.isMesh)return;meshes++;const g=o.geometry;vertices+=g.attributes.position.count;
  for(const [name,a] of Object.entries(g.attributes)){for(const value of a.array)assert.ok(Number.isFinite(value),`${quality} finite ${name}`);}
  if(g.index)for(const idx of g.index.array)assert.ok(idx<g.attributes.position.count,'in-range triangle indices');
  if(g.attributes.animalsWeights){const w=g.attributes.animalsWeights.array,b=g.attributes.animalsBones.array;for(let i=0;i<w.length;i+=4){rigAttributeError=Math.max(rigAttributeError,Math.abs(w[i]+w[i+1]+w[i+2]+w[i+3]-1));for(let j=0;j<4;j++)assert.ok(b[i+j]>=0&&b[i+j]<24,'bone index');}}
  // Validate shader hook expansion against this exact local Three.js release.
  if(o.material.onBeforeCompile&&g.attributes.animalsWeights){
   for(const [material,key] of [[o.material,'standard'],[o.customDepthMaterial,'depth'],[o.customDistanceMaterial,'distanceRGBA']]){
    const lib=T.ShaderLib[key],shader={vertexShader:lib.vertexShader,fragmentShader:lib.fragmentShader,uniforms:{}};material.onBeforeCompile(shader);
    assert.ok(shader.vertexShader.includes('animalsSkin()*vec4(position'),'custom skinning inserted');
    assert.ok(shader.uniforms.animalsBoneTexture,'bone texture connected');
    assert.ok(!shader.vertexShader.includes('#include <begin_vertex>'),'stock begin vertex replaced');
   }
  }
 });
 assert.ok(rigAttributeError<1e-6);
 let previous=new Map();
 for(let frame=0;frame<900;frame++){
  result.update(frame/30,1/30,true);const state=result.inspect();
  for(const a of [...state.boneTextures,...state.instanceMatrices])for(const n of a)assert.ok(Number.isFinite(n),'finite animated transforms');
  for(const contact of state.contacts){
   const key=`${contact.id}-${contact.leg}`,old=previous.get(key);
   if(contact.stance){maxContactError=Math.max(maxContactError,Math.abs(contact.world[1]-contact.terrain));if(old?.stance)maxSkate=Math.max(maxSkate,Math.hypot(contact.world[0]-old.world[0],contact.world[2]-old.world[2]));}
   maxSolveError=Math.max(maxSolveError,contact.solveError);
   previous.set(key,contact);
  }
 }
 const state=result.inspect(),before=[...state.boneTextures,...state.instanceMatrices].map(a=>new Float32Array(a));
 for(let j=0;j<20;j++)result.update(45+j,.1,false);
 const frozen=result.inspect();assert.equal(frozen.elapsed,state.elapsed);
 [...frozen.boneTextures,...frozen.instanceMatrices].forEach((a,i)=>assert.deepEqual(a,before[i],'exact motion freeze'));
 result.setVision(.72);assert.equal(result.inspect().vision,.72);
 assert.ok(maxContactError<1e-5,'planted contacts meet terrain');
 assert.ok(maxSkate<1e-5,'stance feet do not skate');
 assert.ok(maxSolveError<.02,'articulated leg reaches remain within 2 cm');
 assert.ok(result.metadata.renderedTriangles<(quality==='high'?1400000:700000),'render budget');
 assert.ok(result.metadata.drawCalls<65,'draw-call budget');
 for(const track of result.metadata.tracks)for(const p of result.metadata.protectedAreas)assert.ok(track.maxX<p.minX||track.minX>p.maxX||track.maxZ<p.minZ||track.minZ>p.maxZ,`protected lane clear: ${track.id}`);
 report.push({quality,...result.metadata.counts,vertices,meshes,drawCalls:result.metadata.drawCalls,renderedTriangles:result.metadata.renderedTriangles,maxContactError,maxStanceSkate:maxSkate,maxLegSolveError:maxSolveError,rigWeightError:rigAttributeError,finiteGeometry:true,finiteTransforms:true,shaderHooks:true,motionFreeze:'exact',protectedLanes:'clear'});
 result.dispose();assert.equal(result.root.children.length,0);
}
await fs.writeFile(path.join(here,'animals-validation.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
