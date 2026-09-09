import {createArrival,setPlaybackButton,wordmarks} from './experience/arrival.js?v=14';
import {renderCredits} from './experience/credits.js?v=14';
import {preloadFieldRecordings} from './experience/field-recordings.js?v=14';
import {createPreparation,createAudioCache,preparationCopy} from './experience/preparation.js?v=12';
import {chapterTimeline,locateChapterTime,locateSkip,playbackSpeeds} from './experience/podcast.js';
import {story} from './narrative/story.js';
import {entries,createJourney,contentFor,indexFromHash,hashFor,savedIndex} from './narrative/journey.js';
import {createNarrator} from './narrative/audio-player.js?v=12';
import {createReadingClock} from './narrative/reading-clock.js';
import {createCreditsClock,creditPhases} from './experience/opening-credits.js?v=12';
import {ui,languages} from './narrative/ui.js';
import {experienceCopy} from './narrative/experience-copy.js';
import {flowCopy} from './narrative/flow-copy.js';
import {createSound} from './sound.js?v=14';
import {createEndingTimeline} from './experience/ending.js';
import {endingCopy} from './experience/ending-copy.js';
import {createInterface} from './experience/interface.js?v=14';
const $=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)],storageKey='geeta-journey-v1';
let saved={};try{saved=JSON.parse(localStorage.getItem(storageKey)||'{}')||{};}catch{}
const deepLink=indexFromHash(location.hash),director=createJourney({initial:deepLink??savedIndex(saved)});
const ambience=createSound(),reducedQuery=matchMedia('(prefers-reduced-motion: reduce)');
let locale='en',localized=story,u=ui.en,x=experienceCopy.en,f=flowCopy.en,mode=saved.mode==='read'?'read':'listen';
let lastBookmarkWrite=0;
let openingAdvanceRequested=false,openingHiddenPause=false;
let entered=false,world=null,sceneFailed=false,opening=-1,sourceOpen=false,readingTab='shloka',selectedVerse=null,dialogueHidden=false;
let resumeBookmark={id:saved.passageId,time:Number(saved.audioTime)||0};
let entryRestart=false,worldPromise=null,worldResolve=null,worldReject=null;
let arrival=null,languageChosen=false,languagePending=false,gatePending=false,entryStarting=false,entryError=false;
const audioCache=createAudioCache();
let languageRequest=0,verseRequest=0,idleTimer=0,clockFrame=0,clockLast=0;
const localizedCache={en:story};let manifest={languages:{}},audioState={status:'missing',time:0,duration:0,available:false};
const ending=createEndingTimeline({onComplete:showEndScreen});
const readingClock=createReadingClock({onEnd:()=>{if(director.index<entries.length-1)choose(director.index+1,{autoRead:true,autoplay:false});else beginEnding();}});
const openingClock=createCreditsClock({onEnd:()=>advanceOpening()});
const narrator=createNarrator({onState:s=>{audioState=s;if(entered&&opening<0&&s.status==='playing'&&performance.now()-lastBookmarkWrite>5000){lastBookmarkWrite=performance.now();save();}if(opening>=0&&mode==='listen'&&['blocked','error'].includes(s.status)){openingClock.pause();world?.setOpeningPlaying(false);}renderAudio();ambience.setNarration?.(['playing','buffering'].includes(s.status));if(s.status==='playing')scheduleHide();else revealControls();},onEnd:()=>{if(entered&&opening<0&&!ending.active&&mode==='listen'){if(director.index<entries.length-1)choose(director.index+1,{autoplay:true});else beginEnding();}}});
const roman=n=>['','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII'][n];
const fmtTime=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
const position=()=>contentFor(director.entry,localized),hasModal=()=>all('dialog').some(d=>d.open);
const interfaceUI=createInterface({onLayout:reserve});
installPodcast();
const preparation=createPreparation({root:$('#preparation'),intro:$('#intro'),content:$('#experience-ui'),locale:()=>locale,onReady:()=>revealStory(entryRestart),onCancel:()=>$('#enter').focus()});
function installPodcast(){
 const dock=$('#journey-dock'),details=$('#player-details');
 const heading=document.createElement('div');heading.id='podcast-heading';
 const speaker=document.createElement('span');speaker.id='podcast-speaker';heading.append(speaker);
 const speed=document.createElement('select');speed.id='podcast-speed';
 for(const rate of playbackSpeeds){const option=document.createElement('option');option.value=rate;option.textContent=rate+'×';speed.append(option);}heading.append(speed);dock.prepend(heading);
 dock.append($('.audio-timeline'));
 const transport=$('#listen-panel .transport');details.querySelector('.detail-navigation').append($('#audio-next'));
 for(const [id,direction] of [['audio-rewind',-1],['audio-forward',1]]){
  const button=document.createElement('button');button.id=id;button.className='podcast-skip';button.type='button';
  button.innerHTML='<svg aria-hidden="true" viewBox="0 0 32 32"><path d="M7 9a11 11 0 1 1-2 10M7 3v6H1"'+(direction>0?' transform="translate(32 0) scale(-1 1)"':'')+'/></svg><span aria-hidden="true">15</span>';
  if(direction<0)transport.prepend(button);else transport.append(button);
  button.onclick=()=>skipAudio(direction*15);
 }
 speed.onchange=e=>setPlaybackRate(e.target.value);
 $('#audio-seek').onchange=e=>seekChapter(Number(e.target.value)/100);
}
function timeline(){return chapterTimeline(entries,director.index,manifest.languages?.[locale]);}
function seekChapter(fraction){const chapter=timeline();if(!chapter.complete)return;goAudioTime(chapter,chapter.duration*fraction);}
function skipAudio(seconds){const target=locateSkip(entries,director.index,audioState.time,seconds,manifest.languages?.[locale]);goAudioTarget(target);}
function goAudioTime(chapter,seconds){
 goAudioTarget(locateChapterTime(chapter,seconds));
}
function goAudioTarget(target){
 if(!target||!entered||opening>=0||ending.active||mode!=='listen')return;
 const playing=['playing','buffering'].includes(narrator.status);
 if(target.index!==director.index){choose(target.index,{autoplay:false,autoRead:false});narrator.seekSeconds(target.time);if(playing)narrator.play();}
 else narrator.seekSeconds(target.time);
 save();
}
function setPlaybackRate(value){
 const rate=Math.max(.5,Math.min(2,Number(value)||1));
 $('#speed').value=$('#podcast-speed').value=String(rate);narrator.setRate(rate);save();syncMediaSession();
}
function audioRecord(id,language=locale){const record=manifest.languages?.[language]?.[id];return typeof record==='string'?{src:record}:record;}
function cacheSources(){return entries.filter(e=>e.chapter===director.entry.chapter||e.chapter===director.entry.chapter+1).map(e=>audioRecord(e.id)?.src).filter(Boolean);}
async function preloadChapter({opening=false,language=locale,chapter=director.entry.chapter}={}){
 const records=entries.filter(e=>e.chapter===chapter).map(e=>audioRecord(e.id,language));
 if(opening)for(let i=1;i<=5;i++)records.unshift(manifest.openings?.[language]?.['opening.'+i]);
 const sources=records.filter(r=>r?.src).map(r=>r.src);
 for(let i=0;i<sources.length;i+=3)await Promise.all(sources.slice(i,i+3).map(src=>audioCache.load(src)));
 audioCache.retain([...sources,...cacheSources()]);
}
function syncMediaSession(){
 if(!('mediaSession' in navigator))return;
 if(!entered||mode!=='listen'){navigator.mediaSession.playbackState='none';navigator.mediaSession.metadata=null;return;}
 const current=position();
 if(globalThis.MediaMetadata)navigator.mediaSession.metadata=new MediaMetadata({title:opening>=0?x.intro:current.chapter?.title||'Geeta',artist:opening>=0?'Geeta':current.beat.speaker,album:'Geeta'});
 navigator.mediaSession.playbackState=['playing','buffering'].includes(audioState.status)?'playing':'paused';
 const chapter=timeline();
 const duration=opening>=0?audioState.duration:chapter.duration,time=opening>=0?audioState.time:(chapter.current?.start||0)+audioState.time;
 if((opening>=0||chapter.complete)&&duration>0&&navigator.mediaSession.setPositionState){try{navigator.mediaSession.setPositionState({duration,playbackRate:Number($('#speed').value)||1,position:Math.min(duration,time)});}catch{}}
}

function save(){try{localStorage.setItem(storageKey,JSON.stringify({index:director.index,passageId:director.entry.id,mode,locale,speed:Number($('#speed').value),audioTime:opening<0?audioState.time:resumeBookmark?.time||0,readPace:Number($('#read-pace').value),cameraMode:$('#motion').checked?'fixed':'cinematic',gentle:$('#motion').checked,volume:Number($('#volume').value),ambience:$('#ambience').checked,lighting:$('#lighting').value}));}catch{}}
function copyList(selector,items){const list=$(selector);list.replaceChildren();for(const text of items){const li=document.createElement('li');li.textContent=text;list.append(li);}}
function paragraph(parent,text,className=''){const p=document.createElement('p');p.textContent=text;p.className=className;parent.append(p);return p;}
function heading(parent,text){const h=document.createElement('h2');h.textContent=text;parent.append(h);return h;}
function speakerName(key){const e=entries.find(e=>e.speaker===key);return e?contentFor(e,localized).beat.speaker:key;}
function softenText(element){if(reducedQuery.matches||!element.animate)return;for(const a of element.getAnimations())a.cancel();element.animate([{opacity:.15},{opacity:1}],{duration:240,easing:'ease-out'});}
function reserve(){
  if(opening>=0||ending.active&&!ending.field){world?.setReadingLayout({left:0,top:0,bottom:0});return;}
  const h=$('#viewport').clientHeight,header=$('#masthead').getBoundingClientRect(),dock=$('#journey-dock').getBoundingClientRect();
  if(ending.field){document.documentElement.style.setProperty('--paper-top',`${h}px`);world?.setReadingLayout({left:0,top:header.bottom+6,bottom:0});return;}
  const mobileStudy=matchMedia('(max-width:850px) and (orientation:portrait)').matches;
  if(sourceOpen&&!mobileStudy){
    const study=$('#source-panel').getBoundingClientRect();
    document.documentElement.style.setProperty('--paper-top',`${dock.top}px`);
    world?.setReadingLayout({left:study.right+20,top:header.bottom+6,bottom:h-dock.top+8});return;
  }
  const panel=sourceOpen?$('#source-panel'):mode==='read'&&!dialogueHidden?$('#reading-panel'):null;
  const details=$('#player-details'),detailsTop=details&&!details.hidden?details.getBoundingClientRect().top:dock.top;
  const panelTop=Math.min(dock.top,panel?panel.getBoundingClientRect().top:dock.top,detailsTop);
  document.documentElement.style.setProperty('--paper-top',`${panelTop}px`);
  world?.setReadingLayout({left:0,top:entered?Math.min(header.bottom+6,h*.16):0,bottom:entered?Math.max(64,h-panelTop+8):0});
}
function localizeEnding(){const c=endingCopy[locale];for(const [id,key] of Object.entries({'ending-reflection':'reflection','ending-chapters':'chapters','ending-stay':'stay','ending-restart':'restart','ending-skip':'skip','ending-reopen':'reopen','listen-pending':'soon'}))$('#'+id).textContent=c[key];$('#ending-title').setAttribute('aria-label',c.title);$('#ending-film').setAttribute('aria-label',c.label);if(ending.active){$('#ending-last-words').textContent=position().beat.text;syncEndingFrame();}}
function render(){
  const {chapter,scene,beat}=position(),e=director.entry,voice=x.voices[e.speaker];
  $('#chapter-number').textContent=chapter?`${x.chapter} ${roman(chapter.n)}`:x.preface;$('#chapter-title').textContent=chapter?.title||'';
  $('#chapter-trigger').title=chapter?`${x.chapter} ${chapter.n} · ${chapter.title}`:x.contents;
  const contextual=e.speaker==='Sanjaya';
  $('#scene-title').textContent=scene?.title||x.preface;$('#speaker').textContent=contextual?f.fieldContext:beat.speaker;$('#speaker').disabled=contextual;$('#speaker-role').textContent=contextual?'':voice.role;$('#speaker-context').textContent=contextual?'':voice.location;$('#line').textContent=beat.text;
  $('#back').disabled=$('#audio-back').disabled=director.index===0;const final=director.index===entries.length-1;
  for(const id of ['next','audio-next']){const b=$('#'+id);b.disabled=false;b.classList.toggle('finish-action',final);b.setAttribute('aria-label',final?endingCopy[locale].finish:u.next);b.querySelector('svg').hidden=final;b.querySelector('.finish-label').hidden=!final;b.querySelector('.finish-label').textContent=endingCopy[locale].finish;}
  all('#chapter-list button').forEach(b=>{const active=Number(b.dataset.chapter)===e.chapter;if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');b.querySelector('.current-mark').textContent=active?'—':'';});
  $('#enter-label').textContent=director.index>0?x.resume:x.enter;$('#restart').hidden=director.index===0;document.title=entered&&chapter?`Geeta · ${chapter.title}`:'Geeta · '+x.introLine;
  syncView();renderStudy();renderAudio();renderPaced();reserve();
}
function syncView(){
  document.body.classList.toggle('in-opening',opening>=0);document.body.classList.toggle('source-open',sourceOpen&&opening<0);
  $('#reading-panel').hidden=mode!=='read'||opening>=0;$('#opening-caption').hidden=opening<0;$('#source-panel').hidden=!sourceOpen||opening>=0;
  $('#opening-identity').hidden=opening<0;$('#opening-film').hidden=opening<0;
  $('#masthead').inert=opening>=0||ending.active&&!ending.field;$('#journey-dock').inert=opening>=0||ending.active;
  $('#read-controls').hidden=mode!=='read'||opening>=0;$('#listen-panel').hidden=mode!=='listen'||opening>=0;$('#opening-controls').hidden=opening<0;
  $('#source-toggle').hidden=opening>=0;$('#source-toggle').setAttribute('aria-expanded',String(sourceOpen));$('#show-controls').hidden=mode!=='listen'||ending.active;
  document.body.classList.toggle('in-ending',ending.active&&!ending.field);document.body.classList.toggle('ending-field',ending.field);
  $('#ending-film').hidden=!ending.active||ending.field;$('#ending-actions').hidden=!ending.done;$('#ending-actions').inert=!ending.done;$('#ending-controls').hidden=ending.done;$('#ending-reopen').hidden=!ending.field;
  if(ending.active){$('#reading-panel').hidden=true;$('#source-panel').hidden=true;$('#listen-panel').hidden=true;}
}
function renderPaced(){
  const chapterEntries=entries.filter(e=>e.chapter===director.entry.chapter),at=chapterEntries.findIndex(e=>e.id===director.entry.id)+1;
  $('#count').textContent=`${at} / ${chapterEntries.length}`;
  setPlaybackButton($('#read-play'),$('#read-play-icon'),$('#read-pause-icon'),readingClock.playing,readingClock.playing?f.pauseReading:f.playReading);
  $('#read-progress').style.width=(readingClock.progress*100)+'%';

  setPlaybackButton($('#opening-play'),$('#opening-play-icon'),$('#opening-pause-icon'),openingClock.playing,openingClock.playing?f.pauseOpening:f.playOpening);
}
function clockTick(now){
  clockFrame=0;const dt=clockLast?Math.min(.25,(now-clockLast)/1000):0;clockLast=now;
  const blocked=!entered||document.hidden||hasModal()||$('#pause-scene').checked;
  if(ending.active){ending.update(dt,blocked||!world?.ready&&!sceneFailed);syncEndingFrame();}
  else if(opening>=0){const waiting=mode==='listen'&&manifest.openings?.[locale]?.['opening.'+(opening+1)]&&!openingAdvanceRequested&&['loading','buffering','ready','blocked','error','paused'].includes(audioState.status);openingClock.update(dt,blocked||waiting||!world?.ready&&!sceneFailed);world?.setOpeningPlaying(openingClock.playing);updateCredits();}
  else readingClock.update(dt,blocked||mode!=='read'||sourceOpen);
  renderPaced();if(!document.hidden&&(openingClock.playing||readingClock.playing||ending.playing))clockFrame=requestAnimationFrame(clockTick);
}
function wakeClock(){if(!clockFrame&&!document.hidden&&(openingClock.playing||readingClock.playing||ending.playing)){clockLast=0;clockFrame=requestAnimationFrame(clockTick);}}
function toggleReading(){if(ending.active){toggleEnding();return;}if(opening>=0){toggleOpening();return;}if(mode!=='read')return;if(readingClock.playing)readingClock.pause();else{if(sourceOpen)setSource(false);readingClock.play();}renderPaced();wakeClock();}
function toggleOpening(){if(openingClock.playing){openingClock.pause();narrator.pause();}else{openingClock.play();if(mode==='listen'&&audioState.status!=='ended')narrator.play();}world?.setOpeningPlaying(openingClock.playing);renderPaced();wakeClock();}
function updateCredits(){
  const progress=openingClock.progress,film=$('#opening-film');world?.setOpeningProgress(progress);
  const t=Math.max(0,Math.min(1,(progress-.82)/.18)),expand=$('#motion').checked?0:t*t*(3-2*t);
  film.style.setProperty('--split',`${50+50*expand}%`);
  film.style.setProperty('--clan-opacity',String(1-expand));
  // Drive the typography from the same paused timeline as the live cameras.
  const enter=$('#motion').checked?1:Math.min(1,progress*8),leave=$('#motion').checked?1:Math.min(1,(1-progress)*9);
  film.style.setProperty('--credit-opacity',String(Math.max(0,Math.min(enter,leave))));
  film.style.setProperty('--credit-shift',`${(1-enter)*18}px`);
  const nameStart=opening===1?.4:opening===2?.18:0;film.style.setProperty('--name-opacity',String($('#motion').checked?1:Math.max(0,Math.min(leave,(progress-nameStart)*8))));
  $('#opening-progress').style.transform=`scaleX(${(opening+progress)/f.opening.length})`;
}
function showOpening(index){
  opening=index;openingAdvanceRequested=false;const record=manifest.openings?.[locale]?.['opening.'+(index+1)],scene=f.opening[index];$('#opening-film').dataset.phase=creditPhases[index];
  $('#opening-title').textContent=scene.title;$('#opening-text').textContent=scene.text;
  $('#opening-name').textContent=scene.name;$('#opening-clans').textContent=scene.clans;$('#opening-role').textContent=scene.role;
  $('#clan-pandavas').textContent=f.pandavas;$('#clan-kauravas').textContent=f.kauravas;$('#credits-subtitle').textContent=f.creditsSubtitle;
  $('#credits-loading').hidden=!!world?.ready||sceneFailed;$('#credits-loading').textContent=u.prepare;
  openingClock.set(index,{seconds:mode==='listen'&&record?record.duration/(Number($('#speed').value)||1)+.4:0});openingClock.play();
  if(mode==='listen'&&record?.src){narrator.setTrack(audioCache.get(record.src)||new URL(record.src,location.href).href);narrator.play();}else narrator.pause();
  world?.setOpening(index);world?.setOpeningPlaying(true);updateCredits();
  syncView();renderAudio();renderPaced();reserve();wakeClock();
}
function beginOpening(){cancelEnding();interfaceUI.collapse();narrator.pause();readingClock.pause();sourceOpen=false;$('#pause-scene').checked=false;world?.setPause(false);world?.enter({arrival:true,opening:0});showOpening(0);}
function endOpeningSoon(){openingAdvanceRequested=true;narrator.pause();openingClock.requestEnd();world?.setOpeningPlaying(true);wakeClock();}
function advanceOpening(){if(opening+1<f.opening.length)showOpening(opening+1);else finishOpening();}
function finishOpening(){openingClock.pause();narrator.pause();const resume=director.index;if(resume>0){director.go(0,{immediate:true});director.go(resume);}opening=-1;world?.setOpening(null);world?.focusPassage();render();setTrack({resume:true});if(mode==='listen')narrator.play();softenText($('#dialogue-view'));$('#stage').focus({preventScroll:true});}
function syncEndingFrame(){
  const frame=ending.frame;world?.setEnding(ending.active?frame:null);ambience.setEnding?.(ending.active?frame.sound:0);
  const film=$('#ending-film');film.style.setProperty('--ending-title',String(frame.title));film.style.setProperty('--ending-words',String(frame.words));
  film.style.setProperty('--ending-veil',String(.1+frame.title*.55));
  $('#ending-pause').setAttribute('aria-label',ending.playing?endingCopy[locale].pause:endingCopy[locale].play);
  $('#ending-pause').textContent=ending.playing?endingCopy[locale].pause:endingCopy[locale].play;
}
function beginEnding(){
  if(!entered||opening>=0||director.index!==entries.length-1||!ending.begin())return;
  interfaceUI.collapse();narrator.pause();readingClock.pause();sourceOpen=false;dialogueHidden=false;document.body.classList.remove('dialogue-hidden');closeCameraGuide();
  $('#pause-scene').checked=false;world?.setPause(false);$('#ending-last-words').textContent=position().beat.text;
  syncEndingFrame();syncView();renderAudio();reserve();modalState();$('#ending-pause').focus({preventScroll:true});wakeClock();save();
}
function showEndScreen(){syncView();syncEndingFrame();$('#ending-title').focus({preventScroll:true});}
function toggleEnding(){if(!ending.active||ending.done)return;if(ending.playing)ending.pause();else ending.play();syncEndingFrame();modalState();wakeClock();}
function cancelEnding(){if(!ending.active)return;ending.cancel();world?.setEnding(null);ambience.setEnding?.(0);closeCameraGuide();syncView();modalState();}
function stayOnField(){ending.stay();syncEndingFrame();syncView();reserve();$('#stage').focus({preventScroll:true});}
function reopenEnding(){ending.reopen();closeCameraGuide();syncEndingFrame();syncView();reserve();$('#ending-title').focus({preventScroll:true});}
function nextPassage(){if(ending.active)return;if(director.index===entries.length-1)beginEnding();else choose(director.index+1);}
function closeCameraGuide(){$('#camera-guide').hidden=true;$('#look-toggle').setAttribute('aria-expanded','false');}
function setSource(value){sourceOpen=value;if(value){interfaceUI.collapse();readingClock.pause();closeCameraGuide();}render();revealControls();if(value)$('#source-close').focus({preventScroll:true});else $('#source-toggle').focus({preventScroll:true});}
async function renderStudy(){
  const request=++verseRequest;if(!sourceOpen)return;const current=position(),chapter=current.chapter||localized.chapters[0],scene=current.scene||{range:'1.1',ref:1,simple:x.framing};
  $('#source-title').textContent=f.sourceButton;$('#source-range').textContent=current.scene?`${f.verseForScene} · ${scene.range}`:`${x.preface} · 1.1`;
  $('#reading-tabs').hidden=true;$('#source-link').hidden=false;
  for(const tab of ['shloka','meaning'])$('#'+tab+'-view').hidden=!chapter;
  if(!chapter)return;
  const box=$('#meaning-view');box.replaceChildren();for(const [label,text] of [[f.sceneMeaning,scene.simple],[u.example,scene.example],[u.context,scene.context],[u.reflection,current.chapter?.reflection]])if(text){heading(box,label);paragraph(box,text);}
  $('#verse').textContent='';
  try{const {default:verses}=await import('./narrative/sanskrit.js');if(request!==verseRequest)return;
    const chapterVerses=verses.filter(v=>v.chapter===chapter.n);if(!chapterVerses.some(v=>v.verse===selectedVerse))selectedVerse=scene.ref;
    const select=$('#verse-select');select.replaceChildren();for(const verse of chapterVerses){const o=document.createElement('option');o.value=verse.verse;o.textContent=`${chapter.n}.${verse.verse}`;select.append(o);}select.value=selectedVerse;
    const at=chapterVerses.findIndex(v=>v.verse===selectedVerse);$('#verse-back').disabled=at<=0;$('#verse-next').disabled=at===chapterVerses.length-1;
    $('#verse-ref').textContent=`${u.sanskrit} · ${chapter.n}.${selectedVerse}`;$('#verse').textContent=chapterVerses[at]?.text||x.verseUnavailable;
    $('#source-link').href=`https://vedabase.io/en/library/bg/${chapter.n}/${selectedVerse}/`;$('#source-link').textContent=`${x.source} · ${chapter.n}.${selectedVerse}`;
  }catch{if(request===verseRequest)$('#verse').textContent=x.verseUnavailable;}
}
function setTrack({resume=false}={}){
  const src=audioRecord(director.entry.id)?.src;let url=null;
  if(src){try{const p=new URL(src,location.href);if(p.origin===location.origin)url=audioCache.get(src)||p.href;}catch{}}
  narrator.setTrack(url,{startTime:resume&&resumeBookmark?.id===director.entry.id?resumeBookmark.time:0});if(resume)resumeBookmark=null;if(entered)void preloadChapter().catch(()=>{});if(!url){audioState={status:'missing',time:0,duration:0,available:false};renderAudio();}
}
function choose(index,{autoplay=entered&&mode==='listen'&&['playing','buffering'].includes(narrator.status),autoRead=readingClock.playing}={}){
  resumeBookmark=null;cancelEnding();if(opening>=0){openingClock.pause();opening=-1;world?.setOpening(null);}
  director.go(index);if(director.entry.chapter>1)world?.skipArrival();world?.focusPassage();$('#camera-reset').hidden=true;
  selectedVerse=null;$('#reading-scroll').scrollTop=0;$('#source-scroll').scrollTop=0;dialogueHidden=false;document.body.classList.remove('dialogue-hidden');$('#dialogue-toggle').textContent=x.hideDialogue;
  readingClock.set(position().beat.text,locale);if(autoRead&&mode==='read'&&!sourceOpen)readingClock.play();else readingClock.pause();
  render();softenText($('#dialogue-view'));history.replaceState(null,'',location.pathname+hashFor(director.index));setTrack();save();world?.wake();wakeClock();if(autoplay&&mode==='listen')narrator.play();
}
function renderAudio(){
  const pending=!audioState.available;$('#listen-pending').hidden=!pending;$('#mode-listen').title=pending?x.audioPending:u.listen;
  const playing=['playing','buffering'].includes(audioState.status);$('#play').disabled=!audioState.available;setPlaybackButton($('#play'),$('#play-icon'),$('#pause-icon'),playing,playing?u.pauseAudio:u.play);
  $('#audio-status').textContent=audioState.status==='missing'?x.audioPending:(u[audioState.status==='loading'?'buffering':audioState.status]??u.ready);
  $('#listen-notice').hidden=mode!=='listen'||opening>=0||ending.active||!['missing','error','blocked','loading'].includes(audioState.status);$('#listen-read').hidden=audioState.available;
  const chapter=timeline(),duration=chapter.complete?chapter.duration:audioState.duration,time=chapter.complete?(chapter.current?.start||0)+audioState.time:audioState.time;
  $('#elapsed').textContent=fmtTime(time);$('#duration').textContent=fmtTime(duration);$('#audio-seek').disabled=!duration;
  if(document.activeElement!==$('#audio-seek'))$('#audio-seek').value=duration?time/duration*100:0;
  $('#audio-seek').setAttribute('aria-valuetext',`${fmtTime(time)} / ${fmtTime(duration)}`);
  $('#podcast-speaker').textContent=director.entry.speaker==='Sanjaya'?f.fieldContext:position().beat.speaker;
  $('#audio-rewind').disabled=$('#audio-forward').disabled=!audioState.available;
  syncMediaSession();
}
function setMode(next){if(ending.active)return;if(next!=='listen')narrator.pause();readingClock.pause();mode=next;dialogueHidden=false;document.body.classList.remove('dialogue-hidden');document.body.dataset.mode=mode;
  $('#intro-mode-read').setAttribute('aria-pressed',String(mode==='read'));$('#intro-mode-listen').setAttribute('aria-pressed',String(mode==='listen'));$('#mode-read').setAttribute('aria-pressed',String(mode==='read'));$('#mode-listen').setAttribute('aria-pressed',String(mode==='listen'));$('#dialogue-toggle').hidden=mode!=='read';$('#dialogue-toggle').textContent=x.hideDialogue;$('#line').setAttribute('aria-live',mode==='read'?'polite':'off');render();revealControls();if(entered)save();interfaceUI.collapse();interfaceUI.refresh(locale,u,x,f);}
function revealControls(){clearTimeout(idleTimer);document.body.classList.remove('controls-hidden');scheduleHide();}
function scheduleHide(){clearTimeout(idleTimer);document.body.classList.remove('controls-hidden');}
async function togglePlayback(){if(ending.active){toggleEnding();return;}if(!entered||mode!=='listen')return;if(['playing','buffering'].includes(narrator.status))narrator.pause();else await narrator.play();revealControls();}
function localize(){
  document.documentElement.lang=locale;localizeEnding();
  all('[data-wordmark]').forEach(mark=>{mark.textContent=wordmarks[locale];mark.lang=locale;});renderCredits(locale);$('#opening-film').setAttribute('aria-label',f.openingLabel);
  const pc=preparationCopy[locale];$('#podcast-speed').setAttribute('aria-label',pc.speed);$('#audio-rewind').setAttribute('aria-label',pc.rewind);$('#audio-forward').setAttribute('aria-label',pc.forward);$('#preparation progress').setAttribute('aria-label',pc.loading);
  const map={'intro-title':'introLine','intro-body':'introBody','intro-framing':'framing','intro-language-label':'language','intro-about':'about','intro-sound-label':'soundOn','restart':'restart','menu-label':'menu','menu-title':'journey','menu-chapters':'contents','menu-settings':'settings','menu-about':'intro','menu-framing':'framing','back-to-intro':'intro','people-title':'meet','meet-voices':'meet','look-toggle':'look','camera-reset':'returnView','view-front':'viewFront','view-side':'viewSide','view-wide':'viewWide','language-label':'language','ambience-label':'soundOn','volume-label':'volume','lighting-label':'light','motion-label':'gentleCamera','pause-label':'pause','listen-read':'reading'};
  for(const [id,key] of Object.entries(map))$('#'+id).textContent=x[key];
  const newMap={'source-toggle':'sourceButton','tab-shloka':'original','tab-meaning':'sceneMeaning','verse-label':'verseNumber','replay-opening':'replayOpening','skip-opening':'skipOpening','read-pace-label':'readingPace'};for(const [id,key] of Object.entries(newMap))$('#'+id).textContent=f[key];
  $('#intro-kicker').textContent=x.title;$('#intro-meta').textContent=f.introMeta;$('#intro-source').textContent=x.source;
  $('#mode-read').textContent=$('#intro-mode-read-label').textContent=u.read;$('#listen-label').textContent=$('#intro-mode-listen-label').textContent=u.listen;$('#intro-mode-recommended').textContent=({en:'Recommended',hi:'अनुशंसित',ja:'おすすめ','zh-Hans':'推荐',fr:'Recommandé'})[locale];$('#intro-mode').setAttribute('aria-label',x.experienceMode);$('#speed-label').textContent=u.speed;$('#show-controls').textContent=u.show;
  $('#home').setAttribute('aria-label',x.intro);$('#menu-open').setAttribute('aria-label',x.menu);$('#chapter-trigger').setAttribute('aria-label',x.contents);$('#stage').setAttribute('aria-label',u.scene);
  $('#mode-switch').setAttribute('aria-label',x.experienceMode);$('#reading-tabs').setAttribute('aria-label',x.passageView);$('#listen-panel').setAttribute('aria-label',x.playback);$('.camera-arrows').setAttribute('aria-label',x.moveCamera);$('#chapter-list').setAttribute('aria-label',x.contents);
  $('#source-close').setAttribute('aria-label',f.closeSource);$('#verse-back').setAttribute('aria-label',f.previousVerse);$('#verse-next').setAttribute('aria-label',f.nextVerse);$('#opening-next').setAttribute('aria-label',x.next);$('#audio-seek').setAttribute('aria-label',u.audioPosition);
  all('[data-pan]').forEach(b=>b.setAttribute('aria-label',x[{left:'moveLeft',right:'moveRight',forward:'moveForward',back:'moveBack'}[b.dataset.pan]]));
  all('[data-close]').forEach(b=>b.setAttribute('aria-label',x.close));for(const id of ['back','audio-back'])$('#'+id).setAttribute('aria-label',u.previous);for(const id of ['next','audio-next'])$('#'+id).setAttribute('aria-label',u.next);
  $('#reload').textContent=u.reload;$('#dismiss-error').textContent=u.keepReading;$('#error-text').textContent=u.sceneError;$('#loading').textContent=u.prepare;$('#dialogue-toggle').textContent=dialogueHidden?x.showDialogue:x.hideDialogue;
  $('#language').value=$('#intro-language').value=locale;all('#lighting option').forEach(o=>o.textContent=x[o.value==='story'?'storyLight':o.value]);copyList('#intro-disclaimers',x.notes);copyList('#menu-disclaimers',x.notes);buildContents();buildPeople();render();
  readingClock.set(position().beat.text,locale);if(opening>=0)showOpening(opening);
  interfaceUI.refresh(locale,u,x,f);
}
function buildContents(){const box=$('#chapter-list');box.replaceChildren();for(const c of localized.chapters){const n=c.n,b=document.createElement('button');b.dataset.chapter=String(n);for(const [cls,text] of [['chapter-index',roman(n)],['chapter-name',c.title],['current-mark','']]){const span=document.createElement('span');span.className=cls;span.textContent=text;if(cls==='current-mark')span.setAttribute('aria-hidden','true');b.append(span);}b.onclick=()=>{$('#menu').close();choose(entries.findIndex(e=>e.chapter===n),{autoplay:false,autoRead:false});};box.append(b);}}
function buildPeople(){const box=$('#people-content');box.replaceChildren();for(const key of ['Arjun','Krishna']){const section=document.createElement('section');section.dataset.current=String(key===director.entry.speaker);heading(section,speakerName(key));paragraph(section,x.voices[key].role,'person-role');paragraph(section,x.voices[key].description);box.append(section);}}
async function setLanguage(next){if(!languages.includes(next))return;const request=++languageRequest;narrator.pause();readingClock.pause();$('#settings-status').textContent=$('#intro-status').textContent='';languagePending=true;$('#language').disabled=$('#intro-language').disabled=$('#enter').disabled=true;
  try{if(!localizedCache[next]){const r=await fetch(`./narrative/locales/${next}.json`);if(!r.ok)throw Error('Locale unavailable');const data=await r.json();if(data.chapters?.length!==18||data.prologue?.length!==4)throw Error('Incomplete locale');localizedCache[next]=data;}if(request!==languageRequest)return;const openingWasPlaying=openingClock.playing;locale=next;localized=localizedCache[next];u=ui[next];x=experienceCopy[next];f=flowCopy[next];localize();if(opening>=0&&!openingWasPlaying){openingClock.pause();world?.setOpeningPlaying(false);renderPaced();}if(opening<0)setTrack();save();if(!entered)void prepareEntry();return true;}
  catch{if(request===languageRequest){$('#settings-status').textContent=$('#intro-status').textContent=u.languageError;$('#language').value=$('#intro-language').value=locale;}return false;}finally{if(request===languageRequest){languagePending=false;$('#language').disabled=$('#intro-language').disabled=false;updateEntryState();}}}
function modalState(){world?.setModal(!entered||hasModal()||ending.active&&!ending.done&&!ending.playing);ambience.mute(!entered||$('#pause-scene').checked||hasModal()||document.hidden||ending.active&&!ending.done&&!ending.playing);wakeClock();}
function openMenu(section='chapters'){setMenuSection(section);narrator.pause();revealControls();$('#menu').showModal();modalState();}
function setMenuSection(section){for(const key of ['chapters','settings','about']){$('#menu-'+key+'-view').hidden=key!==section;$('#menu-'+key).setAttribute('aria-pressed',String(key===section));}interfaceUI.syncMenu(section);}
function showPeople(){if($('#menu').open)$('#menu').close();buildPeople();narrator.pause();$('#people').showModal();modalState();$('#people-content [data-current=true]')?.scrollIntoView({block:'nearest'});}
all('[data-menu]').forEach(b=>b.onclick=()=>setMenuSection(b.dataset.menu));all('[data-close]').forEach(b=>b.onclick=()=>$('#'+b.dataset.close).close());all('dialog').forEach(d=>{d.addEventListener('close',()=>{modalState();revealControls();});d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});});
function showIntro(){cancelEnding();interfaceUI.collapse();narrator.pause();readingClock.pause();openingClock.pause();opening=-1;all('dialog').forEach(d=>{if(d.open)d.close();});entered=false;$('#intro').hidden=false;$('#experience-ui').inert=true;document.body.classList.add('at-intro');world?.setOpening(null);world?.setIntro(true);ambience.mute(true);revealControls();render();void prepareEntry();$('#enter').focus();}
function entryKey(){return `${locale}:${director.entry.chapter}`;}
function updateEntryState(){
 const ready=arrival?.isReady(entryKey())===true;
 $('#enter').disabled=!languageChosen||languagePending||!ready||entryStarting;
 $('#enter').setAttribute('aria-busy',String(entryStarting));
 all('[data-start-language]').forEach(button=>button.disabled=languagePending||gatePending);
 $('#intro-retry').hidden=!entryError;$('#intro-retry').textContent=preparationCopy[locale].retry;
 if(languageChosen){$('#loading').hidden=ready||entryError;$('#loading').textContent=preparationCopy[locale].loading;}
}
async function prepareEntry(){
 if(!arrival)return;const key=entryKey(),selectedLocale=locale,selectedChapter=director.entry.chapter;entryError=false;updateEntryState();
 try{
  await arrival.prepare(key,async()=>{
   const titles=localized.chapters.map(c=>c.title).join(' ')+f.opening.map(o=>o.title+' '+o.name).join(' ')+wordmarks[locale];
   const fontText=titles+entries.map(e=>contentFor(e,localized).beat.text).join(' ')+f.opening.map(o=>o.text).join(' ');
   const family=getComputedStyle($('#line')).fontFamily,titleFamily=getComputedStyle($('#chapter-title')).fontFamily;
   const fonts=Promise.all([document.fonts.load(`400 20px ${family}`,fontText),document.fonts.load(`400 24px ${titleFamily}`,titles),document.fonts.ready]);
   await manifestReady;await Promise.all([fonts,preloadChapter({opening:true,language:selectedLocale,chapter:selectedChapter})]);
  });
  if(key===entryKey()){$('#intro-status').textContent='';updateEntryState();}
 }catch{if(key===entryKey()){entryError=true;$('#intro-status').textContent=preparationCopy[locale].failed;updateEntryState();}}
}
async function enterStory(restart=false){
 if(entryStarting||preparation.busy||!languageChosen)return;
 if(!restart&&!arrival.isReady(entryKey()))return;
 entryRestart=restart;entryStarting=true;updateEntryState();
 // Unlock audio in the original gesture, including a restart after the ending.
 const soundReady=$('#intro-sound').checked?ambience.start().catch(()=>{$('#ambience').checked=$('#intro-sound').checked=false;}):Promise.resolve();
 ambience.mute(true);const voiceReady=narrator.prime();
 try{
  if(restart){choose(0,{autoplay:false,autoRead:false});await prepareEntry();}
  if(!arrival.isReady(entryKey()))return;
  await Promise.all([soundReady,voiceReady]);revealStory();
 }finally{entryStarting=false;updateEntryState();}
}
function revealStory(){
 entered=true;$('#intro').hidden=true;$('#experience-ui').inert=false;document.body.classList.remove('at-intro');
 $('#ambience').checked=$('#intro-sound').checked;if(!$('#ambience').checked)ambience.stop();world?.setIntro(false);
 setMode(mode);beginOpening();modalState();render();save();$('#stage').focus({preventScroll:true});
}
$('#ending-chapters').onclick=()=>openMenu('chapters');$('#ending-stay').onclick=stayOnField;$('#ending-restart').onclick=()=>{cancelEnding();enterStory(true);};$('#ending-pause').onclick=toggleEnding;$('#ending-skip').onclick=()=>{ending.complete();modalState();};$('#ending-reopen').onclick=reopenEnding;
$('#enter').onclick=()=>enterStory();$('#restart').onclick=()=>enterStory(true);$('#home').onclick=$('#back-to-intro').onclick=showIntro;
$('#replay-opening').onclick=()=>{$('#menu').close();beginOpening();};$('#opening-play').onclick=toggleOpening;$('#opening-next').onclick=endOpeningSoon;$('#skip-opening').onclick=finishOpening;
$('#menu-open').onclick=$('#chapter-trigger').onclick=()=>openMenu('chapters');$('#speaker').onclick=$('#meet-voices').onclick=showPeople;$('#mode-read').onclick=$('#intro-mode-read').onclick=$('#listen-read').onclick=()=>setMode('read');$('#mode-listen').onclick=$('#intro-mode-listen').onclick=()=>setMode('listen');
$('#source-toggle').onclick=()=>setSource(!sourceOpen);$('#source-close').onclick=()=>setSource(false);all('[data-reading]').forEach(b=>b.onclick=()=>{readingTab=b.dataset.reading;$('#source-scroll').scrollTop=0;renderStudy();});
$('#verse-select').onchange=e=>{selectedVerse=Number(e.target.value);renderStudy();};for(const [id,step] of [['verse-back',-1],['verse-next',1]])$('#'+id).onclick=()=>{const select=$('#verse-select'),i=select.selectedIndex+step;if(i>=0&&i<select.options.length){selectedVerse=Number(select.options[i].value);renderStudy();}};
$('#back').onclick=$('#audio-back').onclick=()=>choose(director.index-1);$('#next').onclick=$('#audio-next').onclick=nextPassage;$('#read-play').onclick=toggleReading;$('#reading-scroll').addEventListener('wheel',()=>{if(readingClock.playing){readingClock.pause();renderPaced();}},{passive:true});$('#reading-scroll').addEventListener('touchstart',()=>{if(readingClock.playing){readingClock.pause();renderPaced();}},{passive:true});$('#play').onclick=togglePlayback;$('#audio-seek').oninput=e=>{const t=timeline();$('#elapsed').textContent=fmtTime(Number(e.target.value)/100*(t.complete?t.duration:audioState.duration));};$('#show-controls').onclick=()=>{revealControls();$('#source-toggle').focus();};
$('#dialogue-toggle').onclick=()=>{dialogueHidden=!dialogueHidden;if(dialogueHidden)readingClock.pause();document.body.classList.toggle('dialogue-hidden',dialogueHidden);$('#dialogue-toggle').textContent=dialogueHidden?x.showDialogue:x.hideDialogue;reserve();};
$('#look-toggle').onclick=()=>{if(sourceOpen)return;const open=$('#camera-guide').hidden;$('#camera-guide').hidden=!open;$('#look-toggle').setAttribute('aria-expanded',String(open));revealControls();};$('#camera-reset').onclick=()=>{world?.focusPassage();$('#camera-reset').hidden=true;};all('[data-camera]').forEach(b=>b.onclick=()=>{world?.chooseCamera(b.dataset.camera);$('#camera-reset').hidden=false;});all('[data-pan]').forEach(b=>b.onclick=()=>world?.panCamera(b.dataset.pan));
for(const select of [$('#speed'),$('#podcast-speed')]){
 select.replaceChildren();for(const rate of playbackSpeeds){const option=document.createElement('option');option.value=String(rate);option.textContent=rate+'×';select.append(option);}
}
const restoredRate=playbackSpeeds.includes(Number(saved.speed))?Number(saved.speed):1;
$('#speed').value=$('#podcast-speed').value=String(restoredRate);narrator.setRate(restoredRate);$('#speed').onchange=e=>setPlaybackRate(e.target.value);
$('#read-pace').value=['0.8','1','1.15'].includes(String(saved.readPace))?String(saved.readPace):'1';readingClock.setRate($('#read-pace').value);$('#read-pace').onchange=e=>{readingClock.setRate(e.target.value);save();};$('#language').onchange=$('#intro-language').onchange=e=>setLanguage(e.target.value);
// v6's "gentle" meant scene cuts. Migrate to continuous motion, preserving
// the OS preference and any explicitly chosen v7 fixed viewpoint.
$('#motion').checked=saved.cameraMode?saved.cameraMode==='fixed':reducedQuery.matches;$('#motion').onchange=e=>{world?.setMotion(e.target.checked);save();};reducedQuery.addEventListener('change',e=>{$('#motion').checked=e.matches;world?.setMotion(e.matches);});
$('#volume').value=Number.isFinite(saved.volume)?saved.volume:.65;ambience.setLevel?.(Number($('#volume').value));$('#volume').oninput=e=>{ambience.setLevel?.(Number(e.target.value));save();};$('#intro-sound').checked=$('#ambience').checked=saved.ambience!==false;
$('#ambience').onchange=async e=>{try{if(e.target.checked)await ambience.start();else ambience.stop();$('#intro-sound').checked=e.target.checked;modalState();save();}catch{e.target.checked=false;$('#settings-status').textContent=x.soundError;}};
$('#lighting').value=['story','dawn','day','dusk','night'].includes(saved.lighting)?saved.lighting:'story';$('#lighting').onchange=e=>{world?.setLighting(e.target.value);save();};$('#pause-scene').onchange=e=>{world?.setPause(e.target.checked);modalState();};$('#reload').onclick=()=>location.reload();$('#dismiss-error').onclick=()=>{$('#scene-error').hidden=true;setMode('read');};
let pointerStart=null,dragged=false;$('#stage').addEventListener('pointerdown',e=>{pointerStart={x:e.clientX,y:e.clientY};dragged=false;});$('#stage').addEventListener('pointermove',e=>{if(pointerStart&&Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)>8)dragged=true;});$('#stage').addEventListener('pointerup',()=>{if(!dragged)revealControls();pointerStart=null;});$('#stage').addEventListener('pointercancel',()=>{pointerStart=null;});
addEventListener('pointermove',e=>{if(e.pointerType==='mouse'&&mode==='listen'&&entered)revealControls();});addEventListener('focusin',revealControls);addEventListener('resize',reserve);
addEventListener('keydown',e=>{if(e.key==='Escape'){if(sourceOpen&&!hasModal())setSource(false);revealControls();}if(!entered||e.target.closest('input,select,button,dialog,canvas'))return;if(e.key==='ArrowRight'){e.preventDefault();if(opening>=0)endOpeningSoon();else nextPassage();}if(e.key==='ArrowLeft'&&opening<0&&!ending.active){e.preventDefault();choose(director.index-1);}if(e.key===' '){e.preventDefault();if(ending.active)toggleEnding();else if(opening>=0)toggleOpening();else if(mode==='listen')togglePlayback();else toggleReading();}});
addEventListener('hashchange',()=>{const i=indexFromHash(location.hash);if(i!==null)choose(i,{autoplay:false,autoRead:false});});document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(clockFrame);clockFrame=0;if(opening>=0&&['playing','buffering'].includes(narrator.status)){openingHiddenPause=true;narrator.pause();}}else{if(openingHiddenPause&&opening>=0){openingHiddenPause=false;narrator.play();}wakeClock();}});
addEventListener('pagehide',e=>{save();if(!e.persisted){narrator.dispose();audioCache.dispose();ambience.dispose();cancelAnimationFrame(clockFrame);}});
document.fonts.ready.then(reserve);document.fonts.addEventListener('loadingdone',reserve);
localize();setMode(mode); // Every new page starts with an English language choice.
const manifestReady=fetch('./narrative/audio.json?v=12').then(r=>{if(!r.ok)throw Error('Audio manifest');return r.json();}).then(data=>{manifest=data;setTrack();});
void manifestReady.catch(()=>{$('#intro-status').textContent=u.error||u.reload;});
function sceneError(){sceneFailed=true;worldReject?.(Error('Scene unavailable'));$('#credits-loading').hidden=true;$('#loading').textContent=u.sceneError;if(entered){$('#scene-error').hidden=false;$('#error-text').textContent=u.sceneError;}else $('#intro-status').textContent=u.sceneError;wakeClock();}
function ensureWorld(){
 if(world?.ready)return Promise.resolve(world);if(worldPromise)return worldPromise;
 worldPromise=new Promise((resolve,reject)=>{worldResolve=resolve;worldReject=reject;});
 import('./world.js').then(({createWorld})=>{world=createWorld({canvas:$('#stage'),viewport:$('#viewport'),director,sound:ambience,onProgress:()=>{$('#loading').textContent=u.prepare;},onError:sceneError,
  onReady:()=>{worldResolve?.(world);$('#loading').hidden=true;$('#credits-loading').hidden=true;world.setMotion($('#motion').checked);world.setPause($('#pause-scene').checked);world.setIntro(!entered);world.setLighting($('#lighting').value);modalState();reserve();if(entered){world.enter({arrival:opening>=0,opening:opening>=0?opening:null});world.setOpeningPlaying(openingClock.playing);world.setOpeningProgress(openingClock.progress);if(ending.active)syncEndingFrame();}wakeClock();updateEntryState();},
  onCameraChange:()=>{$('#camera-reset').hidden=false;},onAdvance:()=>{if(opening>=0)endOpeningSoon();else nextPassage();},onTogglePlayback:()=>{if(ending.active)toggleEnding();else if(opening>=0)toggleOpening();else if(mode==='listen')togglePlayback();else toggleReading();}
});}).catch(()=>sceneError());
 return worldPromise;
}
// Starts immediately on page arrival, independently of any click or saved language.
arrival=createArrival(()=>Promise.all([ensureWorld(),manifestReady,import('./narrative/sanskrit.js'),preloadFieldRecordings().catch(()=>{})]));
arrival.shared.then(()=>{if(!gatePending){$('#arrival-message').textContent='Choose a language to continue';$('#arrival-progress').hidden=true;}updateEntryState();}).catch(()=>{
 $('#arrival-message').textContent='The journey could not finish loading.';$('#arrival-progress').hidden=true;$('#arrival-retry').hidden=false;
 entryError=true;$('#intro-status').textContent=preparationCopy[locale].failed;updateEntryState();
});
all('[data-start-language]').forEach(button=>button.onclick=async()=>{
 if(languagePending||gatePending)return;
 gatePending=true;$('#language-options').setAttribute('aria-busy','true');
 all('[data-start-language]').forEach(option=>option.setAttribute('aria-pressed',String(option===button)));
 $('#arrival-message').textContent=`Loading ${button.textContent.trim()}…`;
 $('#arrival-progress').hidden=false;$('#arrival-retry').hidden=true;updateEntryState();
 try{
  const selected=await setLanguage(button.dataset.startLanguage);
  if(!selected)throw Error('Language unavailable');
  await prepareEntry();
  if(!arrival.isReady(entryKey()))throw Error('Journey unavailable');
  languageChosen=true;$('#language-gate').hidden=true;$('#intro').hidden=false;$('#intro').inert=false;
  $('#intro-title').focus({preventScroll:true});
 }catch{
  $('#arrival-message').textContent='The journey could not finish loading. Please try again.';
  $('#arrival-retry').hidden=false;
 }finally{
  gatePending=false;$('#language-options').setAttribute('aria-busy','false');$('#arrival-progress').hidden=true;updateEntryState();
 }
});
$('#arrival-retry').onclick=$('#intro-retry').onclick=()=>location.reload();
updateEntryState();
if('mediaSession' in navigator){
 const canPlay=()=>entered&&mode==='listen'&&!ending.active;
 const actions={
  play:()=>{if(!canPlay())return;if(opening>=0){if(!openingClock.playing)toggleOpening();}else narrator.play();},
  pause:()=>{if(opening>=0&&openingClock.playing)toggleOpening();else narrator.pause();},
  seekbackward:d=>{if(canPlay()&&opening<0)skipAudio(-(d.seekOffset||15));},
  seekforward:d=>{if(canPlay()&&opening<0)skipAudio(d.seekOffset||15);},
  seekto:d=>{if(canPlay()&&opening<0)goAudioTime(timeline(),d.seekTime);},
  previoustrack:()=>{if(canPlay()&&opening<0)choose(Math.max(0,director.index-1));},
  nexttrack:()=>{if(canPlay()&&opening<0)nextPassage();}
 };
 for(const [action,handler] of Object.entries(actions)){try{navigator.mediaSession.setActionHandler(action,handler);}catch{}}
}
