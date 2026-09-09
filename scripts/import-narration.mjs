// Usage: node scripts/import-narration.mjs /absolute/path/to/recordings
// Input: en/0.0.1.mp3, hi/0.0.1.mp3, etc., matching the recording manifest.
import {readFile,writeFile,mkdir,copyFile,stat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
const input=process.argv[2];if(!input||!input.startsWith('/'))throw Error('Provide an absolute recordings folder.');
const production=JSON.parse(await readFile(new URL('../production/narration/recording-manifest.json',import.meta.url)));
const runtimeURL=new URL('../web/narrative/audio.json',import.meta.url);
const runtime=JSON.parse(await readFile(runtimeURL));let imported=0;
const candidates=[];
for(const [language,records] of Object.entries(production.languages))for(const record of records){
  const source=join(resolve(input),record.filename);
  let info;try{info=await stat(source);}catch(e){if(e.code==='ENOENT')continue;throw e;}
  if(!info.isFile()||info.size<128)throw Error(`Recording is empty or invalid: ${record.filename}`);
  const bytes=await readFile(source);const id3=bytes.toString('ascii',0,3)==='ID3',mpeg=bytes[0]===0xff&&(bytes[1]&0xe0)===0xe0;
  if(!id3&&!mpeg)throw Error(`Expected an MP3 recording: ${record.filename}`);
  candidates.push({language,record,source});
}
if(!candidates.length)throw Error('No matching recordings found. Nothing changed.');
for(const {language,record,source} of candidates){
  const target=new URL('../web/audio/'+record.filename,import.meta.url);await mkdir(new URL('./',target),{recursive:true});await copyFile(source,target);
  runtime.languages[language][record.id]={src:'./audio/'+record.filename,textSha256:record.textSha256};imported++;
}
runtime.status=Object.entries(production.languages).every(([language,records])=>records.every(r=>runtime.languages[language]?.[r.id]))?'complete':'partial';
await writeFile(runtimeURL,JSON.stringify(runtime,null,2)+'\n');console.log(`Imported ${imported} recordings. Overall status: ${runtime.status}.`);
