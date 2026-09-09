import * as T from './vendor/three.module.min.js';
import {createInfantry} from './battle/infantry.js';
import {createBattleAnimals} from './battle/animals.js';
import {createNature} from './battle/nature.js';
import {createArmyMass} from './battle/army-mass.js';
import {sampleDaylight} from './experience/daylight.js';

/**
 * Kurukshetra · reusable, self-contained surroundings.
 * Metres; y-up; +Z forward. Nothing is attached to a renderer or a scene.
 * The protected rath clearing x=[-7,7], z=[-12,20] stays clear.
 * Authored geometry and shader detail; animal meshes load from local Site assets.
 */
export async function createSurroundings({quality = 'high'} = {}) {
  const high = quality !== 'low';
  const root = new T.Group();
  root.name = 'Kurukshetra · earth, armies and evening';
  const materials = new Set(), geometries = new Set();
  const gradedMaterials = [];
  const clock = {value: 0}, vision = {value: 0}, night = {value: 0};
  const daylight=sampleDaylight(.76), skyLow={value:daylight.low},skyMid={value:daylight.mid},skyHigh={value:daylight.high},sunDirection={value:daylight.direction};
  const haze = {value: new T.Color('#bb8d67')};
  const rng = seededRandom(110811);
  let disposed = false, elapsed = 0;

  function ownGeometry(g) { geometries.add(g); return g; }
  function ownMaterial(m) { materials.add(m); return m; }
  function standard(color, extras = {}) {
    const m = ownMaterial(new T.MeshStandardMaterial({color, roughness: .94,
      metalness: 0, ...extras}));
    gradedMaterials.push({m, color: m.color.clone(), emissive: m.emissive.clone()});
    const previous = m.onBeforeCompile;
    m.onBeforeCompile = shader => {
      previous.call(m, shader);
      shader.uniforms.uBattleHaze = haze;
      shader.fragmentShader = 'uniform vec3 uBattleHaze;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
        float battlefieldHaze = 1.0 - exp(-pow(length(vViewPosition) / 248.0, 1.45));
        outgoingLight = mix(outgoingLight, uBattleHaze, battlefieldHaze * .72);
        #include <opaque_fragment>`);
    };
    m.customProgramCacheKey = () => 'kurukshetra-haze-v1';
    return m;
  }
  function addMesh(g, m, name, parent = root) {
    const mesh = new T.Mesh(ownGeometry(g), m);
    mesh.name = name; parent.add(mesh); return mesh;
  }
  function instances(g, m, count, name) {
    const mesh = new T.InstancedMesh(ownGeometry(g), m, count);
    mesh.name = name; mesh.castShadow = false; mesh.receiveShadow = false;
    mesh.instanceMatrix.setUsage(T.StaticDrawUsage); root.add(mesh); return mesh;
  }

  // A large, continuous earth disc. Its inner rings are dense enough that the
  // softness of the soil reads as actual contour rather than a flat stage.
  const earthMat = standard('#a78a63');
  const earthCompile = earthMat.onBeforeCompile;
  earthMat.onBeforeCompile = shader => {
    earthCompile(shader);
    shader.vertexShader = 'varying vec3 vEarthPosition;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nvEarthPosition = position;');
    shader.fragmentShader = `varying vec3 vEarthPosition;
      float earthHash(vec2 p) {return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float earthNoise(vec2 p) {
        vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
        return mix(mix(earthHash(i),earthHash(i+vec2(1,0)),f.x),
          mix(earthHash(i+vec2(0,1)),earthHash(i+vec2(1,1)),f.x),f.y);
      }
      ` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
      #include <color_fragment>
      vec2 soilP=vEarthPosition.xz;
      float beds=earthNoise(soilP*.11)*.58+earthNoise(soilP*.37)*.27+earthNoise(soilP*1.4)*.15;
      diffuseColor.rgb *= .84 + beds*.28;
      float oldTrail = exp(-pow((soilP.x + .22*sin(soilP.y*.047))/5.4,2.0));
      float routeEnd = 1.0-smoothstep(110.0,180.0,abs(soilP.y));
      float parallelRuts = exp(-pow((abs(soilP.x+.045*sin(soilP.y*.24))-2.03)/.105,2.0));
      float softenedRut = exp(-pow((abs(soilP.x+.045*sin(soilP.y*.24))-2.03)/.28,2.0));
      float brokenTrack = .66 + .34*earthNoise(vec2(soilP.y*.8,2.1));
      diffuseColor.rgb *= 1.0 + .075*oldTrail*routeEnd;
      diffuseColor.rgb *= 1.0 - routeEnd*brokenTrack*(parallelRuts*.15+softenedRut*.045);
      float bank = exp(-pow((soilP.x+83.0)/14.0,2.0))
        *smoothstep(5.0,22.0,soilP.y)*(1.0-smoothstep(152.0,172.0,soilP.y));
      float damp = bank*(.38+.20*earthNoise(soilP*.25));
      diffuseColor.rgb = mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.69,.75,.66),damp);
      float worn = earthNoise(soilP*.09+vec2(10.0,4.0));
      diffuseColor.rgb *= .94 + .08*smoothstep(.28,.7,worn);
    `);
  };
  earthMat.customProgramCacheKey = () => 'kurukshetra-earth-v1';
  const earth = addMesh(makeEarth(high ? 100 : 72, high ? 160 : 128, 2200), earthMat,
    'Unbroken dusty earth · two weathered wheel tracks');
  earth.receiveShadow = true;

  // Sparse tufts occur in gently curved patches at the edge of the trodden
  // ground. Their placement is intentional, leaving the hero's floor clear.
  const grassMat = standard('#716345', {side:T.DoubleSide, vertexColors:true});
  const grass = instances(makeGrassTuft(), grassMat, high ? 140 : 70,
    'Dry grass · small islands beside the passage');
  const transform = new T.Object3D();
  for (let i=0; i<grass.count; i++) {
    const side = i%2 ? 1 : -1;
    const island = Math.floor(i/2)%4;
    const z = [-43,22,87,134][island] + (rng()-.5)*22;
    const patch = Math.sin(z*.071+side*.7)*.8;
    const x = side*(18.4 + island*3.3 + Math.pow(rng(),2)*9 + patch);
    transform.position.set(x,groundHeight(x,z)+.002,z);
    transform.rotation.set(0,rng()*Math.PI*2,0);
    const s=.50+rng()*.77; transform.scale.set(s,s*(.76+rng()*.35),s);
    transform.updateMatrix(); grass.setMatrixAt(i,transform.matrix);
    grass.setColorAt(i,new T.Color().setHSL(.103+rng()*.025,.20,.34+rng()*.11));
  }
  grass.computeBoundingSphere();

  const stoneMat=standard('#84755e');
  const stones=instances(makeStone(),stoneMat,high?24:12,'Small worn stones · verge clusters');
  for(let i=0;i<stones.count;i++) {
    const island=Math.floor(i/2)%4,side=i%2?1:-1;
    const z=[-43,22,87,134][island]+(rng()-.5)*17;
    const x=side*(20.2+island*3.3+rng()*8),s=.05+Math.pow(rng(),2)*.11;
    transform.position.set(x,groundHeight(x,z)+s*.16,z);
    transform.rotation.set(rng()*.4,rng()*Math.PI*2,rng()*.4);
    transform.scale.set(s*(1+rng()),s*.55,s);transform.updateMatrix();
    stones.setMatrixAt(i,transform.matrix);
    stones.setColorAt(i,new T.Color().setHSL(.092,.12+rng()*.09,.33+rng()*.10));
  }
  stones.computeBoundingSphere();

  // Reusable battle elements share the exact same ground surface.
  // Foreground duels, horse formations and elephants read at human scale;
  // the reserve ranks form dense masses deeper in the field.
  const [infantry,animals,nature,mass]=await Promise.all([
    createInfantry({quality,groundHeight}),
    createBattleAnimals({quality,groundHeight}),
    createNature({quality,groundHeight}),
    createArmyMass({quality,groundHeight})
  ]);
  root.add(infantry.root,animals.root,nature.root,mass.root);

  const standardPositions=[];
  const flagAnchors=[[-31,-36],[-37,-6],[-43,30],[-54,70],[-69,120],[-36,135],
    [40,-30],[52,8],[52,52],[58,90],[70,132],[35,153]];
  for(const [x,z] of flagAnchors){
    standardPositions.push({x,z,height:5.4+rng()*1.15,side:x<0?-1:1,phase:rng()*6.28});
    if(high&&z>20)standardPositions.push({x:x+(x<0?-17:17),z:z+9,height:6.2+rng()*.9,side:x<0?-1:1,phase:rng()*6.28});
  }
  const flagMaterial=ownMaterial(new T.ShaderMaterial({
    side:T.DoubleSide, uniforms:{uTime:clock,uVision:vision,uHaze:haze,uNight:night},
    vertexShader:`
      uniform float uTime;varying vec2 vUv;varying vec3 vTint;
      varying float vShade;varying float vDistance;
      void main(){
        vUv=uv;vTint=vec3(1.0);
        #ifdef USE_INSTANCING_COLOR
          vTint=instanceColor;
        #endif
        vec3 p=position;
        float phase=instanceMatrix[3].x*.17+instanceMatrix[3].z*.063;
        float w=uv.x;
        p.z += w*(.12*sin(w*7.0+uv.y*2.5-uTime*1.55+phase)
          +.085*sin(w*13.0+uv.y*4.0-uTime*2.1+phase));
        p.x -= w*w*(.065+.045*sin(uTime*.8+phase));
        p.y += w*w*.055*sin(uTime*1.1+phase);
        vShade=.78+.19*sin(w*7.0+uv.y*2.5-uTime*1.55+phase)+.06*cos(uv.y*19.0+w*4.0);
        vec4 mv=modelViewMatrix*instanceMatrix*vec4(p,1.0);
        vDistance=length(mv.xyz);gl_Position=projectionMatrix*mv;
      }`,
    fragmentShader:`
      uniform float uVision;uniform vec3 uHaze;uniform float uNight;
      varying vec2 vUv;varying vec3 vTint;varying float vShade;varying float vDistance;
      void main(){
        float edge=min(min(vUv.x,1.0-vUv.x),min(vUv.y,1.0-vUv.y));
        float border=1.0-smoothstep(.018,.027,edge);
        vec2 emblem=(vUv-vec2(.49,.59))*vec2(1.0,1.57);
        float d=length(emblem);
        float ring=(1.0-smoothstep(.009,.014,abs(d-.137)));
        float hub=1.0-smoothstep(.029,.038,d);
        float spokes=(1.0-smoothstep(.032,.061,abs(sin(atan(emblem.y,emblem.x)*8.0))))
          *smoothstep(.055,.065,d)*(1.0-smoothstep(.128,.14,d));
        float symbol=max(border*.8,max(ring,max(hub,spokes)));
        vec3 fabric=mix(vTint,vec3(.66,.43,.16),symbol*.88);
        fabric*=vShade;fabric=mix(fabric,fabric*vec3(.25,.34,.51),uNight*.86);
        fabric=mix(fabric,uHaze,(1.0-exp(-pow(vDistance/248.0,1.45)))*.72);
        fabric=mix(fabric,vec3(.008,.008,.018),uVision*.96);
        gl_FragColor=vec4(fabric,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  }));
  const flags=instances(makeBanner(high?10:7,high?7:5),flagMaterial,standardPositions.length,
    'Wind in the standards · embroidered saffron and indigo cloth');
  const poleMat=standard('#9e7945',{roughness:.68,metalness:.30});
  const poles=instances(new T.CylinderGeometry(.026,.038,1,6,1),poleMat,
    standardPositions.length,'Tall slender banner masts');
  const finials=instances(mergeGeometry([
    coloured(new T.SphereGeometry(.069,8,4).translate(0,.02,0),'#c29a57'),
    coloured(new T.ConeGeometry(.062,.25,8).translate(0,.16,0),'#c29a57')
  ]),standard('#ffffff',{vertexColors:true,metalness:.4,roughness:.55}),
  standardPositions.length,'Small gilded standard finials');
  standardPositions.forEach((p,i)=>{
    const y=groundHeight(p.x,p.z);
    transform.position.set(p.x,y+p.height*.5,p.z);
    transform.rotation.set(0,0,0);transform.scale.set(1,p.height,1);
    transform.updateMatrix();poles.setMatrixAt(i,transform.matrix);
    transform.position.y=y+p.height+.03;transform.scale.setScalar(1);
    transform.updateMatrix();finials.setMatrixAt(i,transform.matrix);
    transform.position.y=y+p.height-.12;
    transform.rotation.set(0,-.55+p.side*.15+(rng()-.5)*.24,0);
    const s=.88+rng()*.22;transform.scale.set(s,s,1);
    transform.updateMatrix();flags.setMatrixAt(i,transform.matrix);
    flags.setColorAt(i,new T.Color(p.side<0?(i%3===0?'#ba813d':'#964527'):(i%3===0?'#78807d':'#364756')));
  });
  flags.computeBoundingSphere();flags.boundingSphere.radius+=1;
  poles.computeBoundingSphere();finials.computeBoundingSphere();

  // Low, continuous terrain contours, all beyond the armies. Each
  // silhouette is a sum of long, smooth waves with no nearby mountain peaks.
  const horizonGroup=new T.Group();horizonGroup.name='Far alluvial horizon · beyond the armies';root.add(horizonGroup);
  for(const [i,radius,height,color] of [
    [0,1800,20,'#8e7766'],[1,2020,29,'#a18771'],[2,2170,36,'#b49276']
  ]) {
    addMesh(makeHorizon(radius,height,high?256:144,i),standard(color),
      `Low horizon layer ${i+1}`,horizonGroup);
  }

  const skyMat=ownMaterial(new T.ShaderMaterial({side:T.BackSide,depthWrite:false,
    uniforms:{uVision:vision,uNight:night,uLow:skyLow,uMid:skyMid,uHigh:skyHigh,uSunDirection:sunDirection},
    vertexShader:`varying vec3 vDirection;void main(){vDirection=position;
      gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`
      uniform float uVision,uNight;uniform vec3 uLow,uMid,uHigh,uSunDirection;varying vec3 vDirection;
      float skyHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      void main(){
        vec3 d=normalize(vDirection);float h=max(d.y,0.0);
        vec3 sky=mix(uLow,uMid,smoothstep(0.0,.34,h));sky=mix(sky,uHigh,smoothstep(.20,.95,h));
        float sunDot=max(dot(d,uSunDirection),0.0);
        sky += vec3(.37,.16,.045)*pow(sunDot,18.0)*(1.0-smoothstep(.06,.48,h))*(1.0-uNight);
        sky += mix(vec3(.90,.40,.11),vec3(.12,.17,.28),uNight)*pow(sunDot,470.0)*.27;
        float disc=smoothstep(cos(.0100),cos(.0085),sunDot);
        sky=mix(sky,mix(vec3(2.2,1.10,.40),vec3(.70,.79,1.0),uNight),disc*.94);
        float belt=exp(-pow((d.y-.023)/.048,2.0));sky=mix(sky,uLow,belt*.20);
        float veil=sin(d.y*88.0+d.x*4.0+sin(d.z*7.0))*.5+.5;
        sky += vec3(.018,.010,.007)*pow(veil,4.0)*smoothstep(.025,.08,h)*(1.0-smoothstep(.20,.34,h))*(1.0-uNight);
        // Fixed stars are spatial, not flickering screen noise.
        vec2 starUV=vec2(atan(d.z,d.x)*.15915494+.5,asin(clamp(d.y,-1.0,1.0))*.31830989+.5)*vec2(1600.0,800.0);
        vec2 cell=floor(starUV),local=fract(starUV)-.5;
        float star=step(.9985,skyHash(cell))*exp(-dot(local,local)*40.0)*smoothstep(.09,.3,h);
        sky+=vec3(.55,.65,.82)*star*uNight;
        sky=mix(sky,vec3(.0025,.0035,.009),uVision*.99);
        gl_FragColor=vec4(sky,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  }));
  const sky=addMesh(new T.SphereGeometry(3000,high?48:32,high?24:16),skyMat,
    'Dawn, daylight, dusk and a moonlit sky');
  sky.renderOrder=-100;sky.frustumCulled=false;

  // Soft dust is made of tiny GPU points: sparse, slow, and absent immediately
  // around the figures. Point sizes fade with distance and have no hard edges.
  const dustCount=high?55:28;
  const dustGeo=ownGeometry(new T.BufferGeometry());
  const dustPosition=new Float32Array(dustCount*3),dustData=new Float32Array(dustCount*3);
  for(let i=0;i<dustCount;i++) {
    let x=(rng()-.5)*155,z=-50+rng()*210;
    if(Math.abs(x)<11 && z>-18 && z<27)x+=(x<0?-1:1)*15;
    dustPosition.set([x,.45+Math.pow(rng(),1.7)*4.4,z],i*3);
    dustData.set([rng()*6.28,.06+rng()*.20,.30+rng()*.58],i*3);
  }
  dustGeo.setAttribute('position',new T.BufferAttribute(dustPosition,3));
  dustGeo.setAttribute('aDust',new T.BufferAttribute(dustData,3));
  const dustMat=ownMaterial(new T.ShaderMaterial({transparent:true,depthWrite:false,
    blending:T.NormalBlending,uniforms:{uTime:clock,uVision:vision},
    vertexShader:`attribute vec3 aDust;uniform float uTime;
      varying float vAlpha;void main(){
        vec3 p=position;p.x+=sin(uTime*.13+aDust.x)*1.8;
        p.z+=sin(uTime*.10+aDust.x*2.0)*.6;
        p.y+=sin(uTime*.23+aDust.x)*.18;
        vec4 mv=modelViewMatrix*vec4(p,1.0);
        gl_Position=projectionMatrix*mv;
        gl_PointSize=clamp(aDust.y*340.0/max(-mv.z,1.0),1.2,9.0);
        vAlpha=aDust.z*.18*(.65+.35*sin(uTime*.22+aDust.x))
          *smoothstep(6.0,17.0,-mv.z)*(1.0-smoothstep(100.0,180.0,-mv.z));
      }`,
    fragmentShader:`uniform float uVision;varying float vAlpha;
      void main(){float r=length(gl_PointCoord-.5)*2.0;
        float a=exp(-r*r*4.5)*(1.0-smoothstep(.70,1.0,r))*vAlpha*(1.0-uVision);
        gl_FragColor=vec4(.72,.49,.27,a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  }));
  const dust=new T.Points(dustGeo,dustMat);dust.name='A few suspended motes of earth';
  dust.renderOrder=4;dust.frustumCulled=false;root.add(dust);

  root.updateMatrixWorld(true);
  const stats={triangles:0,drawCalls:0,instances:0};
  root.traverse(o=>{
    if(o.isMesh){stats.drawCalls++;const triangles=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;
      stats.triangles+=triangles*(o.isInstancedMesh?o.count:o.geometry.isInstancedBufferGeometry?o.geometry.instanceCount:1);if(o.isInstancedMesh)stats.instances+=o.count;else if(o.geometry.isInstancedBufferGeometry)stats.instances+=o.geometry.instanceCount;}
    if(o.isPoints)stats.drawCalls++;
  });
  const metadata={
    title:'Kurukshetra · armies, cavalry and elephants',quality:high?'high':'low',
    units:'metres',up:'+Y',forward:'+Z',groundY:0,
    clearAisle:{minX:-7,maxX:7,minZ:-12,maxZ:20},
    armies:{...infantry.metadata,flags:standardPositions.length},
    animals:animals.metadata,nature:nature.metadata,armyMass:mass.metadata,
    fieldViews:{
      clash:{label:'Soldiers',title:'At the front line.',aim:[-14,1.25,8],yaw:.64,pitch:.17,distance:11.5,minDistance:8,maxDistance:21},
      cavalry:{label:'Cavalry',title:'Across the open ground.',aim:[-24,2.1,60],yaw:-1.1,pitch:.16,distance:18,minDistance:11,maxDistance:29},
      elephants:{label:'Elephants',title:'The war elephants.',aim:[-16,2.6,30],yaw:-.94,pitch:.12,distance:18,minDistance:11,maxDistance:29},
      wide:{label:'Whole field',title:'Between the two armies.',aim:[0,2.8,3],yaw:0,pitch:.37,distance:82,minDistance:34,maxDistance:180}
    },
    horizon:{nearestRadius:1800,highestPoint:36},
    groundRadius:2200,skyRadius:3000,recommendedCameraFar:4000,
    lighting:{keyDirection:[-.53,.20,-.845],keyColor:'#ffd397',
      hemisphereSky:'#aebbcf',hemisphereGround:'#71543c'},
    atmosphere:'Local distance haze is built into the materials; scene.fog may be null.',
    visionBehavior:'0 = warm world; 1 = near-black indigo world and no dust. Reuses materials without recompiling.',
    motion:'Paired sword and shield exchanges, moving mounted formations, elephant weight shifts, cloth, foliage and drifting dust. animated=false freezes all elements.',
    stats,groundHeight
  };
  function update(time,dt,animated=true) {
    if(disposed||!animated)return;
    // An internal clock prevents time jumps when the parent resumes playback.
    if(Number.isFinite(dt))elapsed+=Math.max(0,Math.min(dt,.1));
    else if(Number.isFinite(time))elapsed=time;
    clock.value=elapsed;
    infantry.update(elapsed,dt,true);animals.update(elapsed,dt,true);nature.update(elapsed,dt,true);mass.update(elapsed,dt,true);
  }
  function setVision(amount) {
    const v=T.MathUtils.clamp(Number.isFinite(amount)?amount:0,0,1);vision.value=v;
    const target=new T.Color('#171724');
    for(const {m,color,emissive} of gradedMaterials) {
      m.color.copy(color).lerp(target,v*.82).multiplyScalar(1-v*.76);
      m.emissive.copy(emissive).multiplyScalar(1-v);
    }
    haze.value.copy(daylight.haze).lerp(new T.Color('#090b18'),v*.99);
    infantry.setVision(v);animals.setVision(v);nature.setVision(v);mass.setVision(v);
  }
  function setTimeOfDay(amount) {
    sampleDaylight(amount,daylight);night.value=daylight.night;
    haze.value.copy(daylight.haze).lerp(new T.Color('#090b18'),vision.value*.99);
    mass.setTimeOfDay(daylight.night,daylight.haze);
  }
  function dispose() {
    if(disposed)return;disposed=true;
    infantry.dispose?.();animals.dispose?.();nature.dispose?.();mass.dispose?.();
    for(const g of geometries)g.dispose();for(const m of materials)m.dispose();
    root.removeFromParent();root.clear();
  }
  return {root,update,setVision,setTimeOfDay,metadata,dispose,infantry,animals,nature,mass};
}

function seededRandom(seed) {
  let n=seed>>>0;
  return ()=>{n=(n+0x6D2B79F5)>>>0;let x=n;x=Math.imul(x^(x>>>15),x|1);
    x^=x+Math.imul(x^(x>>>7),x|61);return ((x^(x>>>14))>>>0)/4294967296;};
}
function smooth(a,b,x) {const t=T.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);}
export function groundHeight(x,z) {
  const radius=Math.hypot(x,z);
  // The original rath floor is unchanged; larger undulations belong to the
  // earth beyond it. Every actor samples this same surface for its footsteps.
  const reveal=smooth(13,32,radius)*smooth(7,18,Math.abs(x));
  const plain=reveal*(.17*Math.sin(x*.041+z*.031)+.105*Math.sin(z*.063-x*.034)+.07*Math.cos(x*.092+z*.054));
  const distance=smooth(120,430,radius)*(.94*Math.sin(x*.014)*Math.cos(z*.012));
  const channel=-.70*Math.exp(-(((x+83)/6.2)**2))*smooth(5,20,z)*(1-smooth(155,170,z));
  return -.027+plain+distance+channel;
}
function makeEarth(rings,segments,radius) {
  const positions=[0,groundHeight(0,0),0],uv=[.5,.5],indices=[];
  for(let r=1;r<=rings;r++) {
    const rr=radius*Math.pow(r/rings,2.4);
    for(let s=0;s<segments;s++) {
      const a=s/segments*Math.PI*2,x=Math.cos(a)*rr,z=Math.sin(a)*rr;
      positions.push(x,groundHeight(x,z),z);uv.push(x/radius*.5+.5,z/radius*.5+.5);
    }
  }
  for(let s=0;s<segments;s++)indices.push(0,1+(s+1)%segments,1+s);
  for(let r=1;r<rings;r++)for(let s=0;s<segments;s++) {
    const a=1+(r-1)*segments+s,b=1+(r-1)*segments+(s+1)%segments;
    const c=a+segments,d=b+segments;indices.push(a,b,d,a,d,c);
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
function coloured(g,color) {
  const c=new T.Color(color),n=g.attributes.position.count,out=new Float32Array(n*3);
  for(let i=0;i<n;i++)out.set([c.r,c.g,c.b],i*3);
  g.setAttribute('color',new T.BufferAttribute(out,3));return g;
}
function mergeGeometry(parts) {
  const position=[],normal=[],color=[],uv=[],index=[];let offset=0;
  for(const g of parts) {
    const p=g.attributes.position,n=g.attributes.normal,c=g.attributes.color,u=g.attributes.uv;
    for(let i=0;i<p.count;i++) {
      position.push(p.getX(i),p.getY(i),p.getZ(i));
      normal.push(n?n.getX(i):0,n?n.getY(i):1,n?n.getZ(i):0);
      color.push(c?c.getX(i):1,c?c.getY(i):1,c?c.getZ(i):1);
      uv.push(u?u.getX(i):0,u?u.getY(i):0);
    }
    if(g.index)for(let i=0;i<g.index.count;i++)index.push(g.index.getX(i)+offset);
    else for(let i=0;i<p.count;i++)index.push(i+offset);
    offset+=p.count;g.dispose();
  }
  const result=new T.BufferGeometry();
  result.setAttribute('position',new T.Float32BufferAttribute(position,3));
  result.setAttribute('normal',new T.Float32BufferAttribute(normal,3));
  result.setAttribute('color',new T.Float32BufferAttribute(color,3));
  result.setAttribute('uv',new T.Float32BufferAttribute(uv,2));result.setIndex(index);return result;
}
function makeGrassTuft() {
  const p=[],c=[],idx=[],rng=seededRandom(312),base=new T.Color('#afa380'),tip=new T.Color('#baae8a');
  for(let i=0;i<5;i++) {
    const a=i*2.399,dx=Math.cos(a),dz=Math.sin(a),h=.22+rng()*.22,w=.016+rng()*.009,b=i*5;
    p.push(-dz*w,0,dx*w,dz*w,0,-dx*w,
      dx*h*.23-dz*w*.50,h*.60,dz*h*.23+dx*w*.50,
      dx*h*.23+dz*w*.50,h*.60,dz*h*.23-dx*w*.50,
      dx*h*.50,h,dz*h*.50);
    for(let j=0;j<5;j++){const col=base.clone().lerp(tip,j/4);c.push(col.r,col.g,col.b);}
    idx.push(b,b+1,b+2,b+1,b+3,b+2,b+2,b+3,b+4);
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));
  g.setAttribute('color',new T.Float32BufferAttribute(c,3));g.setIndex(idx);g.computeVertexNormals();return g;
}
function makeStone() {
  const g=new T.IcosahedronGeometry(1,1),p=g.attributes.position;
  for(let i=0;i<p.count;i++) {const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    const n=1+.09*Math.sin(x*5.1+z*4.1)*Math.cos(y*3.0);
    p.setXYZ(i,x*n,y*n,z*n);}
  g.computeVertexNormals();return g;
}
function makeBanner(columns,rows) {
  const p=[],uv=[],idx=[];
  for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++) {
    const u=i/columns,v=j/rows;
    // The bottom is a shallow, elegant split pennon, not a rectangular tile.
    const notch=.21*Math.sin(Math.PI*u)*Math.pow(1-v,8);
    p.push(u*(1.43+.13*v),-(1-v)*2.30+notch,
      u*.08*Math.sin(u*7.0+v*2.5));uv.push(u,v);
  }
  for(let j=0;j<rows;j++)for(let i=0;i<columns;i++) {
    const a=j*(columns+1)+i,b=a+1,c=a+columns+1,d=c+1;idx.push(a,b,c,b,d,c);
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));
  g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
function makeHorizon(radius,height,segments,layer) {
  const p=[],idx=[];
  for(let i=0;i<=segments;i++) {
    const a=i/segments*Math.PI*2;
    const wave=.60+.17*Math.sin(a*4+layer*1.1)+.115*Math.sin(a*9+.3+layer)+.045*Math.cos(a*17);
    const r=radius+Math.sin(a*5+layer)*12;
    for(const [rr,y] of [[r-7,-1.5],[r,height*wave],[r+58,-1.0]])p.push(Math.cos(a)*rr,y,Math.sin(a)*rr);
  }
  for(let i=0;i<segments;i++)for(let band=0;band<2;band++) {
    const a=i*3+band,b=a+3;idx.push(a,b,a+1,b,b+1,a+1);
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));
  g.setIndex(idx);g.computeVertexNormals();return g;
}
