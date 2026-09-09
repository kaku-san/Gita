import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {story} from '../web/narrative/story.js';
import {entries,contentFor} from '../web/narrative/journey.js';
const root=new URL('../production/narration/',import.meta.url);
await mkdir(root,{recursive:true});
const manifest={version:1,status:'text-ready-audio-not-generated',languages:{}};
for(const language of ['en','hi','ja','zh-Hans','fr']){
  const localized=language==='en'?story:JSON.parse(await readFile(new URL(`../web/narrative/locales/${language}.json`,import.meta.url),'utf8'));
  const folder=new URL(language+'/',root);await mkdir(new URL('passages/',folder),{recursive:true});
  const records=entries.map(entry=>{
    const {chapter,scene,beat}=contentFor(entry,localized);
    return {id:entry.id,language,chapter:entry.chapter,scene:entry.chapter?entry.scene+1:0,beat:entry.beat+1,chapterTitle:chapter?.title||'Prologue',sceneTitle:scene?.title||'Prologue',speakerKey:entry.speaker,speaker:beat.speaker,text:beat.text,filename:`${language}/${entry.id}.mp3`,textSha256:createHash('sha256').update(beat.text).digest('hex')};
  });
  manifest.languages[language]=records.map(({id,speakerKey,filename,textSha256})=>({id,speakerKey,filename,textSha256}));
  await writeFile(new URL('recordings.jsonl',folder),records.map(r=>JSON.stringify(r)).join('\n')+'\n');
  const csvCell=s=>'"'+String(s).replaceAll('"','""')+'"';
  const fields=['id','speakerKey','speaker','text','filename'];
  await writeFile(new URL('recordings.csv',folder),'\uFEFF'+[fields,...records.map(r=>fields.map(k=>r[k]))].map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n');
  for(const row of records)await writeFile(new URL('passages/'+row.id+'.txt',folder),row.text+'\n');
  let script=`# Geeta — ${language}\n\nNarration script. Speaker labels and passage IDs are production cues; speak only the paragraph below each cue.\n\n`;
  let lastChapter=-1;for(const row of records){if(row.chapter!==lastChapter){script+=`## ${row.chapter}. ${row.chapterTitle}\n\n`;lastChapter=row.chapter;}script+=`### ${row.id} · ${row.speaker}\n\n${row.text}\n\n`;}
  await writeFile(new URL('script.md',folder),script);
}
await writeFile(new URL('recording-manifest.json',root),JSON.stringify(manifest,null,2)+'\n');
console.log('Prepared 5 languages × 194 passages = 970 recording scripts. No audio generated.');
