import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Numeric-only QA. The module import stays portable in the deliverable; this
// check resolves the existing locally available Three runtime without copying it.
const file = process.argv[2] ? pathToFileURL(path.resolve(process.argv[2])) : new URL('../../../web/battle/infantry.js', import.meta.url);
const runtime = process.argv[3] ? pathToFileURL(path.resolve(process.argv[3])).href : new URL('../../../web/vendor/three.module.min.js', import.meta.url).href;
const T = await import(runtime);
const source = fs.readFileSync(file, 'utf8').replace('./vendor/three.module.min.js', runtime);
const { createInfantry } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const matrix = new T.Matrix4(), inverse = new T.Matrix4(), p = new T.Vector3(), tip = new T.Vector3();
const results = [];
for (const quality of ['high', 'low']) {
  const api = createInfantry({ quality });
  const meshes = Object.fromEntries(api.root.children.map(m => [m.name, m]));
  assert(api.metadata.instancedDraws < 55);
  assert(api.metadata.triangles < (quality === 'high' ? 850000 : 450000));
  let minShin = Infinity, maxShin = 0, minForearm = Infinity, maxForearm = 0, minFoot = Infinity, maxFoot = -Infinity;
  let finiteMatrices = true;
  for (let frame = 0; frame <= 100; frame++) {
    api.update(frame * .059, .059, true);
    for (const m of api.root.children) for (const value of m.instanceMatrix.array) if (!Number.isFinite(value)) finiteMatrices = false;
    for (let i = 0; i < api.metadata.activeFighters * 2; i++) {
      meshes.shin.getMatrixAt(i, matrix); const shin = Math.hypot(...matrix.elements.slice(4, 7));
      minShin = Math.min(minShin, shin); maxShin = Math.max(maxShin, shin);
      meshes.foreArm.getMatrixAt(i, matrix); const forearm = Math.hypot(...matrix.elements.slice(4, 7));
      minForearm = Math.min(minForearm, forearm); maxForearm = Math.max(maxForearm, forearm);
      meshes.foot.getMatrixAt(i, matrix);
      p.set(0, -.096, .057).applyMatrix4(matrix); minFoot = Math.min(minFoot, p.y); maxFoot = Math.max(maxFoot, p.y);
    }
  }
  assert(finiteMatrices);
  const rootPositions = api.metadata.pairs.flatMap(p => p.roots).concat(api.metadata.armyPositions);
  const violations = [];
  for (let i = 0; i < rootPositions.length; i++) {
    const [x, y, z] = rootPositions[i];
    for (const e of api.metadata.exclusions) {
      const inside = e.kind === 'circle' ? Math.hypot(x - e.x, z - e.z) < e.radius : x >= e.minX && x <= e.maxX && z >= e.minZ && z <= e.maxZ;
      if (inside) violations.push({ i, exclusion: e.name, position: [x, y, z] });
    }
  }
  assert.equal(violations.length, 0);
  const pair = api.metadata.pairs[0], contactTime = ((.26 - pair.phase + 1) % 1) * pair.cycleSeconds;
  api.update(contactTime, .016, true);
  meshes.sword.getMatrixAt(0, matrix); tip.set(0, .91, 0).applyMatrix4(matrix);
  meshes.shield.getMatrixAt(1, matrix); inverse.copy(matrix).invert(); tip.applyMatrix4(inverse);
  const shieldContact = { radialDistance: Math.hypot(tip.x, tip.y), signedDepth: tip.z };
  assert(shieldContact.radialDistance < .008, 'Sword tip must meet its paired shield');
  assert(Math.abs(shieldContact.signedDepth - .062) < .007, 'Sword must stop at the shield face');
  assert(maxShin < .422 && minShin > .392, 'Shin must keep anatomical length across the complete cycle');
  assert(maxForearm < .278 && minForearm > .257, 'Forearm must keep anatomical length');
  assert(minFoot >= -.002, 'Feet must stay above the ground');
  // Pause preserves matrices, and a vision change alters opacity without motion.
  const frozen = meshes.sword.instanceMatrix.array.slice(); api.update(91, .1, false);
  assert.deepEqual(meshes.sword.instanceMatrix.array, frozen);
  api.setVision(1); assert.equal(meshes.contactShadow.material.opacity, 0);
  api.setVision(0); assert.equal(meshes.torso.material.opacity, 1);
  const normals = meshes.torso.geometry.attributes.normal, vertices = meshes.torso.geometry.attributes.position;
  let outward = 0, inward = 0;
  for (let i = 0; i < normals.count; i++) if (vertices.getY(i) < .5) {
    const dot = vertices.getX(i) * normals.getX(i) + vertices.getZ(i) * normals.getZ(i);
    if (dot > 0) outward++; else inward++;
  }
  assert.equal(inward, 0);
  const result = { quality, activeFighters: api.metadata.activeFighters, distantSoldiers: api.metadata.distantSoldiers,
    triangles: api.metadata.triangles, draws: api.metadata.instancedDraws, finiteMatrices, exclusionViolations: violations,
    shinLengths: [minShin, maxShin], forearmLengths: [minForearm, maxForearm], footGroundRange: [minFoot, maxFoot],
    focalShieldContact: shieldContact, outwardTorsoNormals: outward, focalPair: api.metadata.focalPair };
  results.push(result); api.dispose(); assert.equal(api.root.children.length, 0);
}
fs.writeFileSync(new URL('./validation.json', import.meta.url), JSON.stringify({ passed: true, method: 'Numeric geometry, placement, animation and API checks only; no rendered QA.', results }, null, 2) + '\n');
console.log(JSON.stringify(results, null, 2));
