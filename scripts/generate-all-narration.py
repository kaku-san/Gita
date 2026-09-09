"""Generate all five languages with two concurrent requests and resumable receipts."""
from concurrent.futures import ThreadPoolExecutor,as_completed
import importlib.util
from pathlib import Path
spec=importlib.util.spec_from_file_location('narration',Path(__file__).with_name('generate-narration.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
if __name__=='__main__':
 failed=[]
 with ThreadPoolExecutor(max_workers=2) as pool:
  jobs={pool.submit(m.generate,locale):locale for locale in ['hi','en','ja','zh-Hans','fr']}
  for job in as_completed(jobs):
   locale=jobs[job]
   try:
    if not job.result():failed.append(locale)
   except Exception as e:failed.append(locale);print(f'{locale}: halted ({type(e).__name__}: {str(e)[:160]})',flush=True)
 print('Production complete.' if not failed else 'Incomplete languages: '+', '.join(failed),flush=True)
 if failed:raise SystemExit(1)
