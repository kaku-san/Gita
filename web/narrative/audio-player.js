/** Recorded narration only. Passage completion, never a guessed timer, advances the story. */
export function createNarrator({createAudio=()=>new Audio(),onState=()=>{},onEnd=()=>{}}={}){
  let audio=null,source=null,epoch=0,request=0,status='missing',rate=1,disposed=false,wantsPlay=false,listeners=[],pendingTime=null;
  function report(next=status){status=next;onState({status,time:audio?.currentTime||0,duration:Number.isFinite(audio?.duration)?audio.duration:0,available:!!source});}
  function setTrack(url,{startTime=null}={}){
    if(disposed)return;if(url===source){if(startTime!==null)seekSeconds(startTime);return;}
    epoch++;request++;wantsPlay=false;
    if(audio){for(const [event,handler] of listeners)audio.removeEventListener(event,handler);listeners=[];audio.pause();audio.removeAttribute('src');audio.load();}
    source=url||null;pendingTime=Math.max(0,Number(startTime)||0);
    if(!source){report('missing');return;}
    const token=epoch,a=audio||createAudio();audio=a;a.preload='auto';a.preservesPitch=true;a.defaultPlaybackRate=a.playbackRate=rate;
    const current=()=>!disposed&&token===epoch&&a===audio;
    const on=(event,handler)=>{listeners.push([event,handler]);a.addEventListener(event,handler);};
    on('loadedmetadata',()=>{if(!current())return;if(pendingTime!==null&&Number.isFinite(a.duration)){a.currentTime=Math.min(pendingTime,Math.max(0,a.duration-.01));pendingTime=null;}report(status==='loading'?'ready':status);});
    on('timeupdate',()=>{if(current())report();});
    on('waiting',()=>{if(current()&&status==='playing')report('buffering');});
    on('playing',()=>{if(current()&&wantsPlay)report('playing');});
    on('ended',()=>{if(current()&&a.ended&&wantsPlay&&['playing','buffering'].includes(status)){wantsPlay=false;report('ended');onEnd();}});
    on('pause',()=>{if(current()&&!a.ended&&wantsPlay){wantsPlay=false;request++;report('paused');}});
    on('error',()=>{if(current()){wantsPlay=false;report('error');}});
    report('loading');a.src=source;a.load();
  }
  async function play(){
    if(!audio||!source||disposed)return false;
    const a=audio,token=epoch,attempt=++request;wantsPlay=true;
    if(status==='error')a.load();if(a.ended)a.currentTime=0;
    try{await a.play();if(disposed||token!==epoch||attempt!==request){if(a!==audio||!wantsPlay)a.pause();return false;}report('playing');return true;}
    catch(e){if(token===epoch&&attempt===request){wantsPlay=false;report(e?.name==='NotAllowedError'?'blocked':'error');}return false;}
  }
  function pause(){request++;wantsPlay=false;audio?.pause();if(source)report('paused');}
  function seekSeconds(value){const time=Math.max(0,Number(value)||0);if(audio&&Number.isFinite(audio.duration)&&audio.duration>0){audio.currentTime=Math.min(time,Math.max(0,audio.duration-.01));pendingTime=null;report();}else pendingTime=time;}
  return {setTrack,play,pause,seekSeconds,
    async prime(){
      if(!audio||disposed)return;const a=audio,token=epoch;
      a.muted=true;
      try{await a.play();if(token===epoch){a.pause();wantsPlay=false;}}catch{}finally{a.muted=false;}
    },
    setRate(value){rate=Math.max(.5,Math.min(2,Number(value)||1));if(audio)audio.defaultPlaybackRate=audio.playbackRate=rate;},
    seek(fraction){if(audio&&Number.isFinite(audio.duration)&&audio.duration>0){seekSeconds(Math.max(0,Math.min(1,Number(fraction)||0))*audio.duration);}},
    dispose(){disposed=true;epoch++;request++;for(const [event,handler] of listeners)audio?.removeEventListener(event,handler);listeners=[];audio?.pause();audio?.removeAttribute('src');audio?.load();audio=null;},
    get status(){return status;},get available(){return !!source;}};
}
