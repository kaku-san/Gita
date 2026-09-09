"""Export real narration from the saved cast. Resume existing takes without paying twice.
Usage: python scripts/generate-narration.py --language hi [--chapter 2] [--limit 1]
"""
from pathlib import Path
import argparse,base64,datetime,hashlib,json,subprocess,urllib.request,urllib.error
ROOT=Path(__file__).resolve().parents[1]
PROD=ROOT/'production/narration'
def digest(data):return hashlib.sha256(data).hexdigest()
def dump(path,data):path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
def generate(locale,chapter=None,limit=None,claim=None):
 cast=json.loads((PROD/'cast.json').read_text())
 rows=json.loads((PROD/'release-script.json').read_text())['languages'][locale]
 for row in rows:assert digest(row['text'].encode())==row['textSha256'],row['id']
 rows=[r for r in rows if chapter is None or r['chapter']==chapter]
 # Same chapter, up to 1,800 text characters. Never split a spoken passage.
 batches=[]
 for row in rows:
  if not batches or row['chapter']!=batches[-1][0]['chapter'] or sum(len(r['text']) for r in batches[-1])+len(row['text'])>1800:batches.append([])
  batches[-1].append(row)
 key=next(x.partition('=')[2].strip() for x in (ROOT/'.env').read_text().splitlines() if x.startswith('ELEVENLABS_API_KEY='))
 for number,group in enumerate(batches):
  if limit is not None and number>=limit:break
  inputs=[{'text':r['text'],'voice_id':cast['languages'][locale]['voices'][r['speakerKey']]['voice_id']} for r in group]
  body={'inputs':inputs,'model_id':'eleven_v3','language_code':cast['languages'][locale]['language_code'],'seed':20260909,'apply_text_normalization':'auto'}
  name=f'{group[0]["id"]}--{group[-1]["id"]}'
  folder=PROD/'takes'/locale/name;folder.mkdir(parents=True,exist_ok=True)
  receipt=folder/'receipt.json';master=folder/'master.mp3';timing=folder/'timing.json'
  fingerprint=digest(json.dumps(body,sort_keys=True,ensure_ascii=False).encode())
  record=json.loads(receipt.read_text()) if receipt.exists() else None
  if record and record.get('status')=='reserved' and claim and record.get('claim')==claim:record=None
  if record:
   assert record['fingerprint']==fingerprint,'Existing take differs; retain it and review before regenerating.'
   if record['status']!='generated':raise RuntimeError(f'{locale}/{name}: prior {record["status"]}; inspect receipt before another paid call')
  else:
   record={'status':'submitted','fingerprint':fingerprint,'submitted_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'request':body,'passages':[{k:r[k] for k in ('id','filename','textSha256','speakerKey')} for r in group]};dump(receipt,record)
   try:
    req=urllib.request.Request('https://api.elevenlabs.io/v1/text-to-dialogue/with-timestamps?output_format=mp3_44100_128',data=json.dumps(body).encode(),headers={'xi-api-key':key,'Content-Type':'application/json'},method='POST')
    with urllib.request.urlopen(req,timeout=240) as response:
     result=json.load(response);record['character_cost']=response.headers.get('character-cost');record['request_id']=response.headers.get('request-id')
    audio=base64.b64decode(result.pop('audio_base64'),validate=True);assert len(audio)>1000
    master.write_bytes(audio);dump(timing,result);record.update(status='generated',master_sha256=digest(audio));dump(receipt,record)
   except urllib.error.HTTPError as e:
    try:detail=json.loads(e.read()).get('detail',{})
    except Exception:detail={}
    record.update(status='rejected',http_status=e.code,detail=json.loads(json.dumps(detail).replace(key,'[redacted]')));dump(receipt,record)
    print(json.dumps({'language':locale,'take':name,'status':record['status'],'http_status':e.code,'detail':record['detail']},ensure_ascii=False),flush=True);return False
   except Exception as e:
    record.update(status='outcome_unknown',error_type=type(e).__name__);dump(receipt,record);raise
  duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',str(master)]))
  result=json.loads(timing.read_text());segments=result['voice_segments'];bounds=[]
  for i,row in enumerate(group):
   selected=[s for s in segments if s['dialogue_input_index']==i]
   assert selected and all(s['voice_id']==inputs[i]['voice_id'] for s in selected),f'Missing/wrong speaker segment: {locale}/{row["id"]}'
   start=min(s['start_time_seconds'] for s in selected);end=max(s['end_time_seconds'] for s in selected)
   assert 0<=start<end<=duration+.15
   if bounds:assert start>=bounds[-1][1]-.03,'Overlapping speaker segments need manual review'
   bounds.append((start,end))
  cuts=[0]+[(bounds[i-1][1]+bounds[i][0])/2 for i in range(1,len(bounds))]+[duration]
  for i,row in enumerate(group):
   out=ROOT/'web/audio'/row['filename'];out.parent.mkdir(parents=True,exist_ok=True)
   if not out.exists():
    subprocess.run(['ffmpeg','-v','error','-y','-i',str(master),'-ss',str(cuts[i]),'-t',str(cuts[i+1]-cuts[i]),'-ac','1','-ar','44100','-c:a','libmp3lame','-b:a','128k',str(out)],check=True)
   seconds=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',str(out)]))
   assert .25<seconds<180
   metadata={'id':row['id'],'language':locale,'src':'./audio/'+row['filename'],'duration':seconds,'textSha256':row['textSha256'],'audioSha256':digest(out.read_bytes()),'voice_id':inputs[i]['voice_id'],'model_id':'eleven_v3','source_take':str(folder.relative_to(PROD)),'start':cuts[i],'end':cuts[i+1]}
   dump(folder/(row['id']+'.json'),metadata)
  print(json.dumps({'language':locale,'take':name,'clips':len(group),'duration':round(duration,2),'status':'ready','character_cost':record.get('character_cost')},ensure_ascii=False),flush=True)
 return True
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--language',required=True,choices=['en','hi','ja','zh-Hans','fr']);p.add_argument('--chapter',type=int);p.add_argument('--limit',type=int);a=p.parse_args()
 if not generate(a.language,a.chapter,a.limit):raise SystemExit(1)
