"""Validate all 965 exported clips and install a complete runtime manifest, atomically."""
from pathlib import Path
import concurrent.futures,hashlib,json,subprocess
import numpy as np
ROOT=Path(__file__).resolve().parents[1];PROD=ROOT/'production/narration'
def sha(data):return hashlib.sha256(data).hexdigest()
def inspect(item):
 locale,row,meta=item;path=ROOT/'web/audio'/row['filename'];data=path.read_bytes()
 assert sha(data)==meta['audioSha256'],row['filename']+' audio hash'
 pcm=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-ac','1','-ar','16000','-f','f32le','pipe:1']),dtype='<f4')
 assert len(pcm)>4000 and np.isfinite(pcm).all(),row['filename']+' decode'
 rms=float(np.sqrt(np.mean(pcm.astype(np.float64)**2)));assert rms>1e-4,row['filename']+' silence'
 assert abs(len(pcm)/16000-meta['duration'])<.15,row['filename']+' duration'
 return locale,row,meta,dict(bytes=len(data),decoded_seconds=round(len(pcm)/16000,4),rms_dbfs=round(float(20*np.log10(rms)),2),peak=float(np.max(np.abs(pcm))))
def main():
 script=json.loads((PROD/'release-script.json').read_text());cast=json.loads((PROD/'cast.json').read_text());metadata={};cost=0
 for p in (PROD/'takes').glob('*/*/receipt.json'):
  receipt=json.loads(p.read_text())
  if receipt['status']!='generated':continue
  cost+=int(receipt.get('character_cost') or 0)
  assert sha((p.parent/'master.mp3').read_bytes())==receipt['master_sha256']
  for row in receipt['passages']:
   clip=p.parent/(row['id']+'.json')
   if clip.exists():
    meta=json.loads(clip.read_text());key=(meta['language'],meta['id'])
    assert key not in metadata,'Duplicate production take for '+str(key)
    metadata[key]=meta
 jobs=[];missing=[]
 for locale,rows in script['languages'].items():
  assert len(rows)==193
  for row in rows:
   meta=metadata.get((locale,row['id']))
   if not meta:missing.append(locale+'/'+row['id']);continue
   assert sha(row['text'].encode())==row['textSha256']==meta['textSha256']
   assert meta['voice_id']==cast['languages'][locale]['voices'][row['speakerKey']]['voice_id']
   jobs.append((locale,row,meta))
 if missing:raise SystemExit(f'{len(missing)} recordings remain. First: '+', '.join(missing[:8]))
 runtime={'version':2,'status':'complete','model':'eleven_v3','languages':{},'openings':{}}
 report={'status':'complete','clips':len(jobs),'characters':sum(len(r['text']) for rows in script['languages'].values() for r in rows),'returned_character_cost':cost,'languages':{},'clips_checked':{},'subjective_listening_review':'Hindi Krishna preview 2 approved by user; full multilingual listening and native-editor review not performed','device_testing':'not performed'}
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
  for locale,row,meta,signal in pool.map(inspect,jobs):
   section=runtime['openings' if row['id'].startswith('opening.') else 'languages'].setdefault(locale,{})
   section[row['id']]={k:meta[k] for k in ('src','duration','textSha256','voice_id')}
   stats=report['languages'].setdefault(locale,{'story_clips':0,'opening_clips':0,'seconds':0,'bytes':0})
   stats['opening_clips' if row['id'].startswith('opening.') else 'story_clips']+=1;stats['seconds']+=signal['decoded_seconds'];stats['bytes']+=signal['bytes']
   report['clips_checked'][locale+'/'+row['id']]=signal
 for stats in report['languages'].values():stats['minutes']=round(stats.pop('seconds')/60,2)
 assert len(jobs)==965 and all(s['story_clips']==188 and s['opening_clips']==5 for s in report['languages'].values())
 tmp=ROOT/'web/narrative/audio.complete.json';tmp.write_text(json.dumps(runtime,ensure_ascii=False,indent=2)+'\n');tmp.replace(ROOT/'web/narrative/audio.json')
 (PROD/'release-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 (ROOT/'web/narrative/voice-credits.json').write_text(json.dumps(cast,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({k:v for k,v in report.items() if k!='clips_checked'},ensure_ascii=False,indent=2))
if __name__=='__main__':main()
