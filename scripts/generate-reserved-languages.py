"""Reserve remaining languages before parallel synthesis; older workers cannot duplicate them."""
from pathlib import Path
import concurrent.futures,importlib.util,json,hashlib,datetime
spec=importlib.util.spec_from_file_location('narration',Path(__file__).with_name('generate-narration.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
if __name__=='__main__':
 claim='five-language-release-20260909';cast=json.loads((m.PROD/'cast.json').read_text());script=json.loads((m.PROD/'release-script.json').read_text())
 locales=['ja','zh-Hans','fr']
 for locale in locales:
  batches=[]
  for row in script['languages'][locale]:
   if not batches or row['chapter']!=batches[-1][0]['chapter'] or sum(len(r['text']) for r in batches[-1])+len(row['text'])>1800:batches.append([])
   batches[-1].append(row)
  for group in batches:
   body={'inputs':[{'text':r['text'],'voice_id':cast['languages'][locale]['voices'][r['speakerKey']]['voice_id']} for r in group],'model_id':'eleven_v3','language_code':cast['languages'][locale]['language_code'],'seed':20260909,'apply_text_normalization':'auto'}
   name=f'{group[0]["id"]}--{group[-1]["id"]}';folder=m.PROD/'takes'/locale/name;folder.mkdir(parents=True,exist_ok=True);receipt=folder/'receipt.json'
   if not receipt.exists():
    data={'status':'reserved','claim':claim,'fingerprint':m.digest(json.dumps(body,sort_keys=True,ensure_ascii=False).encode()),'reserved_at':datetime.datetime.now(datetime.timezone.utc).isoformat()}
    with receipt.open('x') as f:json.dump(data,f,indent=2)
 with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
  jobs={pool.submit(m.generate,locale,claim=claim):locale for locale in locales}
  for job in concurrent.futures.as_completed(jobs):
   locale=jobs[job]
   try:print(locale+': '+('complete' if job.result() else 'incomplete'),flush=True)
   except Exception as e:print(locale+': stopped: '+type(e).__name__+' '+str(e)[:160],flush=True)
