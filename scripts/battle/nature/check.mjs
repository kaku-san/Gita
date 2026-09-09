import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createNature} from '../../../web/battle/nature.js';
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)};
const groundHeight=(x,z)=>.16*Math.sin(x*.015)*Math.cos(z*.012)-.7*Math.exp(-Math.pow((x+83)/6.2,2))*smooth(5,20,z)*(1-smooth(155,170,z));
for(const quality of ['high','low']) {
  const nature=createNature({quality,groundHeight});
  const metadata=nature.metadata;
  const issues=[];
  let minGrassX=Infinity,minFarTreeRadius=Infinity,maxChannelRise=-Infinity,minChannelRise=Infinity;
  nature.root.traverse(object=>{
    if(!object.isMesh)return;
    for(const [key,attribute] of Object.entries(object.geometry.attributes))for(const value of attribute.array)
      assert.ok(Number.isFinite(value),object.name+' finite '+key);
    if(object.isInstancedMesh)for(const value of object.instanceMatrix.array)assert.ok(Number.isFinite(value));
    if(object.name.startsWith('Sparse grasses'))for(let i=0;i<object.count;i++){
      const x=object.instanceMatrix.array[i*16+12];minGrassX=Math.min(minGrassX,Math.abs(x));assert.ok(Math.abs(x)>10.25);
    }
    if(object.name.startsWith('Shallow seasonal')){
      const p=object.geometry.attributes.position;
      for(let i=0;i<p.count;i++){
        const x=p.getX(i),z=p.getZ(i);assert.ok(x>=-92&&x<=-74&&z>=5&&z<=170);
        const rise=p.getY(i)-groundHeight(x,z);maxChannelRise=Math.max(maxChannelRise,rise);minChannelRise=Math.min(minChannelRise,rise);
        assert.ok(rise>=.0079&&rise<=.58);
      }
    }
  });
  for(const tree of metadata.trees)if(!tree.near){const r=Math.hypot(tree.x,tree.z);minFarTreeRadius=Math.min(minFarTreeRadius,r);assert.ok(r>=80);assert.ok(Math.abs(tree.x)>=95&&Math.abs(tree.x)<=220);}
  assert.ok(metadata.stats.triangles<(quality==='high'?250000:150000));assert.ok(metadata.stats.drawCalls<24);
  nature.update(1,.04,true);nature.setVision(.7);const before=nature.metadata.inspect();nature.update(110,99,false);
  assert.equal(nature.metadata.inspect().elapsed,before.elapsed);
  nature.update(111,.016,true);assert.equal(nature.metadata.inspect().elapsed,before.elapsed+.016);
  nature.setVision(0);const reset=nature.metadata.inspect();assert.equal(reset.vision,0);
  nature.dispose();nature.dispose();assert.equal(nature.root.children.length,0);assert.equal(nature.metadata.inspect().disposed,true);
  console.log(JSON.stringify({quality,stats:metadata.stats,trees:metadata.treeCount,leafClusters:metadata.leafClusterCount,
    grassTufts:metadata.grassTuftCount,minGrassX,minFarTreeRadius,channelRise:[minChannelRise,maxChannelRise],pauseAndDispose:'passed'}));
}
