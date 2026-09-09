import * as T from '../vendor/three.module.min.js';

// Deliberate cinematic staging, disclosed on entry; these hours are not a
// claim that the conversation lasted a day. Chapter XI keeps its own light.
const stops=[
  {at:0,low:'#c88858',mid:'#6a6989',high:'#354766',haze:'#ae8975',sun:'#ffd0a0',hemi:'#bbcbe2',key:2.4,ambient:1.18,night:0,elevation:.10},
  {at:.4,low:'#b8c7c0',mid:'#739ab5',high:'#355d8e',haze:'#a8b5b4',sun:'#fff0d6',hemi:'#d6e9fa',key:3.25,ambient:1.4,night:0,elevation:.70},
  {at:.76,low:'#bc8053',mid:'#615666',high:'#293a5b',haze:'#bb8d67',sun:'#ffce91',hemi:'#c3cbe3',key:2.5,ambient:1.12,night:0,elevation:.08},
  {at:1,low:'#202b45',mid:'#101c34',high:'#060c20',haze:'#1b2539',sun:'#aec9ee',hemi:'#7497c7',key:.45,ambient:.68,night:1,elevation:.42}
];
const colors=['low','mid','high','haze','sun','hemi'];
export function daylightFor(entry,mode='story'){
  if(mode==='dawn')return 0;if(mode==='day')return .4;if(mode==='dusk')return .76;if(mode==='night')return 1;
  return T.MathUtils.clamp((entry.chapter||0)/18,0,1);
}
export function sampleDaylight(value,target={}){
  const t=T.MathUtils.clamp(value,0,1);let i=1;while(i<stops.length-1&&t>stops[i].at)i++;
  const a=stops[i-1],b=stops[i],k=T.MathUtils.smoothstep((t-a.at)/(b.at-a.at),0,1);
  for(const key of colors){target[key]??=new T.Color();target[key].set(a[key]).lerp(new T.Color(b[key]),k);}
  for(const key of ['key','ambient','night','elevation'])target[key]=T.MathUtils.lerp(a[key],b[key],k);
  target.direction??=new T.Vector3();target.direction.set(-.53,target.elevation,-.845).normalize();
  return target;
}
export function prayerFor(entry){return entry.chapter>=2&&!(entry.chapter===18&&entry.scene===3&&entry.beat>=3)?1:0;}
