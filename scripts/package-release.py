"""Package committed source and portable website assets, never local credentials.
Usage: python scripts/package-release.py /absolute/output/directory
"""
from pathlib import Path
import json,subprocess,sys,zipfile,hashlib
ROOT=Path(__file__).resolve().parents[1]
if len(sys.argv)!=2 or not Path(sys.argv[1]).is_absolute():raise SystemExit('Pass an absolute output directory.')
out=Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=True)
if subprocess.check_output(['git','status','--porcelain'],cwd=ROOT).strip():raise SystemExit('Commit the complete source before packaging.')
manifest=json.loads((ROOT/'web/narrative/audio.json').read_text())
assert manifest['status']=='complete' and sum(map(len,manifest['languages'].values()))==940 and sum(map(len,manifest['openings'].values()))==25
source=out/'Geeta-Source.zip';site=out/'Geeta-Website.zip'
subprocess.run(['git','archive','--format=zip','--output='+str(source),'HEAD'],cwd=ROOT,check=True)
with zipfile.ZipFile(site,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in sorted((ROOT/'web').rglob('*')):
  if p.is_file():z.write(p,p.relative_to(ROOT/'web').as_posix())
secrets=[]
if (ROOT/'.env').exists():secrets=[x.partition('=')[2].strip().encode() for x in (ROOT/'.env').read_text().splitlines() if '=' in x and x.partition('=')[2].strip()]
for path in (source,site):
 with zipfile.ZipFile(path) as z:
  assert z.testzip() is None
  for name in z.namelist():
   assert not any(part.startswith('.env') and part!='.env.example' for part in Path(name).parts)
   data=z.read(name)
   assert all(secret not in data for secret in secrets),'Credential in archive'
 print(path.name, path.stat().st_size, 'bytes; verified')
report={'commit':subprocess.check_output(['git','rev-parse','--verify','HEAD'],cwd=ROOT,text=True).strip(),'files':[{ 'file':p.name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in (source,site)]}
(out/'Geeta-Release.json').write_text(json.dumps(report,indent=2)+'\n')
