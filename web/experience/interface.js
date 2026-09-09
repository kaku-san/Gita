/* DOM adapter for the cinematic reading interface. No scene or audio ownership. */
const icons={
  read:'<path d="M4 5.5c3-1 5-1 8 1 3-2 5-2 8-1v14c-3-1-5-1-8 1-3-2-5-2-8-1zM12 6.5v14"/>',
  listen:'<path d="M4 14v-3a8 8 0 0 1 16 0v3M4 12H3v7h4v-7zM20 12h1v7h-4v-7z"/>',
  source:'<path d="M6 3h10a2 2 0 0 1 2 2v16H7a3 3 0 0 1 0-6h11M7 3v12M10 7h5M10 10h5"/>',
  more:'<path d="M5 8h14M5 16h14"/><circle cx="9" cy="8" r="2"/><circle cx="15" cy="16" r="2"/>',
  back:'<path d="m14 5-7 7 7 7"/>'
};
const svg=name=>`<svg aria-hidden="true" viewBox="0 0 24 24">${icons[name]}</svg>`;
const copy={
  en:{source:'Shloka',details:'Reading and playback controls',switch:'Switch to',back:'Back to chapters'},
  hi:{source:'श्लोक',details:'पठन और श्रवण नियंत्रण',switch:'मोड बदलें:',back:'अध्यायों पर वापस जाएँ'},
  ja:{source:'詩節',details:'読書・再生コントロール',switch:'切り替え：',back:'章一覧に戻る'},
  'zh-Hans':{source:'偈颂',details:'阅读与播放控制',switch:'切换到',back:'返回章节'},
  fr:{source:'Shloka',details:'Commandes de lecture et d’écoute',switch:'Passer à',back:'Retour aux chapitres'}
};

export function createInterface({onLayout=()=>{}}={}){
  const $=id=>document.getElementById(id),dock=$('journey-dock'),menu=$('menu');
  const mode=document.createElement('button');mode.id='mode-toggle';mode.type='button';
  dock.insertBefore(mode,$('mode-switch'));$('mode-switch').hidden=true;
  const more=document.createElement('button');more.id='player-details-toggle';more.type='button';more.innerHTML=svg('more');more.setAttribute('aria-controls','player-details');more.setAttribute('aria-expanded','false');dock.append(more);
  const details=document.createElement('section');details.id='player-details';details.hidden=true;
  const navigation=document.createElement('div');navigation.className='detail-navigation';details.append(navigation);
  navigation.append($('back'),$('audio-back'),document.querySelector('.passage-meta'));
  details.append(document.querySelector('.audio-timeline'));dock.before(details);
  // These are destinations at the bottom of the index, rather than a second tab bar.
  const destinations=menu.querySelector('.menu-sections');menu.append(destinations);
  menu.querySelector('.sheet-top').prepend($('menu-chapters'));
  let currentLocale='en',labels=null,section='chapters';
  const setExpanded=value=>{details.hidden=!value;document.body.classList.toggle('player-expanded',value);more.setAttribute('aria-expanded',String(value));onLayout();};
  more.onclick=()=>setExpanded(details.hidden);
  mode.onclick=()=>{$(document.body.dataset.mode==='read'?'mode-listen':'mode-read').click();setExpanded(false);};
  addEventListener('keydown',event=>{if(event.key==='Escape'&&!details.hidden&&!document.querySelector('dialog[open]')){setExpanded(false);more.focus();}});
  function syncMenu(next=section){
    section=next;menu.dataset.section=section;
    $('menu-chapters').hidden=section==='chapters';
    destinations.hidden=section!=='chapters';
    if(labels){$('menu-title').textContent=section==='settings'?labels.x.settings:section==='about'?labels.x.intro:labels.x.journey;$('menu-chapters').innerHTML=svg('back');$('menu-chapters').setAttribute('aria-label',copy[currentLocale].back);}
  }
  function refresh(locale,u,x,f){
    currentLocale=copy[locale]?locale:'en';labels={u,x,f};const c=copy[currentLocale],reading=document.body.dataset.mode==='read';
    mode.innerHTML=svg(reading?'listen':'read')+`<span>${reading?u.listen:u.read}</span>`;
    mode.setAttribute('aria-label',`${c.switch} ${reading?u.listen:u.read}`);mode.title=`${c.switch} ${reading?u.listen:u.read}`;
    $('source-toggle').innerHTML=svg('source')+`<span>${c.source}</span>`;
    $('source-toggle').setAttribute('aria-label',f.sourceButton);$('source-toggle').title=f.sourceButton;
    more.setAttribute('aria-label',c.details);more.title=c.details;details.setAttribute('aria-label',c.details);
    $('back').hidden=!reading;$('audio-back').hidden=reading;$('audio-next').hidden=reading;
    details.querySelector('.passage-meta').hidden=!reading;document.querySelector('.audio-timeline').hidden=reading;
    syncMenu();
  }
  return {refresh,syncMenu,collapse:()=>setExpanded(false)};
}
