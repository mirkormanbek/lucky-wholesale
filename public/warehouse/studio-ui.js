export function initPhotoStudio(context){
 const $=id=>document.getElementById(id),modeNames={white:'Белый фон',ghost:'Невидимый манекен',model:'На модели'},viewNames={front:'Спереди',back:'Сзади',side:'Сбоку','three-quarter':'В три четверти'};let mode='white',running=false,lastId=null;
 function estimate(count){return '$'+(Math.ceil((.039+.05*count)*100)/100).toFixed(2)+'–'+(Math.ceil((.039+.08*count)*100)/100).toFixed(2);}
 function render(){
  const c=context.get(),visible=c.role==='owner'&&c.fields?.imageProcessingEnabled&&c.current&&$('entryMode').value!=='batch'&&c.current.status!=='trashed';$('photoStudio').hidden=!visible;if(!visible)return;
  if(lastId!==c.current.id){lastId=c.current.id;mode='white';$('studioInstructions').value='';$('studioView').value='front';$('studioViewConfirmed').checked=false;$('studioProgress').textContent='';}
  const count=c.photos.length;const locked=running||c.busy||c.current.studioPending;
  $('studioSources').textContent='Исходников: '+count+'. Основной ракурс — первое фото. Если оригинал уже принят и удалён, используем сохранённое обработанное фото. Для нескольких вариантов сначала создайте их, затем заменяйте галерею.';
  $('studioSourceThumbs').replaceChildren();for(const photo of c.photos){const image=document.createElement('img');image.src=photo.original||photo.processed||'';image.alt='Исходник товара';$('studioSourceThumbs').append(image);}
  $('studioEstimate').textContent=count?'Ориентир '+estimate(count)+' за кадр':'Сначала добавьте фото';
  $('studioModelField').hidden=mode!=='model';$('studioViewCheck').hidden=!['back','side'].includes($('studioView').value);
  $('photoStudio').querySelectorAll('button,input,select,textarea').forEach(e=>e.disabled=locked);
  $('studioGenerate').disabled=locked||!count||(c.current.studioResults||[]).length>=8;
  $('photoStudio').querySelectorAll('[data-studio-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.studioMode===mode)));
  $('studioResults').replaceChildren();
  for(const result of c.current.studioResults||[]){const card=document.createElement('article'),preview=document.createElement('button'),image=document.createElement('img'),label=document.createElement('p'),actions=document.createElement('div');card.className='studio-result';preview.type='button';preview.className='studio-result-preview';preview.setAttribute('aria-label','Открыть результат студии');image.src=result.processed;image.alt='Новый вариант товара';preview.append(image);preview.addEventListener('click',()=>context.open(result,'processed'));label.textContent=(modeNames[result.studio?.mode]||'Вариант')+' · '+(viewNames[result.studio?.view]||'')+' · '+(result.studio?.sourceCount||0)+' исходников';
   actions.className='actions';for(const [decision,title]of [['replace','Принять вместо текущих фото'],['append','Принять и добавить'],['discard','Отклонить вариант']]){const b=document.createElement('button');b.type='button';b.textContent=title;b.disabled=locked;b.addEventListener('click',()=>decide(result,decision));actions.append(b);}card.append(preview,label,actions);$('studioResults').append(card);
  }
 }
 async function decide(result,decision){
  if(running||context.get().busy)return;const prompts={replace:'Принять результат и заменить им все текущие фото? Неиспользуемые исходники и старые фото будут удалены после сохранения. Товар не публикуется автоматически.',append:'Принять результат и добавить его к текущим фото? Для публикации остальные фото тоже должны быть приняты.',discard:'Удалить этот вариант студии? Вернуть его будет нельзя. Исходники товара сохранятся.'};if(!confirm(prompts[decision]))return;
  if(!await context.save())return;running=true;context.busy(true);render();
  try{const c=context.get();await context.api('studio-result',{id:c.current.id,revision:c.current.revision,photoId:result.id,decision});await context.reload();context.message(decision==='discard'?'Вариант удалён. Исходники сохранены.':'Фото принято. Проверьте карточку и подтвердите публикацию отдельно.');}catch(e){context.message(e.message);}finally{running=false;context.busy(false);render();}
 }
 async function generate(){
  if(running||context.get().busy)return;
  if(['back','side'].includes($('studioView').value)&&!$('studioViewConfirmed').checked){context.message('Для вида сзади или сбоку нужно соответствующее фото. Подтвердите его наличие.');return;}
  const count=context.get().photos.length;if(!count)return;const options={mode,view:$('studioView').value,model:$('studioModel').value,instructions:$('studioInstructions').value.trim(),viewConfirmed:$('studioViewConfirmed').checked};
  if(!confirm('Создать 1 кадр «'+modeNames[mode]+'», используя все '+count+' фото? Ориентир '+estimate(count)+'. Это платный запуск; оценка не является лимитом списания. Автоматического повтора нет.'))return;
  if(!await context.save())return;const c=context.get(),id=c.current.id,requestId=crypto.randomUUID();running=true;context.busy(true);render();$('studioProgress').textContent='Создаём кадр по всем исходникам. Не закрывайте страницу. Если связь прервётся, сначала обновите карточку — готовый вариант сохраняется на сервере.';
  try{const response=await fetch('./process-studio.php',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-Requested-With':'LuckyWarehouse'},body:JSON.stringify({...options,id,revision:c.current.revision,requestId,confirmed:true})});const data=await response.json();if(!response.ok)throw Error(data.error||'Обработка не завершена.');await context.reload();context.message('Новый вариант сохранён отдельно. Сравните его с исходниками и выберите, какие фото использовать.');$('studioProgress').textContent='Готово. Текущая галерея не заменена.';
  }catch(e){context.message((e.message||'Связь прервалась.')+' Перед повтором обновите карточку. Новый запуск оплачивается отдельно.');$('studioProgress').textContent='Автоматический повтор отключён.';}finally{running=false;context.busy(false);render();}
 }
 $('photoStudio').querySelectorAll('[data-studio-mode]').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.studioMode;render();}));$('studioView').addEventListener('change',()=>{$('studioViewConfirmed').checked=false;render();});$('studioGenerate').addEventListener('click',generate);
 return {render};
}

