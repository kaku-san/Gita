import * as T from './vendor/three.module.min.js';
import { V, TAU, mesh, thread, surface, beads } from './geometry.js';
import { dhoti, drape, sacredThread, medallion, rounded, ring } from './royal-costume.js';
import { layout } from './layout.js';

/* Reusable Chapter XI sculpture. Feet rest at y=0 and the calm central face
 * looks along +Z. It contains no camera, lights, DOM, background or scene clock.
 * Every returned object owns its materials/state; loaded skin geometry is shared.
 */
const cache = new Map();
async function loadSkin(name) {
  if (!cache.has(name)) cache.set(name, (async () => {
    const url = new URL(`./skin/${name}`, import.meta.url);
    const [metaResponse, dataResponse] = await Promise.all([fetch(`${url}.json`), fetch(`${url}.bin`)]);
    if (!metaResponse.ok || !dataResponse.ok) throw new Error(`Cannot load Vishvarupa skin: ${name}`);
    const [info, buffer] = await Promise.all([metaResponse.json(), dataResponse.arrayBuffer()]);
    if (buffer.byteLength !== info.bytes) throw new Error(`Invalid Vishvarupa skin: ${name}`);
    const n = info.vertices, g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(new Float32Array(buffer, 0, n * 3), 3));
    g.setAttribute('normal', new T.BufferAttribute(new Float32Array(buffer, n * 12, n * 3), 3));
    g.setIndex(new T.BufferAttribute(new Uint32Array(buffer, n * 24, info.indices), 1));
    g.computeBoundingBox(); g.computeBoundingSphere();
    return g;
  })().catch(error => { cache.delete(name); throw error; }));
  return cache.get(name);
}

function makeMaterials() {
  const mat = (color, metalness = 0, roughness = .65, extra = {}) =>
    new T.MeshStandardMaterial({ color, metalness, roughness, alphaHash: true, ...extra });
  return {
    skin: mat(0x587281, .12, .60),
    gold: mat(0xc49b52, .80, .38),
    pale: mat(0xe5cd8a, .73, .35),
    ivory: mat(0xe7dbc0, .02, .77, { side: T.DoubleSide }),
    saffron: mat(0xd9a958, .07, .71, { side: T.DoubleSide }),
    burgundy: mat(0x63313c, .02, .77, { side: T.DoubleSide }),
    hair: mat(0x232b31, .10, .74),
    garnet: mat(0x562b40, .47, .27),
    teal: mat(0x4d9b95, .52, .30),
  };
}

// Merge in object-local space, with independent indexed buffers. Source skin
// buffers remain immutable and safe for a second createVishvarupa call.
function consolidate(group) {
  group.updateMatrixWorld(true);
  const inverse = group.matrixWorld.clone().invert(), sets = new Map(), remove = [];
  group.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material)) return;
    if (!sets.has(o.material)) sets.set(o.material, []);
    sets.get(o.material).push(o.geometry.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(inverse, o.matrixWorld)));
    remove.push(o);
  });
  for (const [material, geometries] of sets) {
    let vertices = 0, indices = 0;
    for (const g of geometries) { vertices += g.attributes.position.count; indices += g.index ? g.index.count : g.attributes.position.count; }
    const positions = new Float32Array(vertices * 3), normals = new Float32Array(vertices * 3);
    const uvs = new Float32Array(vertices * 2), index = new Uint32Array(indices);
    let vertexOffset = 0, indexOffset = 0;
    for (const g of geometries) {
      const n = g.attributes.position.count;
      positions.set(g.attributes.position.array, vertexOffset * 3);
      normals.set(g.attributes.normal.array, vertexOffset * 3);
      if (g.attributes.uv) uvs.set(g.attributes.uv.array, vertexOffset * 2);
      for (let j = 0, count = g.index ? g.index.count : n; j < count; j++) index[indexOffset++] = (g.index ? g.index.array[j] : j) + vertexOffset;
      vertexOffset += n; g.dispose();
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(positions, 3));
    g.setAttribute('normal', new T.BufferAttribute(normals, 3));
    g.setAttribute('uv', new T.BufferAttribute(uvs, 2));
    g.setIndex(new T.BufferAttribute(index, 1)); g.computeBoundingBox(); g.computeBoundingSphere();
    const o = mesh(g, material, group); o.name = `Vishvarupa · merged ${material.name}`;
  }
  for (const o of remove) o.removeFromParent();
}

function crown(parent, m, high) {
  // A stepped, rounded kirita profile, with lotus-petal relief between tiers.
  // It is a turned gold object, with no exposed cone primitive.
  const profile = [[.204,.219],[.235,.231],[.244,.262],[.234,.294],[.216,.312],
    [.219,.387],[.204,.444],[.175,.465],[.170,.507],[.147,.559],
    [.116,.592],[.106,.652],[.075,.706],[.046,.738],[.054,.772],[.026,.817],[0,.845]];
  mesh(new T.LatheGeometry(profile.map(([r,y]) => new T.Vector2(r,y)), high ? 56 : 40), m.gold, parent);
  const radiusAt = y => {
    let i = 1; while (i < profile.length - 1 && profile[i][1] < y) i++;
    return T.MathUtils.lerp(profile[i-1][0], profile[i][0], (y-profile[i-1][1])/(profile[i][1]-profile[i-1][1]));
  };
  for (const [y,r,w] of [[.250,.241,.010],[.301,.229,.006],[.474,.174,.007],[.744,.049,.006]])
    ring(parent, m.pale, V(0,y,0), V(0,1,0), r, w);
  const n = high ? 12 : 10;
  for (let k = 0; k < n; k++) {
    const a = k/n*TAU;
    const line = [];
    for (let j=0;j<=26;j++) {
      const y=.319+j/26*.416, angle=a+.036*Math.sin(j/26*Math.PI);
      const r=radiusAt(y)+.006;
      line.push([Math.cos(angle)*r,y,Math.sin(angle)*r]);
    }
    thread(parent, m.pale, line, .0065, high ? 28 : 22);
    const r=.245, jewel=rounded(parent, k%3===0?m.teal:m.garnet, V(Math.cos(a)*r,.268,Math.sin(a)*r), [.012,.019,.009]);
    jewel.rotation.y=-a+Math.PI/2;
    const arch=[];
    for(let j=0;j<=14;j++){
      const t=j/14, angle=a+(t-.5)*TAU/n*.77, y=.323+.055*Math.sin(t*Math.PI), rr=radiusAt(y)+.006;
      arch.push([Math.cos(angle)*rr,y,Math.sin(angle)*rr]);
    }
    thread(parent,m.pale,arch,.0045,high?16:12);
  }
  const dots=[];
  for(let j=0;j<32;j++){const a=j/32*TAU;dots.push([Math.cos(a)*.242,.236,Math.sin(a)*.242]);}
  beads(parent,m.pale,dots,.008);
  rounded(parent,m.pale,V(0,.836,0),[.025,.032,.025]);
  medallion(parent,m,V(0,.307,.235),.038);
}

function makeHead(parent, g, m, { position, scale, yaw=0 }, high) {
  const head = new T.Group(); head.name='Crowned sculptural face';
  head.position.set(...position); head.scale.setScalar(scale); head.rotation.y=yaw; parent.add(head);
  mesh(g,m.skin,head);
  // Smooth sculptural face is deliberately retained from the approved study.
  // A small Vaishnava mark reads as ornament; no painted cartoon eyes are added.
  for(const side of [-1,1]){
    thread(head,m.ivory,[[side*.027,.170,.146],[side*.022,.118,.176],[side*.013,.079,.185],[0,.069,.189]],.0044,18);
    const e=ring(head,m.gold,V(side*.244,-.136,.004),V(0,0,1),.046,.008);
    e.scale.x=.73;
    rounded(head,m.pale,V(side*.244,-.187,.009),[.012,.019,.012]);
  }
  thread(head,m.burgundy,[[0,.153,.160],[0,.102,.181]],.0032,10);
  // Hair follows the back of the skull, with a narrow sculpted nape.
  mesh(surface((u,v)=>{
    const a=u*TAU,limit=.87+1.46*(.5-.5*Math.sin(a)),p=.045+v*limit;
    return [Math.cos(a)*Math.sin(p)*.204,.019+Math.cos(p)*.283,-.019+Math.sin(a)*Math.sin(p)*.190];
  },high?48:36,24),m.hair,head);
  crown(head,m,high);
  return head;
}

function hand(parent, geometry, m, position, direction, palm, scale, side) {
  const y=V(...direction).normalize(),z=V(...palm);
  z.addScaledVector(y,-z.dot(y)).normalize();
  const x=V().crossVectors(y,z).normalize();z.crossVectors(x,y).normalize();
  const anchor=new T.Group();anchor.position.set(...position);
  anchor.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,z));
  const mirror=x.dot(V(-side,0,0))>=0?1:-1;
  anchor.scale.set(scale*mirror,scale,scale);parent.add(anchor);
  mesh(geometry,m.skin,anchor);
  return anchor;
}

function bracelet(parent,m,position,direction,r=.15) {
  const p=V(...position),axis=V(...direction).normalize();
  for(const d of [-.075,.025])ring(parent,m.gold,p.clone().addScaledVector(axis,d),axis,r,.030);
  ring(parent,m.pale,p.clone().addScaledVector(axis,-.025),axis,r+.009,.011);
}

function discus(parent,m,high) {
  const g=new T.Group();g.name='Sudarshana discus';g.position.set(3.22,9.53,.61);g.rotation.y=-.12;g.rotation.x=.10;parent.add(g);
  // A fully modelled pierced disc: the centre stays open during an orbit.
  const shape=(u,v)=>{
    const a=u*TAU, r=.385+v*.196+.035*Math.sin(a*24)**8*v;
    return [Math.cos(a)*r,Math.sin(a)*r,.027*Math.sin(v*Math.PI)];
  };
  mesh(surface(shape,high?144:96,8),m.gold,g);
  mesh(surface((u,v)=>{const p=shape(1-u,v);p[2]*=-1;return p;},high?144:96,8),m.gold,g);
  ring(g,m.pale,V(),V(0,0,1),.386,.025);ring(g,m.pale,V(),V(0,0,1),.520,.014);
  for(let k=0;k<24;k++){
    const a=k/24*TAU;
    thread(g,m.pale,[[Math.cos(a)*.415,Math.sin(a)*.415,.025],[Math.cos(a+.022)*.465,Math.sin(a+.022)*.465,.04],[Math.cos(a+.012)*.517,Math.sin(a+.012)*.517,.025]],.010,8);
  }
  return g;
}

function mace(parent,m,high) {
  const g=new T.Group();g.name='Kaumodaki mace';g.position.set(-3.10,8.86,.72);g.rotation.z=.025;parent.add(g);
  // The shaft runs through the sculpted grasp; fluting gives the bulb volume
  // and gold catching ridges from every angle.
  const prof=[new T.Vector2(0,-1.85),new T.Vector2(.072,-1.82),new T.Vector2(.065,-1.68),new T.Vector2(.040,-1.53),
    new T.Vector2(.048,.50),new T.Vector2(.126,.56),new T.Vector2(.105,.69),new T.Vector2(0,.71)];
  mesh(new T.LatheGeometry(prof,36),m.gold,g);
  mesh(surface((u,v)=>{
    const a=u*TAU,p=.06+v*(Math.PI-.12),r=Math.sin(p)*(.405+.033*Math.cos(a*12));
    return [Math.cos(a)*r,.99+Math.cos(p)*.47,Math.sin(a)*r];
  },high?72:48,36),m.gold,g);
  for(const y of [.54,.66,1.32,1.43])ring(g,m.pale,V(0,y,0),V(0,1,0),y>1.3?.112:.10,.022);
  for(let k=0;k<12;k++){
    const pts=[];for(let j=0;j<=26;j++){const p=.22+j/26*(Math.PI-.44),a=k/12*TAU,r=Math.sin(p)*.442;pts.push([Math.cos(a)*r,.99+Math.cos(p)*.47,Math.sin(a)*r]);}
    thread(g,m.pale,pts,.012,high?28:22);
  }
  rounded(g,m.pale,V(0,1.50,0),[.080,.100,.080]);
  for(let k=0;k<8;k++)ring(g,m.pale,V(0,-.05-k*.042,0),V(0,1,0),.053,.009);
  return g;
}

function royalDetails(parent,m,high) {
  // Fitted, full-orbit garments use the approved continuous drapery surface.
  const cloth=new T.Group();cloth.scale.setScalar(3);parent.add(cloth);
  dhoti(cloth,m,{colour:'saffron',long:true,regal:true});
  drape(cloth,m,{colour:'burgundy',gold:true});
  sacredThread(cloth,m,{three:true});
  // Two graduated necklaces and a broad decorated girdle frame the torso.
  for(const [rx,rz,y,drop] of [[.214,.251,2.73,.23],[.292,.278,2.63,.35],[.330,.291,2.58,.49]]){
    const chain=[];
    for(let j=0;j<=96;j++){const a=j/96*TAU;chain.push([Math.cos(a)*rx,y-drop*Math.max(0,Math.sin(a)),Math.sin(a)*rz]);}
    thread(cloth,m.gold,chain,.009,96);
    beads(cloth,m.pale,chain.filter((_,i)=>i%4===0),.012);
  }
  medallion(cloth,m,V(0,2.105,.306),.082);
  medallion(cloth,m,V(0,2.365,.288),.046);
  // Lotus relief at the shoulder pads is ornament, not a replacement joint.
  for(const side of [-1,1]){
    const pad=new T.Group();pad.position.set(side*1.30,7.71,.18);pad.rotation.z=-side*.30;parent.add(pad);
    for(let k=0;k<7;k++){
      const a=-.95+k/6*1.9;
      const petal=rounded(pad,m.gold,V(Math.sin(a)*.22,Math.cos(a)*.16,0),[.055,.16,.023]);petal.rotation.z=-a;
    }
    medallion(pad,m,V(0,.05,.035),.09);
    bracelet(parent,m,[side*2.055,5.67,.28],[side*.10,-1,.15],.246);
    for(const y of [.54,.65])ring(parent,m.gold,V(side*.66,y,.03),V(0,1,0),.162,.026);
  }
  // Long pearl-and-gold garland has real depth over the breast and back.
  const chain=[[-1.03,8.08,.24],[-1.05,7.52,.57],[-.99,6.64,.88],[-.72,5.83,1.00],[0,5.43,1.03],
    [.72,5.83,1.00],[.99,6.64,.88],[1.05,7.52,.57],[1.03,8.08,.24]];
  const c=new T.CatmullRomCurve3(chain.map(p=>V(...p)));
  thread(parent,m.gold,chain,.018,high?96:64);
  beads(parent,m.ivory,Array.from({length:70},(_,i)=>c.getPointAt(i/69)),.048);
  beads(parent,m.gold,Array.from({length:35},(_,i)=>c.getPointAt((i+.5)/35)),.024);
}

export async function createVishvarupa({quality='high'}={}) {
  const high=quality==='high';
  const names=['standing','head','foot','hand-open','hand-teaching','hand-grasp','retained-arms','mantle'];
  const loaded=await Promise.all(names.map(loadSkin));
  const skin=Object.fromEntries(names.map((name,i)=>[name,loaded[i]]));
  const root=new T.Group();root.name='Vishvarupa · Chapter XI universal form';
  const central=new T.Group();central.name='Retained crowned four-armed form';root.add(central);
  const mantle=new T.Group();mantle.name='Universal faces and arms';mantle.position.set(0,7.6,-.6);root.add(mantle);
  const outer=new T.Group();outer.position.set(0,-7.6,.6);mantle.add(outer);
  const m=makeMaterials(), om=makeMaterials();
  om.skin.color.set(0x607986);
  for(const [name,mat] of Object.entries(m))mat.name=name;
  for(const [name,mat] of Object.entries(om))mat.name=`outer ${name}`;
  const torso=mesh(skin.standing,m.skin,central);torso.scale.setScalar(3);torso.name='Continuous calm anatomy';
  for(const side of [-1,1]){
    const foot=mesh(skin.foot,m.skin,central);foot.scale.set(side<0?3:-3,3,3);
    foot.position.set(side*.66,.15,.33);foot.rotation.y=side*.075;
    hand(central,skin['hand-open'],m,[side*2.1,5.46,.36],[side*.11,-1,.16],[0,.16,1],3,side);
  }
  makeHead(central,skin.head,m,{position:[0,9.36,0],scale:3},high);
  mesh(skin['retained-arms'],m.skin,central);
  mesh(skin.mantle,om.skin,outer);
  // Satellite crowns are smaller in the composition; their relief uses the
  // same profile with fewer circumferential samples, preserving skin detail.
  for(const h of layout.heads)makeHead(outer,skin.head,om,h,false);
  for(const a of layout.arms){
    const parent=a.kind==='central'?central:outer,mat=a.kind==='central'?m:om;
    hand(parent,skin[`hand-${a.pose}`],mat,a.points[2],a.direction,a.palm,a.handScale,a.side);
    bracelet(parent,mat,a.points[2],a.direction,a.kind==='central'?.155:.145);
    // A delicate upper-arm armlet sits on the smooth skin, beyond the shoulder.
    const p=V(...a.points[0]).lerp(V(...a.points[1]),.41);
    const axis=V(...a.points[1]).sub(V(...a.points[0])).normalize();
    ring(parent,mat.gold,p,axis,a.kind==='central'?.347:.322,.032);
    ring(parent,mat.pale,p.clone().addScaledVector(axis,.07),axis,a.kind==='central'?.337:.312,.014);
  }
  royalDetails(central,m,high);discus(central,m,high);mace(central,m,high);
  consolidate(central);consolidate(outer);
  // Very small, uniform-driven movement; no arm rotation can break the grasp.
  const breath={value:0};
  for(const mat of Object.values(m)){
    mat.onBeforeCompile=shader=>{
      shader.uniforms.visionBreath=breath;
      shader.vertexShader='uniform float visionBreath;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        float chest = exp(-pow((position.y-7.02)/0.86,2.0)) * (1.0-smoothstep(0.72,1.18,abs(position.x)));
        transformed.z += visionBreath * chest * smoothstep(-0.15,0.45,position.z);
      `);
    };
    mat.customProgramCacheKey=()=> 'vishvarupa-breath-v1';
  }
  const allMaterials=[...Object.values(m),...Object.values(om)];
  const baseColors=new Map(allMaterials.map(mat=>[mat,mat.color.clone()]));
  const warm=new T.Color(0x8c6548), darkBlue=new T.Color(0x35464f);
  let reveal=1,gentle=0,dread=0,elapsed=0;
  function applyVisibility(){
    root.visible=reveal>.001;
    const ease=T.MathUtils.smoothstep(gentle,0,1),fade=1-T.MathUtils.smoothstep(gentle,.12,.92);
    mantle.scale.setScalar(1-ease*.82);mantle.visible=fade*reveal>.001;
    for(const mat of Object.values(m))mat.opacity=reveal;
    for(const mat of Object.values(om))mat.opacity=reveal*fade;
  }
  function setReveal(amount){reveal=T.MathUtils.clamp(Number.isFinite(amount)?amount:0,0,1);applyVisibility();}
  function setGentle(amount){gentle=T.MathUtils.clamp(Number.isFinite(amount)?amount:0,0,1);applyVisibility();}
  function setDread(amount){
    dread=T.MathUtils.clamp(Number.isFinite(amount)?amount:0,0,1);
    for(const mat of allMaterials){
      mat.color.copy(baseColors.get(mat));
      mat.color.lerp(mat===m.skin||mat===om.skin?darkBlue:warm,dread*(mat.metalness>.5?.30:.20));
      mat.emissive.set(0x492411);mat.emissiveIntensity=dread*(mat===m.skin||mat===om.skin?.07:.025);
    }
  }
  function update(time,dt,animated=true){
    if(!animated)return;
    if(Number.isFinite(dt))elapsed+=T.MathUtils.clamp(dt,0,.1);else if(Number.isFinite(time))elapsed=time;
    breath.value=.013*Math.sin(elapsed*.92);
    mantle.rotation.z=.0022*Math.sin(elapsed*.31)*(1-gentle);
  }
  root.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(root),size=bounds.getSize(V());
  // The approved foot has a minute natural sole offset. Rebase once so every
  // ground and whole-root scale places the sole at precisely zero.
  const soleOffset=-bounds.min.y;central.position.y+=soleOffset;mantle.position.y+=soleOffset;
  const metadata={height:size.y,focus:[0,8.7+soleOffset,0],width:size.x,depth:size.z,
    gentleHeight:new T.Box3().setFromObject(central).max.y,faces:9,arms:18,forward:[0,0,1],
    centralGroup:central,outerGroup:mantle,materials:m,outerMaterials:om};
  root.userData.vishvarupa={faces:9,arms:18,gentleArms:4,quality,feetAtZero:true};
  setDread(0);applyVisibility();
  function dispose(){
    root.removeFromParent();
    const geometries=new Set();root.traverse(o=>{if(o.isMesh)geometries.add(o.geometry);});
    for(const g of geometries)g.dispose();for(const mat of allMaterials)mat.dispose();
  }
  return {root,update,setReveal,setDread,setGentle,metadata,dispose};
}

export default createVishvarupa;
