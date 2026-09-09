"""Chapter XI sculpture skin. Authored fields, no third-party character model.

Reuses the approved Dashavatar head, feet, standing body and open palm fields.
Additional arm and neck fields are blended before meshing: no primitive joints
remain in the exported body surfaces. Run this file with Python + numpy/scipy.
"""
from pathlib import Path
import json
import numpy as np
from scipy.interpolate import CubicSpline
from meshing import mesh_field, OUT
from approved_anatomy import ellipsoid, capsule, union, body, head, foot_local, hand_local

DEST=Path(__file__).resolve().parents[2]/'web/vision'
HEADS=[]
for side in [-1,1]:
    for x,y,z,scale,yaw in [(1.45,9.24,-.28,2.48,.20),(2.66,8.97,-.69,2.17,.42),
                           (1.21,10.83,-.93,2.11,.16),(.54,11.72,-1.24,1.74,.08)]:
        HEADS.append(dict(position=[side*x,y,z],scale=scale,yaw=side*yaw))

ARMS=[]
for side in [-1,1]:
    # Upper arm, elbow and wrist sit on an anatomical curve; the first two
    # arms survive the universal-to-reassuring transition.
    ARMS.append(dict(kind='central',side=side,pose='grasp' if side<0 else 'teaching',
        points=[[side*1.17,7.70,-.12],[side*2.40,7.48,.08],[side*3.08,8.60,.50]],
        direction=[side*.08,1,.03],palm=[0,0,1],handScale=2.75))
    rays=[
      ([1.08,6.70,-.40],[2.10,5.91,-.29],[3.15,4.45,.47], [.48,-.85,.08],'open'),
      ([1.32,7.03,-.52],[3.07,6.10,-.46],[4.62,5.17,.05], [.65,-.7,.10],'teaching'),
      ([1.48,7.39,-.65],[3.78,6.98,-.54],[5.53,6.45,.19], [.83,-.36,.1],'open'),
      ([1.60,7.70,-.80],[3.92,8.04,-.83],[6.09,8.03,-.07], [.93,.20,.08],'open'),
      ([1.55,7.96,-.94],[3.62,9.02,-1.03],[5.40,9.76,-.18], [.61,.77,.08],'teaching'),
      ([1.28,8.09,-1.06],[2.75,10.03,-1.22],[4.24,11.30,-.60], [.40,.9,.12],'open'),
      ([.88,8.10,-1.18],[1.74,10.42,-1.52],[2.60,12.23,-.84], [.19,.98,.1],'teaching')]
    for a,b,c,d,pose in rays:
        ARMS.append(dict(kind='outer',side=side,pose=pose,
            points=[[side*p[0],p[1],p[2]] for p in [a,b,c]],
            direction=[side*d[0],d[1],d[2]],palm=[0,.04,1],handScale=2.55))

def curved_limb(p,points,radii,soft=.04):
    points=np.array(points,dtype=np.float32)
    curve=CubicSpline([0,.52,1],points,bc_type='natural')
    ts=np.linspace(0,1,13)
    samples=curve(ts)
    rr=np.interp(ts,[0,.24,.52,.71,1],radii)
    f=np.full(p.shape[:-1],100,dtype=np.float32)
    for i in range(len(ts)-1):
        f=union(f,capsule(p,samples[i],samples[i+1],rr[i],rr[i+1]),soft)
    return f

def retained_arms(p):
    f=np.full(p.shape[:-1],100,dtype=np.float32)
    for a in ARMS:
        if a['kind']!='central':continue
        f=union(f,curved_limb(p,a['points'],[.40,.35,.225,.275,.119],.05),.08)
    return f

def mantle(p):
    f=ellipsoid(p,[0,7.61,-.64],[1.63,.74,.57])
    for side in [-1,1]:
        f=union(f,ellipsoid(p,[side*1.30,7.62,-.57],[.72,.74,.49]),.24)
    for a in ARMS:
        if a['kind']!='outer':continue
        f=union(f,curved_limb(p,a['points'],[.375,.325,.208,.255,.112],.05),.16)
    for h in HEADS:
        x,y,z=h['position'];side=1 if x>0 else -1;scale=h['scale']
        if y<9.1:start=[side*1.20,7.58,-.59];mid=[side*2.03,8.05,-.74]
        elif y<10:start=[side*.54,7.80,-.57];mid=[side*1.06,8.31,-.40]
        elif y<11.2:start=[side*.58,7.9,-.84];mid=[side*.98,9.18,-1.15]
        else:start=[side*.23,8.0,-.85];mid=[side*.47,9.82,-1.37]
        end=[x,y-.21*scale,z-.026*scale]
        f=union(f,curved_limb(p,[start,mid,end],[.38,.35,.31,.27,scale*.104],.07),.17)
    return f

def posed_hand(p,mode):
    if mode=='open':return hand_local(p)
    f=ellipsoid(p,[0,.071,0],[.065,.09,.029])
    f=union(f,capsule(p,[0,-.037,-.006],[0,.052,0],.040,.044),.025)
    for i,(x,ll,rr) in enumerate(zip([-.048,-.017,.018,.049],[.111,.140,.133,.100],[.014,.0155,.015,.0128])):
        a=np.array([x,.132,-.002])
        if mode=='grasp':
            b=a+[x*.08,.046,.033];c=a+[x*.02,.025,.078];d=a+[-x*.06,-.023,.080]
        elif i==3:
            b=a+[.028,.035,.018];c=a+[.037,.008,.048];d=np.array([.105,.110,.057])
        else:
            b=a+[x*.2,ll*.47,.004];c=a+[x*.35,ll*.84,.015];d=a+[x*.41,ll,.033]
        for j,(aa,bb) in enumerate([(a,b),(b,c),(c,d)]):
            f=union(f,capsule(p,aa,bb,rr*(1.07-j*.16),rr*(.96-j*.14)),.010-j*.002)
    f=union(f,ellipsoid(p,[.047,.051,.008],[.032,.055,.029]),.018)
    if mode=='grasp':
        thumb=[[.055,.038,.015],[.097,.066,.048],[.081,.107,.072],[.041,.121,.080]]
    else:
        thumb=[[.055,.042,.008],[.101,.066,.019],[.122,.089,.040],[.105,.110,.057]]
    for j in range(3):f=union(f,capsule(p,thumb[j],thumb[j+1],.022-j*.003,.018-j*.002),.012-j*.003)
    return f

if __name__=='__main__':
    (DEST/'layout.js').write_text('export const layout = '+json.dumps({'heads':HEADS,'arms':ARMS},indent=2)+';\n')
    mesh_field('standing',lambda p:body(p,'standing'),[-.85,-.035,-.30],[.85,3.00,.84],.026)
    mesh_field('head',head,[-.26,-.33,-.23],[.26,.33,.25],.021)
    mesh_field('foot',foot_local,[-.09,-.06,-.19],[.09,.15,.22],.009)
    for mode in ['open','teaching','grasp']:
        mesh_field('hand-'+mode,lambda p:posed_hand(p,mode),[-.09,-.08,-.05],[.16,.30,.12],.0088)
    mesh_field('retained-arms',retained_arms,[-3.6,7.0,-.65],[3.6,8.90,.90],.072)
    mesh_field('mantle',mantle,[-6.40,4.10,-1.91],[6.40,12.52,1.0],.086)
