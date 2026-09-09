import * as T from './vendor/three.module.min.js';

/**
 * Kurukshetra nature — metres, Y up, forward +Z.
 * Owns no scene, lights, sky, renderer, textures or broad ground plane.
 * Only the shallow channel adds relief; all contact points sample groundHeight.
 * The two foreground trees are explicit composition exceptions to the 80 m reserve.
 */
export function createNature({ quality = 'high', groundHeight = () => 0 } = {}) {
  const high = quality !== 'low';
  const root = new T.Group();
  root.name = 'Kurukshetra nature · open Indian plain';
  const geometries = new Set(), materials = new Set(), graded = [];
  const clock = { value: 0 }, vision = { value: 0 };
  const rng = natureRandom(208041);
  const transform = new T.Object3D();
  const trunkParts = [], leafPlacements = [], treePlacements = [], grassPlacements = [];
  let elapsed = 0, disposed = false, lastTime = null;
  const h = (x, z) => { const y = groundHeight(x, z); return Number.isFinite(y) ? y : 0; };
  const own = g => { geometries.add(g); return g; };
  function mat(color, extra = {}) {
    const m = new T.MeshStandardMaterial({ color, roughness: .94, metalness: 0, ...extra });
    materials.add(m);
    graded.push({ material: m, color: m.color.clone(), emissive: m.emissive.clone(), opacity: m.opacity });
    return m;
  }
  function mesh(g, m, name) {
    const object = new T.Mesh(own(g), m); object.name = name;
    object.receiveShadow = true; root.add(object); return object;
  }
  function instances(g, m, placements, name) {
    const object = new T.InstancedMesh(own(g), m, placements.length); object.name = name;
    object.instanceMatrix.setUsage(T.StaticDrawUsage);
    for (let i = 0; i < placements.length; i++) {
      const p = placements[i];
      transform.position.set(...p.position); transform.rotation.set(...(p.rotation || [0, 0, 0]));
      transform.scale.set(...(p.scale || [1, 1, 1])); transform.updateMatrix();
      object.setMatrixAt(i, transform.matrix);
      if (p.color) object.setColorAt(i, p.color);
    }
    object.computeBoundingBox(); object.computeBoundingSphere(); root.add(object); return object;
  }
  function surfaceDetail(material, kind) {
    material.onBeforeCompile = shader => {
      shader.uniforms.uNatureTime = clock; shader.uniforms.uNatureVision = vision;
      shader.vertexShader = 'varying vec3 vNaturePosition;\nuniform float uNatureTime;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
        #include <begin_vertex>
        vNaturePosition = position;
        ${kind === 'leaf' ? `
          #ifdef USE_INSTANCING
            float phase = instanceMatrix[3].x * .117 + instanceMatrix[3].z * .073;
            transformed.x += .032 * sin(uNatureTime * .77 + phase + position.y * 1.8);
            transformed.z += .018 * sin(uNatureTime * .93 + phase * 1.31 + position.x * 2.3);
          #endif` : ''}
        ${kind === 'grass' ? `
          #ifdef USE_INSTANCING
            float phase = instanceMatrix[3].x * .39 + instanceMatrix[3].z * .21;
            transformed.x += position.y * position.y * .075 * sin(uNatureTime * 1.13 + phase);
            transformed.z += position.y * position.y * .037 * sin(uNatureTime * .81 + phase);
          #endif` : ''}
      `);
      shader.fragmentShader = `varying vec3 vNaturePosition;
        uniform float uNatureVision;
        float natureHash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        float natureNoise(vec2 p) {
          vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
          return mix(mix(natureHash(i), natureHash(i+vec2(1,0)), f.x),
            mix(natureHash(i+vec2(0,1)), natureHash(i+vec2(1,1)), f.x), f.y);
        }
      ` + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
        #include <color_fragment>
        ${kind === 'bark' ? `
          float grain = natureNoise(vNaturePosition.xz * 17.0 + vec2(vNaturePosition.y * .39));
          float cracks = pow(.5 + .5 * sin(vNaturePosition.x * 41.0 + vNaturePosition.z * 29.0 + grain * 5.0), 9.0);
          diffuseColor.rgb *= .83 + .23 * grain - cracks * .10;
        ` : kind === 'channel' ? `
          float clay = natureNoise(vNaturePosition.xz * 1.85) * .6 + natureNoise(vNaturePosition.xz * 7.1) * .4;
          float waterlines = .5 + .5 * sin(vNaturePosition.z * 4.3 + natureNoise(vNaturePosition.xz * .3) * 9.0);
          diffuseColor.rgb *= .88 + clay * .22 - waterlines * .016;
        ` : kind === 'leaf' ? `
          float leafMottle = natureNoise(vNaturePosition.xz * 11.0 + vNaturePosition.y * 2.0);
          diffuseColor.rgb *= .88 + leafMottle * .19;
        ` : ''}
      `);
    };
    material.customProgramCacheKey = () => 'nature-v2-' + kind;
  }

  // A wide, tapering branch network carries every foliage mass; broad crowns
  // are irregular layers of interlocking sprays, with small gaps below them.
  function addTree(x, z, size, detail, seed, near = false) {
    const random = natureRandom(seed), baseY = h(x, z);
    const p3 = (a, y, radius) => new T.Vector3(Math.cos(a)*radius, y, Math.sin(a)*radius);
    const world = v => new T.Vector3(x + v.x*size, baseY + v.y*size, z + v.z*size);
    const barkTint = new T.Color('#776955').multiplyScalar(.86 + random()*.22);
    const yaw = random()*Math.PI*2;
    const lean = p3(yaw, 0, .23 + random()*.27);
    function branch(points, radii, radial = 6) {
      trunkParts.push(natureTube(points.map(world), radii.map(r => r*size), radial, barkTint, random));
    }
    const mature = detail === 2;
    const topY = 3.3 + random()*.65;
    const rootTop = new T.Vector3(0, .4, 0);
    const top = new T.Vector3(lean.x, topY, lean.z);
    branch([new T.Vector3(0,-.075,0), rootTop,
      new T.Vector3(lean.x*.12,1.45,lean.z*.2),new T.Vector3(lean.x*.55,2.5,lean.z*.7),top],
      [.58,.49,.36,.30,.245], mature ? 10 : 7);
    for (let r = 0; r < (mature ? 7 : 4); r++) {
      const a = yaw + r*2.399, reach = .78 + random()*.65;
      const e = p3(a, 0, reach); e.y = (h(x+e.x*size,z+e.z*size)-baseY)/size + .016;
      branch([new T.Vector3(0,.48,0),p3(a,.12,reach*.49),e],[.18,.13,.018],5);
    }
    const limbs = mature ? 6 : detail === 1 ? 5 : 4;
    const subCount = mature ? 3 : 2;
    const twigCount = mature ? (high ? 2 : 1) : 1;
    const clusterCount = mature ? (high ? 3 : 4) : detail === 1 ? 3 : 2;
    for (let a = 0; a < limbs; a++) {
      const angle = yaw + a*Math.PI*2/limbs + (random()-.5)*.31;
      const reach = 4.0 + random()*1.5;
      const shoulder = p3(angle, 4.0+random()*.7, 1.3);
      const elbow = p3(angle+.08, 5.5+random()*.8, reach*.70);
      const tip = p3(angle+.12, 6.9+random()*.9, reach);
      branch([top.clone().add(new T.Vector3(0,(a%2)*-.48,0)),shoulder,elbow,tip],
        [.24,.18,.10,.026], mature ? 8 : 5);
      for (let b = 0; b < subCount; b++) {
        const forkA = angle + (b/(subCount-1)-.5)*.97 + (random()-.5)*.23;
        const branchStart = elbow.clone().lerp(tip, .10 + b*.15);
        const out = p3(forkA, 7.1+random()*1.65, reach + .65 + random()*1.4);
        const middle = branchStart.clone().lerp(out,.52).add(new T.Vector3(0,.16,0));
        branch([branchStart,middle,out],[.080,.041,.009],mature ? 6 : 4);
        for (let t = 0; t < twigCount; t++) {
          const twigAngle = forkA + (t-.5)*.40;
          const end = out.clone().add(p3(twigAngle,.22+random()*.85,.75+random()*.62));
          if (mature) branch([middle.clone().lerp(out,.45),out,end],[.024,.015,.0045],4);
          for (let c = 0; c < clusterCount; c++) {
            const center = out.clone().lerp(end, c/Math.max(1,clusterCount-1));
            center.x += (random()-.5)*1.02;
            center.y += .04 + random()*.68;
            center.z += (random()-.5)*1.04;
            const wp = world(center);
            const width = (mature ? .83 : 1.02) + random()*.48;
            const tint = new T.Color().setHSL(.185+random()*.055,.17+random()*.095,.245+random()*.10);
            leafPlacements.push({ position:wp.toArray(), rotation:[(random()-.5)*.44,random()*6.283,(random()-.5)*.35],
              scale:[width*size,(.55+random()*.28)*size,(.83+random()*.39)*size],color:tint });
          }
        }
      }
      // An interior shoulder spray conceals abrupt forks while leaving the bole readable.
      const wp = world(elbow.clone().lerp(tip,.61).add(new T.Vector3(0,.34,0)));
      leafPlacements.push({position:wp.toArray(),rotation:[0,random()*6.28,0],scale:[1.06*size,.64*size,.96*size],
        color:new T.Color('#68704b').multiplyScalar(.83+random()*.2)});
    }
    treePlacements.push({x,z,size,near,detail,height:10.4*size,canopyRadius:8.6*size});
  }
  addTree(-58,-6,1.20,2,31841,true);
  addTree(64,14,1.10,2,76210,true);
  const middleCount = high ? 42 : 28;
  for (let i=0;i<middleCount;i++) {
    const side = i%2 ? 1 : -1, group = Math.floor(i/2)%7;
    const z = 47 + group*29 + (rng()-.5)*18;
    const x = side*(117 + Math.floor(i/14)*26 + rng()*18 + 5*Math.sin(z*.027));
    addTree(x,z,.77+rng()*.43,1,871100+i*103);
  }
  const farCount = high ? 24 : 16;
  for (let i=0;i<farCount;i++) {
    const side = i%2 ? 1 : -1;
    const x = side*(101+rng()*112), z = 226+rng()*32;
    addTree(x,z,.54+rng()*.34,0,900100+i*233);
  }
  const bark = mat('#ffffff',{vertexColors:true}); surfaceDetail(bark,'bark');
  const branches = mesh(natureMerge(trunkParts),bark,'Mature trunks · crooked boughs and tapering roots');
  branches.castShadow = high;
  const leafMaterial = mat('#ffffff',{vertexColors:true,side:T.DoubleSide,roughness:.93});
  surfaceDetail(leafMaterial,'leaf');
  const foliage = instances(natureFoliage(high),leafMaterial,leafPlacements,'Broad canopies · organic clustered leaf sprays');
  foliage.castShadow = high; foliage.receiveShadow = true;

  // A transparent sand dressing follows the supplied ground at centimetre scale.
  // It creates neither a second terrain nor a straight-edged carpet.
  const pathMaterial = mat('#b09a77',{transparent:true,opacity:.23,depthWrite:false,polygonOffset:true,
    polygonOffsetFactor:-2,polygonOffsetUnits:-2,side:T.DoubleSide});
  pathMaterial.onBeforeCompile = shader => {
    shader.vertexShader = 'varying vec2 vPathUV;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvPathUV = uv;');
    shader.fragmentShader = 'varying vec2 vPathUV;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>',`
      #include <color_fragment>
      float edge = 1.0-smoothstep(.42,1.0,abs(vPathUV.x));
      float ends = smoothstep(0.0,.075,vPathUV.y)*(1.0-smoothstep(.87,1.0,vPathUV.y));
      float wear = .83+.17*sin(vPathUV.y*141.0+sin(vPathUV.y*63.0)*2.0);
      float ruts = exp(-pow((abs(vPathUV.x)-.277)/.021,2.0));
      diffuseColor.rgb *= 1.0-ruts*.20;
      diffuseColor.a *= edge*ends*wear;
    `);
  };
  pathMaterial.customProgramCacheKey = () => 'nature-v2-path';
  const path = mesh(naturePath(h,high?136:86),pathMaterial,'Weathered dusty path · soft broken shoulders');
  path.renderOrder = 1;

  // Low seasonal drainage: the bed is on the parent's ground; bank crests rise
  // gently around it, all within the explicitly reserved far-left rectangle.
  const channelMaterial = mat('#ffffff',{vertexColors:true}); surfaceDetail(channelMaterial,'channel');
  const channel = mesh(natureChannel(h,high?150:90,high?24:18),channelMaterial,
    'Shallow seasonal drainage · dry clay bed and worn banks');
  const grassMaterial = mat('#ffffff',{vertexColors:true,side:T.DoubleSide}); surfaceDetail(grassMaterial,'grass');
  const grassRng = natureRandom(121788);
  function grassPatch(cx,cz,count,rx,rz,bank=false) {
    for(let j=0;j<count;j++) {
      const a=grassRng()*Math.PI*2,r=Math.sqrt(grassRng());
      const x=cx+Math.cos(a)*r*rx,z=cz+Math.sin(a)*r*rz;
      if(Math.abs(x)<=10.25 || Math.hypot(x,z)<13)continue;
      const channelY=bank&&x>=-92&&x<=-74&&z>=5&&z<=170?natureChannelRise(x,z):0;
      const s=(bank?.80:.53)+grassRng()*(bank?.66:.65);
      const dry=grassRng()>.42;
      grassPlacements.push({position:[x,h(x,z)+channelY+.006,z],rotation:[0,grassRng()*6.283,0],
        scale:[s,s*(.75+grassRng()*.5),s],color:new T.Color(dry?'#9d8a60':'#747c51').multiplyScalar(.83+grassRng()*.28)});
    }
  }
  for(let i=0;i<(high?70:44);i++) {
    const side=i%2?1:-1,z=-47+Math.floor(i/2)*7.1+(grassRng()-.5)*6;
    const x=side*(12.4+Math.pow(grassRng(),1.7)*7.5)+.55*Math.sin(z*.024);
    grassPatch(x,z,high?11:9,1.05+grassRng()*1.1,1.1+grassRng()*2.0);
  }
  for(let i=0;i<(high?28:18);i++) {
    const z=12+i*(high?5.5:8.6),side=i%2?1:-1;
    const cx=natureChannelCenter(z)+side*(3.2+grassRng()*1.4);
    grassPatch(cx,z,high?12:10,.85,2.1,true);
  }
  // Several low, quiet grass islands beyond the open army corridor.
  for(let i=0;i<(high?22:12);i++) {
    const side=i%2?1:-1;
    grassPatch(side*(99+grassRng()*65),40+grassRng()*170,high?9:7,2.6,3.9);
  }
  const grass = instances(natureGrass(),grassMaterial,grassPlacements,'Sparse grasses · path shoulders and dry banks');
  grass.receiveShadow = true;

  const pebbleRng=natureRandom(654333),pebbles=[];
  for(let i=0;i<(high?110:60);i++) {
    const z=10+pebbleRng()*153,x=natureChannelCenter(z)+(pebbleRng()-.5)*3.8;
    const s=.055+Math.pow(pebbleRng(),2)*.15;
    pebbles.push({position:[x,h(x,z)+natureChannelRise(x,z)+.025,z],rotation:[pebbleRng()*.7,pebbleRng()*6.28,pebbleRng()*.5],
      scale:[s*(1+pebbleRng()*.9),s*.4,s],color:new T.Color('#8b7e68').multiplyScalar(.8+pebbleRng()*.36)});
  }
  const pebbleMaterial=mat('#ffffff',{vertexColors:true});
  const pebbleGeometry = new T.IcosahedronGeometry(1,0);
  const pebbleColors = new Float32Array(pebbleGeometry.attributes.position.count*3).fill(1);
  pebbleGeometry.setAttribute('color',new T.BufferAttribute(pebbleColors,3));
  instances(pebbleGeometry,pebbleMaterial,pebbles,'Rounded gravel · embedded in the dry drainage bed');

  // Small dark soaring forms at the far horizon; their movement shares the
  // same internal clock as foliage and cannot advance while playback is paused.
  const birdPlacements=[];
  for(let i=0;i<(high?7:4);i++) birdPlacements.push({position:[-130+i*14,27+(i%3)*3,174+i*8],
    rotation:[0,.3+i*.13,0],scale:[.65,.65,.65]});
  const birdMaterial=mat('#58594d',{side:T.DoubleSide,roughness:1});
  birdMaterial.onBeforeCompile=shader=>{
    shader.uniforms.uNatureTime=clock;
    shader.vertexShader='uniform float uNatureTime;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`
      #include <begin_vertex>
      #ifdef USE_INSTANCING
        float phase=instanceMatrix[3].x*.16;
        float beat=.045*sin(uNatureTime*2.1+phase);
        transformed.y+=abs(position.x)*beat;
        transformed.x+=sin(uNatureTime*.021+phase)*3.4;
        transformed.z+=cos(uNatureTime*.018+phase)*1.5;
      #endif
    `);
  };
  birdMaterial.customProgramCacheKey=()=> 'nature-v2-birds';
  const birds=instances(natureBird(),birdMaterial,birdPlacements,'Distant birds · slow gliding silhouettes');
  // Shader movement is bounded explicitly, without disabling frustum culling.
  birds.boundingSphere.radius+=6;
  foliage.boundingSphere.radius+=.10;
  grass.boundingSphere.radius+=.12;

  root.updateMatrixWorld(true);
  const stats=natureStats(root);
  const metadata = {
    name:'Kurukshetra · natural Indian plains',version:2,quality:high?'high':'low',units:'metres',
    axis:'Y up; +Z forward', stats,treeCount:treePlacements.length,leafClusterCount:leafPlacements.length,
    grassTuftCount:grassPlacements.length,trees:treePlacements,
    foregroundTreeExceptions:[{x:-58,z:-6},{x:64,z:14}],
    standingTreeReserveRadius:80,heroGrassClearance:10.25,
    channelBounds:{minX:-92,maxX:-74,minZ:5,maxZ:170},
    pathBounds:{minZ:-68,maxZ:240,halfWidthMaximum:8.9},
    additionalTerrain:'Only channel banks, maximum 0.58 m above supplied ground; path is a transparent dressing.',
    animation:'Internal clock; update(...,false) freezes both visible geometry and wind uniforms.',
    groundHeight:h,
    inspect:()=>({elapsed:clock.value,vision:vision.value,disposed}),
  };
  function update(time,dt,animated=true) {
    if(disposed)return;
    if(!animated){if(Number.isFinite(time))lastTime=time;return;}
    if(Number.isFinite(dt))elapsed+=Math.max(0,Math.min(dt,.1));
    else if(Number.isFinite(time)&&lastTime!==null)elapsed+=Math.max(0,Math.min(time-lastTime,.1));
    if(Number.isFinite(time))lastTime=time;
    clock.value=elapsed;
  }
  function setVision(amount) {
    if(disposed)return;
    const v=T.MathUtils.clamp(Number.isFinite(amount)?amount:0,0,1);vision.value=v;
    const target=new T.Color('#141725');
    for(const entry of graded){
      entry.material.color.copy(entry.color).lerp(target,v*.78).multiplyScalar(1-v*.83);
      entry.material.emissive.copy(entry.emissive).multiplyScalar(1-v);
      if(entry.material.transparent)entry.material.opacity=entry.opacity*(1-v*.95);
    }
  }
  function dispose() {
    if(disposed)return;disposed=true;
    for(const g of geometries)g.dispose();for(const m of materials)m.dispose();
    root.removeFromParent();root.clear();
  }
  return {root,update,setVision,metadata,dispose};
}

function natureRandom(seed) {
  let n=seed>>>0;
  return ()=>{n=(n+0x6D2B79F5)>>>0;let t=n;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);
    return ((t^(t>>>14))>>>0)/4294967296;};
}
function natureSmooth(a,b,x){const t=T.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);}
function natureChannelCenter(z){return -83.25+1.22*Math.sin(z*.035)+.40*Math.sin(z*.081+.7);}
function natureChannelRise(x,z){
  const center=natureChannelCenter(z),distance=Math.abs(x-center);
  const edge=Math.min(x+92,-74-x),end=natureSmooth(5,16,z)*(1-natureSmooth(155,170,z));
  const bank=.41*Math.exp(-Math.pow((distance-3.55)/1.35,2));
  const contour=.048*Math.sin(z*.19+x*.64)+.026*Math.sin(z*.7+x*1.2);
  return .008+(bank+Math.max(0,contour)*natureSmooth(1.2,2.5,distance))*natureSmooth(0,1.5,edge)*end;
}
function natureTube(points,radii,radial,color,random){
  const positions=[],colors=[],indices=[];
  const ref=new T.Vector3(0,1,0),tangent=new T.Vector3(),normal=new T.Vector3(),binormal=new T.Vector3();
  for(let j=0;j<points.length;j++){
    tangent.copy(points[Math.min(j+1,points.length-1)]).sub(points[Math.max(0,j-1)]).normalize();
    if(Math.abs(tangent.y)>.94)ref.set(1,0,0);else ref.set(0,1,0);
    normal.crossVectors(tangent,ref).normalize();binormal.crossVectors(tangent,normal).normalize();
    for(let i=0;i<radial;i++){
      const a=i/radial*Math.PI*2,irregular=1+.095*Math.sin(i*4.77+j*.38);
      const v=points[j].clone().addScaledVector(normal,Math.cos(a)*radii[j]*irregular)
        .addScaledVector(binormal,Math.sin(a)*radii[j]*irregular);
      positions.push(v.x,v.y,v.z);
      const c=color.clone().multiplyScalar(.91+random()*.17);colors.push(c.r,c.g,c.b);
      if(j<points.length-1){const a0=j*radial+i,b0=j*radial+(i+1)%radial;indices.push(a0,b0,b0+radial,a0,b0+radial,a0+radial);}
    }
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
function natureMerge(parts){
  const positions=[],normals=[],colors=[],indices=[];let offset=0;
  for(const g of parts){const p=g.attributes.position,n=g.attributes.normal,c=g.attributes.color;
    for(let i=0;i<p.count;i++){positions.push(p.getX(i),p.getY(i),p.getZ(i));normals.push(n.getX(i),n.getY(i),n.getZ(i));
      colors.push(c?c.getX(i):1,c?c.getY(i):1,c?c.getZ(i):1);}
    if(g.index)for(let i=0;i<g.index.count;i++)indices.push(offset+g.index.getX(i));
    else for(let i=0;i<p.count;i++)indices.push(offset+i);
    offset+=p.count;g.dispose();
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  g.setIndex(indices);g.computeBoundingBox();g.computeBoundingSphere();return g;
}
function natureFoliage(high){
  const positions=[],colors=[],indices=[];const radial=8,levels=4;
  // Four ragged oval rings produce an enveloping, smooth leaf mass, not a sphere.
  for(let y=0;y<=levels;y++){
    const v=y/levels,theta=v*Math.PI;
    for(let j=0;j<radial;j++){
      const a=j/radial*Math.PI*2;
      const uneven=1+.15*Math.sin(a*3.0+v*2.5)+.09*Math.cos(a*5.0-v*5.0);
      const radius=Math.sin(theta)*uneven;
      positions.push(Math.cos(a)*radius,Math.cos(theta)*(.77+.055*Math.sin(a*3.0)),Math.sin(a)*radius*.90);
      const shade=.82+v*.07+.12*Math.max(0,Math.cos(a-1.0));colors.push(shade,shade*.998,shade*.93);
      if(y<levels){const a0=y*radial+j,b0=y*radial+(j+1)%radial;
        if(y!==0)indices.push(a0,b0,a0+radial);
        if(y!==levels-1)indices.push(b0,b0+radial,a0+radial);}
    }
  }
  // Attached lance-shaped leaflets break the outline, with no alpha-card noise.
  const n=high?12:8;
  for(let k=0;k<n;k++){
    const a=k*2.399,up=-.37+(k%4)*.24,rad=.81+Math.sin(k*1.7)*.08;
    const c=new T.Vector3(Math.cos(a)*rad,up,Math.sin(a)*rad*.90);
    const axis=new T.Vector3(Math.cos(a)*.22,.10+Math.sin(k)*.035,Math.sin(a)*.22);
    const cross=new T.Vector3(-Math.sin(a)*.082,.016,Math.cos(a)*.082);
    const base=positions.length/3;
    for(const q of [c.clone().sub(axis),c.clone().add(cross),c.clone().add(axis),c.clone().sub(cross)]){
      positions.push(q.x,q.y,q.z);const shade=.91+(k%3)*.045;colors.push(shade,shade,shade*.91);
    }
    indices.push(base,base+1,base+2,base,base+2,base+3);
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
function natureGrass(){
  const positions=[],colors=[],indices=[];
  for(let i=0;i<5;i++){
    const a=i*2.399,rootX=Math.sin(i*4.7)*.055,rootZ=Math.cos(i*2.1)*.049;
    const width=.011+(i%2)*.004,height=.22+(i%3)*.080,lean=.045+(i%3)*.035;
    const sideX=Math.cos(a)*width,sideZ=Math.sin(a)*width,bendX=-Math.sin(a)*lean,bendZ=Math.cos(a)*lean;
    const base=positions.length/3;
    positions.push(rootX-sideX,0,rootZ-sideZ,rootX+sideX,0,rootZ+sideZ,
      rootX+bendX*.34+sideX*.62,height*.54,rootZ+bendZ*.34+sideZ*.62,
      rootX+bendX*.34-sideX*.62,height*.54,rootZ+bendZ*.34-sideZ*.62,
      rootX+bendX,height,rootZ+bendZ);
    for(const shade of [.63,.65,.86,.86,1.03])colors.push(shade,shade,shade*.90);
    indices.push(base,base+1,base+2,base,base+2,base+3,base+3,base+2,base+4);
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
function naturePath(h,segments){
  const positions=[],uv=[],indices=[],across=8;
  for(let j=0;j<=segments;j++){
    const z=-68+308*j/segments,center=.55*Math.sin(z*.024),width=7.75+.7*Math.sin(z*.063)+.35*Math.sin(z*.173);
    for(let i=0;i<=across;i++){
      const u=i/across*2-1,x=center+u*width;
      positions.push(x,h(x,z)+.009,z);uv.push(u,j/segments);
      if(i<across&&j<segments){const a=j*(across+1)+i,b=a+1,c=a+across+1;indices.push(a,c,b,b,c,c+1);}
    }
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
function natureChannel(h,lengthSegments,widthSegments){
  const positions=[],colors=[],indices=[];
  const bed=new T.Color('#817461'),bank=new T.Color('#a68d69'),edge=new T.Color('#a28b68');
  for(let j=0;j<=lengthSegments;j++){
    const z=5+165*j/lengthSegments;
    for(let i=0;i<=widthSegments;i++){
      const x=-92+18*i/widthSegments,rise=natureChannelRise(x,z),distance=Math.abs(x-natureChannelCenter(z));
      positions.push(x,h(x,z)+rise,z);
      const tint=bed.clone().lerp(bank,natureSmooth(1.2,3.8,distance));
      const fade=Math.min(natureSmooth(0,1.3,x+92),natureSmooth(0,1.3,-74-x),natureSmooth(5,15,z),1-natureSmooth(157,170,z));
      tint.lerp(edge,1-fade).multiplyScalar(.96+.055*Math.sin(x*2.4+z*.39));colors.push(tint.r,tint.g,tint.b);
      if(i<widthSegments&&j<lengthSegments){const a=j*(widthSegments+1)+i,b=a+1,c=a+widthSegments+1;indices.push(a,c,b,b,c,c+1);}
    }
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
function natureBird(){
  const p=[-.93,.12,-.02,-.34,.015,.075,0,0,0,-.88,.11,.07,-.30,-.018,.17,
    .93,.12,-.02,.34,.015,.075,.88,.11,.07,.30,-.018,.17,0,-.014,.21,0,.01,-.11];
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));
  g.setIndex([0,1,3,3,1,4,1,2,4,5,7,6,7,8,6,6,8,2,2,9,4,2,8,9,2,10,1,2,6,10]);g.computeVertexNormals();return g;
}
function natureStats(root){
  let triangles=0,drawCalls=0,vertices=0;
  root.traverse(o=>{if(!o.isMesh)return;const n=o.isInstancedMesh?o.count:1,g=o.geometry;
    triangles+=(g.index?g.index.count:g.attributes.position.count)/3*n;vertices+=g.attributes.position.count*n;
    drawCalls+=Array.isArray(o.material)?o.material.length:1;});
  return {triangles,vertices,drawCalls};
}
