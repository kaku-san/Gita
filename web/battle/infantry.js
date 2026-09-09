import * as T from './vendor/three.module.min.js';

// Metres, Y up, character front +Z. All visible anatomy is made from shaped
// surfaces; joints overlap inside the anatomy rather than using joint balls.
const TAU = Math.PI * 2;
const UP = new T.Vector3(0, 1, 0);
const ONE = new T.Vector3(1, 1, 1);
const IDENTITY = new T.Quaternion();
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const fract = v => v - Math.floor(v);
const hash = n => fract(Math.sin(n * 127.1 + 311.7) * 43758.5453123);

function surface(profile, sides, { folds = 0, front = 0, cap = false } = {}) {
  const p = [], uv = [], ix = [];
  for (let j = 0; j < profile.length; j++) {
    const [y, rx, rz, cx = 0, cz = 0] = profile[j];
    for (let i = 0; i <= sides; i++) {
      const a = i / sides * TAU, f = 1 + folds * Math.cos(a * 8 + j * .14);
      p.push(cx + Math.sin(a) * rx * f, y,
        cz + Math.cos(a) * rz * f + front * Math.max(0, Math.cos(a)) ** 5 * Math.sin(j / (profile.length - 1) * Math.PI));
      uv.push(i / sides, j / (profile.length - 1));
      if (j && i < sides) {
        const k = j * (sides + 1) + i, b = k - sides - 1;
        if (profile.at(-1)[0] > profile[0][0]) ix.push(b, b + 1, k, b + 1, k + 1, k);
        else ix.push(b, k, b + 1, b + 1, k, k + 1);
      }
    }
  }
  if (cap) for (const j of [0, profile.length - 1]) {
    const q = profile[j], n = p.length / 3;
    p.push(q[3] || 0, q[0], q[4] || 0); uv.push(.5, .5);
    for (let i = 0; i < sides; i++) {
      const k = j * (sides + 1) + i;
      if (j === 0) ix.push(n, k + 1, k); else ix.push(n, k, k + 1);
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(p, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  g.setIndex(ix); g.computeVertexNormals(); return g;
}

function colored(g, color) {
  const c = new T.Color(color), a = new Float32Array(g.attributes.position.count * 3);
  for (let i = 0; i < a.length; i += 3) { a[i] = c.r; a[i + 1] = c.g; a[i + 2] = c.b; }
  g.setAttribute('color', new T.BufferAttribute(a, 3)); return g;
}

function merge(parts) {
  const p = [], n = [], c = [], uv = [], ix = [];
  let offset = 0;
  for (const g of parts) {
    const a = g.attributes;
    p.push(...a.position.array); n.push(...a.normal.array);
    if (a.color) c.push(...a.color.array);
    else for (let i = 0; i < a.position.count; i++) c.push(1, 1, 1);
    if (a.uv) uv.push(...a.uv.array);
    else for (let i = 0; i < a.position.count; i++) uv.push(0, 0);
    if (g.index) for (const i of g.index.array) ix.push(offset + i);
    else for (let i = 0; i < a.position.count; i++) ix.push(offset + i);
    offset += a.position.count; g.dispose();
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(p, 3));
  g.setAttribute('normal', new T.Float32BufferAttribute(n, 3));
  g.setAttribute('color', new T.Float32BufferAttribute(c, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  g.setIndex(ix); g.computeBoundingBox(); g.computeBoundingSphere(); return g;
}

function ellipsoid(x, y, z, sx, sy, sz, sides = 12, rings = 7, color = 0xffffff) {
  const g = new T.SphereGeometry(1, sides, rings);
  g.scale(sx, sy, sz); g.translate(x, y, z); return colored(g, color);
}

function box(x, y, z, sx, sy, sz, color = 0xffffff) {
  const g = new T.BoxGeometry(sx, sy, sz); g.translate(x, y, z); return colored(g, color);
}

function segment(g, a, b) {
  const va = new T.Vector3(...a), vb = new T.Vector3(...b), d = vb.clone().sub(va);
  g.scale(1, d.length(), 1);
  g.applyQuaternion(new T.Quaternion().setFromUnitVectors(UP, d.normalize()));
  g.translate(...va.toArray()); return g;
}

function faceGeometry(sides) {
  const head = surface([
    [-.118, .041, .046, 0, .021], [-.098, .060, .067, 0, .013],
    [-.066, .074, .074, 0, .002], [-.024, .086, .078, 0, -.003],
    [.026, .087, .082, 0, -.006], [.071, .089, .086, 0, -.011],
    [.110, .079, .073, 0, -.012], [.141, .054, .052, 0, -.013],
    [.155, .011, .011, 0, -.010]
  ], sides, { front: .008 });
  const nose = new T.BufferGeometry();
  nose.setAttribute('position', new T.Float32BufferAttribute([
    -.016, .028, .076, .016, .028, .076, 0, -.011, .125,
    -.019, -.025, .085, .019, -.025, .085, 0, -.030, .111
  ], 3));
  nose.setIndex([0, 2, 1, 0, 3, 2, 1, 2, 4, 3, 5, 2, 4, 2, 5, 3, 4, 5]);
  nose.computeVertexNormals();
  return merge([head, nose,
    ellipsoid(-.087, -.013, -.004, .015, .035, .014, 8, 5),
    ellipsoid(.087, -.013, -.004, .015, .035, .014, 8, 5)]);
}

function facialFeatures() {
  const p = [], ix = [];
  const quad = (x, y, z, w, h, slant = 0) => {
    const k = p.length / 3;
    p.push(x-w,y-h-slant,z, x+w,y-h+slant,z, x+w,y+h+slant,z, x-w,y+h-slant,z);
    ix.push(k,k+1,k+2,k,k+2,k+3);
  };
  for (const s of [-1, 1]) {
    quad(s*.033,.017,.081,.013,.0035);
    quad(s*.034,.032,.082,.017,.003,-s*.0015);
    quad(s*.013,-.047,.085,.013,.004,-s*.001);
  }
  quad(0,-.063,.081,.020,.0025);
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(p,3));
  g.setIndex(ix); g.computeVertexNormals(); return g;
}

function helmetGeometry(sides, turban = false) {
  if (turban) return surface([
    [.022, .096, .090, 0, -.006], [.041, .110, .104, 0, -.010],
    [.057, .103, .099, 0, -.010], [.075, .115, .110, 0, -.013],
    [.089, .105, .102, 0, -.013], [.111, .111, .104, 0, -.014],
    [.132, .086, .083, 0, -.014], [.153, .061, .060, 0, -.014],
    [.166, .010, .010, 0, -.014]
  ], sides, { folds: .018 });
  const dome = surface([
    [.032, .100, .094, 0, -.008], [.046, .103, .097, 0, -.008],
    [.066, .098, .094, 0, -.010], [.110, .084, .083, 0, -.012],
    [.145, .060, .061, 0, -.013], [.165, .012, .014, 0, -.013]
  ], sides);
  const rim = surface([[.030, .103, .097, 0, -.008], [.041, .104, .098, 0, -.008]], sides);
  return merge([colored(dome, 0xa98a58), colored(rim, 0xdfbd70)]);
}

function swordGeometry() {
  const blade = new T.BufferGeometry();
  const p = [];
  for (const [y, w, z] of [[.13, .031, .009], [.70, .024, .006], [.91, 0, 0]])
    p.push(-w, y, 0, 0, y, z, w, y, 0, 0, y, -z);
  const ix = [];
  for (let j = 0; j < 2; j++) for (let k = 0; k < 4; k++) {
    const a = j * 4 + k, b = j * 4 + (k + 1) % 4;
    ix.push(a, b, a + 4, b, b + 4, a + 4);
  }
  blade.setAttribute('position', new T.Float32BufferAttribute(p, 3));
  blade.setIndex(ix); blade.computeVertexNormals();
  return merge([colored(blade, 0xbbbec0),
    box(0, .112, 0, .16, .019, .029, 0xc19b4e),
    colored(new T.CylinderGeometry(.017, .019, .15, 8).translate(0, .025, 0), 0x493426),
    ellipsoid(0, -.062, 0, .026, .022, .022, 8, 3, 0xbd9b58)]);
}

function shieldGeometry(sides) {
  const rings = [[0, .058], [.15, .031], [.255, .005], [.265, 0], [.265, -.027]];
  const p = [], ix = [], colors = [];
  for (let j = 0; j < rings.length; j++) for (let i = 0; i <= sides; i++) {
    const a = i / sides * TAU, [r, z] = rings[j], c = new T.Color(j >= 3 ? 0xc4a36a : 0x4c3826);
    p.push(Math.cos(a) * r, Math.sin(a) * r, z);
    colors.push(c.r, c.g, c.b);
    if (j && i < sides) { const k = j * (sides + 1) + i, b = k - sides - 1; ix.push(b, k, b + 1, b + 1, k, k + 1); }
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(p, 3));
  g.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); g.setIndex(ix); g.computeVertexNormals();
  const boss = (x,y,z,r,d,n) => {
    const b = new T.ConeGeometry(r,d,n); b.rotateX(Math.PI/2); b.translate(x,y,z); return colored(b,0xb89c62);
  };
  const parts = [g, boss(0,0,.062,.048,.030,10)];
  for (let k = 0; k < 4; k++) { const a = (k + .5) / 4 * TAU; parts.push(boss(Math.cos(a)*.128,Math.sin(a)*.128,.038,.021,.014,6)); }
  return merge(parts);
}

function fistGeometry(sides) {
  const palm = surface([[-.045,.027,.019],[-.028,.036,.025],[.017,.038,.026],[.044,.025,.020]],sides,{cap:true});
  const parts = [palm], fine = sides > 6;
  for (let i=0;i<4;i++) {
    const f=surface([[0,.007,.008],[.012,.010,.012],[.038,.006,.007]],fine?5:3);
    f.rotateZ(-Math.PI/2); f.translate(-.009,-.028+i*.018,.023); parts.push(f);
  }
  const thumb=ellipsoid(-.030,.012,.008,.014,.032,.015,fine?6:4,3); thumb.rotateZ(-.30); parts.push(thumb);
  return merge(parts);
}

function footGeometry(sides) {
  return merge([
    colored(surface([[-.045,.039,.049],[.035,.029,.030]],sides),0xc4a186),
    ellipsoid(0, -.052, .055, .058, .043, .137, sides, sides > 6 ? 4 : 3, 0xc4a186),
    ellipsoid(0, -.083, .057, .064, .013, .147, sides, sides > 6 ? 3 : 2, 0x3c2c22),
    box(0, -.020, .108, .113, .013, .026, 0x6b4830),
    box(0, -.010, .030, .098, .015, .026, 0x6b4830)
  ]);
}

function armourGeometry(sides) {
  const shell = surface([
    [.155, .155, .102], [.200, .164, .112], [.315, .190, .125],
    [.455, .211, .141], [.545, .208, .122], [.580, .145, .102]
  ], sides, { front: .012 });
  const belt = surface([[.116, .172, .119], [.160, .169, .118]], sides);
  const rim = surface([[.155, .158, .106], [.168, .162, .109]], sides);
  const parts = [colored(shell, 0x9e7542), colored(belt, 0x442c20), colored(rim, 0xd3ad60),
    ellipsoid(0, .426, .153, .046, .053, .011, 10, 5, 0xc6a561),
    box(0, .137, .124, .058, .044, .010, 0xbfa16c)];
  // Broad shoulder straps follow the shell; engraved chest bands read in shade.
  for (const s of [-1, 1]) {
    parts.push(box(s * .149, .563, .075, .034, .040, .103, 0xc0a167));
    parts.push(box(s * .090, .359, .142, .100, .012, .006, 0x695130));
  }
  return merge(parts);
}

function clothGeometry(sides) {
  const wrap = surface([
    [.020, .169, .114], [-.054, .192, .130], [-.175, .220, .147],
    [-.290, .229, .158], [-.353, .222, .150]
  ], sides, { folds: .044 });
  const sash = surface([[.012, .172, .117], [.082, .173, .119], [.114, .166, .113]], sides, { folds: .025 });
  const apron = new T.BufferGeometry(), p = [], ix = [];
  for (let j = 0; j <= 5; j++) for (let i = 0; i <= 6; i++) {
    const u = i / 6, v = j / 5;
    p.push((u - .5) * mix(.15, .21, v), mix(.075, -.43, v) + .018 * Math.cos(u * TAU), mix(.124, .176, v) + .010 * Math.cos(u * TAU * 3));
    if (i < 6 && j < 5) { const k = j * 7 + i; ix.push(k, k + 1, k + 7, k + 1, k + 8, k + 7); }
  }
  apron.setAttribute('position', new T.Float32BufferAttribute(p, 3)); apron.setIndex(ix); apron.computeVertexNormals();
  return { wrap, sash: merge([sash, apron]) };
}

function makeArmyGeometry(faction, low) {
  const parts = [], s = low ? 5 : 6;
  const skin = faction ? 0x946b4e : 0xa27857, cloth = faction ? 0x8a3d29 : 0x4b6468;
  parts.push(colored(surface([[.83, .16, .10], [1.02, .15, .11], [1.37, .22, .13], [1.46, .17, .10]], s), 0x947344));
  parts.push(colored(surface([[.94, .17, .12], [.70, .21, .145], [.58, .20, .13]], s), cloth));
  parts.push(colored(surface([[1.51, .057, .045], [1.58, .082, .076], [1.70, .084, .076], [1.76, .030, .035]], s), skin));
  parts.push(colored(surface([[1.68, .096, .086], [1.76, .080, .074], [1.80, .015, .016]], s), 0xb09462));
  const limb = (a, b, r1, r2, color) => parts.push(colored(segment(surface([[0, r1, r1 * .83], [1, r2, r2 * .83]], 5), a, b), color));
  for (const side of [-1, 1]) {
    const hip = [side * .104, .90, 0], knee = [side * .143, .49, side * .047], ankle = [side * .16, .10, side * .064];
    limb(hip, knee, .097, .064, 0xbeae84); limb(knee, ankle, .063, .037, skin);
    parts.push(box(side * .16, .053, side * .064 + .047, .10, .076, .235, 0x564131));
    const shoulder = [side * .218, 1.41, 0], elbow = [side * .29, 1.17, .13], wrist = [side * .23, 1.23, .37];
    limb(shoulder, elbow, .062, .043, skin); limb(elbow, wrist, .045, .029, skin);
  }
  const shield = new T.CircleGeometry(.242, low ? 8 : 10); shield.translate(.23, 1.23, .402); parts.push(colored(shield, 0x654c30));
  const boss = new T.ConeGeometry(.042, .032, 5); boss.rotateX(Math.PI / 2); boss.translate(.23, 1.23, .42); parts.push(colored(boss, 0xc4a35f));
  const spear = segment(new T.CylinderGeometry(.010, .013, 1, 4).translate(0, .5, 0), [-.23, .62, .33], [-.22, 2.34, .59]); parts.push(colored(spear, 0x5b4128));
  const tip = new T.ConeGeometry(.039, .20, 4); tip.rotateX(.14); tip.translate(-.22, 2.44, .605); parts.push(colored(tip, 0xb3b5ad));
  return merge(parts);
}

function shadowTexture() {
  const n = 48, data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const d = Math.hypot((x + .5 - n / 2) / (n / 2), (y + .5 - n / 2) / (n / 2));
    const k = (y * n + x) * 4; data[k] = data[k + 1] = data[k + 2] = 255; data[k + 3] = Math.round(255 * Math.pow(clamp(1 - d * d), 2.3));
  }
  const t = new T.DataTexture(data, n, n, T.RGBAFormat); t.needsUpdate = true;
  t.magFilter = t.minFilter = T.LinearFilter; return t;
}

const EXCLUSIONS = [
  { kind: 'box', name: 'Chariot aisle', minX: -7, maxX: 7, minZ: -12, maxZ: 20 },
  { kind: 'box', name: 'Story camera', minX: 5, maxX: 27, minZ: -32, maxZ: 18 },
  { kind: 'box', name: 'Forward cavalry', minX: -28, maxX: -20, minZ: 40, maxZ: 100 },
  { kind: 'box', name: 'Rear cavalry', minX: -28, maxX: -20, minZ: -35, maxZ: -7 },
  { kind: 'circle', name: 'Left elephant', x: -16, z: 30, radius: 5 },
  { kind: 'circle', name: 'Right elephant', x: 20, z: 40, radius: 5 },
  { kind: 'circle', name: 'Rear left elephant', x: -18, z: -18, radius: 5 },
  { kind: 'circle', name: 'Rear right elephant', x: 34, z: -22, radius: 5 }
];

function permitted(x, z, margin = 1) {
  for (const e of EXCLUSIONS) {
    if (e.kind === 'circle') { if (Math.hypot(x - e.x, z - e.z) < e.radius + margin) return false; }
    else if (x > e.minX - margin && x < e.maxX + margin && z > e.minZ - margin && z < e.maxZ + margin) return false;
  }
  return true;
}

function buildPairs(count, groundHeight) {
  const pairs = [];
  const add = (x, z, yaw, island) => {
    if (pairs.length >= count || !permitted(x, z, 1.55)) return;
    if (pairs.some(p => Math.hypot(p.x - x, p.z - z) < 2.60)) return;
    const i = pairs.length, gap = 1.69 + hash(i + 53) * .07;
    const dx = Math.sin(yaw) * gap * .5, dz = Math.cos(yaw) * gap * .5;
    if (!permitted(x - dx, z - dz, .75) || !permitted(x + dx, z + dz, .75)) return;
    pairs.push({ id: i, x, y: groundHeight(x, z), z, yaw, gap, island,
      phase: i === 0 ? .19 : hash(i * 3 + 9), speed: .205 + hash(i + 90) * .047,
      type: i % 3, roots: [[x - dx, groundHeight(x - dx, z - dz), z - dz], [x + dx, groundHeight(x + dx, z + dz), z + dz]] });
  };
  add(-14, 8, .35, 'Focal duel');
  // Clearly readable exchanges beyond the two figures, outside the horse aisle.
  for(const z of [-8,-3,2,12,17])add(-10,z,.65,'Near chariot exchanges');
  add(29,5,-.65,'Near right exchanges');add(29,12,-.4,'Near right exchanges');
  const islands = [
    { name: 'Near and rear left', x0: -17, dx: 3.0, nx: 3, z0: -15, dz: 3.1, nz: 11, n: 23 },
    { name: 'Outer left clash', x0: -41, dx: 3.3, nx: 3, z0: 10, dz: 4.3, nz: 10, n: 16 },
    { name: 'Central forward clash', x0: -10, dx: 4.0, nx: 6, z0: 57, dz: 5.2, nz: 6, n: 15 },
    { name: 'Right clash', x0: 32, dx: 3.5, nx: 5, z0: 23, dz: 4.5, nz: 11, n: 17 }
  ];
  for (const island of islands) {
    const target = pairs.length + Math.round(island.n * (count - 1) / 71), order = [];
    for (let iz = 0; iz < island.nz; iz++) for (let ix = 0; ix < island.nx; ix++) order.push([ix, iz]);
    // Spread pairs across each island, keeping the nearest row visibly busy.
    order.sort((a, b) => hash(a[0] * 37 + a[1] * 73 + island.x0) - hash(b[0] * 37 + b[1] * 73 + island.x0));
    for (const [ix, iz] of order) {
      if (pairs.length >= target) break;
      const h = ix * 81 + iz * 29 + island.x0;
      add(island.x0 + ix * island.dx + (hash(h) - .5) * .48,
        island.z0 + iz * island.dz + (hash(h + 1) - .5) * .40,
        mix(-.38, .48, hash(h + 2)), island.name);
    }
  }
  // Count is exact even if a caller keeps the footprint of an exclusion wider.
  for (let k = 0; pairs.length < count && k < 120; k++) add(32 + (k % 5) * 3.5, 25 + Math.floor(k / 5) * 3.4, .18, 'Right reinforcement');
  return pairs;
}

function buildArmy(low, groundHeight) {
  const companies = [
    [-52, -48, 0], [-46, -14, 0], [-56, 32, 0], [-63, 70, 0], [-62, 105, 0],
    [52, -45, 1], [52, 4, 1], [58, 45, 1], [60, 84, 1], [64, 124, 1]
  ];
  const cols = low ? 10 : 12, rows = low ? 10 : 12, army = [];
  for (let c = 0; c < companies.length; c++) {
    const [cx, cz, faction] = companies[c], yaw = Math.atan2(-cx, 20 - cz);
    for (let r = 0; r < rows; r++) for (let col = 0; col < cols; col++) {
      const i = army.length, x = cx + (col - (cols - 1) / 2) * .96 + (r % 2) * .22 + (hash(i + 518) - .5) * .20;
      const z = cz + (r - (rows - 1) / 2) * 1.34 + (hash(i + 918) - .5) * .20;
      army.push({ x, y: groundHeight(x, z), z, faction, company: c,
        yaw: yaw + (hash(i + 9) - .5) * .10, scale: .95 + hash(i + 17) * .10, phase: hash(i + 42) * TAU });
    }
  }
  return { army, companies: companies.map(([x, z, faction], id) => ({ id, center: [x, 0, z], faction, rows, columns: cols })) };
}

/** Instanced, independently reusable infantry element. No fetches, DOM, renderer
 * ownership or global scene assumptions. `update` is allocation-free per actor.
 * setVision(0) = normal battlefield; setVision(1) = 4% residual figures/no shadows.
 */
export function createInfantry({ quality = 'high', groundHeight = (x, z) => 0 } = {}) {
  const low = quality === 'low', pairs = buildPairs(low ? 52 : 72, groundHeight);
  const { army, companies } = buildArmy(low, groundHeight), count = pairs.length * 2;
  const root = new T.Group(); root.name = 'Living battlefield infantry';
  const materials = [], geometries = new Set(), batches = {}, textures = [];
  const mat = (name, opts) => { const m = new T.MeshStandardMaterial(opts); m.name = name; materials.push(m); return m; };
  const skinMat = mat('Warm varied skin', { color: 0xffffff, roughness: .79 });
  const bronzeMat = mat('Worked bronze cuirass', { vertexColors: true, color: 0xffffff, metalness: .66, roughness: .53 });
  const clothMat = mat('Unbleached cotton dhoti', { color: 0xffffff, roughness: .94, side: T.DoubleSide });
  const sashMat = mat('Woven faction sashes', { color: 0xffffff, roughness: .9, side: T.DoubleSide });
  const detailMat = mat('Face and brow', { color: 0x241b16, roughness: .92 });
  const handMat = skinMat;
  const weaponMat = mat('Blade, hilt and shield', { color: 0xffffff, vertexColors: true, metalness: .72, roughness: .40, side: T.DoubleSide });
  const footMat = mat('Sandals and feet', { color: 0xffffff, vertexColors: true, roughness: .88 });
  const armyMat = mat('Distant natural troop colors', { color: 0xffffff, vertexColors: true, roughness: .84, metalness: .12, side: T.DoubleSide });
  const clock = { value: 0 };
  armyMat.onBeforeCompile = shader => {
    shader.uniforms.infantryTime = clock;
    shader.vertexShader = 'uniform float infantryTime; attribute float soldierPhase;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float upper = smoothstep(0.64, 1.42, position.y);
      transformed.x += sin(infantryTime * 1.12 + soldierPhase) * 0.018 * upper;
      transformed.z += sin(infantryTime * 0.79 + soldierPhase * 1.73) * 0.012 * upper;
    `);
  };
  armyMat.customProgramCacheKey = () => 'living-infantry-army-v2';
  function batch(name, geometry, material, capacity) {
    geometries.add(geometry);
    const m = new T.InstancedMesh(geometry, material, capacity); m.name = name;
    m.instanceMatrix.setUsage(T.DynamicDrawUsage); m.castShadow = true; m.receiveShadow = true;
    // Battles cover disjoint islands; fixed coarse culling is safer than a stale
    // animated instance bound. The parent can cull this root as one element.
    m.frustumCulled = false; root.add(m); batches[name] = m; return m;
  }
  const sides = low ? 6 : 12;
  batch('torso', surface([[0, .139, .096], [.15, .148, .105], [.32, .186, .120], [.49, .212, .126], [.555, .217, .110], [.61, .103, .077], [.69, .047, .044]], sides), skinMat, count);
  batch('armour', armourGeometry(sides), bronzeMat, count);
  const cloth = clothGeometry(low ? 8 : 14);
  batch('dhoti', cloth.wrap, clothMat, count); batch('sash', cloth.sash, sashMat, count);
  batch('head', faceGeometry(sides), skinMat, count);
  batch('features', facialFeatures(), detailMat, count);
  batch('helmet', helmetGeometry(sides), bronzeMat, Math.ceil(count / 2));
  batch('turban', helmetGeometry(sides, true), sashMat, Math.floor(count / 2));
  batch('upperArm', surface([[0, .042, .042], [.13, .066, .059], [.34, .064, .054], [.61, .054, .046], [.89, .040, .037], [1, .038, .034]], sides), skinMat, count * 2);
  batch('foreArm', surface([[0, .041, .037], [.22, .046, .039], [.45, .043, .035], [.79, .031, .026], [1, .027, .024]], sides), skinMat, count * 2);
  batch('thigh', surface([[0, .092, .087], [.22, .109, .093], [.46, .102, .087], [.75, .078, .071], [1, .060, .056]], sides), clothMat, count * 2);
  batch('shin', surface([[0, .061, .056], [.19, .064, .056], [.37, .065, .056], [.64, .048, .043], [.90, .032, .031], [1, .030, .029]], sides), skinMat, count * 2);
  batch('bracer', colored(surface([[.10, .045, .041], [.52, .046, .040], [.72, .038, .034]], sides), 0x766043), bronzeMat, count * 2);
  batch('hand', fistGeometry(low ? 6 : 10), handMat, count * 2);
  batch('foot', footGeometry(low ? 6 : 10), footMat, count * 2);
  batch('sword', swordGeometry(), weaponMat, count);
  batch('shield', shieldGeometry(low ? 12 : 18), weaponMat, count);
  const armyBatches = [];
  for (let f = 0; f < 2; f++) {
    const soldiers = army.filter(a => a.faction === f), g = makeArmyGeometry(f, low);
    g.setAttribute('soldierPhase', new T.InstancedBufferAttribute(new Float32Array(soldiers.map(s => s.phase)), 1));
    armyBatches.push({ mesh: batch(`army${f}`, g, armyMat, soldiers.length), soldiers });
  }
  const shadowMap = shadowTexture(); textures.push(shadowMap);
  const shadowMat = new T.MeshBasicMaterial({ color: 0x241d14, map: shadowMap, transparent: true, alphaTest: .001, opacity: .31, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
  shadowMat.name = 'Soft contact shadows'; materials.push(shadowMat);
  const shadowArmy = army.filter(a => Math.hypot(a.x, a.z) < 80);
  const shadows = batch('contactShadow', new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), shadowMat, count + shadowArmy.length);
  shadows.castShadow = shadows.receiveShadow = false; shadows.renderOrder = 1;

  const matrix = new T.Matrix4(), local = new T.Matrix4(), bodyMatrix = new T.Matrix4(), headMatrix = new T.Matrix4();
  const base = new T.Matrix4(), bodyQ = new T.Quaternion(), q = new T.Quaternion(), bladeQ = new T.Quaternion(), shieldQ = new T.Quaternion();
  const position = new T.Vector3(), scale = new T.Vector3(), direction = new T.Vector3(), midpoint = new T.Vector3();
  const hip = new T.Vector3(), knee = new T.Vector3(), ankle = new T.Vector3(), shoulder = new T.Vector3(), elbow = new T.Vector3(), wrist = new T.Vector3();
  const pole = new T.Vector3(), normal = new T.Vector3(), swordAim = new T.Vector3(), point = new T.Vector3();
  const shieldTarget = new T.Vector3();
  const euler = new T.Euler(), bladeEuler = new T.Euler(), shieldEuler = new T.Euler();
  const actors = pairs.flatMap(pair => [0, 1].map(side => ({ pair, side, scale: .967 + hash(pair.id * 2 + side + 402) * .066,
    skin: new T.Color().setHSL(.062 + hash(pair.id * 2 + side + 502) * .020, .30 + hash(pair.id + 77) * .10, .30 + hash(pair.id * 2 + side + 90) * .12),
    cloth: new T.Color(side ? 0xcdb58a : 0xc6bea0), sash: new T.Color(side ? 0x863628 : 0x435d65) })));
  const bodyTransform = (m, x, y, z) => { position.set(x, y, z); local.compose(position, IDENTITY, ONE); matrix.multiplyMatrices(m, local); };
  const put = (name, index, transform, pos, quat = IDENTITY, scl = ONE) => { local.compose(pos, quat, scl); matrix.multiplyMatrices(transform, local); batches[name].setMatrixAt(index, matrix); };
  function bone(name, index, a, b, transform = base) {
    direction.subVectors(b, a); const length = direction.length();
    q.setFromUnitVectors(UP, direction.multiplyScalar(1 / Math.max(.0001, length)));
    scale.set(1, length, 1); put(name, index, transform, a, q, scale);
  }
  function solveJoint(a, b, l1, l2, px, py, pz, out) {
    direction.subVectors(b, a); const d = clamp(direction.length(), .001, l1 + l2 - .002); direction.normalize();
    pole.set(px, py, pz).addScaledVector(direction, -pole.set(px, py, pz).dot(direction));
    if (pole.lengthSq() < .00001) pole.set(0, 0, 1); pole.normalize();
    const along = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - along * along));
    out.copy(a).addScaledVector(direction, along).addScaledVector(pole, h);
  }
  const footGround = (actor, lx, lz) => {
    const a = actor.pair.yaw + actor.side * Math.PI, c = Math.cos(a), s = Math.sin(a), r = actor.pair.roots[actor.side];
    return (groundHeight(r[0] + (c * lx + s * lz) * actor.scale, r[2] + (-s * lx + c * lz) * actor.scale) - r[1]) / actor.scale;
  };
  function footstep(phase) {
    // Outgoing toe is lifted only while its planted position changes.
    const out = smooth(.025, .135, phase), back = smooth(.36, .48, phase);
    return .19 * (out - back);
  }
  function footlift(phase) {
    if (phase > .025 && phase < .135) return Math.sin((phase - .025) / .110 * Math.PI) * .065;
    if (phase > .36 && phase < .48) return Math.sin((phase - .36) / .12 * Math.PI) * .050;
    return 0;
  }
  function animateActor(actor, i, elapsed) {
    const { pair, side } = actor, phase = fract(elapsed * pair.speed + pair.phase + side * .5), other = fract(phase + .5);
    const wind = smooth(.035, .14, phase) * (1 - smooth(.15, .245, phase));
    const strike = smooth(.15, .245, phase) * (1 - smooth(.30, .445, phase));
    const block = smooth(.09, .21, other) * (1 - smooth(.33, .445, other));
    const recoil = smooth(.24, .275, other) * (1 - smooth(.285, .405, other));
    const step = footstep(phase), lift = footlift(phase), move = .070 * strike - .058 * recoil;
    const hipY = .872 - .014 * wind - .018 * strike - .024 * recoil - .076 * (step / .19);
    const r = pair.roots[side], yaw = pair.yaw + side * Math.PI;
    q.setFromAxisAngle(UP, yaw); scale.setScalar(actor.scale); position.set(r[0], r[1], r[2]); base.compose(position, q, scale);
    euler.set(.055 * strike - .045 * recoil, -.080 * wind + .050 * strike, -.018 * wind);
    bodyQ.setFromEuler(euler); position.set(0, hipY, move); bodyMatrix.compose(position, bodyQ, ONE);
    matrix.multiplyMatrices(base, bodyMatrix); batches.torso.setMatrixAt(i, matrix); batches.armour.setMatrixAt(i, matrix);
    position.set(0, hipY, move); q.setFromAxisAngle(UP, -.035 * wind); put('dhoti', i, base, position, q);
    q.setFromAxisAngle(UP, -.065 * wind); put('sash', i, base, position, q);
    // The neck passes continuously into the jaw. Gaze remains on the opponent.
    position.set(0, .752, .006); q.setFromEuler(bladeEuler.set(-.025 * strike, .058 * wind, .020 * recoil));
    local.compose(position, q, ONE); headMatrix.multiplyMatrices(bodyMatrix, local);
    matrix.multiplyMatrices(base, headMatrix); batches.head.setMatrixAt(i, matrix); batches.features.setMatrixAt(i, matrix);
    batches[i % 2 ? 'turban' : 'helmet'].setMatrixAt(Math.floor(i / 2), matrix);
    // Legs are solved from a fixed rear foot and a stepping front foot. No foot
    // slides during the contact or recoil portions of a duel.
    for (let leg = 0; leg < 2; leg++) {
      const s = leg ? 1 : -1, front = leg === 0;
      hip.set(s * .105, hipY + .020, move);
      const fx = s * .172, fz = front ? .225 + step : -.218;
      ankle.set(fx, .103 + footGround(actor, fx, fz) + (front ? lift : 0), fz);
      solveJoint(hip, ankle, .425, .407, 0, 0, 1, knee);
      bone('thigh', i * 2 + leg, hip, knee); bone('shin', i * 2 + leg, knee, ankle);
      q.setFromEuler(bladeEuler.set(front ? -.24 * (lift / .065) : .045 * strike, s * .085, 0));
      put('foot', i * 2 + leg, base, ankle, q);
    }
    // Sword hand: draw, committed thrust/cut, brief contact, guarded recovery.
    shoulder.set(-.217, .550, .012).applyMatrix4(bodyMatrix);
    const chop = pair.type === 1;
    wrist.set(mix(-.278, -.190, strike) - .045 * wind,
      mix(1.185, chop ? 1.262 : 1.215, strike) + (chop ? .268 : .190) * wind,
      mix(.333, .542, strike) - .242 * wind + move * .35);
    // Compute the actual paired shield's center in this fighter's coordinates.
    // Matching the partner's scale and recoil keeps a strike on the shield,
    // instead of allowing a fixed sword length to pass through the opponent.
    const enemy = actors[i ^ 1], ratio = enemy.scale / actor.scale;
    const enemyBlock = smooth(.09, .21, phase) * (1 - smooth(.33, .445, phase));
    const enemyRecoil = smooth(.24, .275, phase) * (1 - smooth(.285, .405, phase));
    const enemyStrike = smooth(.15, .245, other) * (1 - smooth(.30, .445, other));
    const enemyMove = .070 * enemyStrike - .058 * enemyRecoil;
    shieldQ.setFromEuler(shieldEuler.set(-.06 + .13 * enemyRecoil, -.15 + .22 * enemyBlock, .035 + .08 * enemyRecoil));
    shieldTarget.set(0,0,.062).applyQuaternion(shieldQ);
    shieldTarget.x += .278 - .020 * enemyBlock;
    shieldTarget.y += 1.157 + .067 * enemyBlock - .035 * enemyRecoil;
    shieldTarget.z += .381 + .072 * enemyBlock - .041 * enemyRecoil + enemyMove * .22;
    shieldTarget.set(-shieldTarget.x * ratio,
      (pair.roots[1-side][1] - r[1]) / actor.scale + shieldTarget.y * ratio,
      pair.gap / actor.scale - shieldTarget.z * ratio);
    direction.subVectors(shieldTarget, wrist); const reach = direction.length(); direction.normalize();
    wrist.addScaledVector(direction, (reach - .907) * strike);
    solveJoint(shoulder, wrist, .292, .268, -1, -.30, -.08, elbow);
    bone('upperArm', i * 2, shoulder, elbow); bone('foreArm', i * 2, elbow, wrist); bone('bracer', i * 2, elbow, wrist);
    swordAim.set(-.10, .78, .61).lerp(point.set(chop ? .12 : -.17, .965, .23), wind);
    point.copy(shieldTarget).sub(wrist).normalize();
    swordAim.lerp(point, strike).normalize(); bladeQ.setFromUnitVectors(UP, swordAim);
    put('sword', i, base, wrist, bladeQ); put('hand', i * 2, base, wrist, bladeQ);
    // Shield hand rises into the partner's line, with a distinct shield jolt.
    shoulder.set(.217, .550, .012).applyMatrix4(bodyMatrix);
    wrist.set(.278 - .020 * block, 1.157 + .067 * block - .035 * recoil,
      .343 + .072 * block - .041 * recoil + move * .22);
    solveJoint(shoulder, wrist, .292, .268, 1, -.42, 0, elbow);
    bone('upperArm', i * 2 + 1, shoulder, elbow); bone('foreArm', i * 2 + 1, elbow, wrist); bone('bracer', i * 2 + 1, elbow, wrist);
    shieldQ.setFromEuler(shieldEuler.set(-.06 + .13 * recoil, -.15 + .22 * block, .035 + .08 * recoil));
    put('hand', i * 2 + 1, base, wrist, shieldQ);
    point.copy(wrist); point.z += .038; put('shield', i, base, point, shieldQ);
    position.set(r[0] + Math.sin(yaw) * move * actor.scale,
      groundHeight(r[0], r[2]) + .016, r[2] + Math.cos(yaw) * move * actor.scale);
    q.setFromAxisAngle(UP, yaw); scale.set(.90 * actor.scale, 1, 1.12 * actor.scale);
    matrix.compose(position, q, scale); shadows.setMatrixAt(i, matrix);
  }
  for (let i = 0; i < actors.length; i++) {
    const a = actors[i];
    for (const name of ['torso', 'head']) batches[name].setColorAt(i, a.skin);
    batches.dhoti.setColorAt(i, a.cloth); batches.sash.setColorAt(i, a.sash);
    if (i % 2) batches.turban.setColorAt(Math.floor(i / 2), a.sash);
    for (let k = 0; k < 2; k++) {
      for (const name of ['upperArm', 'foreArm', 'shin', 'hand']) batches[name].setColorAt(i * 2 + k, a.skin);
      batches.thigh.setColorAt(i * 2 + k, a.cloth);
    }
  }
  for (const { mesh, soldiers } of armyBatches) for (let i = 0; i < soldiers.length; i++) {
    const s = soldiers[i]; position.set(s.x, s.y, s.z); q.setFromAxisAngle(UP, s.yaw); scale.setScalar(s.scale);
    matrix.compose(position, q, scale); mesh.setMatrixAt(i, matrix);
    mesh.setColorAt(i, new T.Color().setScalar(.85 + hash(i + s.company * 95) * .22));
  }
  for (let i = 0; i < shadowArmy.length; i++) {
    const s = shadowArmy[i]; position.set(s.x, s.y + .016, s.z); q.setFromAxisAngle(UP, s.yaw); scale.set(.71, 1, .85);
    matrix.compose(position, q, scale); shadows.setMatrixAt(count + i, matrix);
  }
  let elapsed = 0, disposed = false, vision = 0;
  const moving = Object.values(batches).filter(m => !m.name.startsWith('army'));
  const bounds = new T.Box3();
  for (const a of army) bounds.expandByPoint(point.set(a.x, a.y, a.z));
  for (const p of pairs) for (const r of p.roots) bounds.expandByPoint(point.set(...r));
  bounds.min.add(new T.Vector3(-1.3, 0, -1.3)); bounds.max.add(new T.Vector3(1.3, 2.7, 1.3));
  const meshStats = Object.entries(batches).map(([name, m]) => ({ name, instances: m.count, trianglesPerInstance: m.geometry.index.count / 3, triangles: m.count * m.geometry.index.count / 3 }));
  const metadata = {
    version: 2, units: 'metres', quality: low ? 'low' : 'high', nominalHumanHeight: 1.80,
    activeFighters: count, combatPairs: pairs.length, distantSoldiers: army.length, totalSoldiers: count + army.length,
    instancedDraws: meshStats.length, triangles: meshStats.reduce((s, m) => s + m.triangles, 0), meshStats,
    bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
    pairs: pairs.map(p => ({ id: p.id, center: [p.x, p.y, p.z], roots: p.roots, yaw: p.yaw, gap: p.gap, phase: p.phase, cycleSeconds: 1 / p.speed, island: p.island, action: p.type === 1 ? 'high cut and shield parry' : 'thrust and shield parry' })),
    armies: companies, armyPositions: army.map(a => [a.x, a.y, a.z]), exclusions: EXCLUSIONS,
    focalPair: { id: 0, center: [-14, groundHeight(-14, 8), 8], aim: [-14, groundHeight(-14, 8) + 1.14, 8],
      recommendedCamera: { position: [-6.6, groundHeight(-14, 8) + 3.8, 16.5], aim: [-14, groundHeight(-14, 8) + 1.14, 8] } },
    animation: 'Paired thrust/cut, raised shield, recoil, planted outgoing and returning step; independent pair phases.',
    vision: '0 = opaque; 1 = 4% figures, no contact shadows', contactShadows: count + shadowArmy.length
  };
  root.userData.infantry = metadata;
  const api = {
    root, metadata,
    update(time, dt, animated = true) {
      if (disposed || !animated) return;
      if (Number.isFinite(time)) elapsed = Math.max(0, time);
      else if (Number.isFinite(dt)) elapsed += clamp(dt, 0, .1);
      clock.value = elapsed;
      for (let i = 0; i < actors.length; i++) animateActor(actors[i], i, elapsed);
      for (const m of moving) m.instanceMatrix.needsUpdate = true;
    },
    setVision(amount) {
      vision = clamp(Number.isFinite(amount) ? amount : 0);
      for (const m of materials) {
        const transparent = m === shadowMat || vision > .0001;
        if (m.transparent !== transparent) { m.transparent = transparent; m.needsUpdate = true; }
        m.opacity = m === shadowMat ? .31 * (1 - vision) ** 2 : 1 - .96 * vision;
        m.depthWrite = m !== shadowMat && vision < .75;
      }
    },
    dispose() {
      if (disposed) return; disposed = true;
      for (const g of geometries) g.dispose(); for (const m of materials) m.dispose(); for (const t of textures) t.dispose();
      for (const m of Object.values(batches)) m.dispose(); root.clear();
    }
  };
  api.update(0, 0, true); return api;
}
