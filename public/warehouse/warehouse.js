const $=id=>document.getElementById(id);
let db,fields,categories,current,photos=[],manualCategory=false,busy=false,role="manager",view="all";
const normalize=s=>String(s).toLowerCase().replaceAll("ё","е").trim();
const split=s=>[...new Set(s.split(",").map(x=>x.trim()).filter(Boolean))];
const message=s=>$("message").textContent=s;
function request(req){return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});}
async function api(action,body){const response=await fetch("./api.php?action="+action,{cache:"no-store",credentials:"same-origin",...(body?{method:"POST",headers:{"Content-Type":"application/json","X-Requested-With":"LuckyWarehouse"},body:JSON.stringify(body)}:{})});let data;try{data=await response.json();}catch(e){throw Error("Серверный модуль не установлен или не настроен.");}if(!response.ok)throw Error(data.error||"Ошибка сервера.");return data;}
async function all(){const data=await api("list");role=data.role;return data.products;}
async function upload(photo,kind){const source=await (await fetch(photo[kind],{credentials:"same-origin"})).blob(),form=new FormData();form.append("photo",source,photo.name||"product.png");form.append("kind",kind);if(photo.serverId)form.append("id",photo.serverId);const response=await fetch("./api.php?action=upload",{method:"POST",headers:{"X-Requested-With":"LuckyWarehouse"},credentials:"same-origin",body:form});const data=await response.json();if(!response.ok)throw Error(data.error||"Не удалось загрузить фото.");return data.id;}
async function put(product){for(const photo of product.photos){const live=photos.find(p=>p.id===photo.id);if(!photo.serverId)photo.serverId=await upload(photo,"original");if(live)live.serverId=photo.serverId;if(photo.processed?.startsWith("data:")){await upload(photo,"processed");photo.processed="./api.php?action=photo&id="+photo.serverId+"&kind=processed";if(live)live.processed=photo.processed;}}return (await api("save",{...product,photos:product.photos.map(p=>p.serverId)})).product;}
function options(select,values){select.replaceChildren();for(const value of values){const option=document.createElement("option");option.value=value;option.textContent=value||"Выберите";select.appendChild(option);}}
function checks(id,values,chosen=[]){$(id).replaceChildren();for(const value of [...new Set(values)]){const label=document.createElement("label"),input=document.createElement("input");input.type="checkbox";input.value=value;input.checked=chosen.includes(value);label.append(input,document.createTextNode(value));$(id).appendChild(label);}}
function chosen(id){return [...$(id).querySelectorAll("input:checked")].map(e=>e.value);}
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
 photos.forEach((photo,index)=>{const figure=document.createElement("figure"),img=document.createElement("img"),caption=document.createElement("figcaption"),button=document.createElement("button");if(photo.original){img.src=photo.original;img.alt="Оригинал фото товара";caption.textContent="Оригинал";figure.append(img,caption);}button.type="button";button.disabled=busy;button.textContent="Убрать из карточки";button.addEventListener("click",()=>{photos.splice(index,1);renderPhotos();});
 if(photo.processed){const result=document.createElement("img"),note=document.createElement("figcaption");result.src=photo.processed;result.alt="Результат ИИ-обработки на белом фоне";note.textContent=photo.processingStatus==="approved"?"Фото подтверждено":"Белый фон · требуется проверка";figure.append(result,note);if(role==="owner"&&photo.processingStatus!=="approved"){const approve=document.createElement("button");approve.type="button";approve.disabled=busy;approve.textContent="Принять фото";approve.addEventListener("click",()=>approvePhoto(photo));figure.append(approve);const reject=document.createElement("button");reject.type="button";reject.disabled=busy;reject.textContent="Отклонить результат";reject.addEventListener("click",()=>rejectPhoto(photo));figure.append(reject);}}
 if(role==="owner"&&fields.imageProcessingEnabled&&photo.original&&!photo.processed){const process=document.createElement("button");process.type="button";process.disabled=busy;process.textContent="Обработать фон · платно";process.addEventListener("click",()=>processPhoto(photo));figure.append(process);}
 figure.append(button);$("photoPreview").appendChild(figure);});
}
async function processPhoto(photo){
 if(busy||role!=="owner"||!fields.imageProcessingEnabled)return;
 if(!confirm("Отправить фото в ИИ-сервис? Обработка оплачивается отдельно. Проверьте, что в кадре одна модель товара."))return;
 const index=photos.indexOf(photo);if(!await saveForm(false))return;photo=photos[index];
 busy=true;for(const id of ["save","newProduct","showList","photos","camera","export"])$(id).disabled=true;renderPhotos();message("Фото обрабатывается. Не закрывайте страницу.");
 try{
 const source=await (await fetch(photo.original)).blob(),form=new FormData();form.append("photo",source,photo.name);
 const response=await fetch("./process-photo.php",{method:"POST",headers:{"X-Requested-With":"LuckyWarehouse"},body:form,credentials:"same-origin"});
 const data=await response.json();if(!response.ok)throw Error(data.error||"Не удалось обработать фото.");
 if(typeof data.image!=="string"||!data.image.startsWith("data:image/png;base64,"))throw Error("Сервис вернул неверное фото.");
 const image=new Image();image.src=data.image;await image.decode();photo.processed=data.image;photo.processingStatus="needs_review";
 current=await put({...current,photos});photos=structuredClone(current.photos);message("Белый фон готов. Сравните результат с оригиналом и нажмите «Принять фото».");
 }catch(e){message(e.message||"Ошибка обработки. Оригинал сохранён. Повторный запуск оплачивается отдельно.");}
 finally{busy=false;for(const id of ["save","newProduct","showList","photos","camera","export"])$(id).disabled=false;renderPhotos();}
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
 if(busy)return;
 $("listControls").hidden=true;
 current={id:crypto.randomUUID(),article:"LW-"+new Date().toISOString().slice(0,10).replaceAll("-","")+"-"+crypto.randomUUID().slice(0,8).toUpperCase()};
 photos=[];manualCategory=false;$("editor").reset();$("editor").hidden=false;$("productList").hidden=true;
 $("article").textContent=current.article;$("savedStatus").textContent="";$("reviewComment").textContent="";$("save").disabled=false;$("saveDraft").disabled=false;$("ownerActions").hidden=role!=="owner";$("extraFields").open=false;typeOptions();titlePreview();checks("colors",fields.colors);categoryFields();renderPhotos();priceHints().catch(e=>message(e.message));message("");
}
function edit(record){
 $("listControls").hidden=true;
 current=record;photos=structuredClone(record.photos);manualCategory=true;$("editor").hidden=false;$("productList").hidden=true;
 $("article").textContent=record.article;$("sport").value=categories.find(c=>c.id===record.categoryId)?.parentId||"";typeOptions(record.categoryId);$("title").value=record.title===categoryTitle()?"":record.title;titlePreview();$("extraFields").open=false;$("price").value=record.price;
 categoryFields(record);checks("colors",fields.colors,record.colors);$("customColors").value=record.colors.filter(s=>!fields.colors.includes(s)).join(", ");
 renderPhotos();priceHints();$("savedStatus").textContent="Черновик. Для публикации требуется ваше подтверждение.";
 $("ownerActions").hidden=role!=="owner";$("reviewComment").textContent=record.comment||"";$("save").disabled=role!=="owner"&&["review","published"].includes(record.status);$("saveDraft").disabled=$("save").disabled;
}
async function list(){
 $("listControls").hidden=false;
 $("editor").hidden=true;$("productList").hidden=false;$("productList").replaceChildren();
 const records=(await all()).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
 if(!records.length)$("productList").textContent="Черновиков пока нет.";
 for(const record of records.filter(p=>view==="all"||p.status===view)){const article=document.createElement("article"),text=document.createElement("div"),title=document.createElement("strong"),meta=document.createElement("p"),button=document.createElement("button"),image=document.createElement("img");image.src=record.photos[0]?.processed||record.photos[0]?.original||"";image.alt="";image.className="list-photo";title.textContent=record.title;meta.textContent=record.article+" · "+record.price+" "+(fields.currency==="RUB"?"₽":"₸")+" · "+({draft:"Черновик",review:"На проверке",returned:"Вернуть на доработку",published:"На сайте",hidden:"Снят с сайта"}[record.status]||record.status);text.append(title,meta);button.textContent="Открыть";button.addEventListener("click",()=>edit(record));article.append(image,text,button);$("productList").appendChild(article);}
 $("save").textContent=role==="owner"?"Сохранить изменения":"Отправить на проверку";
}
$("title").addEventListener("input",titlePreview);
$("sport").addEventListener("change",()=>{typeOptions();categoryFields();titlePreview();$("categoryHint").textContent="Теперь выберите тип товара.";});
$("category").addEventListener("change",()=>{categoryFields();titlePreview();$("categoryHint").textContent="Название готово. Осталось указать цену.";});
$("photos").addEventListener("change",e=>addPhotos([...e.target.files]));$("camera").addEventListener("change",e=>addPhotos([...e.target.files]));
$("newProduct").addEventListener("click",newProduct);$("showList").addEventListener("click",()=>list().catch(e=>message(e.message)));
async function saveForm(submit){
 if(busy)return false;if(!photos.length){message("Добавьте хотя бы одно фото.");return false;}
 const price=Number($("price").value);if(!Number.isFinite(price)||price<=0){message("Укажите корректную цену.");return;}
 if(!$("category").value){message("Выберите тип товара.");return;}
 const material=$("customMaterial").value.trim()||$("material").value;
 const product={...current,title:$("title").value.trim()||categoryTitle(),categoryId:$("category").value,price,currency:fields.currency,material,sizes:[...new Set([...chosen("sizes"),...split($("customSizes").value)])],colors:[...new Set([...chosen("colors"),...split($("customColors").value)])],photos:structuredClone(photos),status:"draft",updatedAt:new Date().toISOString()};
 busy=true;$("save").disabled=true;$("saveDraft").disabled=true;renderPhotos();
 try{current=await put(product);photos=structuredClone(current.photos);$("article").textContent=current.article;if(submit&&role!=="owner")current=(await api("transition",{id:current.id,revision:current.revision,status:"review"})).product;$("savedStatus").textContent=submit&&role!=="owner"?"Отправлено владельцу на проверку.":"Сохранено на сервере.";message("Сохранено. Товар доступен с другого устройства.");return true;}
 catch(e){message(e.message||"Не удалось сохранить на сервере.");return false;}
 finally{busy=false;$("save").disabled=false;$("saveDraft").disabled=false;renderPhotos();}
}
$("editor").addEventListener("submit",async e=>{e.preventDefault();await saveForm(true);});
$("saveDraft").addEventListener("click",()=>saveForm(false));
async function transition(status){if(busy)return;if(!await saveForm(false))return;const comment=status==="returned"?prompt("Что менеджеру нужно исправить?"):"";if(comment===null)return;try{current=(await api("transition",{id:current.id,revision:current.revision,status,comment})).product;await list();message(status==="published"?"Товар опубликован на сайте.":"Статус товара обновлён.");}catch(e){message(e.message);}}
$("publish").addEventListener("click",()=>transition("published"));$("returnProduct").addEventListener("click",()=>transition("returned"));$("hideProduct").addEventListener("click",()=>transition("hidden"));
$("viewFilter").addEventListener("change",()=>{view=$("viewFilter").value;list().catch(e=>message(e.message));});
$("export").addEventListener("click",async()=>{
 const products=await all();if(!products.length){message("Сначала сохраните товар.");return;}
 const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),products})],{type:"application/json"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="lucky-warehouse-list-"+new Date().toISOString().slice(0,10)+".json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);message("Список товаров скачан. Изображения остаются на сервере.");
});
$("migrate").addEventListener("click",async()=>{if(!db||busy)return;busy=true;$("migrate").disabled=true;try{const local=await request(db.transaction("products").objectStore("products").getAll());const existing=new Set((await all()).map(p=>p.id));for(const record of local){if(existing.has(record.id))continue;await put(record);}await list();message("Старые черновики перенесены на сервер. Локальная копия сохранена.");$("migrate").hidden=true;}catch(e){message(e.message||"Не удалось перенести черновики.");}finally{busy=false;$("migrate").disabled=false;}});
(async()=>{
 try{
 const responses=await Promise.all([fetch("./fields.json",{cache:"no-store"}),fetch("../data/categories.json")]);if(responses.some(r=>!r.ok))throw Error("Не удалось загрузить настройки.");
 [fields,categories]=await Promise.all(responses.map(r=>r.json()));
 $("processingNote").textContent=fields.imageProcessingEnabled?"Обработка фото оплачивается отдельно. Сравните результат с оригиналом перед подтверждением публикации.":"ИИ-обработка пока выключена. Оригиналы сохраняются для обработки на белом фоне.";
 sportOptions();
 $("currency").textContent=fields.currency==="RUB"?"₽":"₸";await list();$("workspace").hidden=false;$("storageNote").textContent=role==="owner"?"Кабинет владельца · проверка фото и публикация товаров":"Кабинет менеджера · фото, категория и цена → отправить на проверку";
 try{const open=indexedDB.open("lucky-warehouse-prototype",1);open.onupgradeneeded=()=>open.result.createObjectStore("products",{keyPath:"id"});db=await request(open);$("migrate").hidden=!(await request(db.transaction("products").objectStore("products").getAll())).length;}catch(e){/* Shared storage does not depend on IndexedDB. */}
 }catch(e){message(e.message||"Браузер не поддерживает сохранение. Откройте страницу в обычном режиме Safari или Chrome.");}
})();
