"""Dashavatar shared anatomy; analytic smooth signed fields, authored from scratch.

Run: python scripts/foundation/sculpt.py
Meshes are Y-up, +Z forward. Binary layout: Float32 positions, Float32 normals,
Uint32 triangle indices. This is a reusable sculpt, never a live primitive stack.
The small hands/feet follow the previously approved Arjun study's analytic forms.
"""
from pathlib import Path
import json
import sys
import numpy as np
from meshing import mesh_field, OUT

def ellipsoid(p,c,r):
    q=p-np.asarray(c,dtype=np.float32); r=np.asarray(r,dtype=np.float32)
    k0=np.linalg.norm(q/r,axis=-1);k1=np.linalg.norm(q/(r*r),axis=-1)
    return np.where(k0<1e-6,-min(r),k0*(k0-1)/np.maximum(k1,1e-7))

def union(a,b,k=.04):
    h=np.maximum(k-np.abs(a-b),0)/k
    return np.minimum(a,b)-h*h*k*.25

def capsule(p,a,b,ra,rb=None,bulge=0):
    a=np.asarray(a,dtype=np.float32); b=np.asarray(b,dtype=np.float32);d=b-a
    t=np.clip(np.sum((p-a)*d,axis=-1)/np.dot(d,d),0,1)
    r=ra if rb is None else ra+(rb-ra)*t
    r=r+bulge*np.sin(t*np.pi)
    return np.linalg.norm(p-a-t[...,None]*d,axis=-1)-r

POSES={
 'standing':dict(hip=1.65,waist=1.82,chest=2.32,shoulder=2.58,neck=2.86,head=3.12,
                 elbows=[[.64,2.18,.03],[-.64,2.18,.03]],wrists=[[.70,1.82,.12],[-.70,1.82,.12]],
                 knees=[[.22,.94,.015],[-.22,.94,.015]],ankles=[[.22,.16,.005],[-.22,.16,.005]]),
 'meditating':dict(hip=.45,waist=.70,chest=1.14,shoulder=1.37,neck=1.66,head=1.92,
                 elbows=[[.53,.91,.21],[-.53,.91,.21]],wrists=[[.145,.67,.42],[-.145,.655,.44]],
                 knees=[[.55,.20,.24],[-.55,.20,.24]],ankles=[[-.25,.16,.65],[.25,.16,.70]]),
 'rider':dict(hip=1.0,waist=1.23,chest=1.77,shoulder=2.03,neck=2.31,head=2.58,
                 elbows=[[.64,1.63,.03],[-.64,1.63,.03]],wrists=[[.70,1.27,.12],[-.70,1.27,.12]],
                 knees=[[.59,.70,.23],[-.59,.70,.23]],ankles=[[.66,.16,.24],[-.66,.16,.24]])
}

def body(p,pose):
    s=POSES[pose];hy=s['hip'];wy=s['waist'];cy=s['chest'];sy=s['shoulder'];ny=s['neck']
    # Pelvis, abdomen and ribcage flow into one gently athletic silhouette.
    f=ellipsoid(p,[0,hy+.02,-.015],[.284,.235,.19])
    fields=[([0,wy+.10,0],[.257,.305,.170],.11),
            ([0,cy-.09,-.025],[.346,.34,.196],.15),
            ([0,sy-.04,-.036],[.334,.145,.171],.09),
            ([0,ny-.06,-.025],[.112,.175,.111],.085)]
    for c,r,k in fields:f=union(f,ellipsoid(p,c,r),k)
    for side in [1,-1]:
        # Pectoral and oblique relief is restrained, blended into the ribcage.
        f=union(f,ellipsoid(p,[side*.156,cy+.024,.088],[.198,.140,.099]),.085)
        f=union(f,ellipsoid(p,[side*.203,wy+.20,.019],[.076,.220,.147]),.066)
        a=[side*.43,sy,0];b=s['elbows'][0 if side==1 else 1];c=s['wrists'][0 if side==1 else 1]
        f=union(f,capsule(p,[side*.085,ny-.12,-.038],a,.082,.106),.075)
        f=union(f,ellipsoid(p,[side*.422,sy-.028,-.002],[.134,.15,.132]),.084)
        f=union(f,capsule(p,a,b,.105,.075,bulge=.011),.055)
        # Forearm has its mass close to the elbow and a narrow wrist.
        f=union(f,capsule(p,b,c,.074,.043,bulge=.011),.038)
        mid=(np.asarray(a)*.49+np.asarray(b)*.51).tolist();mid[2]+=.027
        f=union(f,ellipsoid(p,mid,[.099,.135,.093]),.025)
        idx=0 if side==1 else 1;knee=s['knees'][idx];ankle=s['ankles'][idx]
        hip=[side*.175,hy-.055,-.018]
        if pose=='standing':
            f=union(f,capsule(p,hip,knee,.155,.090,bulge=.025),.085)
            f=union(f,capsule(p,knee,ankle,.089,.049,bulge=.020),.040)
            f=union(f,ellipsoid(p,[side*.22,.635,-.03],[.096,.21,.095]),.025)
        elif pose=='rider':
            # Widely separated thighs leave an actual saddle/barrel opening.
            mid=[side*.39,.825,.115]
            f=union(f,capsule(p,hip,mid,.155,.135),.080)
            f=union(f,capsule(p,mid,knee,.135,.092),.055)
            f=union(f,capsule(p,knee,ankle,.087,.051,bulge=.018),.045)
        else:
            f=union(f,capsule(p,hip,knee,.157,.108,bulge=.012),.082)
            if side==1:
                path=[knee,[.44,.21,.43],[.17,.295,.61],[-.12,.225,.65],ankle]
            else:
                path=[knee,[-.43,.17,.45],[-.20,.115,.62],[.07,.13,.71],ankle]
            radii=[.103,.095,.074,.061,.048]
            for j in range(len(path)-1):
                f=union(f,capsule(p,path[j],path[j+1],radii[j],radii[j+1]),.045)
    # A shallow navel and abdominal centre line, sculpted into the surface.
    navel=ellipsoid(p,[0,wy+.095,.171],[.014,.016,.013])
    f=np.maximum(f,-navel)
    return f

def head(p):
    # Local origin at the contract head centre. Calm, minimally featured face.
    f=ellipsoid(p,[0,.020,-.018],[.198,.280,.181])
    fields=[([0,-.127,.010],[.147,.155,.134],.068),
            ([0,-.055,.062],[.143,.166,.116],.060),
            ([0,-.214,.024],[.095,.059,.083],.065),
            ([0,-.081,.166],[.025,.054,.029],.028),
            ([0,-.115,.185],[.027,.022,.026],.020),
            ([.196,-.038,-.012],[.032,.072,.032],.018),
            ([-.196,-.038,-.012],[.032,.072,.032],.018)]
    for c,r,k in fields:f=union(f,ellipsoid(p,c,r),k)
    return f

def hand_local(p):
    f=ellipsoid(p,[0,.076,0],[.065,.095,.027])
    f=union(f,capsule(p,[0,-.034,-.006],[0,.045,0],.041,.044),.022)
    for x,ll,rr in zip([-.048,-.017,.018,.049],[.111,.140,.133,.100],[.014,.0155,.015,.0128]):
        a=np.array([x,.132,-.002]);b=a+[x*.23,ll*.48,.006]
        c=a+[x*.42,ll*.84,.020];d=a+[x*.46,ll,.031]
        f=union(f,capsule(p,a,b,rr*1.12,rr),.012)
        f=union(f,capsule(p,b,c,rr,rr*.83),.007)
        f=union(f,capsule(p,c,d,rr*.83,rr*.70),.005)
    f=union(f,ellipsoid(p,[.047,.052,.004],[.033,.057,.028]),.018)
    f=union(f,capsule(p,[.055,.042,.008],[.102,.080,.017],.022,.018),.015)
    return union(f,capsule(p,[.102,.080,.017],[.126,.125,.033],.018,.014),.008)

def foot_local(p):
    f=ellipsoid(p,[0,.035,.005],[.072,.05,.152])
    f=union(f,ellipsoid(p,[0,.05,-.112],[.055,.085,.066]),.03)
    for i in range(5):
        x=-.052+i*.024
        f=union(f,capsule(p,[x,.024,.10],[x,.022,.178-i*.010],.022-i*.002,.019-i*.0018),.01)
    return f

if __name__=='__main__':
    selected=sys.argv[1:] or ['standing','meditating','rider','head','hand','foot']
    for name in selected:
        if name in POSES:
            ymax=POSES[name]['neck']+.14
            mesh_field(name,lambda p:body(p,name),[-.85,-.035,-.30],[.85,ymax,.84],.019)
        elif name=='head':mesh_field('head',head,[-.26,-.33,-.23],[.26,.33,.25],.011)
        elif name=='hand':mesh_field('hand',hand_local,[-.09,-.08,-.05],[.15,.30,.08],.0048)
        elif name=='foot':mesh_field('foot',foot_local,[-.09,-.06,-.19],[.09,.15,.22],.0055)
    (Path(__file__).resolve().parent/'landmarks.json').write_text(json.dumps(POSES,indent=2)+'\n')
