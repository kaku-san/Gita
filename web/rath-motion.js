import * as T from './vendor/three.module.min.js';

// Runtime animation for the approved Geeta assembly. The sculpture's positions,
// indices, material detail, proportions and source geometry are never edited.
const TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const ramp = (a, b, x) => smooth((x - a) / (b - a));
const V = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
const FEET = [[-.32, .875], [.32, .945], [-.32, -1.17], [.32, -1.05]];
// L hind, L fore, R hind, R fore: a lateral-sequence four-beat walk.
const PHASE = [.50, 0, .75, .25];
const TEAM_PHASE = [0, .065, .125, .035];
const DUTY = .75;

function legRest(i) {
  const [x, z] = FEET[i], front = i < 2, stagger = front ? z - .875 : z + 1.17;
  return {
    hip: V(x, front ? 1.62 : 1.59, (front ? .77 : -.98) + stagger),
    knee: V(x, front ? .85 : .78, (front ? .80 : -1.35) + stagger),
    ankle: V(x, .115, z - .026),
  };
}

// Extra skin weights are shared by all four copies, like the original anatomy.
// The original geometry remains available for exact restoration on dispose.
function walkingGeometry(source, hoovesOnly = false) {
  const geometry = source.clone(), p = geometry.attributes.position;
  const indices = new Uint16Array(p.count * 4), weights = new Float32Array(p.count * 4);
  const oldIndices = source.attributes.skinIndex, oldWeights = source.attributes.skinWeight;
  const rests = FEET.map((_, i) => legRest(i));
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = i * 4;
    const leg = (z > -.2 ? 0 : 2) + (x > 0 ? 1 : 0), front = leg < 2;
    const region = hoovesOnly ? 1 :
      (1 - ramp(front ? 1.30 : 1.39, front ? 1.75 : 1.82, y)) *
      (front ? ramp(.18, .48, z) : 1 - ramp(-.62, -.34, z)) * ramp(.09, .22, Math.abs(x));
    if (region < 1e-6 && oldIndices) {
      for (let j = 0; j < 4; j++) { indices[k + j] = oldIndices.array[k + j]; weights[k + j] = oldWeights.array[k + j]; }
      continue;
    }
    const hoof = hoovesOnly ? 1 : 1 - ramp(.13, .255, y);
    const upper = ramp(rests[leg].knee.y - .12, rests[leg].knee.y + .12, y);
    indices[k] = 0; indices[k + 1] = 3 + leg * 3; indices[k + 2] = 4 + leg * 3; indices[k + 3] = 5 + leg * 3;
    weights[k] = 1 - region;
    weights[k + 1] = region * (1 - hoof) * upper;
    weights[k + 2] = region * (1 - hoof) * (1 - upper);
    weights[k + 3] = region * hoof;
  }
  geometry.setAttribute('skinIndex', new T.Uint16BufferAttribute(indices, 4));
  geometry.setAttribute('skinWeight', new T.Float32BufferAttribute(weights, 4));
  return geometry;
}

function rigHorse(horse, geometry) {
  const oldSkeleton = horse.body.skeleton, oldGeometry = horse.body.geometry;
  const oldRootPosition = horse.root.position.clone(), legs = [], bones = [...oldSkeleton.bones];
  const skinned = [];
  horse.root.traverse(o => { if (o.isSkinnedMesh) skinned.push({mesh: o, skeleton: o.skeleton, bind: o.bindMatrix.clone()}); });
  for (let i = 0; i < 4; i++) {
    const rest = legRest(i), upper = new T.Bone(), lower = new T.Bone(), hoof = new T.Bone();
    upper.name = `Walk ${i + 1} upper`; lower.name = `Walk ${i + 1} ${i < 2 ? 'carpus' : 'hock'}`; hoof.name = `Walk ${i + 1} hoof`;
    upper.position.copy(rest.hip); lower.position.subVectors(rest.knee, rest.hip); hoof.position.subVectors(rest.ankle, rest.knee);
    horse.rig.base.add(upper); upper.add(lower); lower.add(hoof); bones.push(upper, lower, hoof);
    const a = rest.knee.clone().sub(rest.hip), b = rest.ankle.clone().sub(rest.knee);
    const d = rest.ankle.clone().sub(rest.hip);
    legs.push({upper, lower, hoof, rest, l1: a.length(), l2: b.length(), a1: Math.atan2(a.z, a.y), a2: Math.atan2(b.z, b.y),
      bend: Math.sign(d.y * a.z - d.z * a.y) || 1, target: rest.ankle.clone(), reachError: 0});
  }
  horse.root.updateWorldMatrix(true, true);
  const inverseRoot = horse.root.matrixWorld.clone().invert();
  const inverses = oldSkeleton.boneInverses.map(m => m.clone());
  for (const bone of bones.slice(oldSkeleton.bones.length)) inverses.push(new T.Matrix4().multiplyMatrices(inverseRoot, bone.matrixWorld).invert());
  const skeleton = new T.Skeleton(bones, inverses);
  horse.body.geometry = geometry;
  for (const {mesh, bind} of skinned) mesh.bind(skeleton, bind);

  // mergeStatic combined all four horn walls, caps and soles. Replace that
  // render object with a skinned view of exactly the same approved vertices.
  const hoofViews = [], hoofMeshes = [];
  horse.root.traverse(o => { if (o.isMesh && !o.isSkinnedMesh && o.material === horse.materials.hoof) hoofMeshes.push(o); });
  for (const source of hoofMeshes) {
    const geo = walkingGeometry(source.geometry, true), view = new T.SkinnedMesh(geo, source.material);
    view.name = 'Approved hoof walls, caps and soles · walking'; view.position.copy(source.position); view.quaternion.copy(source.quaternion); view.scale.copy(source.scale);
    view.castShadow = source.castShadow; view.receiveShadow = source.receiveShadow; view.frustumCulled = false;
    source.parent.add(view); view.bind(skeleton, horse.body.bindMatrix); const visible = source.visible; source.visible = false;
    hoofViews.push({source, view, visible});
  }
  return {horse, legs, skeleton, oldRootPosition,
    dispose() {
      horse.root.position.copy(oldRootPosition); horse.body.geometry = oldGeometry;
      for (const {mesh, skeleton: original, bind} of skinned) mesh.bind(original, bind);
      for (const {source, view, visible} of hoofViews) { source.visible = visible; view.removeFromParent(); view.geometry.dispose(); }
      for (const {upper} of legs) upper.removeFromParent(); skeleton.dispose();
    }
  };
}

function solveLeg(leg, target, hoofPitch) {
  const {rest, upper, lower, hoof, l1, l2, bend} = leg;
  let dy = target.y - rest.hip.y, dz = target.z - rest.hip.z;
  const requested = Math.hypot(dy, dz), d = clamp(requested, Math.abs(l1 - l2) + 1e-5, l1 + l2 - 1e-5);
  leg.reachError = Math.max(0, requested - d);
  // Numerical clamping only; the modest stride and body lowering keep targets
  // inside reach throughout the authored arrival. Bone lengths never change.
  dy *= d / Math.max(requested, 1e-9); dz *= d / Math.max(requested, 1e-9);
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const ky = dy * a / d - dz * h / d * bend, kz = dz * a / d + dy * h / d * bend;
  const upperAngle = Math.atan2(kz, ky) - leg.a1;
  const lowerAngle = Math.atan2(dz - kz, dy - ky) - leg.a2;
  upper.rotation.x = upperAngle; lower.rotation.x = lowerAngle - upperAngle; hoof.rotation.x = hoofPitch - lowerAngle;
  leg.target.copy(target);
}

/**
 * Capture the final parked pose and add a 9 m opening approach along local +Z.
 * Call update AFTER assembly.update; update already refreshes reins and traces.
 * setTravel(true) plays from the beginning; false parks; a number seeks 0..1.
 * Passing {progress, playing} permits controlled scrubbing/resume.
 */
export function createRathMotion(assembly, options = {}) {
  const distance = options.distance ?? 9, duration = options.duration ?? 10.5;
  const cycle = options.cycle ?? 1.0, lift = options.hoofLift ?? .145;
  if (!(distance > 0 && duration >= 5 && cycle > .5)) throw new Error('Rath travel needs positive distance, duration ≥ 5 s, and cycle > .5 s.');
  const moveDuration = duration - .40, inTime = Math.min(1.4, moveDuration * .22), outTime = Math.min(1.7, moveDuration * .24);
  const cruiseSpeed = distance / (moveDuration - (inTime + outTime) / 2);
  const parkedPosition = assembly.root.position.clone(), lastWorld = V(), parkedWorld = V(), world = V();
  const root = assembly.root, team = assembly.team, chariot = assembly.chariot;
  const geometry = walkingGeometry(team.horses[0].body.geometry), rigs = team.horses.map(h => rigHorse(h, geometry));
  const initialWheelAngles = chariot.wheels.map(w => w.rotation.x);
  chariot.setRolling(false);

  // Keep running gear, wheels, drawpole, towing eye and clevis rigidly coupled.
  // Only the sprung decks and their mounted figures receive millimetric sway.
  const suspension = new T.Group(); suspension.name = 'Rath · restrained carriage suspension';
  suspension.position.set(0, 1.50, -1.20); chariot.root.add(suspension);
  const suspended = [chariot.sections.driver, chariot.sections.warrior, ...Object.values(chariot.mounts), ...Object.values(chariot.seats),
    ...Object.values(chariot.supports), chariot.canopy, chariot.standard].filter(Boolean);
  const parents = suspended.map(o => ({object: o, parent: o.parent, position: o.position.clone(), quaternion: o.quaternion.clone(), scale: o.scale.clone()}));
  chariot.root.updateWorldMatrix(true, true); for (const o of suspended) suspension.attach(o);
  const suspensionRest = suspension.position.clone();
  const restTracePoints = team.traces.map(trace => trace.path.points.map(p => p.clone()));
  let age = 0, playing = options.autoplay !== false, previousAge = -1, disposed = false;
  const state = {progress: 0, elapsed: 0, distance: 0, speed: 0, moving: true, arrived: false, shadowDirty: true,
    worldDisplacement: V(), deltaWorld: V(), maxReachError: 0, feet: []};
  const hand = V(), inverseTeam = new T.Matrix4();
  let lightCapture = null;

  function at(t) {
    t = clamp(t, 0, moveDuration);
    if (t < inTime) { const u = t / inTime; return cruiseSpeed * inTime * (u ** 3 - .5 * u ** 4); }
    const beforeEnd = moveDuration - outTime;
    if (t <= beforeEnd) return cruiseSpeed * (t - inTime / 2);
    const u = (t - beforeEnd) / outTime;
    return cruiseSpeed * (beforeEnd - inTime / 2 + outTime * (u - u ** 3 + .5 * u ** 4));
  }
  function speedAt(t) {
    if (t <= 0 || t >= moveDuration) return 0;
    return cruiseSpeed * smooth(t / inTime) * smooth((moveDuration - t) / outTime);
  }
  function footAt(t, i, horseIndex) {
    const phase = PHASE[i] + TEAM_PHASE[horseIndex], q = t / cycle + phase, n = Math.floor(q), f = q - n;
    const previousContact = (n - phase) * cycle, nextContact = previousContact + cycle;
    const finalContact = (Math.floor(duration / cycle + phase) - phase) * cycle;
    function planted(contact) {
      if (contact <= 0) return 0;
      if (contact >= finalContact - 1e-7) return distance;
      return at(contact + DUTY * cycle * .5);
    }
    if (t >= finalContact) return {z: distance, y: 0, pitch: 0, planted: true};
    const a = planted(previousContact);
    if (f < DUTY) return {z: a, y: 0, pitch: 0, planted: true};
    // A staggered horse may begin inside its first nominal swing. Start that
    // shortened preparatory step on the floor, at the exact approved rest pose.
    const start = Math.max(0, nextContact - (1 - DUTY) * cycle);
    const u = clamp((t - start) / Math.max(1e-6, nextContact - start)), b = planted(nextContact), step = b - a;
    // Smooth world-space flight; zero endpoint velocity and a flat planted sole.
    const arc = Math.sin(Math.PI * u), stepAmount = clamp(Math.abs(step) / .26);
    return {z: T.MathUtils.lerp(a, b, smooth(u)), y: lift * arc * arc * stepAmount,
      pitch: -.17 * Math.sin(TAU * u) * stepAmount, planted: false};
  }

  function refreshHarness() {
    root.updateWorldMatrix(true, true);
    assembly.anchors.reinHand.getWorldPosition(hand); team.setDriverAnchor(hand);
    inverseTeam.copy(team.root.matrixWorld).invert();
    for (let i = 0; i < team.traces.length; i++) {
      const trace = team.traces[i], horse = team.horses[Math.floor(i / 2)], side = i % 2 ? 'Right' : 'Left';
      horse.anchors['trace' + side].getWorldPosition(trace.path.points[0]).applyMatrix4(inverseTeam);
      // Keep the approved routed span and stitching, flexing only its first span.
      for (let j = 1; j < trace.path.points.length; j++) trace.path.points[j].copy(restTracePoints[i][j]);
      trace.refresh();
    }
  }
  function apply() {
    const travelled = at(age), speed = speedAt(age);
    root.position.copy(parkedPosition); root.position.z += travelled - distance;
    state.maxReachError = 0; state.feet.length = 0;
    const activity = smooth(age / .55) * smooth((duration - age) / .70);
    for (let h = 0; h < rigs.length; h++) {
      const rig = rigs[h], bob = activity * (-.085 + .010 * Math.sin(age / cycle * TAU * 2 + h * .8));
      rig.horse.root.position.copy(rig.oldRootPosition); rig.horse.root.position.y += bob;
      for (let i = 0; i < 4; i++) {
        const leg = rig.legs[i], foot = footAt(age, i, h), target = leg.rest.ankle.clone();
        target.y += foot.y - bob; target.z += foot.z - travelled;
        // A rotating hoof would otherwise graze the ground near landing.
        target.y += Math.abs(Math.sin(foot.pitch)) * .115;
        solveLeg(leg, target, foot.pitch); state.maxReachError = Math.max(state.maxReachError, leg.reachError);
        state.feet.push({horse: h, leg: i, worldAdvance: foot.z, lift: foot.y, planted: foot.planted});
      }
    }
    for (let i = 0; i < chariot.wheels.length; i++) chariot.wheels[i].rotation.x = initialWheelAngles[i] + travelled / chariot.wheelRadius;
    suspension.position.copy(suspensionRest); suspension.position.y += activity * .008 * Math.sin(travelled * 7.1);
    suspension.rotation.set(activity * .0017 * Math.sin(travelled * 4.7), 0, activity * .0022 * Math.sin(travelled * 6.3));
    if (previousAge !== age || age < duration) refreshHarness();
    root.getWorldPosition(world);
    parkedWorld.copy(parkedPosition); if (root.parent) root.parent.localToWorld(parkedWorld);
    state.worldDisplacement.subVectors(world, parkedWorld); state.deltaWorld.subVectors(world, lastWorld); lastWorld.copy(world);
    state.progress = age / duration; state.elapsed = age; state.distance = travelled; state.speed = speed;
    state.arrived = age >= duration; state.moving = !state.arrived; state.shadowDirty = previousAge !== age;
    previousAge = age;
    if (options.renderer) syncShadows(options.renderer, options.shadowLight);
    return state;
  }
  function syncShadows(renderer, light) {
    if (state.shadowDirty) renderer.shadowMap.needsUpdate = true;
    if (light) {
      if (!lightCapture || lightCapture.light !== light) {
        light.updateWorldMatrix(true, false); light.target.updateWorldMatrix(true, false);
        lightCapture = {light, position: light.getWorldPosition(V()), target: light.target.getWorldPosition(V())};
      }
      const p = lightCapture.position.clone().add(state.worldDisplacement), target = lightCapture.target.clone().add(state.worldDisplacement);
      if (light.parent) light.parent.worldToLocal(p); if (light.target.parent) light.target.parent.worldToLocal(target);
      light.position.copy(p); light.target.position.copy(target); light.target.updateWorldMatrix(true, false);
    }
  }
  function setTravel(value = true) {
    if (typeof value === 'number') { age = clamp(value) * duration; playing = false; }
    else if (typeof value === 'boolean') { age = value ? 0 : duration; playing = value; }
    else { if (value.progress !== undefined) age = clamp(value.progress) * duration; if (value.playing !== undefined) playing = !!value.playing; }
    return apply();
  }
  root.updateWorldMatrix(true, true); root.getWorldPosition(lastWorld); apply(); state.deltaWorld.set(0, 0, 0);
  return {
    setTravel, get progress() { return state.progress; }, get state() { return state; }, get playing() { return playing; },
    update(time, dt, animated = true) {
      if (disposed) return state;
      if (animated && playing) { age = Math.min(duration, age + Math.max(0, Math.min(dt, .1))); if (age >= duration) playing = false; }
      return apply();
    },
    syncShadows,
    dispose() {
      if (disposed) return; disposed = true;
      for (const rig of rigs) rig.dispose(); geometry.dispose(); root.position.copy(parkedPosition);
      for (const {object, parent, position, quaternion, scale} of parents) { parent.add(object); object.position.copy(position); object.quaternion.copy(quaternion); object.scale.copy(scale); }
      suspension.removeFromParent(); chariot.wheels.forEach((w, i) => { w.rotation.x = initialWheelAngles[i]; });
      if (lightCapture) {
        const {light, position, target} = lightCapture, p = position.clone(), q = target.clone();
        if (light.parent) light.parent.worldToLocal(p); if (light.target.parent) light.target.parent.worldToLocal(q);
        light.position.copy(p); light.target.position.copy(q);
      }
      refreshHarness();
    }
  };
}
