/** Entry stays covered until the first usable scene and selected-language assets exist. */
export const preparationCopy={
 en:{loading:'Loading your journey…',failed:'The journey could not finish loading.',retry:'Try again',back:'Back',speed:'Playback speed',rewind:'Back 15 seconds',forward:'Forward 15 seconds'},
 hi:{loading:'आपकी यात्रा तैयार हो रही है…',failed:'यात्रा पूरी तरह लोड नहीं हो सकी।',retry:'फिर कोशिश करें',back:'वापस',speed:'सुनने की गति',rewind:'15 सेकंड पीछे',forward:'15 सेकंड आगे'},
 ja:{loading:'旅を読み込んでいます…',failed:'読み込みを完了できませんでした。',retry:'再試行',back:'戻る',speed:'再生速度',rewind:'15秒戻る',forward:'15秒進む'},
 'zh-Hans':{loading:'正在加载旅程…',failed:'旅程未能完成加载。',retry:'重试',back:'返回',speed:'播放速度',rewind:'后退15秒',forward:'前进15秒'},
 fr:{loading:'Votre voyage se prépare…',failed:'Le chargement n’a pas pu se terminer.',retry:'Réessayer',back:'Retour',speed:'Vitesse de lecture',rewind:'Reculer de 15 secondes',forward:'Avancer de 15 secondes'}
};
export function createPreparation({root,intro,content,locale=()=> 'en',onReady,onCancel=()=>{}}){
 let token=0,busy=false,timer=null;
 const label=root.querySelector('[role=status]'),progress=root.querySelector('progress'),actions=root.querySelector('nav');
 function clear(){clearTimeout(timer);timer=null;}
 function close(){clear();busy=false;root.hidden=true;intro.inert=false;document.body.classList.remove('is-loading');}
 async function run(work){
  if(busy)return;busy=true;const id=++token,c=preparationCopy[locale()]||preparationCopy.en;
  label.textContent=c.loading;progress.hidden=false;actions.hidden=true;root.hidden=false;intro.inert=true;content.inert=true;root.setAttribute('aria-busy','true');
  root.querySelector('[data-retry]').textContent=c.retry;root.querySelector('[data-back]').textContent=c.back;
  document.body.classList.add('is-loading');root.focus({preventScroll:true});
  try{
   await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   if(id!==token)return;
   await Promise.race([work(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Preparation timed out')),90000);})]);
   if(id!==token)return;close();onReady();
  }catch{
   if(id!==token)return;clear();busy=false;label.textContent=c.failed;progress.hidden=true;actions.hidden=false;root.setAttribute('aria-busy','false');
   root.querySelector('[data-retry]').focus({preventScroll:true});
  }
 }
 function cancel(){++token;close();onCancel();}
 root.querySelector('[data-back]').onclick=cancel;
 root.querySelector('[data-retry]').onclick=()=>location.reload();
 return {run,cancel,get busy(){return busy;}};
}

/** Bounded compressed-audio cache; no decoding an entire book into mobile RAM. */
export function createAudioCache({maxBytes=24e6}={}){
 const entries=new Map();let bytes=0,disposed=false;
 async function load(src){
  const url=new URL(src,location.href);if(url.origin!==location.origin)throw Error('Audio must be hosted locally');
  if(entries.has(url.href))return entries.get(url.href).promise;
  const item={url:null,size:0,promise:null};entries.set(url.href,item);
  item.promise=(async()=>{
   const response=await fetch(url);if(!response.ok)throw Error('Audio unavailable');
   const blob=await response.blob();if(!blob.size||blob.size>8e6)throw Error('Audio unavailable');
   if(disposed)throw Error('Audio cache disposed');
   item.url=URL.createObjectURL(blob);item.size=blob.size;bytes+=blob.size;
   return item.url;
  })().catch(e=>{entries.delete(url.href);throw e;});return item.promise;
 }
 function get(src){try{return entries.get(new URL(src,location.href).href)?.url||null;}catch{return null;}}
 function retain(sources){
  const keep=new Set(sources.map(src=>new URL(src,location.href).href));
  for(const [src,item] of entries){if(bytes<=maxBytes)break;if(keep.has(src)||!item.url)continue;URL.revokeObjectURL(item.url);bytes-=item.size;entries.delete(src);}
 }
 function dispose(){disposed=true;for(const item of entries.values())if(item.url)URL.revokeObjectURL(item.url);entries.clear();bytes=0;}
 return {load,get,retain,dispose};
}
