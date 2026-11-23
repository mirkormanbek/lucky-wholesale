const pending=new Set(),sent=new Set();let counter=null;
const disabled=navigator.doNotTrack==='1'||navigator.globalPrivacyControl===true;
function flush(){if(!counter||disabled)return;for(const id of pending){if(!sent.has(id)){window.ym(counter,'reachGoal','lead_sent');sent.add(id);}pending.delete(id);}}
window.addEventListener('lucky:lead-sent',e=>{if(disabled||typeof e.detail?.requestId!=='string')return;pending.add(e.detail.requestId);flush();});
if(!disabled)fetch('/site-settings.php',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(data=>{
 if(!/^[1-9][0-9]{0,11}$/.test(data?.metrikaId||''))return;counter=Number(data.metrikaId);
 window.ym=window.ym||function(){(window.ym.a=window.ym.a||[]).push(arguments);};window.ym.l=Date.now();
 const script=document.createElement('script');script.async=true;script.src='https://mc.yandex.ru/metrika/tag.js';document.head.append(script);
 window.ym(counter,'init',{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:false});flush();
}).catch(()=>{});
