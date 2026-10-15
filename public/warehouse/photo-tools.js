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
 const canvas=document.createElement("canvas"),swap=angle===90||angle===270;
 canvas.width=swap?image.naturalHeight:image.naturalWidth;canvas.height=swap?image.naturalWidth:image.naturalHeight;
 const context=canvas.getContext("2d");if(!context)throw Error("Браузер не поддерживает поворот фото.");
 context.translate(canvas.width/2,canvas.height/2);context.rotate(angle*Math.PI/180);context.drawImage(image,-image.naturalWidth/2,-image.naturalHeight/2);
 const result=canvas.toDataURL("image/png");
 if(result.length*3/4>12*1024*1024)throw Error("После поворота PNG превышает 12 МБ. Загрузите уменьшенную копию фото.");
 return result;
}
export function keepPhotoEdits(next,previous){
 return next.map(photo=>{const old=previous.find(p=>(p.serverId||p.id)===(photo.serverId||photo.id));
  return {...photo,processingInstructions:old?.processingInstructions||"",inputRotation:photo.original?(old?.inputRotation||0):0,processingSource:photo.original?old?.processingSource:null};
 });
}
