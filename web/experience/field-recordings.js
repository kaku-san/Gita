/** Fetch compressed field recordings on arrival; create audio nodes only after a gesture. */
let manifestPromise;
const recordingBytes=new Map();
function fieldManifest(){
 if(!manifestPromise)manifestPromise=fetch(new URL('../audio/battlefield.json?v=11',import.meta.url)).then(r=>{if(!r.ok)throw Error('Battlefield sound unavailable.');return r.json();}).catch(error=>{manifestPromise=null;throw error;});
 return manifestPromise;
}
function fieldBytes(src){
 const url=new URL(src,location.href);if(url.origin!==location.origin)throw Error('Recordings must be hosted with the experience.');
 if(!recordingBytes.has(url.href))recordingBytes.set(url.href,fetch(url).then(async r=>{if(!r.ok)throw Error('Recording unavailable');const data=await r.arrayBuffer();if(!data.byteLength||data.byteLength>2e6)throw Error('Recording exceeds the audio budget.');return data;}).catch(error=>{recordingBytes.delete(url.href);throw error;}));
 return recordingBytes.get(url.href);
}
export async function preloadFieldRecordings(){
 const manifest=await fieldManifest(),layers=(manifest.layers||[]).slice(0,12);
 for(let i=0;i<layers.length;i+=3)await Promise.all(layers.slice(i,i+3).filter(item=>item.src).map(item=>fieldBytes(item.src)));
}
export function createFieldRecordings(ctx,{bedBus,actionBus,travelBus,accentBus,windBus}){
  const beds=[],events=[],voices=new Set();
  const abort=new AbortController();let disposed=false,loaded=false;
  const buses={field:bedBus,combat:actionBus,travel:travelBus,signal:accentBus,wind:windBus};
  async function buffer(src){
    const url=new URL(src,location.href);
    if(url.origin!==location.origin)throw Error('Recordings must be hosted with the experience.');
    const data=await fieldBytes(src);if(disposed)throw Error('Recordings disposed');
    const decoded=await ctx.decodeAudioData(data.slice(0));
    if(decoded.duration>31||decoded.numberOfChannels>2)throw Error('Recording exceeds the decoded audio budget.');
    return decoded;
  }
  function play(item,time,loop=false){
    if(disposed||voices.size>=12||item.active)return;
    const source=ctx.createBufferSource(),gain=ctx.createGain();
    const pan=item.spatial===false?null:ctx.createPanner();
    source.buffer=item.buffer;source.loop=loop;
    source.playbackRate.value=loop?1:.985+Math.random()*.03;
    const duration=item.buffer.duration/source.playbackRate.value;
    if(pan){
      const pos=item.position||[0,2,40];
      pan.panningModel='HRTF';pan.distanceModel='inverse';
      pan.refDistance=item.bus==='travel'||item.near?8:24;
      pan.rolloffFactor=.7;pan.maxDistance=350;
      [pan.positionX.value,pan.positionY.value,pan.positionZ.value]=pos;
    }
    gain.gain.setValueAtTime(0,time);
    gain.gain.linearRampToValueAtTime(Math.max(0,Math.min(1,item.gain??.4)),time+(loop?.8:.04));
    source.connect(gain);gain.connect(pan||buses[item.bus]);pan?.connect(buses[item.bus]);
    const voice={source,gain,pan,item,loop,stopping:false};
    voices.add(voice);item.active=true;
    source.onended=()=>{
      voices.delete(voice);item.active=false;source.onended=null;
      source.disconnect();gain.disconnect();pan?.disconnect();
    };
    source.start(time);
    if(!loop){
      gain.gain.setTargetAtTime(0,Math.max(time+.04,time+duration-.05),.015);
      const [a,b]=item.interval||[8,18];
      // Intervals are quiet time after the clip; a clip never overlaps itself.
      item.next=time+duration+Math.max(.8,a)+Math.random()*Math.max(0,b-a);
    }
  }
  async function load(){
    const manifest=await fieldManifest();
    // Decode serially to bound peak memory on phones, starting the wind first.
    for(const item of (manifest.layers||[]).slice(0,12)){
      if(disposed)return;
      if(!item.src||!buses[item.bus])continue;
      try{
        const decoded=await buffer(item.src);if(disposed)return;
        const first=item.startAfter||[3,8];
        const row={...item,buffer:decoded,next:ctx.currentTime+first[0]+Math.random()*(first[1]-first[0]),active:false};
        if(item.loop){beds.push(row);play(row,ctx.currentTime+.04,true);}else events.push(row);
      }catch(error){if(disposed||error.name==='AbortError')return;}
    }
    loaded=true;
    if(!beds.length&&!events.length)throw Error('Battlefield sound unavailable.');
  }
  function tick(time,{travel=0,narration=false,vision=0,ending=0}={}){
    if(disposed||!loaded)return;
    for(const item of events){
      if(time<item.next||item.active)continue;
      if(ending>.98||item.bus==='travel'&&travel<.025||item.bus==='signal'&&(narration||vision>.5||ending>.02)){
        item.next=time+2+Math.random()*4;continue;
      }
      play(item,time+.02);
    }
  }
  function stopEvents(bus){
    for(const voice of voices){
      if(voice.loop||voice.stopping||bus&&voice.item.bus!==bus)continue;
      voice.stopping=true;
      const now=ctx.currentTime,param=voice.gain.gain;
      if(param.cancelAndHoldAtTime)param.cancelAndHoldAtTime(now);
      else{param.cancelScheduledValues(now);param.setValueAtTime(param.value,now);}
      param.linearRampToValueAtTime(0,now+.06);
      voice.source.stop(now+.065);
      voice.item.next=Math.max(voice.item.next,now+4);
    }
  }
  function dispose(){
    disposed=true;abort.abort();
    for(const v of voices){v.source.onended=null;try{v.source.stop();}catch{}v.source.disconnect();v.gain.disconnect();v.pan?.disconnect();v.source.buffer=null;}
    voices.clear();beds.length=events.length=0;
  }
  return {load,tick,stopEvents,dispose};
}
