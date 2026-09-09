"""Create the four native context narrators, preserving previews and request receipts."""
from pathlib import Path
import json,urllib.request,urllib.error,base64,concurrent.futures
ROOT=Path(__file__).resolve().parents[1];PROD=ROOT/'production/narration'
key=next(x.partition('=')[2].strip() for x in (ROOT/'.env').read_text().splitlines() if x.startswith('ELEVENLABS_API_KEY='))
release=json.loads((PROD/'release-script.json').read_text())
labels={'hi':'Hindi, standard Indian Hindi pronunciation','ja':'Japanese, standard Tokyo pronunciation','zh-Hans':'Mandarin Chinese, standard Putonghua pronunciation','fr':'French, standard metropolitan French pronunciation'}
def write(p,x):p.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
def post(path,body):
 req=urllib.request.Request('https://api.elevenlabs.io'+path,data=json.dumps(body).encode(),headers={'xi-api-key':key,'Content-Type':'application/json'},method='POST')
 with urllib.request.urlopen(req,timeout=180) as response:return json.load(response)
def design(locale):
 folder=PROD/'auditions'/f'{locale}-context';folder.mkdir(parents=True,exist_ok=True);saved=folder/'voice.json'
 if saved.exists():return locale,json.loads(saved.read_text())
 text=' '.join(r['text'] for r in release['languages'][locale] if r['speakerKey']=='Sanjaya')[:900]
 description=f'Native {labels[locale]}. Male, age 40. Studio quality. A composed storyteller introducing an ancient Indian philosophical drama. Clear, warm middle-register voice, measured flowing speech and precise native diction. Understated and observant, gently inviting the listener into the story. Natural pauses and human warmth. Calm context narration, emotionally distinct from the youthful warrior and the melodious divine teacher.'
 request={'model_id':'eleven_ttv_v3','text':text,'voice_description':description,'auto_generate_text':False,'guidance_scale':5,'seed':20260910,'should_enhance':False}
 meta=folder/'previews.json'
 try:
  if not meta.exists():
   if (folder/'submitted.json').exists():raise RuntimeError('Previous generation outcome needs review')
   write(folder/'submitted.json',request);response=post('/v1/text-to-voice/design?output_format=mp3_44100_128',request)
   for i,p in enumerate(response['previews']):
    (folder/f'context-{i+1}.mp3').write_bytes(base64.b64decode(p.pop('audio_base_64')))
   write(meta,response)
  data=json.loads(meta.read_text());previews=data['previews'];language='zh' if locale=='zh-Hans' else locale
  selected=next((p for p in previews if p.get('language') in (language,'cmn')),previews[0])
  req={'voice_name':f'Geeta — Context — {locale}','voice_description':description,'generated_voice_id':selected['generated_voice_id'],'labels':{'language':language,'project':'Geeta','character':'context'}}
  # A submitted save is retained to prevent duplicate mutations after ambiguous failures.
  if (folder/'save-request.json').exists():raise RuntimeError('Previous save outcome needs review')
  write(folder/'save-request.json',req);voice=post('/v1/text-to-voice',req)
  result={'voice_id':voice['voice_id'],'name':req['voice_name'],'kind':'designed','language_code':language,'description':description,'selection':'First matching-language preview for production under user authorization; listening review pending','generated_preview_id':selected['generated_voice_id']};write(saved,result)
  print(json.dumps({'locale':locale,'status':'saved','voice_id':result['voice_id']}),flush=True);return locale,result
 except urllib.error.HTTPError as e:
  detail=json.loads(e.read()).get('detail',{});safe=json.loads(json.dumps(detail).replace(key,'[redacted]'));write(folder/'error.json',{'code':e.code,'detail':safe});print(json.dumps({'locale':locale,'code':e.code,'detail':safe}),flush=True);return locale,None
if __name__=='__main__':
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(design,labels))
 cast=json.loads((PROD/'cast.json').read_text());cast['languages']['en']['voices']['Sanjaya']={'voice_id':'8JVbfL6oEdmuxKn5DK2C','name':'Johnny Kid — Serious and Calm Narrator','kind':'library','source':'https://elevenlabs.io/voice-library/narrator-voices'}
 for locale,voice in results:
  if voice:cast['languages'][locale]['voices']['Sanjaya']=voice
 write(PROD/'cast.json',cast)
