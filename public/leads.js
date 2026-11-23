import {normalizePhone} from './lead-phone.js';
const form=document.querySelector('#leadForm'),dialog=document.querySelector('#requestDialog');
if(form){
 const status=document.querySelector('#leadStatus'),submit=form.querySelector('[type=submit]');let requestId=crypto.randomUUID(),running=false;
 const renew=()=>{if(!running){requestId=crypto.randomUUID();submit.disabled=false;submit.textContent='Отправить заявку';delete form.dataset.sent;}};
 form.addEventListener('input',renew);form.addEventListener('change',renew);
 function interest(value){const field=form.elements.interest;value=value.slice(0,400);if(field.value!==value){field.value=value;renew();}}
 function open(title){if(title)interest(title);if(dialog&&!dialog.open)dialog.showModal();form.elements.phone.focus();}
 document.addEventListener('click',e=>{const button=e.target.closest('[data-request-product]');if(button){e.preventDefault();open(button.dataset.requestTitle||'');}});
 window.addEventListener('lucky:request-open',e=>{if(e.detail?.interest)interest(e.detail.interest);});
 document.querySelector('#requestDialogClose')?.addEventListener('click',()=>dialog.close());
 const utm={};try{Object.assign(utm,JSON.parse(sessionStorage.getItem('lucky-lead-utm')||'{}'));}catch{}
 const params=new URLSearchParams(location.search);for(const key of ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','utm_id'])if(params.has(key))utm[key]=params.get(key).slice(0,80);
 try{sessionStorage.setItem('lucky-lead-utm',JSON.stringify(utm));}catch{}
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(running||form.dataset.sent)return;
  const phone=form.elements.phone;phone.setCustomValidity('');try{phone.value=normalizePhone(phone.value,form.elements.country.value);}catch(err){phone.setCustomValidity(err.message);phone.reportValidity();return;}
  if(!form.reportValidity())return;
  const data=Object.fromEntries(new FormData(form));data.consent=form.elements.consent.checked;data.page=location.origin+location.pathname;data.utm=utm;data.requestId=requestId;
  running=true;submit.disabled=true;status.hidden=false;status.className='lead-status';status.textContent='Отправляем заявку…';
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try{const r=await fetch('/leads.php',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-Requested-With':'LuckyWholesale'},body:JSON.stringify(data),signal:controller.signal});const response=await r.json().catch(()=>null);
   if(!r.ok||response?.ok!==true)throw Error(response?.error||'Не удалось подтвердить отправку. Напишите нам напрямую.');
   status.className='lead-status success';status.textContent='Заявка принята, ответим в течение часа в рабочее время';submit.textContent='Заявка отправлена';form.dataset.sent='true';window.dispatchEvent(new CustomEvent('lucky:lead-sent',{detail:{requestId}}));
  }catch(err){status.className='lead-status error';status.textContent=err.name==='AbortError'?'Не удалось подтвердить доставку. Пожалуйста, напишите нам в WhatsApp или Telegram.':err.message;submit.disabled=false;}
  finally{clearTimeout(timer);running=false;}
 });
 form.elements.phone.addEventListener('input',()=>form.elements.phone.setCustomValidity(''));
 form.elements.country.addEventListener('change',()=>form.elements.phone.setCustomValidity(''));
 document.querySelector('#productCurrency')?.addEventListener('change',e=>{const c=e.target.value;document.cookie='lucky_currency='+c+'; Path=/; Max-Age=31536000; SameSite=Lax';try{localStorage.setItem('lucky-wholesale-currency',c);}catch{}const url=new URL(location.href);url.searchParams.set('currency',c);location.assign(url);});
}
fetch('/site-settings.php',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(data=>{const mount=document.querySelector('#wholesaleTermsMount');if(!mount||!Array.isArray(data?.terms))return;const section=document.createElement('section');section.className='wholesale-terms';section.id='wholesaleTerms';const title=document.createElement('h2');title.textContent='Условия опта';const list=document.createElement('ul');for(const text of data.terms){const li=document.createElement('li');li.textContent=text;list.append(li);}section.append(title,list);mount.replaceWith(section);}).catch(()=>{});
