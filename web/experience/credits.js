const copy = {
 en:{title:'Credits',built:'Built with',voices:'Narration and battlefield sound',inspired:'Experience inspiration',source:'Adapted from the Bhagavad Gita',cast:'Voice cast',notices:'Fonts and licenses',details:'Credits and license notices'},
 hi:{title:'श्रेय',built:'निर्माण में उपयोग',voices:'कथावाचन और युद्धभूमि की ध्वनियाँ',inspired:'अनुभव की प्रेरणा',source:'भगवद्गीता पर आधारित',cast:'स्वर कलाकार',notices:'फ़ॉन्ट और लाइसेंस',details:'श्रेय और लाइसेंस विवरण'},
 ja:{title:'クレジット',built:'使用技術',voices:'ナレーションと戦場の音',inspired:'体験の着想',source:'『バガヴァッド・ギーター』をもとに',cast:'音声キャスト',notices:'フォントとライセンス',details:'クレジットとライセンス情報'},
 'zh-Hans':{title:'制作鸣谢',built:'使用技术',voices:'旁白与战场音效',inspired:'体验灵感',source:'改编自《薄伽梵歌》',cast:'配音阵容',notices:'字体与许可证',details:'鸣谢与许可说明'},
 fr:{title:'Crédits',built:'Réalisé avec',voices:'Narration et ambiance sonore',inspired:'Inspirations de l’expérience',source:'Adapté de la Bhagavad-Gita',cast:'Distribution des voix',notices:'Polices et licences',details:'Crédits et mentions de licence'}
};
const link=(name,url)=>{const a=document.createElement('a');a.textContent=name;a.href=url;if(url.startsWith('https:')||url.startsWith('./credits.html')){a.target='_blank';a.rel='noopener noreferrer';}return a;};
export function renderCredits(locale='en') {
 const c=copy[locale]||copy.en;
 for(const box of document.querySelectorAll('[data-project-credits]')){
  const open=box.open;box.replaceChildren();const summary=document.createElement('summary');summary.textContent=c.title;box.append(summary);
  for(const [label,links] of [
   [c.built,[['Three.js','https://threejs.org/'],['Web Audio API','https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API'],['HTML · CSS · JavaScript','https://developer.mozilla.org/en-US/docs/Web'],['OpenAI Codex','https://openai.com/codex/']]],
   [c.voices,[['ElevenLabs','https://elevenlabs.io/'],[c.cast,'./credits.html']]],
   [c.inspired,[["Lusion · AI Quest",'https://ai-quest.lusion.co/'],['Astra','https://astra.directory/'],['The Gateless Gate 3D','https://killedbyapixel.github.io/GatelessGate/#preface']]],
   [c.source,[['Bhagavad Gita','https://vedabase.io/en/library/bg/']]],
   [c.notices,[[c.details,'./credits.html#licenses']]]
  ]){const p=document.createElement('p');p.append(document.createTextNode(label));const row=document.createElement('span');row.className='credit-links';for(const [name,url] of links)row.append(link(name,url));p.append(row);box.append(p);}
  box.open=open;
 }
}
