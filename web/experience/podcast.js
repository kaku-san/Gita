/** Pure chapter timeline shared by scrubber, skips and media-session controls. */
export function chapterTimeline(entries,index,records){
 const chapter=entries[index]?.chapter;
 const rows=entries.map((entry,index)=>({entry,index,duration:Number(records?.[entry.id]?.duration)||0})).filter(row=>row.entry.chapter===chapter);
 let duration=0;
 for(const row of rows){row.start=duration;duration+=row.duration;}
 return {rows,duration,current:rows.find(row=>row.index===index),complete:rows.length>0&&rows.every(row=>row.duration>0)};
}
export function locateChapterTime(timeline,time){
 const value=Math.max(0,Math.min(timeline.duration-.01,Number(time)||0));
 const row=timeline.rows.find(row=>row.start+row.duration>value)||timeline.rows.at(-1);
 return row?{index:row.index,time:Math.max(0,value-row.start)}:null;
}
export const playbackSpeeds=[.5,.75,1,1.25,1.5,1.75,2];
export function locateSkip(entries,index,time,offset,records){
 let i=Math.max(0,Math.min(entries.length-1,index)),target=(Number(time)||0)+(Number(offset)||0);
 while(target<0&&i>0){const previous=Number(records?.[entries[i-1].id]?.duration)||0;if(!previous)break;i--;target+=previous;}
 let duration=Number(records?.[entries[i]?.id]?.duration)||0;
 while(duration>0&&target>=duration&&i<entries.length-1){const next=Number(records?.[entries[i+1].id]?.duration)||0;if(!next)break;target-=duration;i++;duration=next;}
 return {index:i,time:Math.max(0,Math.min(Math.max(0,duration-.01),target))};
}
