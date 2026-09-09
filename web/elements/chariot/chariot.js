import * as T from './vendor/three.module.min.js';
import {V,TAU,lerp,clamp,grain,mesh,ell,curve,thread,sweep,band,beads,surface,mergeStatic} from './geometry.js';

/** Independent Geeta chariot. Y up, forward +Z, wheels touch Y=0. */
export function createChariot(){
  const root=new T.Group();root.name='Geeta chariot';
  const body=new T.Group();body.name='Carriage';root.add(body);
  const metalGrain=grain('gold'),clothGrain=grain('cloth');
  const M={
    wood:new T.MeshStandardMaterial({color:0x4b2819,roughness:.49,metalness:.03,bumpMap:woodGrain(),bumpScale:.004}),
    darkWood:new T.MeshStandardMaterial({color:0x231510,roughness:.64,bumpMap:woodGrain(),bumpScale:.003}),
    floor:new T.MeshStandardMaterial({color:0x795033,roughness:.65,bumpMap:woodGrain(),bumpScale:.002}),
    bronze:new T.MeshStandardMaterial({color:0x9d713a,roughness:.41,metalness:.78,bumpMap:metalGrain,bumpScale:.0008}),
    gold:new T.MeshStandardMaterial({color:0xc7a263,roughness:.36,metalness:.76}),
    darkGold:new T.MeshStandardMaterial({color:0x594227,roughness:.47,metalness:.72}),
    iron:new T.MeshStandardMaterial({color:0x39302a,roughness:.54,metalness:.75}),
    leather:new T.MeshStandardMaterial({color:0x261c16,roughness:.85,bumpMap:clothGrain,bumpScale:.001}),
    saffron:new T.MeshPhysicalMaterial({color:0xad491e,roughness:.82,sheen:.8,sheenColor:0xd98238,sheenRoughness:.8,side:T.DoubleSide,bumpMap:clothGrain,bumpScale:.001}),
    burgundy:new T.MeshPhysicalMaterial({color:0x621f2c,roughness:.81,sheen:.8,sheenColor:0x983d4f,sheenRoughness:.8,bumpMap:clothGrain,bumpScale:.001}),
    embroidery:new T.MeshStandardMaterial({color:0xc09855,roughness:.63,metalness:.28,side:T.DoubleSide}),
    blue:new T.MeshPhysicalMaterial({color:0x173544,roughness:.24,metalness:.16,clearcoat:.6})
  };
  function woodGrain(){
    const n=256,data=new Uint8Array(n*n*4);
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){
      const drift=2.4*Math.sin(y*.045)+.8*Math.sin(y*.115),s=Math.sin((x+drift)*.79);
      const q=150+30*s+12*Math.sin(x*2.7+y*.02)+8*Math.sin(x*8.41+y*3.77),k=(y*n+x)*4;
      data[k]=data[k+1]=data[k+2]=q;data[k+3]=255;
    }
    const t=new T.DataTexture(data,n,n);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(2,2);
    t.generateMipmaps=true;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.anisotropy=4;t.needsUpdate=true;return t;
  }
  function cylinder(parent,mat,a,b,r1,r2=r1,segments=40){
    const d=b.clone().sub(a),o=mesh(new T.CylinderGeometry(r2,r1,d.length(),segments),mat,parent);
    o.position.copy(a).lerp(b,.5);o.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());return o;
  }
  function block(parent,mat,c,size,r=.018){
    const [w,h,d]=size,s=new T.Shape(),x=-w/2,z=-d/2;
    s.moveTo(x+r,z);s.lineTo(-x-r,z);s.quadraticCurveTo(-x,z,-x,z+r);
    s.lineTo(-x,-z-r);s.quadraticCurveTo(-x,-z,-x-r,-z);
    s.lineTo(x+r,-z);s.quadraticCurveTo(x,-z,x,-z-r);
    s.lineTo(x,z+r);s.quadraticCurveTo(x,z,x+r,z);
    const bevel=Math.min(.012,r*.25,h*.16);
    const g=new T.ExtrudeGeometry(s,{depth:h,steps:1,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:3,curveSegments:8});
    g.rotateX(Math.PI/2);g.translate(0,h/2,0);
    const o=mesh(g,mat,parent);o.position.copy(c);return o;
  }
  function lathe(parent,mat,profile,c,axis=V(0,1,0),segments=72){
    const g=new T.LatheGeometry(profile.map(p=>new T.Vector2(...p)),segments),o=mesh(g,mat,parent);
    o.position.copy(c);o.quaternion.setFromUnitVectors(V(0,1,0),axis);return o;
  }
  const deckHeights={krishna:1.28,arjun:2.08},wheelRadius=1.50;
  const sections={driver:new T.Group(),warrior:new T.Group()};
  sections.driver.name='Lower charioteer compartment';sections.warrior.name='Raised warrior platform';
  root.add(sections.driver,sections.warrior);
  const rear=sections.warrior,front=sections.driver;
  function plankedDeck(group,width,length,centreZ,top){
    // Keep the structural deck below the visible boards, not coplanar with them.
    block(group,M.darkWood,V(0,top-.145,centreZ),[width,.216,length],.20);
    block(group,M.bronze,V(0,top-.185,centreZ),[width+.035,.040,length+.025],.20);
    const count=Math.round((width-.30)/.19),spacing=(width-.30)/count;
    for(let i=0;i<count;i++)block(group,M.floor,V((i-(count-1)/2)*spacing,top-.020,centreZ),[spacing-.006,.030,length-.29],.025);
  }
  // A generous rear war deck, and a genuinely separate, lower driver's box.
  plankedDeck(rear,3.58,3.34,-1.26,deckHeights.arjun);
  plankedDeck(front,2.64,2.24,1.55,deckHeights.krishna);
  for(const sign of [-1,1]){
    sweep(body,M.darkWood,[[sign*.91,1.74,-2.63],[sign*.91,1.73,-.42],[sign*.84,1.12,.66],[sign*.80,1.04,2.51]],.105,{segments:60,sides:20,ellipse:.85});
    cylinder(body,M.iron,V(sign*1.13,1.50,-1.20),V(sign*1.13,1.92,-1.20),.090);
    band(body,M.bronze,V(sign*1.13,1.50,-1.20),V(1,0,0),.145,.024);
  }
  cylinder(body,M.iron,V(-2.24,1.50,-1.20),V(2.24,1.50,-1.20),.115);

  function carvedShell(group,points,bottom,topFn,outwardSign=1,panelCount=13){
    const outline=curve(points);
    function frame(u){const p=outline.getPointAt(u),t=outline.getTangentAt(u),n=V(-t.z,0,t.x).normalize().multiplyScalar(outwardSign);return {p,t,n};}
    function panel(u,v,offset=0){const {p,n}=frame(u);p.y=lerp(bottom,topFn(u),v);p.addScaledVector(n,offset+.024*Math.sin(v*Math.PI));return p;}
    for(const side of [-1,1]){const wall=mesh(surface((u,v)=>panel(u,v,side*.050).toArray(),192,28),side===1?M.wood:M.darkWood,group);wall.material.side=T.DoubleSide;}
    for(const v of [0,.09,.91,1])thread(group,v===0||v===1?M.bronze:M.darkGold,Array.from({length:181},(_,i)=>panel(i/180,v,v===0||v===1?0:.058)),v===1?.052:v===0?.034:.012,200);
    for(const v of [0,1])mesh(surface((u,w)=>panel(u,v,lerp(-.05,.05,w)).toArray(),192,3),M.wood,group);
    for(const u of [0,1])thread(group,M.bronze,Array.from({length:21},(_,j)=>panel(u,j/20)),.047,28);
    const rivets=[];
    for(let i=0;i<=80;i++)for(const v of [.13,.87])rivets.push(panel(i/80,v,.065));
    beads(group,M.gold,rivets,.009);
    for(let i=0;i<panelCount;i++){
      const u=(i+.5)/panelCount,{t,n}=frame(u);
      rosette(group,panel(u,.49,.065),t,V(0,1,0),n,Math.min(.185,(topFn(u)-bottom)*.225),8);
      for(const edge of [-1,1])thread(group,M.darkGold,Array.from({length:22},(_,j)=>panel((i+.5+edge*.47)/panelCount,.19+j/21*.60,.064)),.0065,24);
    }
    for(const u of [0,.25,.75,1])lathe(group,M.bronze,[[.04,0],[.068,.018],[.051,.061],[.033,.095],[.081,.123],[.077,.16],[.042,.187],[0,.222]],panel(u,1));
    return {panel,frame};
  }
  // Tall rear enclosure; the opening faces the driver's lower compartment.
  carvedShell(rear,[[-1.69,0,.34],[-1.79,0,-.30],[-1.80,0,-1.88],[-1.48,0,-2.69],[0,0,-2.91],[1.48,0,-2.69],[1.80,0,-1.88],[1.79,0,-.30],[1.69,0,.34]],2.09,u=>2.99+.21*Math.sin(u*Math.PI)**4,-1,15);
  // A lower, rounded bow and side walls define the charioteer's own bay.
  carvedShell(front,[[-1.18,0,.58],[-1.33,0,1.02],[-1.32,0,2.10],[-.92,0,2.63],[0,0,2.76],[.92,0,2.63],[1.32,0,2.10],[1.33,0,1.02],[1.18,0,.58]],1.30,u=>1.96+.105*Math.sin(u*Math.PI)**4,1,9);
  // The raised front fascia makes the change of level visible even from outside.
  block(rear,M.wood,V(0,1.77,.32),[3.33,.57,.11],.035);
  for(const y of [1.52,2.045])thread(rear,M.bronze,[[-1.65,y,.395],[0,y,.395],[1.65,y,.395]],.018,35);
  for(const x of [-1.15,-.57,0,.57,1.15])rosette(rear,V(x,1.775,.388),V(1,0,0),V(0,1,0),V(0,0,1),.132,8);
  // A central opening and three treads connect the two working sections.
  for(const [y,z] of [[1.48,.99],[1.68,.74],[1.88,.49]]){
    block(body,M.wood,V(0,y-.053,z),[.75,.095,.27],.035);
    thread(body,M.bronze,[[-.36,y+.003,z+.115],[0,y+.003,z+.115],[.36,y+.003,z+.115]],.009,16);
  }
  for(const sign of [-1,1]){
    cylinder(body,M.darkWood,V(sign*.28,1.31,1.10),V(sign*.28,1.96,.26),.035);
    // Carved shoulders flank the entry to the upper deck.
    sweep(rear,M.wood,[[sign*1.67,2.99,.32],[sign*1.04,2.83,.31],[sign*.53,2.45,.33]],.050,{segments:38,sides:18});
    thread(rear,M.bronze,[[sign*1.67,3.02,.32],[sign*1.04,2.86,.31],[sign*.53,2.48,.33]],.009,38);
    lathe(rear,M.bronze,[[.050,0],[.066,.028],[.038,.08],[.028,.40],[.066,.44],[.057,.49],[0,.56]],V(sign*.53,2.08,.33));
  }
  // Outside footholds are part of the charioteer's low section.
  for(const sign of [-1,1]){
    block(front,M.wood,V(sign*1.43,.72,1.13),[.30,.08,.54],.055);
    cylinder(front,M.iron,V(sign*1.37,.73,1.13),V(sign*1.13,1.15,1.13),.035);
  }

  function rosette(parent,centre,right,up,normal,radius,petals=8){
    band(parent,M.darkGold,centre,normal,radius*1.04,.007);
    band(parent,M.bronze,centre.clone().addScaledVector(normal,.007),normal,radius*.90,.004);
    for(let k=0;k<petals;k++){
      const a=k/petals*TAU,pts=[];
      for(let j=0;j<=24;j++){
        const q=j/24*TAU,r=radius*(.49+.29*Math.cos(q)),w=radius*.15*Math.sin(q);
        pts.push(centre.clone().addScaledVector(right,Math.sin(a)*r+Math.cos(a)*w).addScaledVector(up,Math.cos(a)*r-Math.sin(a)*w).addScaledVector(normal,.010));
      }
      thread(parent,M.bronze,pts,.0034,26);
    }
    const jewel=ell(parent,M.blue,centre.clone().addScaledVector(normal,.016),[radius*.14,radius*.14,.012]);
    jewel.quaternion.setFromUnitVectors(V(0,0,1),normal);
  }
  const wheels=[];
  for(const sign of [-1,1]){
    const wheel=new T.Group();wheel.name=sign<0?'Left wheel':'Right wheel';root.add(wheel);wheel.position.set(sign*2.06,wheelRadius,-1.20);wheel.scale.setScalar(wheelRadius/1.10);wheels.push(wheel);
    const axis=V(1,0,0);
    lathe(wheel,M.wood,[[.940,-.091],[1.060,-.106],[1.084,-.075],[1.084,.075],[1.060,.106],[.940,.091],[.940,-.091]],V(),axis,112);
    lathe(wheel,M.iron,[[1.079,-.074],[1.100,-.067],[1.100,.067],[1.079,.074],[1.079,-.074]],V(),axis,112);
    for(const x of [-.108,.108])band(wheel,M.bronze,V(x,0,0),axis,1.025,.017);
    for(let k=0;k<12;k++){
      const a=k/12*TAU,radial=V(0,Math.sin(a),Math.cos(a));
      const pts=[.18,.33,.64,.965].map((r,i)=>radial.clone().multiplyScalar(r).add(V(i===2?sign*.014:0,0,0)));
      sweep(wheel,M.wood,pts,t=>lerp(.055,.039,t),{segments:18,sides:14,ellipse:.83});
      for(const r of [.285,.913])band(wheel,M.bronze,radial.clone().multiplyScalar(r),radial,r<.5?.052:.042,.009);
      thread(wheel,M.gold,[.35,.56,.83].map(r=>radial.clone().multiplyScalar(r).add(V(sign*.048,0,0))),.0035,16);
    }
    lathe(wheel,M.darkWood,[[0,-.19],[.165,-.19],[.202,-.13],[.210,.13],[.165,.22],[0,.22]],V(),axis,64);
    for(const x of [-.145,.145])band(wheel,M.bronze,V(x,0,0),axis,.208,.019);
    cylinder(wheel,M.bronze,V(sign*.15,0,0),V(sign*.266,0,0),.154,.128);
    rosette(wheel,V(sign*.27,0,0),V(0,0,sign),V(0,1,0),V(sign,0,0),.108,8);
    const studs=[];
    for(let i=0;i<36;i++){const a=i/36*TAU;studs.push(V(sign*.128,Math.sin(a)*1.025,Math.cos(a)*1.025));}
    beads(wheel,M.gold,studs,.010);
    mergeStatic(wheel);
  }

  // The driver is centred ahead of the warrior, on a lower working floor.
  const mounts={},seats={},supports={};
  for(const [name,z,material] of [['krishna',1.64,M.saffron],['arjun',-1.47,M.burgundy]]){
    const anchor=new T.Group();anchor.name=name+' mount';anchor.position.set(0,deckHeights[name]-.12,z);root.add(anchor);mounts[name]=anchor;
    const support=new T.Group();support.name=name+' seat support';root.add(support);support.position.copy(anchor.position);supports[name]=support;
    // A broad dais replaces the two matching stools of the first study.
    block(support,M.wood,V(0,.37,.035),[1.04,.50,.66],.075);
    block(support,M.bronze,V(0,.625,.035),[1.10,.045,.71],.066);
    for(const x of [-.43,.43])for(const zz of [-.24,.31])lathe(support,M.bronze,[[.038,0],[.055,.025],[.039,.07],[.030,.43],[.045,.49],[.039,.53]],V(x,.12,zz));
    const seat=new T.Group();seat.name=name+' removable cushion';root.add(seat);seat.position.copy(anchor.position);seats[name]=seat;
    block(seat,M.wood,V(0,.73,.035),[1.13,.17,.81],.10);
    ell(seat,material,V(0,.86,.035),[.545,.10,.38]);
    const piping=Array.from({length:91},(_,i)=>{const a=i/90*TAU;return [Math.sin(a)*.53,.873,Math.cos(a)*.363+.035];});thread(seat,M.embroidery,piping,.006,100);
    mergeStatic(seat);mergeStatic(support);
  }

  // Draw pole and detachable four-place yoke; horses are a later saved element.
  const drawbar=new T.Group();drawbar.name='Draw pole and yoke';root.add(drawbar);
  sweep(drawbar,M.wood,[[0,1.04,-.64],[0,1.02,1.65],[0,1.08,3.10],[0,1.12,4.94]],t=>lerp(.125,.081,t),{segments:86,sides:26,ellipse:.82});
  for(const z of [1.10,2.05,3.28,4.65])band(drawbar,M.bronze,V(0,z>2.5?1.105:1.03,z),V(0,0,1),z>2.5?.088:.125,.015);
  for(const sign of [-1,1])sweep(drawbar,M.darkWood,[[sign*.86,1.10,1.80],[sign*.46,1.07,2.63],[0,1.09,3.23]],.049,{segments:42,sides:18});
  mergeStatic(drawbar);
  const yoke=new T.Group();yoke.name='Four horse yoke';drawbar.add(yoke);yoke.position.set(0,1.13,4.95);
  sweep(yoke,M.wood,[[-1.98,-.02,0],[-1.43,.055,.02],[0,0,0],[1.43,.055,.02],[1.98,-.02,0]],.055,{segments:80,sides:20});
  const harnessMounts=[];
  for(const x of [-1.59,-.53,.53,1.59]){
    band(yoke,M.bronze,V(x,.035,0),V(1,0,0),.059,.012);
    band(yoke,M.leather,V(x,-.076,0),V(0,0,1),.102,.016);
    const anchor=new T.Group();anchor.position.set(x,-.08,0);anchor.name='Harness '+(harnessMounts.length+1);yoke.add(anchor);harnessMounts.push(anchor);
  }
  mergeStatic(yoke);

  // A domed chhatri gives the raised rear deck its own architectural silhouette.
  const canopy=new T.Group();canopy.name='Warrior deck canopy';root.add(canopy);
  for(const x of [-1.53,1.53])for(const z of [-2.39,.02]){
    lathe(canopy,M.wood,[[.105,0],[.12,.06],[.105,.19],[.073,.30],[.070,2.69],[.100,2.79],[.126,2.89],[.105,2.99],[.12,3.16],[.12,3.38]],V(x,2.08,z));
    for(const y of [2.15,2.33,4.88,5.10,5.34])band(canopy,M.bronze,V(x,y,z),V(0,1,0),y<2.4?.116:.110,.017);
    lathe(canopy,M.bronze,[[.108,0],[.166,.028],[.172,.085],[.122,.145],[.10,.21]],V(x,5.25,z));
  }
  for(const z of [-2.39,.02]){
    sweep(canopy,M.wood,[[-1.53,4.79,z],[-1.19,5.13,z],[0,5.37,z],[1.19,5.13,z],[1.53,4.79,z]],.066,{segments:80,sides:20});
    thread(canopy,M.bronze,[[-1.53,4.82,z+.045],[-1.19,5.16,z+.045],[0,5.40,z+.045],[1.19,5.16,z+.045],[1.53,4.82,z+.045]],.010,80);
  }
  for(const x of [-1.53,1.53])sweep(canopy,M.wood,[[x,4.89,-2.39],[x,5.30,-1.90],[x,5.40,-1.19],[x,5.30,-.48],[x,4.89,.02]],.058,{segments:72,sides:18});
  function roof(u,v){const a=u*TAU,r=v;return [Math.sin(a)*1.98*r,5.47+.75*(1-r*r)**.70, -1.19+Math.cos(a)*1.81*r];}
  const roofMat=M.bronze.clone();roofMat.side=T.DoubleSide;roofMat.roughness=.46;
  mesh(surface(roof,144,44),roofMat,canopy);
  // A wooden soffit joins the dome to its capitals and arched supporting beams.
  mesh(surface((u,v)=>[Math.sin(u*TAU)*1.98*v,5.445,-1.19+Math.cos(u*TAU)*1.81*v],120,8),M.darkWood,canopy);
  for(const radius of [.54,1.27,1.74]){
    const ring=band(canopy,M.bronze,V(0,5.432,-1.19),V(0,1,0),radius,.010);ring.scale.y=1.81/1.98;
  }
  rosette(canopy,V(0,5.428,-1.19),V(1,0,0),V(0,0,1),V(0,-1,0),.285,12);
  for(const v of [.41,.72,.97,1])thread(canopy,M.darkGold,Array.from({length:129},(_,i)=>V(...roof(i/128,v)).add(V(0,.011,0))),v===1?.038:.009,150);
  for(let i=0;i<24;i++)thread(canopy,M.gold,Array.from({length:48},(_,j)=>V(...roof(i/24,lerp(.08,.99,j/47))).add(V(0,.011,0))),.0055,55);
  // A scalloped valance and small suspended bells finish the eaves.
  mesh(surface((u,v)=>{const a=u*TAU;return [Math.sin(a)*1.976,5.47-v*(.135+.045*(1+Math.cos(a*24))*.5),-1.19+Math.cos(a)*1.806];},192,6),M.burgundy,canopy).material.side=T.DoubleSide;
  thread(canopy,M.gold,Array.from({length:193},(_,i)=>{const a=i/192*TAU;return [Math.sin(a)*1.982,5.335-.045*(1+Math.cos(a*24))*.5,-1.19+Math.cos(a)*1.812];}),.007,220);
  for(let i=0;i<24;i++){
    const a=i/24*TAU,c=V(Math.sin(a)*1.98,5.23,-1.19+Math.cos(a)*1.81);
    thread(canopy,M.darkGold,[c.clone().add(V(0,.065,0)),c],.003,3);
    lathe(canopy,M.bronze,[[.036,0],[.039,.013],[.022,.039],[.012,.052],[0,.060]],c.clone().add(V(0,-.057,0)),V(0,1,0),24);
    ell(canopy,M.darkGold,c.clone().add(V(0,-.059,0)),[.008,.013,.008]);
  }
  lathe(canopy,M.gold,[[.13,0],[.17,.03],[.13,.10],[.07,.17],[.10,.22],[.067,.31],[.025,.43],[0,.51]],V(0,6.22,-1.19));
  mergeStatic(canopy);

  // A cloth standard with a restrained woven sun, all on the same moving surface.
  const standard=new T.Group();standard.name='Saffron standard';root.add(standard);
  const pole=V(1.64,0,-2.48);
  cylinder(standard,M.wood,pole.clone().setY(2.07),pole.clone().setY(6.82),.036,.026);
  for(const y of [2.17,2.88,5.97,6.71])band(standard,M.bronze,pole.clone().setY(y),V(0,1,0),.042,.009);
  lathe(standard,M.bronze,[[.031,0],[.052,.028],[.055,.060],[.032,.091],[.071,.125],[.045,.19],[0,.32]],pole.clone().setY(6.80));
  const flagParts=[];
  const flagInk=M.embroidery.clone();flagInk.polygonOffset=true;flagInk.polygonOffsetFactor=-1;flagInk.polygonOffsetUnits=-1;flagInk.depthWrite=false;
  function flagPoint(u,v,time,out=[]){
    const width=1.26-.27*Math.sin(v*Math.PI)**1.2,flap=Math.sin(u*5.1-time*1.7)*.074+Math.sin(u*10-v*2.5-time*2.3)*.024;
    out[0]=pole.x+u*width;out[1]=6.74-v*.79-.075*u*u;out[2]=pole.z+flap*u;return out;
  }
  function flagPiece(uv,nu,nv,material,offset=0){
    const g=surface((a,b)=>{const [u,v]=uv(a,b),p=flagPoint(u,v,0);p[2]+=offset;return p;},nu,nv);
    const o=mesh(g,material===M.embroidery?flagInk:material,standard);o.userData.flex=true;
    // The thin, moving flag does not invalidate the static carriage shadow map.
    o.castShadow=false;if(material===M.embroidery)o.renderOrder=1;
    g.attributes.position.setUsage(T.DynamicDrawUsage);g.attributes.normal.setUsage(T.DynamicDrawUsage);
    g.computeBoundingSphere();g.boundingSphere.radius+=.12;
    const coords=[];for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++)coords.push(...uv(i/nu,j/nv));flagParts.push({mesh:o,coords,offset});return o;
  }
  const flag=flagPiece((u,v)=>[u,v],58,26,M.saffron);flag.name='Standard cloth';
  for(const edge of [.02,.98])flagPiece((u,v)=>[u,edge+(v-.5)*.015],58,2,M.embroidery,.0025);
  flagPiece((u,v)=>[.979+(u-.5)*.014,v],2,26,M.embroidery,.0025);
  const cu=.43,cv=.47;
  flagPiece((u,v)=>{const a=u*TAU,r=lerp(.112,.121,v);return [cu+Math.cos(a)*r,cv+Math.sin(a)*r*1.47];},68,2,M.embroidery,.003);
  for(let k=0;k<12;k++)flagPiece((u,v)=>{const a=k/12*TAU+(u-.5)*.085,r=lerp(.141,.180,v);return [cu+Math.cos(a)*r,cv+Math.sin(a)*r*1.47];},2,3,M.embroidery,.003);
  flagPiece((u,v)=>{const a=u*TAU,r=.057*v;return [cu+Math.cos(a)*r,cv+Math.sin(a)*r*1.47];},32,4,M.embroidery,.003);
  mergeStatic(standard);mergeStatic(body);mergeStatic(front);mergeStatic(rear);

  let speed=0,targetSpeed=0,travel=0;const flagScratch=[0,0,0];
  return {
    root,wheels,mounts,seats,supports,sections,canopy,drawbar,yoke,harnessMounts,standard,materials:M,
    deckHeights,wheelRadius,
    setRolling(value){targetSpeed=value ? .52 : 0;},
    isRolling(){return targetSpeed>0||speed>.0001;},
    update(time,dt,animated=true){
      if(!animated)return;
      speed=lerp(speed,targetSpeed,1-Math.exp(-dt*3));if(!targetSpeed&&speed<.0001)speed=0;travel+=speed*dt;
      for(const wheel of wheels)wheel.rotation.x=travel/wheelRadius;
      for(const {mesh:o,coords,offset} of flagParts){
        const g=o.geometry,a=g.attributes.position;
        for(let i=0;i<a.count;i++){flagPoint(coords[i*2],coords[i*2+1],time,flagScratch);a.setXYZ(i,flagScratch[0],flagScratch[1],flagScratch[2]+offset);}
        a.needsUpdate=true;g.computeVertexNormals();
      }
    }
  };
}
