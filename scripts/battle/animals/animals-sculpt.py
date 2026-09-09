"""Deterministic elephant sculpture and approved-skin LOD exporter. NumPy only.
No generated images, networks, or modifications to approved source assets.
Run: python scripts/battle/animals/animals-sculpt.py
"""
from pathlib import Path
import importlib.util, json
import numpy as np
HERE=Path(__file__).resolve().parent
OUT=HERE.parents[2]/'web'/'battle'/'animals-skin'
spec=importlib.util.spec_from_file_location('animals_meshing',HERE/'animals-meshing.py')
meshing=importlib.util.module_from_spec(spec);spec.loader.exec_module(meshing)
meshing.OUT=OUT

def ell(p,c,r):
 q=p-np.array(c);r=np.array(r);k0=np.linalg.norm(q/r,axis=-1);k1=np.linalg.norm(q/(r*r),axis=-1)
 return k0*(k0-1)/np.maximum(k1,1e-8)
def cap(p,a,b,r0,r1):
 a=np.array(a);b=np.array(b);q=p-a;ab=b-a;t=np.clip(np.sum(q*ab,axis=-1)/np.sum(ab*ab),0,1)
 return np.linalg.norm(q-t[...,None]*ab,axis=-1)-(r0+(r1-r0)*t)
def union(a,b,k=.18):
 h=np.maximum(k-np.abs(a-b),0)/k
 return np.minimum(a,b)-h*h*k*.25
def interp(x,k,v):
 k=np.array(k);v=np.array(v);m=np.gradient(v,k);i=np.clip(np.searchsorted(k,x)-1,0,len(k)-2)
 h=k[i+1]-k[i];t=np.clip((x-k[i])/h,0,1)
 return (2*t**3-3*t*t+1)*v[i]+(t**3-2*t*t+t)*h*m[i]+(-2*t**3+3*t*t)*v[i+1]+(t**3-t*t)*h*m[i+1]
def loft(p,axis,k,c,w,d):
 q=p[...,axis];other=2 if axis==1 else 1
 rx=np.maximum(interp(q,k,w),.001);ry=np.maximum(interp(q,k,d),.001)
 radial=(np.sqrt((p[...,0]/rx)**2+((p[...,other]-interp(q,k,c))/ry)**2)-1)*np.minimum(rx,ry)
 return np.maximum(radial,np.maximum(k[0]-q,q-k[-1]))
TRUNK=[[0,3.18,2.04,.35],[0,2.79,2.28,.32],[0,2.29,2.46,.26],
 [0,1.78,2.55,.215],[.025,1.22,2.61,.17],[.09,.73,2.69,.135],
 [.18,.43,2.90,.105],[.24,.49,3.17,.075],[.25,.68,3.28,.030]]
def elephant_field(p):
 # Broad Asian elephant barrel, raised shoulders, rounded pelvis and domed head.
 f=loft(p,2,[-2.44,-2.30,-1.91,-1.27,-.55,.30,.87,1.35,1.64],
  [2.51,2.51,2.57,2.60,2.60,2.58,2.66,2.62,2.59],
  [.003,.42,.88,1.04,1.08,1.07,.99,.71,.015],
  [.003,.43,.91,1.03,1.01,1.02,.99,.68,.015])
 for c,r in [((0,2.99,1.30),(.63,.74,.66)),((0,3.23,1.69),(.64,.66,.65)),
             ((-.24,3.61,1.55),(.34,.29,.42)),((.24,3.61,1.55),(.34,.29,.42)),
             ((0,2.66,1.82),(.53,.43,.49)),((0,2.42,1.78),(.40,.29,.40))]:
  f=union(f,ell(p,c,r),.22)
 for a,b in zip(TRUNK,TRUNK[1:]):f=union(f,cap(p,a[:3],b[:3],a[3],b[3]),.17)
 for s in [-1,1]:
  q=p-np.array([s*.76,0,0])
  for rear in [False,True]:
   z=-1.48 if rear else 1.01
   k=[.015,.075,.22,.48,.86,1.24,1.61,1.96,2.46,2.91]
   c=[z+.055,z+.025,z,z-.01,z-.035,z-.055,z-.08,z-.07,z-.18,z-.25]
   w=[.11,.265,.28,.255,.24,.26,.30,.35,.40,.32]
   d=[.17,.34,.32,.28,.27,.28,.315,.37,.43,.32]
   f=union(f,loft(q,1,k,c,w,d),.20)
 # Slight integrated folds where massive limbs meet the belly and on the brow.
 x,y,z=p[...,0],p[...,1],p[...,2]
 f+=.008*np.sin(y*30+z*5)*np.exp(-((np.abs(x)-.95)/.22)**2-((y-1.95)/.50)**2)
 f+=.008*np.exp(-(x/.07)**2-((y-3.82)/.20)**2-((z-1.52)/.48)**2)
 return f

def read(name):
 meta=json.loads((HERE/'approved-inputs'/f'{name}.json').read_text())
 data=(HERE/'approved-inputs'/f'{name}.bin').read_bytes();n=meta['vertices']
 return np.frombuffer(data,'<f4',n*3).reshape(-1,3),np.frombuffer(data,'<f4',n*3,n*12).reshape(-1,3),np.frombuffer(data,'<u4',meta['indices'],n*24).reshape(-1,3)
def write(name,p,n,f):
 p=p.astype('<f4');n=n.astype('<f4');f=f.astype('<u4');blob=p.tobytes()+n.tobytes()+f.tobytes()
 (OUT/f'{name}.bin').write_bytes(blob)
 (OUT/f'{name}.json').write_text(json.dumps(dict(vertices=len(p),indices=f.size,bytes=len(blob))))
 print(name,len(p),'vertices',len(f),'triangles',flush=True)
def cluster(name,p,n,f,step):
 # Vertex clustering keeps the approved silhouette and does not invent anatomy.
 keys=np.floor(p/step+.5).astype(np.int32);_,inverse=np.unique(keys,axis=0,return_inverse=True)
 count=np.bincount(inverse);pos=np.stack([np.bincount(inverse,weights=p[:,j])/count for j in range(3)],axis=1)
 nor=np.stack([np.bincount(inverse,weights=n[:,j])/count for j in range(3)],axis=1)
 nor/=np.maximum(np.linalg.norm(nor,axis=1)[:,None],1e-9)
 faces=inverse[f];valid=(faces[:,0]!=faces[:,1])&(faces[:,1]!=faces[:,2])&(faces[:,0]!=faces[:,2]);faces=faces[valid]
 _,ids=np.unique(np.sort(faces,axis=1),axis=0,return_index=True);faces=faces[np.sort(ids)]
 write(name,pos,nor,faces)

if __name__=='__main__':
 OUT.mkdir(exist_ok=True)
 for src,steps in [('horse',[.037,.079]),('rider',[.038,.075]),('head',[.026,.045])]:
  p,n,f=read(src)
  for quality,step in zip(['high','low'],steps):cluster(f'{src}-{quality}',p,n,f,step)
 meshing.mesh_field('elephant-sculpture',elephant_field,[-1.28,-.05,-2.53],[1.28,3.99,3.42],.068)
 meta=json.loads((OUT/'elephant-sculpture.json').read_text());data=(OUT/'elephant-sculpture.bin').read_bytes();n=meta['vertices']
 p=np.frombuffer(data,'<f4',n*3).reshape(-1,3);norm=np.frombuffer(data,'<f4',n*3,n*12).reshape(-1,3);faces=np.frombuffer(data,'<u4',meta['indices'],n*24).reshape(-1,3)
 cluster('elephant-high',p,norm,faces,.045);cluster('elephant-low',p,norm,faces,.09)
 (OUT/'elephant-landmarks.json').write_text(json.dumps({'trunk':TRUNK,'shoulderHeight':3.60,'headHeight':3.9,'feet':[[-.76,1.01],[.76,1.01],[-.76,-1.48],[.76,-1.48]]}))
