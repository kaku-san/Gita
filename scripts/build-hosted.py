"""Build a small Worker release; keep the full portable website in web/."""
from pathlib import Path
import hashlib,json,mimetypes,shutil,tarfile
ROOT=Path(__file__).resolve().parents[1]
files={}
types={'.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.html':'text/html; charset=utf-8','.json':'application/json; charset=utf-8','.mp3':'audio/mpeg','.woff2':'font/woff2','.bin':'application/octet-stream','.gltf':'model/gltf+json','.glb':'model/gltf-binary'}
for p in sorted((ROOT/'web').rglob('*')):
 if not p.is_file():continue
 assert not any(part.startswith('.env') for part in p.relative_to(ROOT/'web').parts)
 data=p.read_bytes();files['/'+p.relative_to(ROOT/'web').as_posix()]={'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data),'type':types.get(p.suffix,mimetypes.guess_type(p.name)[0] or 'application/octet-stream')}
identity=hashlib.sha256(json.dumps(files,sort_keys=True,separators=(',',':')).encode()).hexdigest()
release={'id':identity,'files':files}
(ROOT/'hosting/release.json').write_text(json.dumps(release,indent=2)+'\n')
out=ROOT/'dist'
if out.exists():shutil.rmtree(out)
(out/'server').mkdir(parents=True);(out/'client/_previous').mkdir(parents=True);(out/'.openai').mkdir()
server="import {env} from 'cloudflare:workers';\n"+(ROOT/'worker/asset-server.js').read_text()+"\nconst release="+json.dumps(release,separators=(',',':'))+";\nconst api=createAssetServer(release);\nexport default {fetch(request){return api.fetch(request,env);}};\n"
(out/'server/index.js').write_text(server)
shutil.copy2(ROOT/'.openai/hosting.json',out/'.openai/hosting.json')
with tarfile.open(ROOT/'hosting/previous-site.tar.gz','r:gz') as t:
 for member in t:
  if not member.isfile():continue
  path=Path(member.name);assert path.parts[0]=='dist' and '..' not in path.parts
  if '.openai' in path.parts:continue
  target=out/'client/_previous'/Path(*path.parts[1:]);target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(t.extractfile(member).read())
print(json.dumps({'release':identity,'files':len(files),'objects':len(set(f['sha256'] for f in files.values())),'narration':sum(p.endswith('.mp3') and any(p.startswith('/audio/'+loc+'/') for loc in ['en','hi','ja','zh-Hans','fr']) for p in files),'worker_bytes':(out/'server/index.js').stat().st_size}))
