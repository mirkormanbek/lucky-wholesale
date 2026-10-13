import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const selected=[
  {key:'ekaterina',name:'Екатерина',snippets:['Ткань отличная и прочная','Покупали сыну на день рождения, ему очень понравился кимоно. Спасибо продавцу.']},
  {key:'pavel',name:'Павел',snippets:['Очень хорошее кимоно приятно сидит хвалю']},
  {key:'alexey',name:'Алексей',snippets:['Качество очень хорошее! Размер подошёл ровно!','Продавца рекомендую']},
  {key:'elena',name:'Елена',snippets:['Качественный шлем','Смотрится стилево, мы с сыном довольны']},
  {key:'nina',name:'Нина',snippets:['Отличное кимоно, плотное, село хорошо, посмотрим как поведёт себя в носке']}
];
const normalize=s=>String(s||'').toLowerCase().replaceAll('ё','е').replace(/[^\p{L}\p{N}]+/gu,'');
export function matches(review,item){const text=normalize([review.pros,review.text].filter(Boolean).join(' '));return review.productValuation===5&&normalize(review.userName).includes(normalize(item.name))&&item.snippets.every(s=>text.includes(normalize(s)));}
function mediaURL(value){try{const u=new URL(value);return u.protocol==='https:'&&(u.hostname.endsWith('.wbbasket.ru')||u.hostname.endsWith('.wb.ru')||u.hostname.endsWith('.wildberries.ru'))?u.href:null;}catch{return null;}}
const root=process.cwd(),output=path.join(root,'public/data/selected-review-media.json');
async function main(){
  const token=process.env.WB_API_TOKEN?.trim();if(!token)throw Error('WB_API_TOKEN отсутствует.');
  const found=new Map(),ambiguous=new Set();let requests=0,scanned=0,apiStatus='ok';
  async function list(endpoint,skip,answered){
    const url=new URL('https://feedbacks-api.wildberries.ru/api/v1/'+endpoint);url.searchParams.set('take','5000');url.searchParams.set('skip',String(skip));url.searchParams.set('order','dateDesc');if(answered!==undefined)url.searchParams.set('isAnswered',String(answered));
    if(requests)await new Promise(r=>setTimeout(r,500));requests++;
    const response=await fetch(url,{headers:{Authorization:token},redirect:'error',signal:AbortSignal.timeout(45000)});
    if(!response.ok){apiStatus='HTTP '+response.status;return null;}const data=await response.json();if(data.error||!Array.isArray(data.data?.feedbacks)){apiStatus='Некорректный ответ WB';return null;}
    const reviews=data.data.feedbacks;scanned+=reviews.length;
    for(const review of reviews)for(const item of selected)if(matches(review,item)){
      if(found.has(item.key)&&found.get(item.key).id!==review.id)ambiguous.add(item.key);else found.set(item.key,review);
    }
    return reviews.length;
  }
  for(let page=0;page<4;page++){const count=await list('feedbacks/archive',page*5000);if(count===null||count<5000||found.size===5)break;}
  if(apiStatus==='ok'&&found.size<5)for(const answered of [false,true]){const count=await list('feedbacks',0,answered);if(count===null||found.size===5)break;}
  const result=[];await fs.mkdir(path.join(root,'public/media/reviews'),{recursive:true});
  for(const item of selected){const review=found.get(item.key);if(!review||ambiguous.has(item.key)){result.push({key:item.key,matched:false,reason:ambiguous.has(item.key)?'ambiguous':'not-found'});continue;}
    const photos=[];let photoIndex=0;
    for(const photo of (review.photoLinks||[]).slice(0,6)){
      const url=mediaURL(photo.fullSize);if(!url)continue;const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(30000)});if(!response.ok)continue;
      const type=response.headers.get('content-type')||'',ext=type.includes('webp')?'webp':type.includes('jpeg')?'jpg':type.includes('png')?'png':null;if(!ext)continue;
      const bytes=new Uint8Array(await response.arrayBuffer());if(bytes.length>12000000)continue;const file='media/reviews/'+item.key+'-'+(++photoIndex)+'.'+ext;await fs.writeFile(path.join(root,'public',file),bytes);photos.push('./'+file);
    }
    let video=null;const videoURL=mediaURL(review.video?.link);
    if(videoURL){const file='media/reviews/'+item.key+'-video.mp4';const p=spawnSync('ffmpeg',['-nostdin','-v','error','-y','-protocol_whitelist','https,tls,tcp,crypto','-i',videoURL,'-t','120','-an','-vf','scale=480:-2','-c:v','libx264','-preset','fast','-crf','26','-pix_fmt','yuv420p','-movflags','+faststart',path.join(root,'public',file)],{timeout:180000,stdio:'ignore'});if(p.status===0)video='./'+file;else await fs.rm(path.join(root,'public',file),{force:true});}
    result.push({key:item.key,matched:true,id:review.id,nmId:review.productDetails?.nmId||null,productName:review.productDetails?.productName||null,createdDate:review.createdDate||null,photos,video});
  }
  const report={generatedAt:new Date().toISOString(),apiStatus,requests,scanned,reviews:result};await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({apiStatus,requests,scanned,matched:result.filter(r=>r.matched).length,photos:result.reduce((n,r)=>n+(r.photos?.length||0),0),videos:result.filter(r=>r.video).length}));
}
if(process.env.WB_REVIEW_MATCH_TEST!=='1')main().catch(()=>{console.error('Не удалось получить выбранные отзывы. Подробные ответы API и токен не выводятся.');process.exitCode=1;});
