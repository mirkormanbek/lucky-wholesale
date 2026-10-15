export function normaliseRotation(value){return ((Number(value)||0)%360+360)%360;}
export function rotationRequest(instructions){
 const pattern=/(?:поверн[а-яё]*|поворот)[^.\n;]{0,45}?([−-]?\s*(?:90|180|270))\s*(?:°|градус[а-яё]*)/iu;
 const match=pattern.exec(instructions);
 if(!match)return {degrees:null,instructions};
 const degrees=Number(match[1].replace(/\s/g,"").replace("−","-"));
 return {degrees,instructions:instructions.replace(match[0],"").replace(/^[\s,;:.]+|[\s,;:.]+$/g,"")};
}
export async function rotatedPhotoSource(source,degrees){
 const angle=normaliseRotation(degrees);if(![0,90,180,270].includes(angle))throw Error("Допустим поворот на 90, 180 или 270 градусов.");
 if(!angle)return source;
 const image=new Image();image.src=source;await image.decode();
 if(image.naturalWidth*image.naturalHeight>40000000)throw Error("Фото слишком большое для поворота. Загрузите уменьшенную копию.");
 const swap=angle===90||angle===270,limit=10*1024*1024;
 let edge=3200;
 for(let attempt=0;attempt<4;attempt++,edge=Math.floor(edge*.8)){
  const scale=Math.min(1,edge/Math.max(image.naturalWidth,image.naturalHeight)),w=Math.max(1,Math.round(image.naturalWidth*scale)),h=Math.max(1,Math.round(image.naturalHeight*scale));
  const canvas=document.createElement("canvas");canvas.width=swap?h:w;canvas.height=swap?w:h;
  const context=canvas.getContext("2d");if(!context)throw Error("Браузер не поддерживает поворот фото.");
  context.fillStyle="#fff";context.fillRect(0,0,canvas.width,canvas.height);context.translate(canvas.width/2,canvas.height/2);context.rotate(angle*Math.PI/180);context.drawImage(image,-w/2,-h/2,w,h);
  for(const [type,quality]of [["image/png",undefined],["image/jpeg",.94],["image/jpeg",.88]]){
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,type,quality));
   if(blob&&blob.size<=limit)return await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error("Не удалось подготовить фото."));reader.readAsDataURL(blob);});
  }
 }
 throw Error("Не удалось подготовить рабочую копию. Оригинал сохранён.");
}
export function keepPhotoEdits(next,previous){
 return next.map(photo=>{const old=previous.find(p=>(p.serverId||p.id)===(photo.serverId||photo.id));
  return {...photo,processingInstructions:old?.processingInstructions||"",inputRotation:photo.original?(old?.inputRotation||0):0,processingSource:photo.original?old?.processingSource:null};
 });
}
