import * as T from './vendor/three.module.min.js';
import {V,TAU,mesh,ell,curve,thread,sweep,band,mergeStatic} from './geometry.js';

/** Independent, undrawn recurve bow component; origin is the grip. */
export function createBow(){
  const root=new T.Group();root.name='Arjun bow';
  const wood=new T.MeshStandardMaterial({color:0x412720,roughness:.48,metalness:.04});
  const horn=new T.MeshStandardMaterial({color:0x211c1b,roughness:.36});
  const gold=new T.MeshStandardMaterial({color:0xb58b47,roughness:.40,metalness:.73});
  const leather=new T.MeshStandardMaterial({color:0x251c19,roughness:.83});
  const string=new T.MeshStandardMaterial({color:0xd6c9a4,roughness:.84});
  const tips=[];
  for(const sign of [-1,1]){
    const pts=[[0,0,0],[-.016,.18*sign,0],[-.106,.46*sign,0],[-.173,.76*sign,0],[-.147,.945*sign,0],[-.080,1.035*sign,0]];
    const centreline=curve(pts);
    sweep(root,wood,pts,t=>.023*(1-t)+.008*t,{segments:72,sides:16,ellipse:.60});
    thread(root,horn,pts.map(p=>[p[0]+.010,p[1],p[2]+.007]),.0046,70);
    for(const t of [.27,.48,.72,.9]){
      band(root,gold,centreline.getPointAt(t),centreline.getTangentAt(t),.023*(1-t)+.008*t,.0025);
    }
    const tip=V(-.080,1.035*sign,0);tips.push(tip);
    ell(root,gold,tip,[.012,.024,.013]);
    thread(root,gold,pts.slice(2).map(p=>[p[0]-.011,p[1],p[2]+.004]),.002,44);
  }
  // A continuous string connects the two nocks.
  thread(root,string,[tips[0],V(-.080,0,0),tips[1]],.00145,6);
  const grip=mesh(new T.CylinderGeometry(.022,.022,.175,24),leather,root);
  for(let i=0;i<12;i++){
    const points=[];for(let j=0;j<=20;j++){const a=j/20*TAU;points.push([Math.cos(a)*.0225,-.081+i*.014+a/TAU*.009,Math.sin(a)*.0225]);}
    thread(root,i%4===0?gold:leather,points,.0017,22);
  }
  for(const y of [-.095,.095])band(root,gold,V(0,y,0),V(0,1,0),.023,.006);
  mergeStatic(root);
  return {root,gripPosition:V(0,0,0),length:2.07};
}
