"""Upload verified immutable assets, then atomically activate the complete release.
GEETA_SITE_ORIGIN and GEETA_SITE_BEARER are supplied per invocation; never stored.
The separate GEETA_PUBLISH_TOKEN is read from the ignored local .env.
"""
from pathlib import Path
import concurrent.futures,hashlib,json,os,time
from urllib.request import Request,build_opener,HTTPRedirectHandler
from urllib.error import HTTPError,URLError
ROOT=Path(__file__).resolve().parents[1]
release=json.loads((ROOT/'hosting/release.json').read_text())
origin=os.environ['GEETA_SITE_ORIGIN'].rstrip('/')
assert origin.startswith('https://')
token=next(x.partition('=')[2].strip() for x in (ROOT/'.env').read_text().splitlines() if x.startswith('GEETA_PUBLISH_TOKEN='))
headers={'OAI-Sites-Authorization':'Bearer '+os.environ['GEETA_SITE_BEARER'],'x-geeta-publish-token':token}
class NoRedirect(HTTPRedirectHandler):
 def redirect_request(self,req,fp,code,msg,response_headers,newurl):return None
class Result:
 def __init__(self,status,body):self.status_code=status;self.body=body
 def json(self):return json.loads(self.body)
def request(method,path,**kwargs):
 for attempt in range(4):
  try:
   try:
    with build_opener(NoRedirect).open(Request(origin+path,data=kwargs.get('data'),headers=headers,method=method),timeout=45) as response:r=Result(response.status,response.read())
   except HTTPError as e:r=Result(e.code,e.read())
   if r.status_code not in (429,502,503,504):return r
  except (URLError,TimeoutError,OSError):
   if attempt==3:raise RuntimeError('Media transfer failed after retries') from None
  if attempt<3:time.sleep(1+attempt)
 return r
status=request('GET','/_publish/status');assert status.status_code==200,f'Publish status returned HTTP {status.status_code}'
status=status.json();assert status['release']==release['id'],'Hosted worker does not match this release'
missing=set(status['missing']);jobs={}
for name,f in release['files'].items():
 if f['sha256'] in missing:jobs.setdefault(f['sha256'],(name,f))
def upload(item):
 sha,(name,f)=item;data=(ROOT/'web'/name.lstrip('/')).read_bytes();assert hashlib.sha256(data).hexdigest()==sha
 r=request('PUT','/_publish/objects/'+sha,data=data);assert r.status_code==200,f'Upload failed for {name}: HTTP {r.status_code}'
 assert r.json()['sha256']==sha
 return len(data)
print(json.dumps({'objects_to_upload':len(jobs),'release':release['id']}),flush=True)
count=0;size=0
with concurrent.futures.ThreadPoolExecutor(max_workers=32) as pool:
 pending=[pool.submit(upload,item) for item in jobs.items()]
 try:
  for done in concurrent.futures.as_completed(pending):
   size+=done.result();count+=1
   if count%50==0 or count==len(jobs):print(json.dumps({'uploaded':count,'total':len(jobs),'MB':round(size/1e6,2)}),flush=True)
 except BaseException:
  for job in pending:job.cancel()
  print('Transfer stopped; verified objects will be reused on resume.',flush=True)
  raise
r=request('POST','/_publish/activate');assert r.status_code==200,f'Activation refused: HTTP {r.status_code}'
result=r.json();assert result['active'] and result['release']==release['id']
(ROOT/'dist/hosted-release.json').write_text(json.dumps({'release':release['id'],'files':len(release['files']),'active':True,'uploaded_bytes':size},indent=2)+'\n')
print(json.dumps({'activated':True,'files':result['files'],'release':release['id']}),flush=True)
