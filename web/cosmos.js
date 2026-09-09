import * as T from './vendor/three.module.min.js';

const noiseGLSL=`
  float hash31(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
  float cosmicNoise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
    return mix(mix(mix(hash31(i),hash31(i+vec3(1,0,0)),f.x),mix(hash31(i+vec3(0,1,0)),hash31(i+vec3(1,1,0)),f.x),f.y),
      mix(mix(hash31(i+vec3(0,0,1)),hash31(i+vec3(1,0,1)),f.x),mix(hash31(i+vec3(0,1,1)),hash31(i+vec3(1,1,1)),f.x),f.y),f.z);}
  float fbm(vec3 p){return cosmicNoise3(p)*.55+cosmicNoise3(p*2.03+7.1)*.27+cosmicNoise3(p*4.07+13.3)*.13+cosmicNoise3(p*8.11)*.05;}
`;
function randomFactory(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}

/** Depth-bearing worlds, astral light and the restrained vision of dissolution.
 * Independent of the renderer and of the physical Vishvarupa sculpture.
 */
export function createCosmos({quality='high'}={}){
  const root=new T.Group();root.name='Worlds within worlds';
  const time={value:0},amount={value:0},dread={value:0};
  const rng=randomFactory(1132),count=quality==='low'?1100:2200;
  const positions=[],seeds=[],sizes=[];
  for(let i=0;i<count;i++){
    const a=rng()*Math.PI*2,cos=rng()*1.45-.45,s=Math.sqrt(1-cos*cos),r=70+rng()*160;
    positions.push(Math.cos(a)*s*r,16+cos*r,38+Math.sin(a)*s*r);
    seeds.push(rng());sizes.push(.65+Math.pow(rng(),5)*3.2);
  }
  const starsG=new T.BufferGeometry();starsG.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  starsG.setAttribute('seed',new T.Float32BufferAttribute(seeds,1));starsG.setAttribute('size',new T.Float32BufferAttribute(sizes,1));
  const starsM=new T.ShaderMaterial({uniforms:{uTime:time,uAmount:amount,uDread:dread},transparent:true,depthWrite:false,blending:T.AdditiveBlending,
    vertexShader:`attribute float seed;attribute float size;varying float vSeed;uniform float uTime;void main(){vSeed=seed;vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(size*170./max(25.,-p.z),.8,5.);}`,
    fragmentShader:`varying float vSeed;uniform float uTime,uAmount,uDread;void main(){float r=length(gl_PointCoord-.5);float a=exp(-r*r*22.)*(1.-smoothstep(.35,.5,r));vec3 c=mix(vec3(.53,.7,1.),vec3(1.,.78,.42),vSeed);c=mix(c,vec3(1.,.38,.09),uDread*.3);gl_FragColor=vec4(c,a*uAmount*(.68+.13*sin(uTime*.27+vSeed*40.)));}`});
  const stars=new T.Points(starsG,starsM);stars.frustumCulled=false;root.add(stars);

  // The entire sky becomes a continuous, slow, layered expanse. Its material
  // lives in 3D directional space: it is not a billboard or a replacement image.
  const skyM=new T.ShaderMaterial({side:T.BackSide,transparent:true,depthWrite:false,
    uniforms:{uTime:time,uAmount:amount,uDread:dread},
    vertexShader:`varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec3 vDirection;uniform float uTime,uAmount,uDread;${noiseGLSL}
      void main(){vec3 d=normalize(vDirection);vec3 p=d*3.5+vec3(0.,uTime*.006,0.);
        float n=fbm(p+vec3(fbm(p*1.6),0.,0.));float fold=exp(-pow((d.x*.65+d.y*.9-.28+(n-.5)*.48)*7.,2.));
        vec3 c=mix(vec3(.008,.014,.038),vec3(.047,.04,.10),n);
        c+=mix(vec3(.095,.07,.032),vec3(.16,.026,.006),uDread)*fold*(.3+n);
        c+=vec3(.022,.04,.068)*pow(n,4.)*4.;
        gl_FragColor=vec4(c,uAmount*.995);}`});
  const sky=new T.Mesh(new T.SphereGeometry(850,40,28),skyM);sky.renderOrder=-9;root.add(sky);

  const worlds=new T.Group();worlds.name='Worlds held inside the vision';root.add(worlds);
  const globeG=new T.SphereGeometry(1,48,32),worldsList=[];
  const planetSpecs=[[-17,23,49,2.8,.3],[15,31,63,3.6,.8],[-12,39,76,2,.5],[7,11,31,1.8,.1],[28,18,86,4.3,.75],[-29,14,93,3.8,.4]];
  for(const [x,y,z,s,seed] of planetSpecs){
    const m=new T.ShaderMaterial({uniforms:{uTime:time,uAmount:amount,uDread:dread,uSeed:{value:seed}},transparent:true,
      vertexShader:`varying vec3 vP;varying vec3 vN;void main(){vP=position;vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader:`varying vec3 vP,vN;uniform float uTime,uAmount,uDread,uSeed;${noiseGLSL}
        void main(){float n=fbm(vP*3.7+uSeed*19.);float land=smoothstep(.46,.53,n);
          vec3 ocean=mix(vec3(.015,.055,.095),vec3(.09,.052,.03),uSeed);
          vec3 soil=mix(vec3(.16,.21,.15),vec3(.29,.17,.06),uSeed);
          vec3 color=mix(ocean,soil,land);
          float cloud=smoothstep(.62,.75,fbm(vP*8.+vec3(uTime*.009,uSeed*7.,0.)));
          color=mix(color,vec3(.56,.57,.53),cloud*.6);
          float light=max(0.,dot(normalize(vN),normalize(vec3(-.8,.5,.6))));
          float limb=pow(1.-abs(vN.z),3.5);
          color=color*(.18+light*1.7)+vec3(.08,.16,.25)*limb;
          color=mix(color,color*vec3(1.5,.60,.31),uDread*.75);
          gl_FragColor=vec4(color,uAmount*.91);}`});
    const globe=new T.Mesh(globeG,m);globe.position.set(x,y,z);globe.scale.setScalar(s);globe.rotation.set(seed,seed*4,seed*.6);worlds.add(globe);worldsList.push(globe);
  }

  // Light follows long curved filaments at different depths. A narrow luminous
  // core sits in a wide feathered ribbon; no solid geometric rings are exposed.
  const ribbonM=new T.ShaderMaterial({uniforms:{uTime:time,uAmount:amount,uDread:dread},transparent:true,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending,
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec2 vUv;uniform float uTime,uAmount,uDread;void main(){float w=exp(-pow((vUv.x-.5)*7.,2.));float ends=sin(vUv.y*3.14159265);float flow=.63+.15*sin(vUv.y*13.-uTime*.20);vec3 c=mix(vec3(.58,.42,.19),vec3(.74,.16,.035),uDread);gl_FragColor=vec4(c,w*ends*flow*uAmount*.16);}`});
  for(let i=0;i<7;i++){
    const points=[];const side=i%2?1:-1;
    points.push(new T.Vector3(side*(20+i*3),-3,75+i*6));
    points.push(new T.Vector3(side*(32+i*1.9),22+i*3,69+i*7));
    points.push(new T.Vector3(side*(13+i*.4),48+i*2,57+i*8));
    points.push(new T.Vector3(-side*(22+i),57-i,84+i*7));
    const curve=new T.CatmullRomCurve3(points),p=[],uv=[],idx=[];
    for(let j=0;j<=100;j++){
      const t=j/100,c=curve.getPoint(t),tangent=curve.getTangent(t),right=new T.Vector3().crossVectors(tangent,new T.Vector3(0,0,1)).normalize();
      for(let k=0;k<2;k++){const v=c.clone().addScaledVector(right,(k-.5)*(1.6+i*.17));p.push(...v);uv.push(k,t);}
      if(j<100){const a=j*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);
    const ribbon=new T.Mesh(g,ribbonM);root.add(ribbon);
  }

  // Warriors enter the vision of Time as quiet distant silhouettes, without
  // injury, impacts or a reward loop. They diminish into radiance at the end.
  const travelerG=makeWarrior(),travelerM=new T.MeshStandardMaterial({color:0x443124,roughness:.9,metalness:.05,emissive:0x351004,emissiveIntensity:.15,transparent:true,opacity:0});
  const travelers=new T.InstancedMesh(travelerG,travelerM,quality==='low'?28:48);travelers.frustumCulled=false;travelers.name='Warriors within the vision of Time';root.add(travelers);
  const dummy=new T.Object3D();
  const glowM=new T.ShaderMaterial({uniforms:{uTime:time,uAmount:amount,uDread:dread},transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec2 vUv;uniform float uTime,uAmount,uDread;${noiseGLSL}void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float n=fbm(vec3(p*2.6,uTime*.023));float core=exp(-r*r*5.);float a=core*(.4+n*.6)*uDread*uAmount*.65;gl_FragColor=vec4(vec3(1.,.34+.2*n,.075)*core,a);}`});
  const blaze=new T.Mesh(new T.PlaneGeometry(33,30),glowM);blaze.position.set(0,25,35);root.add(blaze);
  let elapsed=0;
  function update(t,dt,animated=true){
    if(animated){elapsed=t;time.value=t;worldsList.forEach((o,i)=>{o.rotation.y=t*.012+i*.48;});}
    for(let i=0;i<travelers.count;i++){
      const f=(i/travelers.count+elapsed*.019)%1,side=i%2?1:-1,arc=Math.sin(f*Math.PI),end=Math.pow(f,1.25);
      dummy.position.set(side*(26*(1-end)+Math.sin(f*7+i)*arc*1.2),.3+end*25,5+end*30+i%3);
      dummy.rotation.set(0,side*.3,side*(-.12-arc*.3));
      const shrink=(1-T.MathUtils.smoothstep(f,.78,1))*.95;dummy.scale.setScalar(Math.max(.001,shrink));dummy.updateMatrix();travelers.setMatrixAt(i,dummy.matrix);
    }
    travelers.instanceMatrix.needsUpdate=true;
  }
  function setState(v,d){amount.value=T.MathUtils.clamp(v,0,1);dread.value=T.MathUtils.clamp(d,0,1);root.visible=v>.001;travelers.visible=d>.02;travelerM.opacity=d*.8;}
  setState(0,0);update(0,0,false);
  function bindFigure(figure){
    for(const m of [figure.metadata.materials.skin,figure.metadata.outerMaterials.skin]){
      const prior=m.onBeforeCompile,priorKey=m.customProgramCacheKey();
      m.onBeforeCompile=(shader,renderer)=>{
        prior.call(m,shader,renderer);
        shader.uniforms.uCosmicTime=time;shader.uniforms.uCosmicAmount=amount;shader.uniforms.uCosmicDread=dread;
        shader.vertexShader='varying vec3 vCosmicSkin;\n'+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvCosmicSkin=position;');
        shader.fragmentShader='varying vec3 vCosmicSkin;uniform float uCosmicTime,uCosmicAmount,uCosmicDread;\n'+noiseGLSL+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
          vec3 cp=vCosmicSkin;
          float chestMask=smoothstep(3.9,5.4,cp.y)*(1.-smoothstep(7.9,8.7,cp.y));
          float n=fbm(cp*1.5+vec3(0.,uCosmicTime*.008,0.));
          float veil=exp(-pow((n-.53)*12.,2.));
          vec3 cell=floor(cp*31.);vec3 fracCell=fract(cp*31.)-.5;
          float smallStar=step(.989,hash31(cell))*exp(-dot(fracCell,fracCell)*36.);
          vec3 astral=mix(vec3(.12,.22,.36),vec3(.4,.115,.028),uCosmicDread);
          totalEmissiveRadiance+=(astral*veil*.38+vec3(.72,.58,.34)*smallStar*.6)*chestMask*uCosmicAmount;
        `);
      };
      m.customProgramCacheKey=()=>priorKey+'-worlds-within-v1';m.needsUpdate=true;
    }
  }
  return {root,setState,update,bindFigure,metadata:{name:'Worlds within worlds',source:'Bhagavad Gita 11.7–32',starCount:count,worldCount:planetSpecs.length},
    dispose(){const gs=new Set(),ms=new Set();root.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material)ms.add(o.material);});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());}};
}

function makeWarrior(){
  const g=[],mat=new T.Matrix4();
  function add(source,pos,scale,rotation=[0,0,0]){const m=new T.Object3D();m.position.set(...pos);m.scale.set(...scale);m.rotation.set(...rotation);m.updateMatrix();const geo=source.toNonIndexed();geo.applyMatrix4(m.matrix);g.push(geo);source.dispose();}
  add(new T.SphereGeometry(1,10,7),[0,1.5,0],[.14,.18,.135]);
  add(new T.CapsuleGeometry(.18,.43,3,10),[0,1.05,0],[1,1,.64]);
  for(const s of [-1,1]){
    add(new T.CapsuleGeometry(.063,.54,3,8),[s*.11,.40,0],[1,1,1],[0,0,s*.055]);
    add(new T.CapsuleGeometry(.055,.42,3,8),[s*.22,1.02,0],[1,1,1],[0,0,s*.15]);
  }
  add(new T.SphereGeometry(1,12,8),[.26,1,.10],[.22,.27,.05]);
  const p=[],n=[];for(const s of g){p.push(...s.attributes.position.array);n.push(...s.attributes.normal.array);s.dispose();}
  const merged=new T.BufferGeometry();merged.setAttribute('position',new T.Float32BufferAttribute(p,3));merged.setAttribute('normal',new T.Float32BufferAttribute(n,3));merged.computeBoundingSphere();return merged;
}
