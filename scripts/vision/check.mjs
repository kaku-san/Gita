// Numeric-only smoke check. Never starts a server or browser.
// node scripts/check.mjs /absolute/path/to/installed/three/vendor
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const asset=path.resolve(here,'../../web/vision');
const vendor=process.argv[2];
if(!vendor)throw new Error('Pass the installed Three.js vendor directory as argv[2].');
const stage=await fs.mkdtemp(path.join(os.tmpdir(),'vishvarupa-check-'));
try{
  await fs.cp(asset,path.join(stage,'vision'),{recursive:true});
  await fs.symlink(vendor,path.join(stage,'vendor'),'dir');
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async (url,options)=>{
    if(!String(url).startsWith('file:'))return originalFetch(url,options);
    try{const buf=await fs.readFile(fileURLToPath(url));return new Response(buf,{status:200});}
    catch{return new Response('',{status:404});}
  };
  const T=await import(pathToFileURL(path.join(stage,'vendor/three.module.min.js')));
  const {createVishvarupa}=await import(pathToFileURL(path.join(stage,'vision/vishvarupa.js')));
  const sculpture=await createVishvarupa({quality:'high'});
  const meshes=[];let triangles=0;
  sculpture.root.traverse(o=>{
    if(!o.isMesh)return;meshes.push(o);
    const g=o.geometry,p=g.attributes.position,n=g.attributes.normal;
    triangles+=(g.index?g.index.count:p.count)/3*(o.isInstancedMesh?o.count:1);
    for(let i=0;i<p.array.length;i++)if(!Number.isFinite(p.array[i]))throw new Error('Non-finite position');
    for(let i=0;i<n.array.length;i++)if(!Number.isFinite(n.array[i]))throw new Error('Non-finite normal');
    if(g.index)for(const i of g.index.array)if(i>=p.count)throw new Error('Out of range index');
  });
  sculpture.root.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(sculpture.root);
  if(Math.abs(bounds.min.y)>1e-5)throw new Error(`Feet not grounded: ${bounds.min.y}`);
  if(triangles>900000){console.log(meshes.map(o=>({name:o.material.name,triangles:(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1)})));throw new Error(`Triangle budget exceeded: ${triangles}`);}
  if(meshes.length>90)throw new Error(`Draw budget exceeded: ${meshes.length}`);
  sculpture.setReveal(0);if(sculpture.root.visible)throw new Error('Reveal(0) still visible');
  sculpture.setReveal(1);if(!sculpture.root.visible)throw new Error('Reveal(1) hidden');
  sculpture.setGentle(1);if(sculpture.metadata.outerGroup.visible)throw new Error('Gentle mantle still visible');
  sculpture.setGentle(0);if(!sculpture.metadata.outerGroup.visible)throw new Error('Universal mantle hidden');
  sculpture.setDread(1);sculpture.setDread(0);sculpture.update(20,.016,true);sculpture.update(20,.016,false);
  // A second instance must not share mutable material or transition state.
  const second=await createVishvarupa({quality:'medium'});
  second.setReveal(.4);second.setGentle(1);
  if(sculpture.metadata.materials.skin===second.metadata.materials.skin)throw new Error('Material ownership leaked');
  if(sculpture.metadata.materials.skin.opacity!==1)throw new Error('Reveal state leaked');
  console.log(JSON.stringify({triangles,drawCalls:meshes.length,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},
    height:sculpture.metadata.height,faces:sculpture.metadata.faces,arms:sculpture.metadata.arms,
    checks:['finite buffers','valid indices','grounded soles','triangle and draw budget','reveal','gentle retraction','dread','per-instance ownership']},null,2));
}finally{await fs.rm(stage,{recursive:true,force:true});}
