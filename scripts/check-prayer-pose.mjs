import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import * as T from '../web/vendor/three.module.min.js';
import {createArjun} from '../web/elements/arjun/character.js';
import {createPrayerPose} from '../web/prayer-pose.js';

const originalFetch = globalThis.fetch;
globalThis.fetch = async input => {
  const u = input instanceof URL ? input : new URL(input);
  if (u.protocol !== 'file:') return originalFetch(input);
  const b = await fs.readFile(fileURLToPath(u));
  return {ok: true, json: async () => JSON.parse(b.toString()), arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)};
};
const arjun = await createArjun();
const world = new T.Group(), mount = new T.Group();
world.position.set(5, .7, -2); world.rotation.y = .4;
mount.position.set(0, 1.96, -1.47); world.add(mount); mount.add(arjun.root);
world.updateMatrixWorld(true);
const originalBody = arjun.root.children.find(o => o.isSkinnedMesh);
const originalGeometry = originalBody.geometry;
const originalSkeleton = originalBody.skeleton;
const snapshots = new Map();
arjun.root.traverse(o => {if(o.isMesh && !o.isInstancedMesh) snapshots.set(o, {g: o.geometry, material: o.material});});
const prayer = createPrayerPose(arjun, {THREE: T});
assert.equal(prayer.diagnostics().recoveredHandVertices, 16733);
assert.equal(originalBody.skeleton.bones.length, 8);
const rawHandBytes = await fs.readFile(new URL('../web/elements/arjun/skin/hand.bin',import.meta.url));
const rawHand = new Float32Array(rawHandBytes.buffer, rawHandBytes.byteOffset, 16733 * 3);
const recoveredHand = prayer.hands.right.geometry.attributes.position.array;
let handRecoveryError = 0;
for (let i = 0; i < rawHand.length; i++) handRecoveryError = Math.max(handRecoveryError, Math.abs(rawHand[i] - recoveredHand[i]));
assert.ok(handRecoveryError < 1e-6, `hand recovery error ${handRecoveryError}`);
const reports = [];
for (const [i, weight] of [0, .25, .5, .75, 1, 1, 0].entries()) {
  arjun.update(i / 20, 1 / 60, true); prayer.update(weight, i / 20);
  world.updateMatrixWorld(true); originalBody.skeleton.update();
  const d = prayer.diagnostics(); reports.push(d);
  assert.equal(d.bodyVertices, 58044);
  assert.ok(d.leftWeightedVertices > 2000);
  assert.ok(d.armourVertexCount > 1000);
  assert.ok(d.minClothY >= d.floorY - 1e-6, `deck intersection at weight ${weight}: ${d.minClothY}`);
  const pos = originalBody.geometry.attributes.position, q = new T.Vector3();
  for (let j = 0; j < pos.count; j += 13) {
    q.fromBufferAttribute(pos, j); originalBody.applyBoneTransform(j, q);
    assert.ok(Number.isFinite(q.x) && Number.isFinite(q.y) && Number.isFinite(q.z));
  }
  for (const [mesh, snapshot] of snapshots) {
    assert.equal(mesh.material, snapshot.material);
    assert.equal(mesh.geometry.attributes.position.count, snapshot.g.attributes.position.count);
  }
  if (weight === 1) {
    const right = new T.Vector3(...d.rightWristWorld), left = new T.Vector3(...d.leftWristWorld);
    assert.ok(Math.abs(right.distanceTo(left) - .0934) < 1e-6, `wrist separation ${right.distanceTo(left)}`);
    assert.equal(arjun.bow.visible, false); assert.equal(arjun.seat.visible, false);
    // Both original palms are symmetric, inward facing and almost touching.
    const handP = prayer.hands.right.geometry.attributes.position;
    let maxPalmZ = -Infinity;
    for (let j = 0; j < handP.count; j++) maxPalmZ = Math.max(maxPalmZ, handP.getZ(j));
    const minimumPalmGap = .0934 - 2 * maxPalmZ;
    assert.ok(minimumPalmGap >= 0 && minimumPalmGap < .001);
    d.minimumPalmGap = minimumPalmGap;
  }
  if (weight === 0) {
    const reference = new T.SkinnedMesh(originalGeometry, arjun.materials.skin);
    reference.skeleton = originalSkeleton; reference.bindMatrix.copy(originalBody.bindMatrix);
    reference.bindMatrixInverse.copy(originalBody.bindMatrixInverse); originalSkeleton.update();
    for (let j = 0; j < pos.count; j += 13) {
      const expected = new T.Vector3().fromBufferAttribute(pos, j);
      q.copy(expected); reference.applyBoneTransform(j, expected); originalBody.applyBoneTransform(j, q);
      assert.ok(q.distanceTo(expected) < 1e-6, `neutral binding error at vertex ${j}`);
    }
  }
}
prayer.dispose();
assert.equal(originalBody.geometry, originalGeometry);
assert.equal(originalBody.skeleton, originalSkeleton);
for (const [mesh, snapshot] of snapshots) assert.equal(mesh.geometry, snapshot.g);
assert.equal(arjun.bow.visible, true);
await fs.writeFile(new URL('./prayer-validation.json', import.meta.url), JSON.stringify({passed: true, handRecoveryError, reports}, null, 2));
console.log(JSON.stringify({passed: true, handRecoveryError, fullPose: reports[4], restoredPose: reports.at(-1)}, null, 2));
