from pathlib import Path
import json
import numpy as np
OUT=Path(__file__).resolve().parents[3]/"web"/"battle"/"animals-skin"
OUT.mkdir(exist_ok=True)

# Corners, and a compatible six-tetra decomposition of each grid cell.
CORNERS=np.array([[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]])
TETS=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]]
EDGES=[(0,1),(0,2),(0,3),(1,2),(1,3),(2,3)]

def mesh_field(name, field, lo, hi, step):
    lo=np.array(lo,dtype=np.float32)
    axes=[np.arange(lo[i],hi[i]+step,step,dtype=np.float32) for i in range(3)]
    p=np.stack(np.meshgrid(*axes,indexing='ij'),axis=-1)
    f=field(p).astype(np.float32)
    grad=np.stack(np.gradient(f,step),axis=-1)
    slices=[tuple(slice(c[i],f.shape[i]-1+c[i]) for i in range(3)) for c in CORNERS]
    cv=np.stack([f[s] for s in slices],axis=-1)
    crossing=(cv.min(-1)<0)&(cv.max(-1)>=0)
    base=np.argwhere(crossing)
    pp=lo+(base[:,None,:]+CORNERS[None,:,:])*step
    vv=cv[crossing]
    gg=np.stack([grad[s][crossing] for s in slices],axis=1)
    verts=[]; norms=[]
    for ids in TETS:
        tv=vv[:,ids]; tp=pp[:,ids]; tn=gg[:,ids]
        code=(tv<0).astype(np.uint8) @ np.array([1,2,4,8],dtype=np.uint8)
        for case in range(1,15):
            take=code==case
            if not np.any(take):continue
            es=[(a,b) for a,b in EDGES if bool(case&(1<<a))!=bool(case&(1<<b))]
            pts=[];ns=[]
            for a,b in es:
                v0,v1=tv[take,a],tv[take,b]
                t=v0/(v0-v1)
                pts.append(tp[take,a]+t[:,None]*(tp[take,b]-tp[take,a]))
                ns.append(tn[take,a]+t[:,None]*(tn[take,b]-tn[take,a]))
            pts=np.stack(pts,axis=1);ns=np.stack(ns,axis=1)
            if len(es)==4:
                # Sort around the average normal to avoid crossing the quad.
                cen=pts.mean(1);nn=ns.mean(1);nn/=np.linalg.norm(nn,axis=1)[:,None]
                u=pts[:,0]-cen;u/=np.linalg.norm(u,axis=1)[:,None]
                v=np.cross(nn,u)
                ang=np.arctan2(np.sum((pts-cen[:,None])*v[:,None],-1),np.sum((pts-cen[:,None])*u[:,None],-1))
                order=np.argsort(ang,axis=1)
                pts=np.take_along_axis(pts,order[:,:,None],axis=1)
                ns=np.take_along_axis(ns,order[:,:,None],axis=1)
                tris=[[0,1,2],[0,2,3]]
            else:tris=[[0,1,2]]
            for tri in tris:
                a=pts[:,tri].copy();n=ns[:,tri].copy()
                flip=(np.sum(np.cross(a[:,1]-a[:,0],a[:,2]-a[:,0])*n.mean(1),-1)<0)
                a[flip]=a[flip][:,[0,2,1]];n[flip]=n[flip][:,[0,2,1]]
                verts.append(a.reshape(-1,3));norms.append(n.reshape(-1,3))
    pos=np.concatenate(verts).astype('<f4');nor=np.concatenate(norms)
    nor/=np.maximum(np.linalg.norm(nor,axis=-1)[:,None],1e-9)
    nor=nor.astype('<f4')
    # Deduplicate for storage and a smooth connected skin mesh.
    unique,ind,inv=np.unique(np.round(pos,6),axis=0,return_index=True,return_inverse=True)
    pos=pos[ind];nor=nor[ind];indices=inv.astype('<u4')
    blob=pos.tobytes()+nor.tobytes()+indices.tobytes()
    (OUT/(name+'.bin')).write_bytes(blob)
    (OUT/(name+'.json')).write_text(json.dumps({'vertices':len(pos),'indices':len(indices),'bytes':len(blob)}))
    print(name,len(pos),'vertices',len(indices)//3,'triangles',flush=True)
