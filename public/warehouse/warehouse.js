import {initPhotoStudio} from "./studio-ui.js?v=4";
import {normaliseRotation,rotationRequest,rotatedPhotoSource,keepPhotoEdits} from "./photo-tools.js?v=2";
let warehouseRecords=[];
const $=id=>document.getElementById(id);
let db,fields,categories,current,photos=[],manualCategory=false,busy=false,role="manager",view="all",colorExplicit=true;
const normalize=s=>String(s).toLowerCase().replaceAll("ё","е").trim();
const split=s=>[...new Set(s.split(",").map(x=>x.trim()).filter(Boolean))];
const message=s=>$("message").textContent=s;
let viewedPhoto=null,viewerZoom=false,previousOverflow="";
function viewerImage(kind){
 if(!viewedPhoto?.[kind])return;
 $("viewerImage").src=kind==="original"?(viewedPhoto.processingSource||viewedPhoto.original):viewedPhoto[kind];$("viewerImage").alt=kind==="original"?"Оригинал фото товара":"Обработанное фото товара";
 $("viewerOriginal").setAttribute("aria-pressed",String(kind==="original"));$("viewerProcessed").setAttribute("aria-pressed",String(kind==="processed"));
 viewerZoom=false;$("viewerCanvas").classList.remove("actual-size");$("viewerZoom").textContent="Увеличить до 100%";
}
function openPhoto(photo,kind){
 viewedPhoto=photo;$("viewerOriginal").hidden=!photo.original;$("viewerProcessed").hidden=!photo.processed;
 $("viewerNote").textContent=photo.original?"Сравните детали, цвет и надписи на товаре.":"Оригинал удалён после подтверждения. Доступно обработанное фото.";
 viewerImage(photo[kind]?kind:(photo.processed?"processed":"original"));
 if(!$("photoViewer").open){previousOverflow=document.documentElement.style.overflow;document.documentElement.style.overflow="hidden";$("photoViewer").showModal();}
}
function photoThumbnail(img,photo,kind){const button=document.createElement("button");button.type="button";button.className="photo-thumbnail";button.setAttribute("aria-label",kind==="original"?"Открыть оригинал фото крупно":"Открыть обработанное фото крупно");button.title="Нажмите для увеличения";button.append(img);button.addEventListener("click",()=>openPhoto(photo,kind));return button;}
$("viewerOriginal").addEventListener("click",()=>viewerImage("original"));$("viewerProcessed").addEventListener("click",()=>viewerImage("processed"));
$("viewerClose").addEventListener("click",()=>$("photoViewer").close());
$("viewerZoom").addEventListener("click",()=>{viewerZoom=!viewerZoom;$("viewerCanvas").classList.toggle("actual-size",viewerZoom);$("viewerZoom").textContent=viewerZoom?"Вписать в экран":"Увеличить до 100%";});
$("photoViewer").addEventListener("close",()=>{document.documentElement.style.overflow=previousOverflow;viewedPhoto=null;$("viewerImage").removeAttribute("src");});
$("photoViewer").addEventListener("click",e=>{if(e.target!==$("photoViewer"))return;const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.currentTarget.close();});
$("photoViewer").addEventListener("keydown",e=>{if(e.key==="ArrowLeft"||e.key==="ArrowRight"){e.preventDefault();viewerImage(e.key==="ArrowLeft"?"original":"processed");}});
function request(req){return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});}
async function api(action,body){const response=await fetch("./api.php?action="+action,{cache:"no-store",credentials:"same-origin",...(body?{method:"POST",headers:{"Content-Type":"application/json","X-Requested-With":"LuckyWarehouse"},body:JSON.stringify(body)}:{})});let data;try{data=await response.json();}catch(e){throw Error("Серверный модуль не установлен или не настроен.");}if(!response.ok)throw Error(data.error||"Ошибка сервера.");return data;}
async function all(){const data=await api("list");role=data.role;$("wbProducts").hidden=role!=="owner";return data.products;}
async function upload(photo,kind,expectedVersion=null){const source=await (await fetch(photo[kind],{credentials:"same-origin"})).blob(),form=new FormData();form.append("photo",source,photo.name||"product.png");form.append("kind",kind);if(expectedVersion){form.append("replace","1");form.append("expectedVersion",expectedVersion);}if(photo.serverId)form.append("id",photo.serverId);const response=await fetch("./api.php?action=upload",{method:"POST",headers:{"X-Requested-With":"LuckyWarehouse"},credentials:"same-origin",body:form});const data=await response.json();if(!response.ok)throw Error(data.error||"Не удалось загрузить фото.");return data.id;}
async function put(product){for(const photo of product.photos){const live=photos.find(p=>p.id===photo.id);if(!photo.serverId)photo.serverId=await upload(photo,"original");if(live)live.serverId=photo.serverId;if(photo.processed?.startsWith("data:")){await upload(photo,"processed");photo.processed="./api.php?action=photo&id="+photo.serverId+"&kind=processed";if(live)live.processed=photo.processed;}}return (await api("save",{...product,photos:product.photos.map(p=>p.serverId)})).product;}
function options(select,values){select.replaceChildren();for(const value of values){const option=document.createElement("option");option.value=value;option.textContent=value||"Выберите";select.appendChild(option);}}
function checks(id,values,chosen=[]){$(id).replaceChildren();for(const value of [...new Set(values)]){const label=document.createElement("label"),input=document.createElement("input");input.type=id==="colors"?"radio":"checkbox";if(id==="colors")input.name="product-color-value";input.value=value;input.checked=chosen.includes(value);label.append(input,document.createTextNode(value));$(id).appendChild(label);}}
function chosen(id){return [...$(id).querySelectorAll("input:checked")].map(e=>e.value);}
function entryMode(){
 $("ownerActions").hidden=role!=="owner"||$("entryMode").value==="batch";
 $("addColor").hidden=$("entryMode").value==="batch";$("addColor").disabled=busy;
 const batch=$("entryMode").value==="batch";$("entryHint").textContent=batch?"Каждое фото станет отдельным товаром. Категория, цена и характеристики общие для партии.":"Фото одного товара и одного цвета.";
 $("save").textContent=batch?(role==="owner"?"Создать товары · ":"Отправить на проверку · ")+photos.length:(role==="owner"?"Сохранить изменения":"Отправить на проверку");
 $("saveDraft").textContent=batch?"Сохранить всю партию":"Сохранить черновик";
}
function categoryTitle(){
 const category=categories.find(c=>c.id===$("category").value);if(!category)return "";
 return fields.titles?.[category.id]||category.name;
}
function titlePreview(){$("generatedTitle").textContent=$("title").value.trim()||categoryTitle()||"Подставится автоматически";}
function typeOptions(selected=""){
 const items=categories.filter(c=>c.active!==false&&c.parentId===$("sport").value).sort((a,b)=>(a.sort||0)-(b.sort||0));
 $("category").replaceChildren();const blank=document.createElement("option");blank.value="";blank.textContent="Выберите тип товара";$("category").appendChild(blank);
 for(const c of items){const option=document.createElement("option");option.value=c.id;option.textContent=c.name;$("category").appendChild(option);}$("category").value=selected;$("category").disabled=!items.length;
}
function sportOptions(){
 const active=categories.filter(c=>c.active!==false),parents=new Set(active.map(c=>c.parentId));
 $("sport").replaceChildren();const blank=document.createElement("option");blank.value="";blank.textContent="Выберите вид спорта";$("sport").appendChild(blank);
 const order=["combat-boxing-mma","judo","bjj","karate","football","basketball","volleyball","other"];
 for(const c of active.filter(c=>parents.has(c.id)&&c.id!=="combat").sort((a,b)=>(order.indexOf(a.id)<0?99:order.indexOf(a.id))-(order.indexOf(b.id)<0?99:order.indexOf(b.id)))){const option=document.createElement("option");option.value=c.id;option.textContent=c.name.replace(/BJJ\s*\/\s*Джиу-джитсу/i,"Джиу-джитсу").replace(/MMA/g,"ММА");$("sport").appendChild(option);}typeOptions();
}

let additionalCategoryIds=new Set();
function renderAdditionalCategories(record=null){
 if(record)additionalCategoryIds=new Set(record.additionalCategoryIds||[]);
 const primary=$("category").value;additionalCategoryIds.delete(primary);
 $("additionalCategoryFields").hidden=role!=="owner";
 $("additionalCategoryCount").textContent=additionalCategoryIds.size?" · "+additionalCategoryIds.size:"";
 const list=$("additionalCategoryChoices");list.replaceChildren();
 const path=id=>{const parts=[],seen=new Set();let c=categories.find(c=>c.id===id);while(c&&!seen.has(c.id)){seen.add(c.id);if(c.id!=="combat")parts.unshift(c.name);c=categories.find(x=>x.id===c.parentId);}return parts.join(" / ");};
 const leaves=categories.filter(c=>c.active!==false&&c.id!==primary&&!categories.some(x=>x.active!==false&&x.parentId===c.id)).sort((a,b)=>path(a.id).localeCompare(path(b.id),"ru"));
 for(const c of leaves){const label=document.createElement("label"),input=document.createElement("input");input.type="checkbox";input.value=c.id;input.checked=additionalCategoryIds.has(c.id);input.disabled=busy||current?.status==="trashed";input.addEventListener("change",()=>{if(input.checked)additionalCategoryIds.add(c.id);else additionalCategoryIds.delete(c.id);$("additionalCategoryCount").textContent=additionalCategoryIds.size?" · "+additionalCategoryIds.size:"";});label.append(input,document.createTextNode(path(c.id)));list.append(label);}
}

function categoryFields(record={}){
 const config=fields.categories[$("category").value]||fields.defaults;
 options($("material"),["",...config.materials]);$("material").value=config.materials.includes(record.material)?record.material:"";
 $("customMaterial").value=record.material&&!config.materials.includes(record.material)?record.material:"";
 checks("sizes",config.sizes,record.sizes||[]);
 $("customSizes").value=(record.sizes||[]).filter(s=>!config.sizes.includes(s)).join(", ");
}
async function priceHints(){
 const products=await all(),counts=new Map();for(const p of products)if(p.price>0)counts.set(p.price,(counts.get(p.price)||0)+1);
 $("priceSuggestions").replaceChildren();
 for(const [price]of [...counts].sort((a,b)=>b[1]-a[1]).slice(0,6)){const button=document.createElement("button");button.type="button";button.textContent=new Intl.NumberFormat("ru-RU").format(price)+" "+(fields.currency==="RUB"?"₽":"₸");button.addEventListener("click",()=>$("price").value=price);$("priceSuggestions").appendChild(button);}
}
function renderPhotos(){
 $("photoPreview").replaceChildren();
 photos.forEach((photo,index)=>{const figure=document.createElement("figure"),img=document.createElement("img"),caption=document.createElement("figcaption"),button=document.createElement("button");if(photo.original){img.src=photo.processingSource||photo.original;img.alt="Оригинал фото товара";caption.textContent=photo.inputRotation?"Оригинал · поворот "+photo.inputRotation+"°":"Оригинал";figure.append(photoThumbnail(img,photo,"original"),caption);}button.type="button";button.disabled=busy;button.textContent="Убрать из карточки";button.addEventListener("click",()=>{photos.splice(index,1);renderPhotos();});
 if(photo.processed){const result=document.createElement("img"),note=document.createElement("figcaption");result.src=photo.processed;result.alt="Результат ИИ-обработки на белом фоне";note.textContent=photo.processingStatus==="approved"?"Фото подтверждено":"Белый фон · требуется проверка";figure.append(photoThumbnail(result,photo,"processed"),note);if(role==="owner"&&photo.processingStatus!=="approved"){const approve=document.createElement("button");approve.type="button";approve.disabled=busy;approve.textContent="Принять фото";approve.addEventListener("click",()=>approvePhoto(photo));figure.append(approve);const turn=document.createElement("div");turn.className="photo-rotation-controls";for(const [text,degrees]of [["↶ Результат влево",-90],["Результат вправо ↷",90]]){const b=document.createElement("button");b.type="button";b.textContent=text;b.disabled=busy;b.addEventListener("click",()=>rotateProcessedPhoto(photo,degrees));turn.append(b);}const turnNote=document.createElement("small");turnNote.textContent="Повернуть результат — бесплатно, без повторной ИИ-обработки.";figure.append(turn,turnNote);const reject=document.createElement("button");reject.type="button";reject.disabled=busy;reject.textContent="Отклонить результат";reject.addEventListener("click",()=>rejectPhoto(photo));figure.append(reject);}}
 if(role==="owner"&&fields.imageProcessingEnabled&&photo.original&&!photo.processed&&$("entryMode").value!=="batch"){const label=document.createElement("label"),instructions=document.createElement("textarea"),hint=document.createElement("small");figure.classList.add("processing-photo");const rotation=document.createElement("div");rotation.className="photo-rotation-controls";for(const [text,degrees]of [["↶ Влево 90°",-90],["Вправо 90° ↷",90],["Сбросить",0]]){const rotate=document.createElement("button");rotate.type="button";rotate.textContent=text;rotate.disabled=busy;rotate.addEventListener("click",()=>rotatePhotoInput(photo,degrees));rotation.append(rotate);}figure.append(rotation);label.textContent="Пожелания к обработке · необязательно";instructions.maxLength=1000;instructions.rows=3;instructions.placeholder="Например: убрать упаковку, оставить мягкую тень";instructions.value=photo.processingInstructions||"";instructions.disabled=busy;instructions.className="processing-instructions";instructions.addEventListener("input",()=>{photo.processingInstructions=instructions.value;});label.append(instructions);hint.textContent="Эта кнопка обрабатывает отдельное фото без шаблона категории. Для узла на кимоно используйте фотостудию ниже. Поворот — бесплатно, до ИИ. Положительные углы — по часовой стрелке. Поворот используется при следующей обработке. Пожелания — до 1000 символов; форма, цвета и логотипы сохраняются.";const process=document.createElement("button");process.type="button";process.disabled=busy;process.textContent="Только белый фон · платно";process.addEventListener("click",()=>processPhoto(photo));figure.append(label,hint,process);}
 figure.append(button);$("photoPreview").appendChild(figure);});
 entryMode();
 photoStudio?.render();
}
async function rotatePhotoInput(photo,degrees){
 if(busy||photo.processed)return;busy=true;renderPhotos();
 try{const angle=degrees===0?0:normaliseRotation((photo.inputRotation||0)+degrees);const source=await rotatedPhotoSource(photo.original,angle);photo.inputRotation=angle;photo.processingSource=angle?source:null;message("Поворот готов, без ИИ и оплаты. Оригинал сохранён. Проверьте фото перед обработкой.");}catch(e){message(e.message);}finally{busy=false;renderPhotos();}
}
async function processPhoto(photo){
 if(busy||role!=="owner"||!fields.imageProcessingEnabled)return;
 const requested=rotationRequest((photo.processingInstructions||"").trim());
 if(requested.degrees!==null){busy=true;renderPhotos();try{const angle=normaliseRotation(requested.degrees);photo.processingSource=angle?await rotatedPhotoSource(photo.original,angle):null;photo.inputRotation=angle;photo.processingInstructions=requested.instructions;}catch(e){message(e.message);return;}finally{busy=false;renderPhotos();}await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));}
 const instructions=(photo.processingInstructions||"").trim();
 if(!confirm("Отправить показанное фото в ИИ-сервис?"+(photo.inputRotation?" Поворот "+photo.inputRotation+"° уже выполнен.":"")+" Обработка фона оплачивается отдельно."))return;
 const index=photos.indexOf(photo);if(!await saveForm(false))return;photo=photos[index];photo.processingInstructions=instructions;
 busy=true;for(const id of ["save","newProduct","showList","photos","camera","export"])$(id).disabled=true;renderPhotos();message("Фото обрабатывается. Не закрывайте страницу.");
 try{
 const source=await (await fetch(photo.processingSource||photo.original)).blob(),form=new FormData();form.append("photo",source,photo.name);form.append("instructions",instructions);form.append("orientation_locked",photo.inputRotation?"1":"0");
 const response=await fetch("./process-photo.php",{method:"POST",headers:{"X-Requested-With":"LuckyWarehouse"},body:form,credentials:"same-origin"});
 const data=await response.json();if(!response.ok)throw Error(data.error||"Не удалось обработать фото.");
 if(typeof data.image!=="string"||!data.image.startsWith("data:image/png;base64,"))throw Error("Сервис вернул неверное фото.");
 const image=new Image();image.src=data.image;await image.decode();photo.processed=data.image;photo.processingStatus="needs_review";
 current=await put({...current,photos});photos=keepPhotoEdits(structuredClone(current.photos),photos);message("Белый фон готов. Сравните результат с оригиналом и нажмите «Принять фото».");
 }catch(e){message(e.message||"Ошибка обработки. Оригинал сохранён. Повторный запуск оплачивается отдельно.");}
 finally{busy=false;for(const id of ["save","newProduct","showList","photos","camera","export"])$(id).disabled=false;renderPhotos();}
}
async function rotateProcessedPhoto(photo,degrees){
 if(busy||role!=="owner"||photo.processingStatus==="approved")return;
 const index=photos.indexOf(photo);if(!await saveForm(false))return;photo=photos[index];
 if(!photo?.processedVersion){message("Обновите страницу, чтобы загрузить версию фото для поворота.");return;}
 busy=true;renderPhotos();try{
  const rotated=await rotatedPhotoSource(photo.processed,degrees);
  await upload({...photo,processed:rotated},"processed",photo.processedVersion);
  edit((await all()).find(p=>p.id===current.id));message("Результат повёрнут без ИИ и оплаты. Проверьте фото и нажмите «Принять фото».");
 }catch(e){message(e.message||"Не удалось повернуть результат. Сохранённое фото не изменено.");}finally{busy=false;renderPhotos();}
}
async function approvePhoto(photo){if(busy)return;if(!confirm("Подтвердить результат? Оригинал этого фото будет удалён с сервера."))return;busy=true;renderPhotos();try{const result=await api("approve-photo",{id:current.id,revision:current.revision,photoId:photo.serverId});const records=await all();edit(records.find(p=>p.id===current.id));message(result.originalDeleted?"Фото принято. Оригинал удалён с сервера.":"Фото принято, но удалить оригинал не удалось. Проверьте права папки.");}catch(e){message(e.message);}finally{busy=false;renderPhotos();}}
async function rejectPhoto(photo){if(busy)return;busy=true;renderPhotos();try{await api("reject-photo",{id:current.id,revision:current.revision,photoId:photo.serverId});edit((await all()).find(p=>p.id===current.id));message("Результат отклонён. Оригинал сохранён для новой обработки.");}catch(e){message(e.message);}finally{busy=false;renderPhotos();}}
async function addPhotos(files){
 if(photos.length+files.length>8){message("Можно добавить до 8 фото.");return;}
 busy=true;$("save").disabled=true;
 try{for(const file of files){
   if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>12*1024*1024)throw Error("Нужен JPEG, PNG или WebP до 12 МБ. Для HEIC сначала сохраните фото как JPEG.");
   const original=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});
   const img=new Image();img.src=original;await img.decode();
   if(img.naturalWidth*img.naturalHeight>40000000)throw Error("Фото слишком большое. Используйте до 40 мегапикселей.");
   photos.push({id:crypto.randomUUID(),name:file.name,original,processingStatus:"pending",processed:null});
 }renderPhotos();message("Фото добавлены. Оригиналы будут сохранены с черновиком.");}
 catch(e){renderPhotos();message(e.message||"Не удалось прочитать фото.");}
 finally{busy=false;$("save").disabled=false;$("photos").value="";$("camera").value="";renderPhotos();}
}
function newProduct(){
 $("wbPanel").hidden=true;
 if(busy)return;
 colorExplicit=true;
 $("entryMode").disabled=false;
 $("addColor").hidden=false;
 $("listControls").hidden=true;
 current={id:crypto.randomUUID(),article:"LW-"+new Date().toISOString().slice(0,10).replaceAll("-","")+"-"+crypto.randomUUID().slice(0,8).toUpperCase()};
 photos=[];manualCategory=false;$("editor").reset();$("editor").hidden=false;$("productList").hidden=true;
 $("returnProduct").hidden=false;$("trashProduct").hidden=false;$("restoreProduct").hidden=true;$("hideProduct").hidden=false;$("publish").hidden=false;$("article").textContent=current.article;$("savedStatus").textContent="";$("reviewComment").textContent="";$("save").disabled=false;$("saveDraft").disabled=false;$("ownerActions").hidden=role!=="owner";$("extraFields").open=false;typeOptions();titlePreview();checks("colors",fields.colors);categoryFields();renderAdditionalCategories({});$("additionalCategoryFields").open=false;renderPhotos();priceHints().catch(e=>message(e.message));message("");
}
function edit(record){
 $("entryMode").value="single";$("entryMode").disabled=true;
 colorExplicit=record.colors.length<=1;
 $("addColor").hidden=false;
 $("listControls").hidden=true;
 current=record;photos=structuredClone(record.photos);manualCategory=true;$("editor").hidden=false;$("productList").hidden=true;
 $("article").textContent=record.article;$("sport").value=categories.find(c=>c.id===record.categoryId)?.parentId||"";typeOptions(record.categoryId);$("title").value=record.title===categoryTitle()?"":record.title;titlePreview();$("extraFields").open=false;$("price").value=record.price;
 renderAdditionalCategories(record);$("additionalCategoryFields").open=false;categoryFields(record);checks("colors",fields.colors,colorExplicit?record.colors:[]);$("customColors").value=colorExplicit?record.colors.filter(s=>!fields.colors.includes(s)).join(", "):"";
 renderPhotos();priceHints();$("savedStatus").textContent="Черновик. Для публикации требуется ваше подтверждение.";
 if(!colorExplicit)$("savedStatus").textContent="В старой карточке несколько цветов: "+record.colors.join(", ")+". Перед сохранением выберите один цвет для этого товара. Другие цвета добавьте отдельными товарами.";
 $("ownerActions").hidden=role!=="owner";$("trashProduct").hidden=record.status==="trashed";$("restoreProduct").hidden=record.status!=="trashed";$("hideProduct").hidden=record.status==="trashed";$("publish").hidden=record.status==="trashed";$("reviewComment").textContent=record.comment||"";$("save").disabled=role!=="owner"&&["review","published"].includes(record.status);$("save").disabled=$("save").disabled||record.status==="trashed";$("saveDraft").disabled=$("save").disabled;$("returnProduct").hidden=record.status==="trashed";
}
async function list(){
 message("");
 $("wbPanel").hidden=true;
 $("listControls").hidden=false;
 $("editor").hidden=true;$("productList").hidden=false;$("productList").replaceChildren();
 warehouseRecords=await all();renderWarehouseList();
}
let warehousePage=1;
const warehousePageSize=24;
const statusNames={draft:"Черновик",review:"На проверке",returned:"На доработке",published:"На сайте",hidden:"Снят с сайта",trashed:"В корзине"};
function selectWarehouseStatus(status){$("viewFilter").value=status;$("viewFilter").dispatchEvent(new Event("change"));}
function renderInventoryOverview(){
 const overview=$("inventoryOverview"),tabs=$("statusTabs");overview.replaceChildren();tabs.replaceChildren();
 const count=status=>warehouseRecords.filter(p=>status==="all"?!["hidden","trashed"].includes(p.status):p.status===status).length;
 for(const [status,title]of [["all","Активные товары"],["review","На проверке"],["published","На сайте"]]){const b=document.createElement("button"),label=document.createElement("span"),n=document.createElement("strong");b.type="button";label.textContent=title;n.textContent=count(status);b.append(label,n);b.addEventListener("click",()=>selectWarehouseStatus(status));overview.append(b);}
 for(const [status,title]of [["all","Все"],["review","На проверке"],["draft","Черновики"],["returned","На доработке"],["published","На сайте"],["hidden","Снятые"],["trashed","Корзина"]]){const b=document.createElement("button"),n=document.createElement("span");b.type="button";b.textContent=title;b.setAttribute("aria-pressed",String(view===status));n.textContent=count(status);b.append(n);b.addEventListener("click",()=>selectWarehouseStatus(status));tabs.append(b);}
}
function renderWarehouseList(){
 renderInventoryOverview();$("productList").replaceChildren();const query=normalize($("warehouseSearch").value);
 const records=warehouseRecords.filter(p=>(view==="all"?!["hidden","trashed"].includes(p.status):p.status===view)&&[p.categoryId,...(p.additionalCategoryIds||[])].some(id=>categoryMatches(id,$("warehouseCategory").value))&&normalize([p.title,p.article,...(p.colors||[])].join(" ")).includes(query)).sort((a,b)=>{
  const order=$("warehouseSort").value;const date=p=>String(p.createdAt||p.updatedAt||"");
  if(order.startsWith("created"))return order==="createdAsc"?date(a).localeCompare(date(b)):date(b).localeCompare(date(a));
  if(order==="name")return a.title.localeCompare(b.title,"ru");if(order==="priceAsc")return a.price-b.price;if(order==="priceDesc")return b.price-a.price;
  return order==="oldest"?String(a.updatedAt||"").localeCompare(String(b.updatedAt||"")):String(b.updatedAt||"").localeCompare(String(a.updatedAt||""));
 });
 const pages=Math.max(1,Math.ceil(records.length/warehousePageSize));warehousePage=Math.min(warehousePage,pages);const start=(warehousePage-1)*warehousePageSize;
 $("inventoryResults").textContent=records.length?`${start+1}–${Math.min(start+warehousePageSize,records.length)} из ${records.length} товаров`:"0 товаров";
 $("inventoryTableHeading").hidden=!records.length;
 if(!records.length){const empty=document.createElement("div"),title=document.createElement("strong"),text=document.createElement("span");empty.className="inventory-empty";title.textContent="Товаров пока нет";text.textContent=query||$("warehouseCategory").value?"Измените поиск или категорию, чтобы увидеть другие товары.":"Выберите другой статус или добавьте новый товар.";empty.append(title,text);$("productList").append(empty);}
 for(const record of records.slice(start,start+warehousePageSize)){
  const row=document.createElement("article"),product=document.createElement("div"),details=document.createElement("div"),title=document.createElement("strong"),meta=document.createElement("p"),price=document.createElement("div"),status=document.createElement("span"),date=document.createElement("div"),button=document.createElement("button");row.className="inventory-row";product.className="inventory-product";
  const source=record.photos[0]?.processed||record.photos[0]?.original;
  if(source){const image=document.createElement("img");image.src=source;image.alt="";image.loading="lazy";image.className="list-photo";product.append(image);}else{const placeholder=document.createElement("span");placeholder.className="photo-placeholder";placeholder.textContent="Нет фото";product.append(placeholder);}
  title.textContent=record.title;const category=categories.find(c=>c.id===record.categoryId);meta.textContent=[record.article,category?.name,(record.colors||[]).join(", ")].filter(Boolean).join(" · ");details.append(title,meta);product.append(details);
  price.className="inventory-price";price.textContent=new Intl.NumberFormat("ru-RU",{maximumFractionDigits:2}).format(record.price)+" "+(record.currency==="RUB"?"₽":record.currency==="USD"?"$":"₸");
  status.className="inventory-status";status.dataset.status=record.status;status.textContent=statusNames[record.status]||record.status;if(record.status==="trashed")status.title="Хранится до "+new Date(record.deleteAfter).toLocaleString("ru-RU");
  date.className="inventory-date";const at=new Date(record.createdAt||record.updatedAt);date.textContent=Number.isNaN(at.getTime())?"—":at.toLocaleDateString("ru-RU");
  button.type="button";button.className="inventory-open";button.textContent="Открыть";button.setAttribute("aria-label","Открыть товар «"+record.title+"»");button.addEventListener("click",()=>{edit(record);window.scrollTo({top:0,behavior:"smooth"});});row.append(product,price,status,date,button);$("productList").append(row);
 }
 const pagination=$("warehousePagination");pagination.replaceChildren();pagination.hidden=pages<=1;
 if(pages>1){const previous=document.createElement("button"),next=document.createElement("button"),label=document.createElement("span");previous.type=next.type="button";previous.textContent="←";next.textContent="→";previous.setAttribute("aria-label","Предыдущая страница склада");next.setAttribute("aria-label","Следующая страница склада");previous.disabled=warehousePage===1;next.disabled=warehousePage===pages;label.textContent=`Страница ${warehousePage} из ${pages}`;previous.addEventListener("click",()=>{warehousePage--;renderWarehouseList();});next.addEventListener("click",()=>{warehousePage++;renderWarehouseList();});pagination.append(previous,label,next);}
 $("save").textContent=role==="owner"?"Сохранить изменения":"Отправить на проверку";
}
$("title").addEventListener("input",titlePreview);
$("sport").addEventListener("change",()=>{typeOptions();categoryFields();renderAdditionalCategories();titlePreview();$("categoryHint").textContent="Теперь выберите тип товара.";});
$("category").addEventListener("change",()=>{categoryFields();renderAdditionalCategories();titlePreview();$("categoryHint").textContent="Название готово. Осталось указать цену.";});
$("photos").addEventListener("change",e=>addPhotos([...e.target.files]));$("camera").addEventListener("change",e=>addPhotos([...e.target.files]));
$("newProduct").addEventListener("click",newProduct);$("showList").addEventListener("click",()=>list().catch(e=>message(e.message)));
async function saveForm(submit){
 if(busy)return false;if(!photos.length){message("Добавьте хотя бы одно фото.");return false;}
 if(!colorExplicit){message("В старой карточке несколько цветов. Явно выберите один цвет перед сохранением.");return false;}
 const price=Number($("price").value);if(!Number.isFinite(price)||price<=0){message("Укажите корректную цену.");return;}
 if(!$("category").value){message("Выберите тип товара.");return;}
 const material=$("customMaterial").value.trim()||$("material").value;
 const product={...current,title:$("title").value.trim()||categoryTitle(),categoryId:$("category").value,...(role==="owner"?{additionalCategoryIds:[...additionalCategoryIds]}:{}),price,currency:fields.currency,material,sizes:[...new Set([...chosen("sizes"),...split($("customSizes").value)])],colors:$("customColors").value.trim()?[$("customColors").value.trim()]:chosen("colors"),photos:structuredClone(photos),status:"draft",updatedAt:new Date().toISOString()};
 if($("entryMode").value==="batch")return saveBatch(product,submit);
 busy=true;$("save").disabled=true;$("saveDraft").disabled=true;renderPhotos();
 try{current=await put(product);photos=keepPhotoEdits(structuredClone(current.photos),photos);$("entryMode").disabled=true;$("article").textContent=current.article;$("addColor").hidden=false;if(submit&&role!=="owner")current=(await api("transition",{id:current.id,revision:current.revision,status:"review"})).product;$("savedStatus").textContent=submit&&role!=="owner"?"Отправлено владельцу на проверку.":"Сохранено на сервере.";message("Сохранено. Товар доступен с другого устройства.");return true;}
 catch(e){message(e.message||"Не удалось сохранить на сервере.");return false;}
 finally{busy=false;$("save").disabled=false;$("saveDraft").disabled=false;renderPhotos();}
}
async function saveBatch(product,submit){
 busy=true;$("save").disabled=true;$("saveDraft").disabled=true;$("entryMode").disabled=true;renderPhotos();
 try{
 const items=[];for(const photo of photos){photo.batchSkuId=photo.batchSkuId||crypto.randomUUID();if(!photo.serverId)photo.serverId=await upload(photo,"original");items.push({id:photo.batchSkuId,photoId:photo.serverId});}
 const result=await api("batch-save",{batchId:current.id,items,title:product.title,categoryId:product.categoryId,...(role==="owner"?{additionalCategoryIds:product.additionalCategoryIds}:{}),price:product.price,material:product.material,sizes:product.sizes,colors:product.colors,submit:submit&&role!=="owner"});
 await list();message("Создано товаров: "+result.products.length+". У каждого свой артикул и фото."+(submit&&role!=="owner"?" Партия отправлена владельцу.":" Товары сохранены как черновики."));return true;
 }catch(e){message(e.message||"Не удалось сохранить партию. Повторный запрос не создаст дубликаты.");return false;}
 finally{busy=false;$("save").disabled=false;$("saveDraft").disabled=false;$("entryMode").disabled=false;renderPhotos();}
}
$("entryMode").addEventListener("change",renderPhotos);
$("editor").addEventListener("submit",async e=>{e.preventDefault();await saveForm(true);});
$("saveDraft").addEventListener("click",()=>saveForm(false));
$("customColors").addEventListener("input",()=>{colorExplicit=true;if($("customColors").value.trim())$("colors").querySelectorAll("input").forEach(input=>input.checked=false);});
$("colors").addEventListener("change",()=>{colorExplicit=true;$("customColors").value="";});
$("addColor").addEventListener("click",async()=>{
 if(busy)return;
 if(!current.revision){if(!await saveForm(false))return;}
 const source=structuredClone(current);newProduct();current.derivedFrom=source.id;
 $("sport").value=categories.find(c=>c.id===source.categoryId)?.parentId||"";typeOptions(source.categoryId);$("title").value=source.title===categoryTitle()?"":source.title;titlePreview();$("price").value=source.price;categoryFields(source);renderAdditionalCategories(source);$("extraFields").open=true;
 message("Другой цвет — новый товар и артикул. Выберите цвет и добавьте его фото. Категория и цена уже подставлены.");
});
async function transition(status){if(busy)return;if(!await saveForm(false))return;const comment=status==="returned"?prompt("Что менеджеру нужно исправить?"):"";if(comment===null)return;try{current=(await api("transition",{id:current.id,revision:current.revision,status,comment})).product;await list();message(status==="published"?"Товар опубликован на сайте.":"Статус товара обновлён.");}catch(e){message(e.message);}}
$("publish").addEventListener("click",()=>transition("published"));$("returnProduct").addEventListener("click",()=>transition("returned"));$("hideProduct").addEventListener("click",async()=>{if(busy)return;if(!current?.revision){message("Сначала сохраните товар.");return;}if(!confirm("Снять с сайта товар «"+current.title+"»? Товар и фото сохранятся без срока удаления."))return;busy=true;renderPhotos();try{await api("transition",{id:current.id,revision:current.revision,status:"hidden"});await list();message("Товар снят с сайта.");}catch(e){message(e.message);}finally{busy=false;renderPhotos();}});
$("viewFilter").addEventListener("change",()=>{view=$("viewFilter").value;warehousePage=1;renderWarehouseList();});
$("warehouseSearch").addEventListener("input",()=>{warehousePage=1;renderWarehouseList();});$("warehouseCategory").addEventListener("change",()=>{warehousePage=1;renderWarehouseList();});
$("warehouseSort").addEventListener("change",()=>{warehousePage=1;renderWarehouseList();});
$("export").addEventListener("click",async()=>{
 const products=await all();if(!products.length){message("Сначала сохраните товар.");return;}
 const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),products})],{type:"application/json"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="lucky-warehouse-list-"+new Date().toISOString().slice(0,10)+".json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);message("Список товаров скачан. Изображения остаются на сервере.");
});
$("migrate").addEventListener("click",async()=>{if(!db||busy)return;busy=true;$("migrate").disabled=true;try{const local=await request(db.transaction("products").objectStore("products").getAll());const existing=new Set((await all()).map(p=>p.id));for(const record of local){if(existing.has(record.id))continue;await put(record);}await list();message("Старые черновики перенесены на сервер. Локальная копия сохранена.");$("migrate").hidden=true;}catch(e){message(e.message||"Не удалось перенести черновики.");}finally{busy=false;$("migrate").disabled=false;}});
(async()=>{
 try{
 const responses=await Promise.all([fetch("./fields.json",{cache:"no-store"}),fetch("../data/categories.json",{cache:"no-store"})]);if(responses.some(r=>!r.ok))throw Error("Не удалось загрузить настройки.");
 [fields,categories]=await Promise.all(responses.map(r=>r.json()));
 $("processingNote").textContent=fields.imageProcessingEnabled?"Обработка фото оплачивается отдельно. Сравните результат с оригиналом перед подтверждением публикации.":"ИИ-обработка пока выключена. Оригиналы сохраняются для обработки на белом фоне.";
 sportOptions();populateCategoryFilter("warehouseCategory");
 $("currency").textContent=fields.currency==="RUB"?"₽":"₸";await list();$("workspace").hidden=false;$("storageNote").textContent=role==="owner"?"Кабинет владельца · проверка фото и публикация товаров":"Кабинет менеджера · фото, категория и цена → отправить на проверку";
 try{const open=indexedDB.open("lucky-warehouse-prototype",1);open.onupgradeneeded=()=>open.result.createObjectStore("products",{keyPath:"id"});db=await request(open);$("migrate").hidden=!(await request(db.transaction("products").objectStore("products").getAll())).length;}catch(e){/* Shared storage does not depend on IndexedDB. */}
 }catch(e){message(e.message||"Браузер не поддерживает сохранение. Откройте страницу в обычном режиме Safari или Chrome.");}
})();

function categoryMatches(id, selected){if(!selected)return true;let c=categories.find(x=>x.id===id);const seen=new Set();while(c&&!seen.has(c.id)){if(c.id===selected)return true;seen.add(c.id);c=categories.find(x=>x.id===c.parentId);}return false;}
function populateCategoryFilter(id){const select=$(id);for(const c of categories.filter(x=>x.active!==false)){const o=document.createElement('option');o.value=c.id;o.textContent=(c.parentId?'— ':'')+c.name;select.append(o);}}
async function trashTransition(status){if(busy||!current?.revision)return;if(status==='trashed'&&!confirm('Удалить товар «'+current.title+'»? Через 24 часа запись и неиспользуемые фото будут удалены без возможности восстановления. До этого товар можно восстановить из корзины.'))return;busy=true;try{await api('transition',{id:current.id,revision:current.revision,status});await list();message(status==='trashed'?'Товар в корзине на 24 часа.':'Товар восстановлен.');}catch(e){message(e.message);}finally{busy=false;}}
$("trashProduct").addEventListener('click',()=>trashTransition('trashed'));$("restoreProduct").addEventListener('click',()=>trashTransition('restore'));

function syncCabinetView(){
 const ready=!$("workspace").hidden,mode=!$("wbPanel").hidden?"wb":!$("editor").hidden?"editor":"warehouse";
 const hideInventory=!ready||mode!=="warehouse";for(const id of ["inventoryOverview","inventoryPanel"])if($(id).hidden!==hideInventory)$(id).hidden=hideInventory;$("processingNote").hidden=mode!=="editor";
 $("cabinetTitle").textContent=mode==="wb"?"Товары с ВБ":mode==="editor"?(current?.revision?"Карточка товара":"Новый товар"):"Товары склада";
 for(const [id,target]of [["navWarehouse","showList"],["navWb","wbProducts"],["navNew","newProduct"]]){const nav=$(id);nav.disabled=!ready||$(target).disabled;if((id==="navWarehouse"&&(mode==="warehouse"||(mode==="editor"&&current?.revision)))||(id==="navWb"&&mode==="wb")||(id==="navNew"&&mode==="editor"&&!current?.revision))nav.setAttribute("aria-current","page");else nav.removeAttribute("aria-current");}
 const hideDraft=role==="owner";if($("saveDraft").hidden!==hideDraft)$("saveDraft").hidden=hideDraft;
 const hideWb=$("wbProducts").hidden;if($("navWb").hidden!==hideWb)$("navWb").hidden=hideWb;
}
$("navWarehouse").addEventListener("click",()=>$("showList").click());
$("navWb").addEventListener("click",()=>$("wbProducts").click());
$("navNew").addEventListener("click",()=>$("newProduct").click());
new MutationObserver(syncCabinetView).observe($("workspace"),{attributes:true,subtree:true,attributeFilter:["hidden","disabled"]});
syncCabinetView();

async function saveForStudio(){
 if(current?.revision&&current.status==="published"){
  const pairs=[[$("category").value,current.categoryId],[$("title").value.trim()||categoryTitle(),current.title],[Number($("price").value),Number(current.price)],[$("customMaterial").value.trim()||$("material").value,current.material||""]];
  const same=(a,b)=>JSON.stringify([...a].sort())===JSON.stringify([...b].sort());
  if(!same([...additionalCategoryIds],current.additionalCategoryIds||[])||pairs.some(([a,b])=>a!==b)||!same(photos.map(p=>p.serverId),current.photos.map(p=>p.serverId))||!same([...chosen("sizes"),...split($("customSizes").value)],current.sizes)||!same($("customColors").value.trim()?[$("customColors").value.trim()]:chosen("colors"),current.colors)){message("Сначала сохраните изменения карточки. Опубликованный товар вернётся на проверку.");return false;}
  return true;
 }
 return await saveForm(false);
}
const studioDisabledSnapshot=new Map();
const photoStudio=initPhotoStudio({
 get:()=>({current,photos,role,busy,fields}),
 save:saveForStudio,
 busy:value=>{busy=value;if(value){for(const input of [...$("editor").querySelectorAll("button,input,select,textarea"),...["newProduct","showList","wbProducts","export"].map($)]){if(!studioDisabledSnapshot.has(input))studioDisabledSnapshot.set(input,input.disabled);input.disabled=true;}}else{for(const [input,disabled]of studioDisabledSnapshot)if(input.isConnected)input.disabled=disabled;studioDisabledSnapshot.clear();}renderPhotos();},
 reload:async()=>{const id=current.id;edit((await all()).find(p=>p.id===id));},
 api,open:openPhoto,message
});

