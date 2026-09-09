import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';

const file=process.argv[2]?pathToFileURL(path.resolve(process.argv[2])):new URL('../../../web/battle/army-mass.js',import.meta.url);
const runtime=process.argv[3]?pathToFileURL(path.resolve(process.argv[3])).href:new URL('../../../web/vendor/three.module.min.js',import.meta.url).href;
const source=fs.readFileSync(file,'utf8').replace('./vendor/three.module.min.js',runtime);
const {createArmyMass}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const results=[];
for(const quality of ['high','low']){
  const start=performance.now();
  const api=createArmyMass({quality,groundHeight:(x,z)=>.32*Math.sin(x*.016)*Math.cos(z*.011)});
  const m=api.metadata;
  assert(m.representedSoldiers>=1000000&&m.representedSoldiers<=2200000);
  assert(m.draws<=24);assert(m.triangles<(quality==='high'?1000000:600000));
  assert.equal(m.centerViolations,0);assert.equal(m.reserveViolations,0);
  assert(m.nearestRadius>=42&&m.nearestRadius<65);
  assert(m.fieldExtents.minX<-1090&&m.fieldExtents.maxX>1090&&m.fieldExtents.minZ<-1090&&m.fieldExtents.maxZ>1090);
  assert(m.farthestRadius>1500);
  for(const sector of m.angularSectors){
    assert(sector.representedSoldiers>30000,`Sector ${sector.sector} is too sparse`);
    assert(sector.nearestRadius<115,`Sector ${sector.sector} has an empty inner front`);
    for(let band=0;band<4;band++)assert(sector.bands[band]>500,`Sector ${sector.sector}, band ${band} is empty`);
  }
  let finiteValues=0;
  for(const mesh of api.root.children){
    const g=mesh.geometry;
    for(const a of Object.values(g.attributes))for(const v of a.array){assert(Number.isFinite(v));finiteValues++;}
    for(const name of ['aCenter','aSpan','aSeed'])assert.equal(g.attributes[name].count,g.instanceCount);
    assert(mesh.material.vertexShader.includes('cameraPosition.xz - center.xz'));
    assert.equal(mesh.material.fog,false);
    assert.equal(mesh.castShadow,false);
  }
  const uniforms=api.root.children[0].material.uniforms;
  api.update(12,.016,true);assert.equal(uniforms.uTime.value,12);
  api.update(88,.016,false);assert.equal(uniforms.uTime.value,12);
  api.update(0,0,true);assert.equal(uniforms.uTime.value,0);
  const palette=JSON.stringify([uniforms.uClothA.value,uniforms.uClothB.value,uniforms.uHaze.value]);
  api.setVision(1);assert.equal(uniforms.uVision.value,1);
  api.setVision(0);assert.equal(uniforms.uVision.value,0);
  assert.equal(JSON.stringify([uniforms.uClothA.value,uniforms.uClothB.value,uniforms.uHaze.value]),palette);
  results.push({...m,finiteShaderGeometryValues:finiteValues,pauseResetPassed:true,buildMilliseconds:Math.round(performance.now()-start)});
  api.dispose();assert.equal(api.root.children.length,0);
}
fs.writeFileSync(new URL('./validation.json',import.meta.url),JSON.stringify({passed:true,method:'Numerical coverage, geometry, capacity, pause/reset and shader-source checks; no rendered QA.',results},null,2)+'\n');
console.log(JSON.stringify(results.map(r=>({quality:r.quality,represented:r.representedSoldiers,near:r.distinctNearSoldiers,strips:r.distantFormationStrips,draws:r.draws,triangles:r.triangles,bufferBytes:r.bufferBytes,extents:r.fieldExtents,angularMinimum:Math.min(...r.angularSectors.map(s=>s.representedSoldiers)),nearest:r.nearestRadius,farthest:r.farthestRadius,buildMilliseconds:r.buildMilliseconds})),null,2));
