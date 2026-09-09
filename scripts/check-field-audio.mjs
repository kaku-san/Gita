import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createSound} from '../web/sound.js';
import {createFieldRecordings} from '../web/experience/field-recordings.js';

const root=new URL('../',import.meta.url);
const read=p=>readFile(new URL(p,root));
const bank=JSON.parse(await read('web/audio/battlefield.json'));
const prepared=JSON.parse(await read('production/sound/preparation.json'));
assert.equal(bank.layers.length,8);
assert.deepEqual(bank,JSON.parse(await read('production/sound/battlefield.ready.json')));
let bytes=0,decodedBytesAt48k=0;
for(const item of bank.layers){
  const name=item.src.split('/').at(-1),entry=prepared.files.find(x=>x.file===name);
  const file=await read('web/audio/field/'+name),original=await read('production/sound/originals/'+name);
  const hash=b=>createHash('sha256').update(b).digest('hex');
  assert.equal(hash(file),entry.runtime_sha256);assert.equal(hash(original),entry.source_sha256);
  assert(entry.peak_dbfs< -3.5&&entry.rms_dbfs> -50);
  assert.equal(entry.channels,item.spatial===false?2:1);
  if(item.loop)assert.equal(entry.loop_overlap_seconds,.16);
  bytes+=file.length;decodedBytesAt48k+=entry.seconds*48000*entry.channels*4;
}
assert(bytes<1.7e6);assert(decodedBytesAt48k<30e6);

class Param{
  value=0;calls=[];
  setValueAtTime(v,t){this.value=v;this.calls.push(['set',v,t]);}
  setTargetAtTime(v,t,s){this.value=v;this.calls.push(['target',v,t,s]);}
  linearRampToValueAtTime(v,t){this.value=v;this.calls.push(['ramp',v,t]);}
  cancelAndHoldAtTime(){} cancelScheduledValues(){}
}
class Node{
  connections=[];
  constructor(params=[]){for(const p of params)this[p]=new Param();}
  connect(n){assert(n);this.connections.push(n);return n;}
  disconnect(){this.connections=[];}
}
class Source extends Node{
  constructor(ctx){super(['playbackRate']);this.ctx=ctx;this.stopped=false;}
  start(time){assert(this.buffer);this.started=time;this.ctx.started.push(this);}
  stop(){this.stopped=true;this.finish();}
  finish(){const f=this.onended;this.onended=null;f?.();}
}
const contexts=[];
class Context extends EventTarget{
  state='suspended';currentTime=0;nodes=[];started=[];gainNodes=[];resumes=0;decoding=0;peakDecodes=0;
  destination=new Node();
  listener=new Node(['positionX','positionY','positionZ','forwardX','forwardY','forwardZ','upX','upY','upZ']);
  constructor(){super();contexts.push(this);}
  node(n){this.nodes.push(n);return n;}
  createGain(){const n=this.node(new Node(['gain']));this.gainNodes.push(n);return n;}
  createDynamicsCompressor(){return this.node(new Node(['threshold','knee','ratio','attack','release']));}
  createBiquadFilter(){return this.node(new Node(['frequency','Q']));}
  createPanner(){return this.node(new Node(['positionX','positionY','positionZ']));}
  createBufferSource(){return this.node(new Source(this));}
  async decodeAudioData(data){
    this.peakDecodes=Math.max(this.peakDecodes,++this.decoding);await Promise.resolve();--this.decoding;
    return {duration:12,numberOfChannels:1,id:new Uint8Array(data)[0]};
  }
  async resume(){this.resumes++;this.state='running';this.dispatchEvent(new Event('statechange'));}
  async suspend(){this.state='suspended';this.dispatchEvent(new Event('statechange'));}
  async close(){this.state='closed';}
}
const doc=new EventTarget();doc.hidden=false;
const saved=Object.fromEntries(['AudioContext','document','location','fetch','setInterval','clearInterval','setTimeout','clearTimeout'].map(k=>[k,globalThis[k]]));
let intervals=new Map(),timeouts=new Map(),timer=0,missing=new Set();
const ids=new Map(bank.layers.map((x,i)=>[x.src.split('/').at(-1),i+1]));
Object.assign(globalThis,{AudioContext:Context,document:doc,location:new URL('https://geeta.test/'),
  fetch:async url=>{
    const name=new URL(url).pathname.split('/').at(-1);
    if(name==='battlefield.json')return {ok:true,json:async()=>bank};
    if(missing.has(name))return {ok:false};
    assert(ids.has(name),'Only declared local assets are fetched');
    return {ok:true,arrayBuffer:async()=>Uint8Array.of(ids.get(name)).buffer};
  },
  setInterval:f=>{const id=++timer;intervals.set(id,f);return id;},clearInterval:id=>intervals.delete(id),
  setTimeout:f=>{const id=++timer;timeouts.set(id,f);return id;},clearTimeout:id=>timeouts.delete(id)
});
const flush=async()=>{await Promise.resolve();await Promise.resolve();};
const parked=async()=>{for(const [id,f] of [...timeouts]){timeouts.delete(id);f();}await flush();};
try{
  const sound=createSound();sound.setListener({x:5,y:3,z:9},{x:0,y:0,z:0,w:1});
  assert.equal(contexts.length,0,'No context before gesture');
  const pending=sound.start(),ctx=contexts[0];
  assert.equal(ctx.resumes,1,'Resume happens in the original gesture');await pending;
  assert.equal(ctx.peakDecodes,1,'One concurrent decode');assert.equal(ctx.started.length,3,'Three loop beds');
  assert.equal(intervals.size,1);assert.equal(ctx.listener.positionX.value,5);
  const [master,field,combat,travel,signal,wind]=ctx.gainNodes;
  assert.equal(travel.gain.value,0,'Stationary chariot has no hoof loop volume');
  sound.setTravel(1);assert(travel.gain.value>.8);
  const baseline=combat.gain.value;
  ctx.currentTime=100;for(const tick of intervals.values())tick();
  const signalSources=ctx.started.filter(s=>[7,8].includes(s.buffer.id));assert.equal(signalSources.length,2);
  sound.setNarration(true);assert(combat.gain.value<baseline*.25);assert(signalSources.every(s=>s.stopped),'Signals stop under speech');
  sound.setNarration(false);sound.state(1,0);assert(combat.gain.value<baseline*.3);
  sound.state(0,0);sound.setEnding(1);assert.equal(combat.gain.value,0);assert.equal(travel.gain.value,0);assert.equal(signal.gain.value,0);assert(wind.gain.value>0);
  sound.setEnding(0);sound.mute();assert.equal(master.gain.value,0);assert.equal(intervals.size,0);await parked();assert.equal(ctx.state,'suspended');
  sound.mute(false);await flush();assert.equal(ctx.state,'running');assert.equal(intervals.size,1);
  doc.hidden=true;doc.dispatchEvent(new Event('visibilitychange'));await parked();assert.equal(ctx.state,'suspended');
  doc.hidden=false;doc.dispatchEvent(new Event('visibilitychange'));await flush();assert.equal(ctx.state,'running');
  sound.stop();await parked();assert.equal(ctx.state,'suspended');assert.equal(sound.enabled,false);
  await sound.dispose();assert.equal(ctx.state,'closed');assert.equal(intervals.size,0);assert.equal(timeouts.size,0);assert(ctx.nodes.every(n=>n.connections.length===0));
  await assert.rejects(()=>sound.start(),/disposed/);

  const direct=new Context(),buses=Object.fromEntries(['bedBus','actionBus','travelBus','accentBus','windBus'].map(k=>[k,direct.createGain()]));
  missing=new Set(['combat-right.mp3']);const recordings=createFieldRecordings(direct,buses);await recordings.load();
  recordings.tick(100);const started=direct.started.length;
  recordings.tick(200);assert.equal(direct.started.length,started,'Active clips never overlap themselves');
  for(const s of direct.started.filter(s=>!s.loop))s.finish();
  recordings.tick(300);assert(direct.started.length>started,'Completed events can recur');
  assert(!direct.started.some(s=>s.buffer.id===4),'One missing clip leaves the others playable');recordings.dispose();

  missing=new Set(ids.keys());const retry=createSound();await assert.rejects(()=>retry.start(),/unavailable/);assert.equal(retry.enabled,false);
  missing.clear();await retry.start();assert.equal(retry.enabled,true);await retry.dispose();
  console.log(JSON.stringify({passed:true,layers:8,downloadBytes:bytes,decodedBytesAt48k,checks:['lazy gesture startup','serial decode','no synthesized source API','narration and vision ducking','closing wind','event overlap and recurrence','listener pose','mute and background suspension','disposal','partial failure and full retry'],deviceListening:'pending'},null,2));
}finally{Object.assign(globalThis,saved);}
