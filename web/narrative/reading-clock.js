/** Optional, explicit auto reading. Recorded audio uses its own real end event. */
export function readingSeconds(text,locale='en'){
  if(/^(ja|zh)/.test(locale))return Math.max(11,Math.min(65,Array.from(text.replace(/\s|[。、，！？!?.]/gu,'')).length/4.5+4));
  const count=typeof Intl.Segmenter==='function'?[...new Intl.Segmenter(locale,{granularity:'word'}).segment(text)].filter(s=>s.isWordLike).length:text.trim().split(/\s+/).length;
  return Math.max(10,Math.min(65,count/(locale==='hi'?2.35:2.8)+4));
}
export function createReadingClock({onEnd=()=>{}}={}){
  let duration=10,elapsed=0,playing=false,rate=1,ended=false;
  return {
    set(text,locale='en'){duration=readingSeconds(text,locale);elapsed=0;ended=false;},
    play(){if(ended){elapsed=0;ended=false;}playing=true;},pause(){playing=false;},
    setRate(value){rate=Math.max(.65,Math.min(1.5,Number(value)||1));},
    update(dt,blocked=false){if(playing&&!blocked&&!ended){elapsed=Math.min(duration,elapsed+Math.max(0,Math.min(Number(dt)||0,.25))*rate);if(elapsed>=duration){ended=true;playing=false;onEnd();}}return elapsed/duration;},
    get playing(){return playing;},get progress(){return elapsed/duration;},get duration(){return duration;}
  };
}

export const openingShots=[
  {camera:[26,15,28],aim:[0,3,13]},
  {camera:[3,4.5,2],aim:[0,3.8,-1.47]},
  {camera:[3,4.4,5],aim:[0,3.9,.93]},
  {camera:[14,7.8,18],aim:[0,2.8,2.5]},
  {camera:[14,7.8,18],aim:[0,2.8,2.5]}
];
