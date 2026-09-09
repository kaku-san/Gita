/**
 * Optional Arjun kneeling / anjali adapter for the approved character element.
 * Dependency injection deliberately keeps this file independent of Site paths.
 *
 * const prayer = createPrayerPose(arjun, {THREE: T});
 * arjun.update(time, dt, true);
 * prayer.update(teachingWeight, time); // AFTER the original character update
 *
 * No replacement limbs, materials, head, armour or cape are generated. The
 * original open hand is recovered from its merged mesh; the original body is
 * rebound to three additional left-arm bones. Existing garment vertices move
 * along folded leg centrelines while retaining their sculpted cross-sections.
 */
export function createPrayerPose(arjun, {
  THREE: T,
  floorY = .12,
  manageBowVisibility = true,
  manageSeatVisibility = true,
} = {}) {
  if (!T || !arjun?.root || !arjun?.materials) {
    throw new Error('createPrayerPose requires the approved Arjun API and {THREE}.');
  }
  const root = arjun.root, M = arjun.materials;
  const v = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
  const clamp = T.MathUtils.clamp, smooth = T.MathUtils.smoothstep;
  const identity = new T.Quaternion();
  const hip = v(0, 1.17, 0);
  const R = [v(-.425, 2.015, .005), v(-.695, 1.625, .20), v(-.550, 1.400, .590)];
  const L = [v(.425, 2.015, .005), v(.55, 1.57, .18), v(.41, 1.16, .48)];
  const skin = root.children.find(o => o.isSkinnedMesh);
  const originalSkeleton = skin?.skeleton;
  const base = originalSkeleton?.bones.find(o => o.name === 'Torso');
  const shoulder = originalSkeleton?.bones.find(o => o.name === 'Bow shoulder');
  const elbow = originalSkeleton?.bones.find(o => o.name === 'Bow elbow');
  const wrist = originalSkeleton?.bones.find(o => o.name === 'Bow wrist');
  const neck = originalSkeleton?.bones.find(o => o.name === 'Head');
  const torso = arjun.cape?.parent;
  const lower = root.children.find(o => o.isGroup && o.children.some(c => c.isMesh && c.material === M.linen));
  const oldLeftHand = torso?.children.find(o => o.isMesh && !o.isInstancedMesh && o.material === M.skin);
  const oldRightHand = wrist?.children.find(o => o.isMesh && o.material === M.skin);
  if (!skin || !base || !shoulder || !elbow || !wrist || !neck || !torso || !lower || !oldLeftHand || !oldRightHand) {
    throw new Error('Prayer adapter: the expected approved Arjun topology was not found.');
  }

  const saved = {
    bodyGeometry: skin.geometry,
    basePosition: base.position.clone(),
    rootQuaternion: root.quaternion.clone(),
    rightHand: oldRightHand.visible,
    leftHand: oldLeftHand.visible,
    bow: arjun.bow.visible,
    seat: arjun.seat.visible,
  };
  const geometryEdits = [], instanceEdits = [];
  const qTilt = new T.Quaternion().setFromAxisAngle(v(1, 0, 0), .055);
  const qHead = new T.Quaternion().setFromEuler(new T.Euler(.135, 0, 0));
  const drop = .38 - (floorY - .12);

  // All inverse matrices use the original body's bind coordinate system. This
  // remains correct when the character has already been put on a moving mount.
  const leftShoulder = new T.Bone(), leftElbow = new T.Bone(), leftWrist = new T.Bone();
  leftShoulder.name = 'Prayer left shoulder';
  leftElbow.name = 'Prayer left elbow';
  leftWrist.name = 'Prayer left wrist';
  leftShoulder.position.copy(L[0]).sub(hip);
  leftElbow.position.copy(L[1]).sub(L[0]);
  leftWrist.position.copy(L[2]).sub(L[1]);
  base.add(leftShoulder); leftShoulder.add(leftElbow); leftElbow.add(leftWrist);
  const leftFirst = originalSkeleton.bones.length;
  const originalBaseIndex = originalSkeleton.bones.indexOf(base);
  const extraInverses = L.map(p => new T.Matrix4().makeTranslation(
    hip.x - p.x, hip.y - p.y, hip.z - p.z,
  ).multiply(originalSkeleton.boneInverses[originalBaseIndex]));
  const skeleton = new T.Skeleton(
    [...originalSkeleton.bones, leftShoulder, leftElbow, leftWrist],
    [...originalSkeleton.boneInverses.map(m => m.clone()), ...extraInverses],
  );
  skin.geometry = skin.geometry.clone();
  skin.skeleton = skeleton;
  // This adapter extends the binding; calling bind() here would bake in the
  // current bow animation / mount transform and corrupt the original rig.
  const positions = skin.geometry.attributes.position;
  const weights = skin.geometry.attributes.skinWeight;
  const indices = skin.geometry.attributes.skinIndex;
  const p = v();
  function segment(point, a, b) {
    const d = b.clone().sub(a);
    const t = clamp(point.clone().sub(a).dot(d) / d.lengthSq(), 0, 1);
    return {t, d: point.distanceTo(a.clone().addScaledVector(d, t))};
  }
  let leftWeightedVertices = 0;
  for (let i = 0; i < positions.count; i++) {
    p.fromBufferAttribute(positions, i);
    if (p.y >= 2.20 || p.x <= .30) continue;
    const u = segment(p, L[0], L[1]), f = segment(p, L[1], L[2]);
    let a = originalBaseIndex, b = leftFirst, w;
    if (f.d < u.d && p.x > .34) {
      a = leftFirst + 1; b = leftFirst + 2; w = smooth(f.t, .80, 1);
      if (f.t < .17) { a = leftFirst; b = leftFirst + 1; w = .5 + .5 * f.t / .17; }
    } else {
      w = smooth(u.t, -.04, .28) * smooth(p.x, .30, .46);
      if (u.t > .83) { a = leftFirst; b = leftFirst + 1; w = smooth(u.t, .83, 1) * .5; }
    }
    indices.setXYZW(i, a, b, 0, 0); weights.setXYZW(i, 1 - w, w, 0, 0);
    leftWeightedVertices++;
  }
  indices.needsUpdate = weights.needsUpdate = true;

  // Unbake the EXACT approved open hand from its single-material merged mesh.
  const leftHandRestQ = new T.Quaternion().setFromEuler(new T.Euler(2.15, .3, -.12));
  const handRestMatrix = new T.Matrix4().compose(L[2], leftHandRestQ, v(-1, 1, 1));
  const handGeometry = oldLeftHand.geometry.clone().applyMatrix4(handRestMatrix.invert());
  const rightHand = new T.Mesh(handGeometry, M.skin);
  const leftHand = new T.Mesh(handGeometry, M.skin);
  rightHand.name = 'Arjun approved open right hand'; leftHand.name = 'Arjun approved open left hand';
  leftHand.scale.x = -1; leftHand.quaternion.copy(leftHandRestQ);
  rightHand.castShadow = leftHand.castShadow = true;
  rightHand.receiveShadow = leftHand.receiveShadow = true;
  rightHand.visible = leftHand.visible = false;
  wrist.add(rightHand); leftWrist.add(leftHand);
  const rightPalmQ = new T.Quaternion().setFromAxisAngle(v(0, 1, 0), Math.PI / 2);
  const leftPalmQ = new T.Quaternion().setFromAxisAngle(v(0, 1, 0), -Math.PI / 2);

  // Connected surfaces survived mergeStatic as disconnected indexed islands.
  // Classify whole islands, so cuirass triangles are never tugged into an arm.
  function islands(g) {
    const a = g.attributes.position, ix = g.index?.array;
    if (!ix) throw new Error('Prayer adapter expects indexed approved meshes.');
    const uf = new Int32Array(a.count);
    for (let i = 0; i < uf.length; i++) uf[i] = i;
    const find = n => { while (uf[n] !== n) { uf[n] = uf[uf[n]]; n = uf[n]; } return n; };
    const join = (a, b) => { a = find(a); b = find(b); if (a !== b) uf[b] = a; };
    for (let i = 0; i < ix.length; i += 3) { join(ix[i], ix[i + 1]); join(ix[i], ix[i + 2]); }
    const out = new Map();
    for (let i = 0; i < a.count; i++) {
      const key = find(i);
      if (!out.has(key)) out.set(key, {vertices: [], centre: v(), min: v(Infinity, Infinity, Infinity), max: v(-Infinity, -Infinity, -Infinity)});
      const c = out.get(key); p.fromBufferAttribute(a, i);
      c.vertices.push(i); c.centre.add(p); c.min.min(p); c.max.max(p);
    }
    for (const c of out.values()) c.centre.divideScalar(c.vertices.length);
    return [...out.values()];
  }
  const upperDelta = new T.Matrix4(), lowerDelta = new T.Matrix4();
  const upperNormal = new T.Matrix3(), lowerNormal = new T.Matrix3();
  function armPart(c) {
    const s = c.centre;
    if (s.x > .35 && s.y > 1.77 && s.distanceTo(L[0]) < .28 && c.max.x - c.min.x < .47) return 1;
    if (s.x > .35 && s.y > 1.12 && s.y < 1.55 && s.z > .20 && segment(s, L[1], L[2]).d < .15) return 2;
    return 0;
  }
  let armourVertexCount = 0;
  for (const mesh of torso.children) {
    if (!mesh.isMesh || mesh.isInstancedMesh || mesh === oldLeftHand || mesh.userData.flex) continue;
    const parts = islands(mesh.geometry).map(c => ({...c, part: armPart(c)})).filter(c => c.part);
    if (!parts.length) continue;
    const edit = ownGeometry(mesh);
    edit.armParts = parts;
    armourVertexCount += parts.reduce((n, c) => n + c.vertices.length, 0);
  }
  for (const mesh of torso.children) {
    if (!mesh.isInstancedMesh) continue;
    const matrices = [], centre = v(), min = v(Infinity, Infinity, Infinity), max = v(-Infinity, -Infinity, -Infinity);
    for (let i = 0; i < mesh.count; i++) {
      const matrix = new T.Matrix4(); mesh.getMatrixAt(i, matrix);
      p.setFromMatrixPosition(matrix);
      matrices.push(matrix); centre.add(p); min.min(p); max.max(p);
    }
    const part = armPart({centre: centre.divideScalar(mesh.count), min, max});
    if (part) instanceEdits.push({mesh, matrices, tags: Array(mesh.count).fill(part), mode: 'arm'});
  }
  function ownGeometry(mesh) {
    const originalGeometry = mesh.geometry;
    mesh.geometry = originalGeometry.clone();
    mesh.geometry.attributes.position.setUsage(T.DynamicDrawUsage);
    mesh.geometry.attributes.normal.setUsage(T.DynamicDrawUsage);
    // The pose extends behind the original standing/seated bounding volume.
    const edit = {mesh, originalGeometry, original: Float32Array.from(mesh.geometry.attributes.position.array),
      normals: Float32Array.from(mesh.geometry.attributes.normal.array), originalFrustumCulled: mesh.frustumCulled};
    mesh.frustumCulled = false;
    geometryEdits.push(edit); return edit;
  }

  // The two original linen sweeps contain 85 rings of 49 vertices. We transport
  // their actual sculpted offsets; radii, pleats, UVs and materials stay intact.
  const linen = lower.children.find(o => o.isMesh && o.material === M.linen);
  const ringSize = 49, ringCount = 85, legVertices = ringSize * ringCount;
  if (linen.geometry.attributes.position.count !== legVertices * 2) {
    throw new Error('Prayer adapter: unexpected approved dhoti ring topology.');
  }
  const legEdit = ownGeometry(linen);
  legEdit.mode = 'legs';
  const legRows = [];
  const kneeTargets = [], ankleTargets = [];
  const yShift = floorY - .12;
  for (let side = 0; side < 2; side++) {
    const sign = side === 0 ? -1 : 1;
    const restCurve = new T.CatmullRomCurve3([
      v(sign * .15, 1.12, .005), v(sign * .30, 1.10, .25),
      v(sign * .39, .98, .49), v(sign * .39, .64, .55), v(sign * .33, .235, .57),
    ], false, 'centripetal');
    const knee = v(sign * .30, .290 + yShift, .30);
    const ankle = v(sign * .25, .235 + yShift, -.448);
    const foldedCurve = new T.CatmullRomCurve3([
      v(sign * .15, .74 + yShift, .005), v(sign * .25, .54 + yShift, .17),
      knee, v(sign * .28, .273 + yShift, -.06), ankle,
    ], false, 'centripetal');
    kneeTargets.push(knee); ankleTargets.push(ankle);
    for (let row = 0; row < ringCount; row++) {
      const t = row / (ringCount - 1);
      legRows.push({start: side * legVertices + row * ringSize,
        rest: restCurve.getPointAt(t), goal: foldedCurve.getPointAt(t),
        rotation: new T.Quaternion().setFromUnitVectors(restCurve.getTangentAt(t), foldedCurve.getTangentAt(t))});
    }
  }
  for (const mesh of lower.children) {
    if (!mesh.isMesh || mesh === linen) continue;
    if (mesh.isInstancedMesh) {
      const matrices = [];
      for (let i = 0; i < mesh.count; i++) { const matrix = new T.Matrix4(); mesh.getMatrixAt(i, matrix); matrices.push(matrix); }
      instanceEdits.push({mesh, matrices, mode: 'apron'}); continue;
    }
    const edit = ownGeometry(mesh);
    if (mesh.material === M.skin || mesh.material === M.leather) edit.mode = 'feet';
    else if (mesh.material === M.redLight || mesh.material === M.border) edit.mode = 'apron';
    else if (mesh.material === M.red) {
      edit.mode = 'waist';
      edit.panelVertices = islands(mesh.geometry).filter(c => c.max.z > .45).flatMap(c => c.vertices);
    } else edit.mode = 'waist';
  }

  const q = new T.Quaternion(), n = v(), temp = v(), centre = v();
  const matrix = new T.Matrix4(), scale = v(1, 1, 1);
  const tempPosition = v(), tempQuaternion = new T.Quaternion(), tempScale = v();
  const posedHip = v(), waistRotation = new T.Quaternion();
  const rightPose = makeArm(R, v(-.9, -.70, -.12));
  const leftPose = makeArm(L, v(.9, -.70, -.12));
  const rightGoal = v(-.0467, 1.650, .530), leftGoal = v(.0467, 1.650, .530);
  const targetUpper = new T.Quaternion(), targetLower = new T.Quaternion(), targetWrist = new T.Quaternion();
  const upperWorldQ = new T.Quaternion(), lowerWorldQ = new T.Quaternion(), elbowPosition = v();
  const captured = {base: new T.Quaternion(), shoulder: new T.Quaternion(), elbow: new T.Quaternion(), wrist: new T.Quaternion(), neck: new T.Quaternion()};
  let lastWeight = -1, lastTime = -1, disposed = false;
  const savedFrustumCulled = skin.frustumCulled; skin.frustumCulled = false;

  function makeArm(points, pole) {
    const upper = points[1].clone().sub(points[0]), lower = points[2].clone().sub(points[1]);
    return {points, upper, lower, l1: upper.length(), l2: lower.length(), pole};
  }
  function solveArm(arm, goal) {
    const dir = goal.clone().sub(arm.points[0]);
    const distance = clamp(dir.length(), .03, arm.l1 + arm.l2 - .003); dir.normalize();
    const pole = arm.pole.clone().addScaledVector(dir, -arm.pole.dot(dir)).normalize();
    const along = (arm.l1 * arm.l1 - arm.l2 * arm.l2 + distance * distance) / (2 * distance);
    const height = Math.sqrt(Math.max(0, arm.l1 * arm.l1 - along * along));
    const joint = arm.points[0].clone().addScaledVector(dir, along).addScaledVector(pole, height);
    targetUpper.setFromUnitVectors(arm.upper.clone().normalize(), joint.clone().sub(arm.points[0]).normalize());
    targetLower.setFromUnitVectors(arm.lower.clone().normalize(), goal.clone().sub(joint).normalize());
  }
  function poseArm(arm, goal, upperBone, lowerBone, wristBone, palmQ, restHandQ, weight, existing) {
    solveArm(arm, goal);
    targetWrist.copy(targetLower).invert().multiply(palmQ);
    if (restHandQ) targetWrist.multiply(restHandQ.clone().invert());
    const localLower = targetUpper.clone().invert().multiply(targetLower);
    upperBone.quaternion.copy(existing?.shoulder || identity).slerp(targetUpper, weight);
    lowerBone.quaternion.copy(existing?.elbow || identity).slerp(localLower, weight);
    wristBone.quaternion.copy(existing?.wrist || identity).slerp(targetWrist, weight);
  }
  function apronTarget(point, out) {
    const t = clamp((1.235 - point.y) / .995, 0, 1);
    const oldZ = .25 + .457 * smooth(t, 0, .27) - .025 * smooth(t, .55, 1);
    const newZ = .25 + .26 * smooth(t, 0, .52) + .055 * smooth(t, .65, 1);
    return out.set(point.x, point.y - drop + .305 * t, point.z + newZ - oldZ);
  }
  function updateLower(weight) {
    waistRotation.copy(identity).slerp(qTilt, weight);
    posedHip.copy(hip); posedHip.y -= drop * weight;
    for (const row of legRows) {
      q.copy(identity).slerp(row.rotation, weight); centre.copy(row.rest).lerp(row.goal, weight);
      for (let k = 0; k < ringSize; k++) {
        const i = row.start + k;
        p.fromArray(legEdit.original, i * 3).sub(row.rest).applyQuaternion(q).add(centre);
        // A shallow contact patch compresses only the lowest knee/shin pleats,
        // as cloth resting on the deck does. No ring or limb is replaced.
        if (weight > 0) p.y = Math.max(p.y, floorY + .0005 * weight);
        legEdit.mesh.geometry.attributes.position.setXYZ(i, p.x, p.y, p.z);
      }
    }
    for (const edit of geometryEdits) {
      if (!edit.mode) continue;
      const g = edit.mesh.geometry, a = g.attributes.position;
      if (edit.mode === 'legs') { a.needsUpdate = true; g.computeVertexNormals(); continue; }
      for (let i = 0; i < a.count; i++) {
        p.fromArray(edit.original, i * 3);
        if (edit.mode === 'apron') p.lerp(apronTarget(p, temp), weight);
        else if (edit.mode === 'feet') {
          // A rotating foot, not linear interpolation through a flattened foot.
          const sign = p.x < 0 ? -1 : 1;
          centre.set(sign * .33, .235, .57);
          temp.set(sign * .25, .235 + yShift, -.448);
          q.setFromAxisAngle(v(0, 1, 0), Math.PI * weight);
          p.sub(centre).applyQuaternion(q).add(centre.lerp(temp, weight));
        } else p.sub(hip).applyQuaternion(waistRotation).add(posedHip);
        a.setXYZ(i, p.x, p.y, p.z);
      }
      if (edit.panelVertices) for (const i of edit.panelVertices) {
        p.fromArray(edit.original, i * 3);
        const t = clamp((p.z - .05) / .57, 0, 1);
        temp.set(p.x * (1 - .13 * t), p.y - drop - .18 * t + .07 * Math.sin(Math.PI * t), p.z - .15 * t);
        p.lerp(temp, weight); a.setXYZ(i, p.x, p.y, p.z);
      }
      a.needsUpdate = true; g.computeVertexNormals();
    }
    for (const edit of instanceEdits) {
      if (edit.mode !== 'apron') continue;
      edit.matrices.forEach((original, i) => {
        original.decompose(tempPosition, tempQuaternion, tempScale);
        p.copy(tempPosition); tempPosition.lerp(apronTarget(p, temp), weight);
        matrix.compose(tempPosition, tempQuaternion, tempScale); edit.mesh.setMatrixAt(i, matrix);
      });
      edit.mesh.instanceMatrix.needsUpdate = true;
      edit.mesh.computeBoundingSphere();
    }
  }
  function updateArmour() {
    upperWorldQ.copy(leftShoulder.quaternion);
    lowerWorldQ.copy(upperWorldQ).multiply(leftElbow.quaternion);
    elbowPosition.copy(L[1]).sub(L[0]).applyQuaternion(upperWorldQ).add(L[0]);
    upperDelta.compose(L[0], upperWorldQ, scale).multiply(new T.Matrix4().makeTranslation(-L[0].x, -L[0].y, -L[0].z));
    lowerDelta.compose(elbowPosition, lowerWorldQ, scale).multiply(new T.Matrix4().makeTranslation(-L[1].x, -L[1].y, -L[1].z));
    upperNormal.getNormalMatrix(upperDelta); lowerNormal.getNormalMatrix(lowerDelta);
    for (const edit of geometryEdits) {
      if (!edit.armParts) continue;
      const a = edit.mesh.geometry.attributes.position, normals = edit.mesh.geometry.attributes.normal;
      for (const c of edit.armParts) for (const i of c.vertices) {
        p.fromArray(edit.original, i * 3).applyMatrix4(c.part === 1 ? upperDelta : lowerDelta);
        n.fromArray(edit.normals, i * 3).applyMatrix3(c.part === 1 ? upperNormal : lowerNormal).normalize();
        a.setXYZ(i, p.x, p.y, p.z); normals.setXYZ(i, n.x, n.y, n.z);
      }
      a.needsUpdate = normals.needsUpdate = true;
    }
    for (const edit of instanceEdits) {
      if (edit.mode !== 'arm') continue;
      edit.matrices.forEach((original, i) => {
        if (!edit.tags[i]) return;
        matrix.multiplyMatrices(edit.tags[i] === 1 ? upperDelta : lowerDelta, original);
        edit.mesh.setMatrixAt(i, matrix);
      });
      edit.mesh.instanceMatrix.needsUpdate = true; edit.mesh.computeBoundingSphere();
    }
  }

  function update(weight, time = 0) {
    if (disposed) return;
    weight = clamp(Number(weight) || 0, 0, 1);
    // Original character.update supplies these animated baseline quaternions.
    captured.base.copy(base.quaternion); captured.shoulder.copy(shoulder.quaternion);
    captured.elbow.copy(elbow.quaternion); captured.wrist.copy(wrist.quaternion); captured.neck.copy(neck.quaternion);
    base.position.copy(saved.basePosition); base.position.y -= drop * weight;
    base.quaternion.copy(captured.base).slerp(qTilt, weight);
    neck.quaternion.copy(captured.neck).slerp(qHead, weight);
    poseArm(rightPose, rightGoal, shoulder, elbow, wrist, rightPalmQ, null, weight, captured);
    poseArm(leftPose, leftGoal, leftShoulder, leftElbow, leftWrist, leftPalmQ, leftHandRestQ, weight, null);
    const active = weight > .00001;
    oldRightHand.visible = active ? false : saved.rightHand;
    oldLeftHand.visible = active ? false : saved.leftHand;
    rightHand.visible = leftHand.visible = active;
    if (manageBowVisibility) arjun.bow.visible = active ? false : saved.bow;
    if (manageSeatVisibility) arjun.seat.visible = active ? false : saved.seat;
    if (lastWeight !== weight) { updateLower(weight); updateArmour(); }
    root.updateWorldMatrix(true, true); skeleton.update();
    lastWeight = weight; lastTime = time;
  }
  function faceToward(worldPoint, weight = 1) {
    root.parent?.updateWorldMatrix(true, false);
    p.copy(worldPoint);
    if (root.parent) root.parent.worldToLocal(p);
    p.sub(root.position); p.y = 0;
    if (p.lengthSq() < 1e-9) return;
    q.setFromAxisAngle(v(0, 1, 0), Math.atan2(p.x, p.z));
    root.quaternion.copy(saved.rootQuaternion).slerp(q, clamp(weight, 0, 1));
  }
  function diagnostics() {
    root.updateWorldMatrix(true, true); skeleton.update();
    let minClothY = Infinity;
    for (const edit of geometryEdits) if (edit.mode) {
      const a = edit.mesh.geometry.attributes.position;
      for (let i = 0; i < a.count; i++) minClothY = Math.min(minClothY, a.getY(i));
    }
    return {
      weight: lastWeight, leftWeightedVertices, armourVertexCount,
      originalBodyVertices: saved.bodyGeometry.attributes.position.count,
      bodyVertices: skin.geometry.attributes.position.count,
      recoveredHandVertices: handGeometry.attributes.position.count,
      kneeTargets: kneeTargets.map(p => p.toArray()), ankleTargets: ankleTargets.map(p => p.toArray()),
      minClothY, floorY,
      rightWristWorld: wrist.getWorldPosition(v()).toArray(),
      leftWristWorld: leftWrist.getWorldPosition(v()).toArray(),
      torsoDrop: drop,
    };
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    skin.geometry.dispose(); skin.geometry = saved.bodyGeometry;
    skin.skeleton = originalSkeleton; skin.frustumCulled = savedFrustumCulled;
    rightHand.removeFromParent(); leftHand.removeFromParent(); handGeometry.dispose();
    leftShoulder.removeFromParent(); skeleton.dispose();
    for (const edit of geometryEdits) {
      edit.mesh.geometry.dispose(); edit.mesh.geometry = edit.originalGeometry;
      edit.mesh.frustumCulled = edit.originalFrustumCulled;
    }
    for (const edit of instanceEdits) {
      edit.matrices.forEach((m, i) => edit.mesh.setMatrixAt(i, m));
      edit.mesh.instanceMatrix.needsUpdate = true; edit.mesh.computeBoundingSphere();
    }
    base.position.copy(saved.basePosition); root.quaternion.copy(saved.rootQuaternion);
    oldRightHand.visible = saved.rightHand; oldLeftHand.visible = saved.leftHand;
    arjun.bow.visible = saved.bow; arjun.seat.visible = saved.seat;
    // Restore procedural baseline rotations using the model's own authored API.
    arjun.update(Math.max(0, lastTime), 0, true);
  }
  return {update, faceToward, diagnostics, dispose, bones: {leftShoulder, leftElbow, leftWrist},
    hands: {right: rightHand, left: leftHand}, root};
}
