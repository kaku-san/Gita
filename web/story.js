// Original adaptation preserved from Geeta's production story, XI.
// Reader-paced passages: scene values are independent of elapsed time.
export const passages=[
  {phase:'The request',speaker:'Arjun',text:'If you think I can bear it, show me your sovereign form.',source:'11.1–4',next:'The gift of sight',vision:0,reveal:0,dread:0,gentle:0,scale:3.2,position:[0,0,38],camera:[11,6.4,13],aim:[0,3,1.8],duration:0},
  {phase:'Divine sight',speaker:'Krishna',text:'Your ordinary eyes cannot take in this vision. I grant you divine sight.',source:'11.5–14',next:'Behold',vision:.48,reveal:.16,dread:0,gentle:0,scale:3.2,position:[0,0,38],camera:[9,5,-12],aim:[0,8.5,24],duration:6.5},
  {phase:'The universal form',speaker:'Arjun',text:'I see beings and divine powers within you. Your radiance fills every direction.',source:'11.15–22',next:'Beyond all measure',vision:1,reveal:1,dread:0,gentle:0,scale:3.2,position:[0,0,38],camera:[14,6,-18],aim:[0,17,35],duration:7},
  {phase:'Without beginning or end',speaker:'Arjun',text:'I cannot find your beginning, your middle or your end.',source:'11.16–20',next:'Wonder becomes fear',vision:1,reveal:1,dread:0,gentle:0,scale:3.2,position:[0,0,38],camera:[21,7,-23],aim:[0,17,37],duration:4.5},
  {phase:'Wonder becomes fear',speaker:'Arjun',text:'I see our warriors entering destruction, rushing toward it like rivers toward the sea.',source:'11.23–31',next:'Who are you?',vision:1,reveal:1,dread:.72,gentle:0,scale:3.2,position:[0,0,38],camera:[9,5.2,-15],aim:[0,15,35],duration:5.5},
  {phase:'Time',speaker:'Krishna',text:'I am Time, bringing worlds to their end. The warriors arrayed here will not remain, even without you.',source:'11.32–34',next:'Arjun’s appeal',vision:1,reveal:1,dread:1,gentle:0,scale:3.2,position:[0,0,38],camera:[9,5.2,-15],aim:[0,15,35],duration:3},
  {phase:'The appeal',speaker:'Arjun',text:'I am filled with wonder, and shaken by fear. Show me again a form I can bear.',source:'11.35–46',next:'Let this fear subside',vision:.72,reveal:1,dread:.25,gentle:.35,scale:2.6,position:[0,0,30],camera:[9,5,-15],aim:[0,10,22],duration:5},
  {phase:'The reassuring form',speaker:'Krishna',text:'Let this fear subside. See again the form you have asked for.',source:'11.46–49',next:'The friend returns',vision:.28,reveal:1,dread:0,gentle:1,scale:.5,position:[0,.3,16],camera:[9,5,-12],aim:[0,4.6,16],duration:6},
  {phase:'The friend within the vastness',speaker:'Arjun',text:'Seeing your gentle human form, I can gather myself again.',source:'11.50–51',next:'Return to the teaching',vision:0,reveal:0,dread:0,gentle:1,scale:.5,position:[0,.3,16],camera:[6.7,4.6,6],aim:[0,3.2,.7],duration:6},
  {phase:'The teaching continues',speaker:'Krishna',text:'Through undivided devotion I can be truly known, seen and entered. Be free of clinging and of hostility toward beings.',source:'11.52–55',next:'Experience again',vision:0,reveal:0,dread:0,gentle:1,scale:.5,position:[0,.3,16],camera:[7.8,4.5,7.5],aim:[0,3.2,.8],duration:3.5}
];
export const reading=[
  {title:'The gift of sight · 11.1–14',lines:[['Arjun','What you have taught me has lifted much of my confusion. I have heard how beings arise and pass away. I want to behold your sovereign form. If you think I can bear it, show me.'],['Krishna','Behold my forms in their countless colours and kinds. See the whole world gathered here, and wonders you have never seen. Your ordinary eyes cannot take in this vision. I grant you divine sight.'],['Sanjaya','Then Krishna revealed the universal form. Its radiance was beyond the light the field had known.']]},
  {title:'Wonder becomes fear · 11.15–31',lines:[['Arjun','I see beings and divine powers within you. I cannot find your beginning, your middle or your end. Your radiance fills every direction.'],['Arjun','And I see our warriors entering destruction. Bhishma, Drona, the sons of Dhritarashtra—rushing toward it like rivers toward the sea. I cannot find peace. Tell me who you are in this terrible form.']]},
  {title:'Time · 11.32–34',lines:[['Krishna','I am Time, bringing worlds to their end. The warriors arrayed here will not remain, even without you. Rise, Arjun. Become an instrument. These warriors stand already within that ending. Meet the battle before you.'],['Context','This difficult command belongs to Krishna’s revelation and Arjun’s particular role in the epic. It is not permission to identify one’s own enemies with those warriors or to use religion to excuse violence.']]},
  {title:'The friend within the vastness · 11.35–55',lines:[['Arjun','I have called you my friend and spoken lightly, not knowing the greatness before me. Forgive what I failed to understand. I am filled with wonder, and shaken by fear. Show me again a form I can bear: crowned, with mace and discus, with four arms.'],['Krishna','Let this fear subside. See again the form you have asked for.'],['Arjun','Seeing your gentle human form, I can gather myself again.'],['Krishna','Through undivided devotion I can be truly known, seen and entered. Work for me. Make me your highest aim. Be free of clinging and of hostility toward beings.']]}
];
export const clamp01=n=>Math.max(0,Math.min(1,n));
export const ease=n=>{const t=clamp01(n);return t*t*t*(t*(t*6-15)+10);};
export function interpolate(a,b,t){
  const e=ease(t),out={};
  for(const k of ['vision','reveal','dread','gentle','scale'])out[k]=a[k]+(b[k]-a[k])*e;
  for(const k of ['position','camera','aim'])out[k]=a[k].map((n,i)=>n+(b[k][i]-n)*e);
  return out;
}
