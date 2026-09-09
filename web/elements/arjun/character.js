import * as T from './vendor/three.module.min.js';
import {V,TAU,clamp,lerp,rnd,grain,mesh,ell,thread,surface,sweep,band,beads,ringPoints,skinGeometry,mergeStatic} from './geometry.js';
import {createBow} from './bow.js';

/** Reusable Arjun element. Units, orientation and seat height match Krishna v1. */
export async function createArjun(){
  const [bodyG,handG,gripG,footG]=await Promise.all(['body','hand','grip','foot'].map(skinGeometry));
  const root=new T.Group();root.name='Arjun';
  const fabric=grain('cloth'),metal=grain('gold');
  const M={
    skin:new T.MeshPhysicalMaterial({color:0x996749,roughness:.66,clearcoat:.02}),
    bronze:new T.MeshStandardMaterial({color:0xb48b4f,metalness:.77,roughness:.43,bumpMap:metal,bumpScale:.001}),
    darkBronze:new T.MeshStandardMaterial({color:0x5d452a,metalness:.70,roughness:.49}),
    edge:new T.MeshStandardMaterial({color:0xd4b572,metalness:.72,roughness:.36}),
    steel:new T.MeshStandardMaterial({color:0x717378,metalness:.83,roughness:.38}),
    leather:new T.MeshStandardMaterial({color:0x302421,roughness:.87,bumpMap:fabric,bumpScale:.0008}),
    red:new T.MeshPhysicalMaterial({color:0x5d1e2b,roughness:.75,sheen:1,sheenColor:0x96394b,sheenRoughness:.72,side:T.DoubleSide,bumpMap:fabric,bumpScale:.0012}),
    redLight:new T.MeshPhysicalMaterial({color:0x702939,roughness:.75,sheen:.85,sheenColor:0xa85866,sheenRoughness:.66,side:T.DoubleSide,bumpMap:fabric,bumpScale:.0012}),
    linen:new T.MeshPhysicalMaterial({color:0xc8b890,roughness:.86,sheen:.7,sheenColor:0xe1cf9f,sheenRoughness:.8,side:T.DoubleSide,bumpMap:fabric,bumpScale:.0013}),
    border:new T.MeshStandardMaterial({color:0x997247,metalness:.40,roughness:.57,side:T.DoubleSide}),
    ruby:new T.MeshPhysicalMaterial({color:0x591724,roughness:.23,metalness:.12,clearcoat:.7}),
    hair:new T.MeshStandardMaterial({color:0x1d1715,roughness:.72}),
    strand:new T.MeshStandardMaterial({color:0x3a2a21,roughness:.62}),
    wood:new T.MeshStandardMaterial({color:0x292526,roughness:.78}),
    feather:new T.MeshStandardMaterial({color:0xbfb8a5,roughness:.9,side:T.DoubleSide})
  };
  const skin=new T.SkinnedMesh(bodyG,M.skin);skin.castShadow=skin.receiveShadow=true;root.add(skin);
  const hip=V(0,1.17,0),R0=V(-.425,2.015,.005),R1=V(-.695,1.625,.20),R2=V(-.550,1.400,.590);
  const L0=V(.425,2.015,.005),L1=V(.55,1.57,.18),L2=V(.41,1.16,.48);
  const base=new T.Bone(),shoulder=new T.Bone(),elbow=new T.Bone(),wrist=new T.Bone(),neck=new T.Bone();
  base.name='Torso';shoulder.name='Bow shoulder';elbow.name='Bow elbow';wrist.name='Bow wrist';neck.name='Head';
  base.position.copy(hip);shoulder.position.copy(R0.clone().sub(hip));elbow.position.copy(R1.clone().sub(R0));wrist.position.copy(R2.clone().sub(R1));neck.position.copy(V(0,2.24,0).sub(hip));
  base.add(shoulder,neck);shoulder.add(elbow);elbow.add(wrist);skin.add(base);
  const skeleton=new T.Skeleton([base,shoulder,elbow,wrist,neck]);
  const pos=bodyG.attributes.position,weights=[],indices=[],p=V();
  function segment(p,a,b){const d=b.clone().sub(a),t=clamp(p.clone().sub(a).dot(d)/d.lengthSq(),0,1);return {t,d:p.distanceTo(a.clone().addScaledVector(d,t))};}
  for(let i=0;i<pos.count;i++){
    p.fromBufferAttribute(pos,i);let a=0,b=0,w=0;
    if(p.y>2.20){b=4;w=T.MathUtils.smoothstep(p.y,2.20,2.33);}
    else if(p.x<-.30){const u=segment(p,R0,R1),f=segment(p,R1,R2);
      if(f.d<u.d&&p.x<-.43){a=2;b=3;w=T.MathUtils.smoothstep(f.t,.80,1);if(f.t<.17){a=1;b=2;w=lerp(.5,1,f.t/.17);}}
      else{a=0;b=1;w=T.MathUtils.smoothstep(u.t,-.04,.28)*T.MathUtils.smoothstep(-p.x,.30,.46);if(u.t>.83){a=1;b=2;w=T.MathUtils.smoothstep(u.t,.83,1)*.5;}}
    }
    indices.push(a,b,0,0);weights.push(1-w,w,0,0);
  }
  bodyG.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));bodyG.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));skin.bind(skeleton);
  const still=new T.Group(),torso=new T.Group(),head=new T.Group(),upperArm=new T.Group(),forearm=new T.Group();root.add(still,torso,head,upperArm,forearm);
  const rightHand=mesh(gripG,M.skin,wrist);
  const leftHand=mesh(handG,M.skin,torso);leftHand.position.copy(L2);leftHand.rotation.set(2.15,.3,-.12);leftHand.scale.x=-1;

  // Curved cuirass, raised edging, rivets and relief. The front is a shaped shell.
  function armour(u,v){
    const a=u*TAU,top=2.018+.055*Math.abs(Math.sin(a))+.048*Math.max(0,-Math.cos(a)),y=lerp(1.315,top,v);
    const rx=.319+.118*Math.sin(v*Math.PI*.58),rz=.238+.060*Math.sin(v*Math.PI*.70);
    return [Math.sin(a)*rx,y,Math.cos(a)*rz-.015];
  }
  const shell=mesh(surface(armour,128,66),M.bronze,torso);shell.material.side=T.DoubleSide;
  for(const v of [0,.16,.31,.47,.63,1]){
    const pts=Array.from({length:101},(_,i)=>V(...armour(i/100,v)));
    thread(torso,v===1?M.edge:M.darkBronze,pts,v===1?.0065:.0042,130);
    if(v===0||v===1)beads(torso,M.edge,pts.filter((_,i)=>i%2===0),.0047);
  }
  // Engraving follows the curvature of the plate, rather than floating over it.
  for(let row=0;row<4;row++)for(let col=0;col<16;col++){
    const u=(col+(row%2)*.5)/16,v=.25+row*.135,pts=[];
    for(let j=0;j<=22;j++){const a=j/22*TAU,q=armour(u+.018*Math.sin(a),v+.032*Math.cos(a));q[0]*=1.006;q[2]=q[2]*1.007;pts.push(q);}
    thread(torso,M.darkBronze,pts,.00145,24);
    const p=V(...armour(u,v)).multiply(V(1.008,1,1.008));ell(torso,M.edge,p,[.0035,.0035,.0035]);
  }
  const medallion=ell(torso,M.darkBronze,V(0,1.905,.281),[.066,.075,.009]);
  band(torso,M.edge,V(0,1.905,.294),V(0,0,1),.055,.0037);
  for(let k=0;k<8;k++){const a=k/8*TAU,pts=[];for(let j=0;j<=26;j++){const q=j/26*TAU,r=.025+.014*Math.cos(q);pts.push([Math.sin(a)*r+Math.cos(a)*.009*Math.sin(q),1.905+Math.cos(a)*r-Math.sin(a)*.009*Math.sin(q),.304]);}thread(torso,M.edge,pts,.0018,28);}
  ell(torso,M.ruby,V(0,1.905,.31),[.012,.016,.005]);

  function pauldron(group,c){
    for(let layer=0;layer<3;layer++){
      const lo=layer===0?.015:1.18+(layer-1)*.25,hi=layer===0?1.43:1.65+(layer-1)*.24;
      const fn=(u,v)=>{const a=u*TAU,t=lerp(lo,hi,v),r=.196+layer*.005;
        return [c.x+Math.sin(a)*Math.sin(t)*r,c.y+Math.cos(t)*.191-layer*.009,c.z+Math.cos(a)*Math.sin(t)*(.189+layer*.005)+layer*.008];};
      mesh(surface(fn,72,30),layer===0?M.bronze:M.darkBronze,group);
      const edge=Array.from({length:89},(_,i)=>V(...fn(i/88,1)));thread(group,M.edge,edge,.0042,96);
      if(layer===0){
        beads(group,M.edge,edge.filter((_,i)=>i%4===0),.0045);
        for(let k=0;k<12;k++)thread(group,M.darkBronze,Array.from({length:24},(_,i)=>{const p=V(...fn(k/12,lerp(.2,.93,i/23)));return p.add(p.clone().sub(c).normalize().multiplyScalar(.0015));}),.0017,26);
      }
    }
  }
  pauldron(upperArm,R0.clone().add(V(-.009,.02,.003)));pauldron(torso,L0.clone().add(V(.009,.02,.003)));
  function bracer(group,a,b){const c=a.clone().lerp(b,.70),axis=b.clone().sub(a).normalize();
    const g=mesh(new T.CylinderGeometry(.078,.050,.24,42,8,true),M.darkBronze,group);g.position.copy(c);g.quaternion.setFromUnitVectors(V(0,1,0),axis.clone().negate());
    for(const k of [-1,1])band(group,M.edge,c.clone().addScaledVector(axis,k*.12),axis,k>0?.053:.080,.005);
    const front=c.clone().add(V(0,0,.067));ell(group,M.bronze,front,[.031,.082,.012]);
    for(let i=0;i<5;i++)ell(group,M.edge,front.clone().add(V(0,(i-2)*.027,.013)),[.0025,.0025,.0025]);
  }
  bracer(forearm,R1,R2);bracer(torso,L1,L2);
  // A leather baldric supports the quiver on his back.
  const baldric=(u,v)=>{const x=lerp(-.325,.22,v)+(u-.5)*.077,y=lerp(2.075,1.33,v);return [x,y,.296-.08*Math.abs(x)/.44];};
  mesh(surface(baldric,10,80),M.leather,torso);
  for(const edge of [.04,.96])thread(torso,M.edge,Array.from({length:70},(_,i)=>baldric(edge,i/69)),.00135,80);
  ell(torso,M.darkBronze,V(-.122,1.80,.288),[.047,.06,.010]);
  const buckle=new T.Mesh(new T.TorusGeometry(.037,.005,8,40),M.edge);buckle.position.set(-.122,1.80,.3);buckle.scale.y=1.3;torso.add(buckle);

  const quiver=new T.Group();torso.add(quiver);quiver.position.set(.255,1.755,-.492);quiver.rotation.set(.13,0,-.28);
  const tube=mesh(new T.CylinderGeometry(.096,.074,.68,40,8,true),M.leather,quiver);
  for(const y of [-.315,.315])band(quiver,M.bronze,V(0,y,0),V(0,1,0),y>0?.097:.075,.008);
  for(let k=0;k<5;k++){
    const x=(k-2)*.028,z=(k%2)*.035-.018,h=.62+(k%3)*.048;
    thread(quiver,M.wood,[[x,-.10,z],[x,h,z]],.0035,3);
    for(let side=0;side<3;side++){
      const a=side/3*TAU;mesh(surface((u,v)=>[x+Math.cos(a)*Math.sin(v*Math.PI)*u*.029,lerp(h-.17,h-.025,v),z+Math.sin(a)*Math.sin(v*Math.PI)*u*.029],4,16),M.feather,quiver);
    }
    ell(quiver,M.edge,V(x,h,z),[.005,.012,.005]);
  }

  // Cream dhoti and a burgundy waist wrap; the underlying seated posture matches Krishna.
  const legR=t=>t<.38?lerp(.192,.167,t/.38):lerp(.167,.068,(t-.38)/.62);
  for(const sign of [-1,1])sweep(still,M.linen,[[sign*.15,1.12,.005],[sign*.30,1.10,.25],[sign*.39,.98,.49],[sign*.39,.64,.55],[sign*.33,.235,.57]],legR,{fold:.010,ellipse:.92,segments:84});
  mesh(surface((u,v)=>{const side=u*2-1,w=lerp(.26,.39,v);return [side*w,1.29-.29*v-.07*Math.sin(u*Math.PI)*Math.sin(v*Math.PI)+.013*Math.cos(u*TAU*7+v*4)*v,.05+.57*v];},64,60),M.red,still);
  mesh(surface((u,v)=>{const a=u*TAU;return [Math.sin(a)*(.315+.007*Math.cos(a*24)),lerp(1.20,1.335,v),Math.cos(a)*.246];},96,20),M.red,still);
  for(const y of [1.246,1.296]){const pts=Array.from({length:85},(_,i)=>{const a=i/84*TAU;return [Math.sin(a)*.323,y,Math.cos(a)*.251];});thread(still,M.edge,pts,.005,90);}
  ell(still,M.bronze,V(0,1.27,.269),[.058,.047,.014]);ell(still,M.ruby,V(0,1.27,.286),[.022,.027,.006]);
  const apron=(u,v)=>{const x=(u-.5)*lerp(.22,.29,v),y=lerp(1.235,.24,v)+.018*Math.sin(u*TAU),z=.25+.457*T.MathUtils.smoothstep(v,0,.27)-.025*T.MathUtils.smoothstep(v,.55,1)+.016*Math.cos(u*TAU*6+v*2);return [x,y,z];};
  mesh(surface(apron,50,80),M.redLight,still);
  for(const edge of [.03,.97]){mesh(surface((u,v)=>apron(edge+(u-.5)*.055,v),5,80),M.border,still);beads(still,M.edge,Array.from({length:67},(_,i)=>V(...apron(edge,i/66)).add(V(0,0,.004))),.0024);}
  for(const sign of [-1,1]){
    const foot=mesh(footG.clone(),M.skin,still);foot.position.set(sign*.33,.158,.65);foot.rotation.y=sign*.13;
    const sole=ell(still,M.leather,V(sign*.33,.134,.67),[.084,.014,.191]);
    thread(still,M.leather,[[sign*.33-.064,.17,.68],[sign*.33-.035,.22,.70],[sign*.33+.035,.22,.70],[sign*.33+.064,.17,.68]],.016,20);
  }

  // A shaped shoulder line wraps around the cuirass, then falls behind the seat.
  // Positive Z faces the body: keep every fold outside the back of its silhouette.
  const capeFn=(u,v)=>{
    const side=u*2-1,spread=T.MathUtils.smoothstep(v,0,.72);
    const w=.83+.22*spread-.06*T.MathUtils.smoothstep(v,.75,1),x=side*w*.5;
    const shoulderY=2.11-.085*(1-side*side),hemY=.51+.075*Math.pow(Math.abs(side),1.6);
    const y=lerp(shoulderY,hemY,v);
    const shoulderZ=-.342+.164*side*side;
    const backZ=lerp(shoulderZ,-.451+.052*side*side,T.MathUtils.smoothstep(v,0,.66));
    const folds=(.019*Math.cos(u*TAU*4+.24*Math.sin(v*Math.PI))+.006*Math.sin(u*TAU*7-v*.7))*Math.sin(Math.min(1,v*2.4)*Math.PI*.5);
    return [x,y,backZ+folds];
  };
  const capeGroup=new T.Group();capeGroup.name='Fitted cape';torso.add(capeGroup);
  const flex=[];
  function clothPiece(fn,nu,nv,mat,name){
    const part=mesh(surface(fn,nu,nv),mat,capeGroup);part.name=name;part.userData.flex=true;
    part.geometry.attributes.position.setUsage(T.DynamicDrawUsage);
    part.geometry.attributes.normal.setUsage(T.DynamicDrawUsage);
    // The small motion stays inside these precomputed culling bounds.
    part.geometry.computeBoundingSphere();part.geometry.boundingSphere.radius+=.01;
    flex.push({mesh:part,original:Float32Array.from(part.geometry.attributes.position.array)});return part;
  }
  clothPiece(capeFn,72,90,M.red,'Cape cloth');
  // Offset the embroidery from the cloth so it cannot flicker against it.
  for(const edge of [.016,.984])clothPiece((u,v)=>{const p=capeFn(edge+(u-.5)*.021,v);p[2]-=.003;return p;},4,90,M.border,'Cape side embroidery');
  clothPiece((u,v)=>{const p=capeFn(u,lerp(.989,.998,v));p[2]-=.003;return p;},72,3,M.border,'Cape hem');
  for(const side of [-1,1])ell(torso,M.darkBronze,V(side*.411,2.111,-.194),[.022,.019,.008]);

  // Tied hair, smooth hairline and a restrained warrior's headband.
  mesh(surface((u,v)=>{const a=u*TAU,theta=.05+v*(Math.cos(a)>.30?.98:2.50);return [.204*Math.sin(theta)*Math.sin(a),2.56+.286*Math.cos(theta),-.018+.193*Math.sin(theta)*Math.cos(a)];},96,64),M.hair,head);
  mesh(surface((u,v)=>{const a=1.18+u*(TAU-2.36),r=.204+.025*Math.sin(v*Math.PI)+.006*Math.sin(a*24+v*5);return [Math.sin(a)*r,lerp(2.68,2.30,v)+.018*Math.sin(a*4)*v,Math.cos(a)*r-.04];},74,54),M.hair,head);
  for(let i=0;i<42;i++){
    const a=i/42*TAU,pts=[];
    for(let j=0;j<=11;j++){const t=j/11,theta=lerp(.87,.1,t),aa=a+.4*t;pts.push([Math.sin(aa)*Math.sin(theta)*.21,2.57+Math.cos(theta)*.279,Math.cos(aa)*Math.sin(theta)*.195-.019]);}
    thread(head,i%4===0?M.strand:M.hair,pts,i%4===0?.0012:.0032,28);
  }
  ell(head,M.hair,V(.014,2.868,-.065),[.113,.101,.109]);
  for(let k=0;k<11;k++){
    const pts=[];for(let j=0;j<=60;j++){const a=j/60*TAU,r=.106*Math.sin((k+1)/12*Math.PI);pts.push([.014+Math.cos(a)*r,2.795+k*.013+.008*Math.sin(a*3+k),-.065+Math.sin(a)*r]);}thread(head,k%3?M.hair:M.strand,pts,k%3?.004:.0018,62);
  }
  for(const side of [-1,1]){
    thread(head,M.hair,[[side*.17,2.65,.08],[side*.214,2.54,.007],[side*.211,2.40,-.008],[side*.185,2.31,-.015]],.015,35);
    band(head,M.bronze,V(side*.208,2.387,.011),V(0,0,1),.024,.0045);
  }
  const bandPts=Array.from({length:100},(_,i)=>{const a=i/99*TAU;return V(Math.sin(a)*.200,2.686-.022*Math.cos(a),Math.cos(a)*.184-.009);});
  thread(head,M.bronze,bandPts,.014,110);
  thread(head,M.edge,bandPts.map(p=>p.clone().add(V(0,.013,0))),.0026,110);
  ell(head,M.bronze,V(0,2.666,.19),[.036,.027,.01]);ell(head,M.ruby,V(0,2.666,.203),[.014,.017,.005]);

  const seatGroup=new T.Group();seatGroup.name='Detachable seat';root.add(seatGroup);
  const seat=mesh(new T.CylinderGeometry(.53,.50,.17,80),M.wood,seatGroup);seat.position.set(0,.733,.035);seat.scale.z=.74;
  ell(seatGroup,M.red,V(0,.86,.035),[.505,.095,.355]);
  for(const y of [.66,.796]){const r=band(seatGroup,M.darkBronze,V(0,y,.035),V(0,1,0),.515,.007);r.scale.y=.74;}

  // The independent bow sits inside the closed palm. Its long axis crosses local X.
  const bow=createBow();wrist.add(bow.root);bow.root.position.set(0,.109,.044);bow.root.rotation.z=-Math.PI/2;
  mergeStatic(still);mergeStatic(torso);mergeStatic(head);mergeStatic(upperArm);mergeStatic(forearm);mergeStatic(seatGroup);
  root.updateMatrixWorld(true);base.attach(torso);neck.attach(head);shoulder.attach(upperArm);elbow.attach(forearm);

  const bindUpper=R1.clone().sub(R0),bindLower=R2.clone().sub(R1),l1=bindUpper.length(),l2=bindLower.length();
  const d0=R2.clone().sub(R0).normalize(),poleRef=bindUpper.clone().addScaledVector(d0,-bindUpper.dot(d0)).normalize();
  const qUpper=new T.Quaternion(),qLower=new T.Quaternion(),qHand=new T.Quaternion(),axisZ=V(0,0,1);
  let down=0,targetDown=0;
  const api={
    root,bow:bow.root,seat:seatGroup,cape:capeGroup,materials:M,
    setBowDown(value){targetDown=value?1:0;},
    getPose(){return {bowDown:down,targetDown};},
    update(time,dt,animated=true){
      if(!animated)return;
      down=lerp(down,targetDown,1-Math.exp(-dt*1.65));
      const goal=R2.clone().lerp(V(-.26,1.245,.590),down);
      const dir=goal.clone().sub(R0),distance=clamp(dir.length(),.06,l1+l2-.003);dir.normalize();
      const pole=poleRef.clone().addScaledVector(dir,-poleRef.dot(dir)).normalize();
      const along=(l1*l1-l2*l2+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,l1*l1-along*along));
      const joint=R0.clone().addScaledVector(dir,along).addScaledVector(pole,height);
      qUpper.setFromUnitVectors(bindUpper.clone().normalize(),joint.clone().sub(R0).normalize());
      qLower.setFromUnitVectors(bindLower.clone().normalize(),goal.clone().sub(joint).normalize());
      shoulder.quaternion.copy(qUpper);elbow.quaternion.copy(qUpper).invert().multiply(qLower);
      qHand.setFromAxisAngle(axisZ,Math.PI/2*(1-down));wrist.quaternion.copy(qLower).invert().multiply(qHand);
      base.rotation.x=.050*down+.003*Math.sin(time*1.25);base.rotation.z=-.008*down;
      neck.rotation.x=.17*down+.007*Math.sin(time*.65);neck.rotation.y=-.04+Math.sin(time*.33)*.021;neck.rotation.z=.015*down;
      for(const f of flex){
        const g=f.mesh.geometry,a=g.attributes.position;
        for(let i=0;i<a.count;i++){
          const y=f.original[i*3+1],amount=clamp((1.87-y)/1.36,0,1)**2;
          a.setZ(i,f.original[i*3+2]+Math.sin(time*.72+f.original[i*3]*3)*.006*amount);
        }
        a.needsUpdate=true;g.computeVertexNormals();
      }
    }
  };
  api.update(0,1/60,true);
  return api;
}
