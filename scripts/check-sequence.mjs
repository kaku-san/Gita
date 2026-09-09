// Numeric and source validation only. This does not launch a browser/renderer.
import assert from 'node:assert/strict';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import * as T from '../web/vendor/three.module.min.js';
import {createAssembly} from '../web/assembly.js';
import {createVishvarupa} from '../web/vision/vishvarupa.js';
import {createSurroundings} from '../web/surroundings.js';
import {createCosmos} from '../web/cosmos.js';
import {createSequence} from '../web/sequence.js';
import {passages} from '../web/story.js';
import {cameraPositionFor} from '../web/camera.js';

globalThis.fetch=async url=>{try{const data=await readFile(new URL(url));return new Response(data,{status:200});}catch{return new Response('',{status:404});}};
const manifest=JSON.parse(await readFile(new URL('./approved-assets.json',import.meta.url)));
const approvedVision=JSON.parse(await readFile(new URL('./approved-vishvarupa.json',import.meta.url)));
for(const [path,hash] of Object.entries(approvedVision.files))assert.equal(createHash('sha256').update(await readFile(new URL('../web/'+path,import.meta.url))).digest('hex'),hash,'Approved Vishvarupa/story changed '+path);
for(const [path,hash] of Object.entries(manifest.files))assert.equal(createHash('sha256').update(await readFile(new URL('../web/'+path,import.meta.url))).digest('hex'),hash,'Approved source changed '+path);
async function validateFiles(dir){
  for(const f of await readdir(dir,{withFileTypes:true})){
    const url=new URL(f.name+(f.isDirectory()?'/':''),dir);
    if(f.isDirectory())await validateFiles(url);
    else if(f.name.endsWith('.js')){
      const syntax=spawnSync(process.execPath,['--check',fileURLToPath(url)],{encoding:'utf8'});assert.equal(syntax.status,0,syntax.stderr);
      const text=await readFile(url,'utf8');
      for(const match of text.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g))assert((await readFile(new URL(match[1],url))).length>0,match[1]);
    }
  }
}
await validateFiles(new URL('../web/',import.meta.url));
const seq=createSequence();assert.deepEqual(seq.update(0),seq.state);
for(let i=0;i<passages.length;i++){
  seq.go(i);const snapshot=structuredClone(seq.state);seq.update(.05,{paused:true});assert.deepEqual(seq.state,snapshot,'Pause freezes a transition');
  for(let n=0;n<200;n++)seq.update(.05);
  assert.equal(seq.index,i);assert.equal(seq.progress,1);
  for(const k of ['vision','reveal','dread','gentle','scale'])assert.equal(seq.state[k],passages[i][k]);
  seq.update(100);assert.equal(seq.index,i,'Reading never auto-advances');
}
seq.go(1);seq.update(.1);const current=structuredClone(seq.state);seq.go(8);assert.deepEqual(seq.state,current,'Interrupting a move starts from current position');
seq.update(.05,{reduced:true});assert.equal(seq.progress,1);assert.equal(seq.state.reveal,0);
seq.go(2,{immediate:true});assert.equal(seq.state.reveal,1);seq.go(0,{immediate:true});assert.equal(seq.state.vision,0);
for(const p of passages)for(const k of ['camera','aim','position'])for(const v of p[k])assert(Number.isFinite(v));

const assembly=await createAssembly(),vision=await createVishvarupa({quality:'high'}),surroundings=await createSurroundings(),cosmos=createCosmos();
cosmos.bindFigure(vision);
for(const m of [vision.metadata.materials.skin,vision.metadata.outerMaterials.skin]){
  const shader={vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader,uniforms:{}};m.onBeforeCompile(shader);
  assert(shader.uniforms.uCosmicTime);assert(shader.fragmentShader.includes('totalEmissiveRadiance+='));assert(shader.vertexShader.includes('vCosmicSkin=position;'));
  if(m===vision.metadata.materials.skin)assert(shader.uniforms.visionBreath,'Existing breathing hook retained');
}
const reports={};
for(const [name,root] of [['rath',assembly.root],['universalForm',vision.root],['surroundings',surroundings.root],['cosmos',cosmos.root]]){
  let triangles=0,meshes=0,vertices=0;const seen=new Set();
  root.traverse(o=>{
    if(!o.geometry)return;meshes++;const g=o.geometry;
    if(o.isMesh)triangles+=(g.index?.count??g.attributes.position.count)/3*(o.isInstancedMesh?o.count:g.isInstancedBufferGeometry?g.instanceCount:1);
    if(!seen.has(g)){
      for(const a of Object.values(g.attributes))for(const value of a.array)assert(Number.isFinite(value),'Nonfinite attribute in '+name);
      if(g.index)for(const value of g.index.array)assert(value>=0&&value<g.attributes.position.count,'Invalid index in '+name);
      vertices+=g.attributes.position.count;seen.add(g);
    }
    if(o.isInstancedMesh)for(const v of o.instanceMatrix.array)assert(Number.isFinite(v));
  });reports[name]={triangles,drawObjects:meshes,uniqueVertices:vertices};
}
vision.setReveal(0);assert(!vision.root.visible);vision.setReveal(1);vision.setGentle(1);assert(!vision.metadata.outerGroup.visible);vision.setGentle(0);assert(vision.metadata.outerGroup.visible);
const c=cosmos.root.children.find(o=>o.name==='Warriors within the vision of Time');
cosmos.setState(1,1);cosmos.update(7,.05,true);const old=c.instanceMatrix.array.slice();cosmos.update(20,1,false);assert.deepEqual(c.instanceMatrix.array,old,'Cosmic movement pauses');
cosmos.setState(0,0);assert(!cosmos.root.visible);
const surface=surroundings.root.children[0].material.color.clone();surroundings.setVision(1);surroundings.setVision(0);assert(surface.equals(surroundings.root.children[0].material.color));
assembly.setMoment(true);for(let i=0;i<120;i++)assembly.update(i*.05,.05,true);
assert(assembly.arjun.getPose().bowDown>.999);assembly.root.updateMatrixWorld(true);
const hand=assembly.anchors.reinHand.getWorldPosition(new T.Vector3());
for(const r of assembly.team.reins)assert(r.path.points.at(-1).clone().applyMatrix4(assembly.team.root.matrixWorld).distanceTo(hand)<.056,'Approved reins retain connection');

// Perspective checks keep Arjun available as a scale anchor during the cosmic
// keyframes; this is a numerical framing check, not a rendered visual review.
const framing=[];
for(const aspect of [16/9,390/844])for(let i=1;i<=7;i++){
  const p=passages[i],camera=new T.PerspectiveCamera(aspect<.8?57:46,aspect,.18,4000);
  const aim=new T.Vector3(...p.aim);cameraPositionFor(p,aspect,camera.position);camera.lookAt(aim);camera.updateMatrixWorld(true);
  const projected=new T.Vector3(0,4.4,-1.47).project(camera);
  framing.push({passage:i+1,aspect,arjun:projected.toArray().map(n=>+n.toFixed(3))});
  assert(Number.isFinite(projected.x)&&Number.isFinite(projected.y));
  assert(Math.abs(projected.x)<.88&&projected.y>-.78&&projected.y<.8,'Arjun must remain in frame at passage '+(i+1)+' aspect '+aspect);
}
const report={passed:true,checks:['all approved dependency hashes','module syntax and imports','reader-paced transition state','pause and reduced motion','interrupted transitions','finite geometry and instance matrices','revealed/gentle/return states','cosmic skin hook composition','connected reins','numeric camera framing'],browserQA:'not performed',geometry:reports,framing};
await writeFile(new URL('./validation.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
