const PAGE_SIZE=24;
const state={page:1,products:[],categories:[],categoryById:new Map(),selectedCategoryId:null,query:"",sort:"default",currency:localStorage.getItem("lucky-wholesale-currency")||"KZT",requestIds:new Set(JSON.parse(localStorage.getItem("lucky-wholesale-request")||"[]"))};

const el={
  menuToggle:document.querySelector("#menuToggle"),mobileNav:document.querySelector("#mobileNav"),
  showcaseCardOne:document.querySelector("#showcaseCardOne"),showcaseCardTwo:document.querySelector("#showcaseCardTwo"),
  showcaseImageOne:document.querySelector("#showcaseImageOne"),showcaseImageTwo:document.querySelector("#showcaseImageTwo"),
  showcaseTitleOne:document.querySelector("#showcaseTitleOne"),showcaseTitleTwo:document.querySelector("#showcaseTitleTwo"),
  showcaseBrandOne:document.querySelector("#showcaseBrandOne"),showcaseBrandTwo:document.querySelector("#showcaseBrandTwo"),
  pagination:document.querySelector("#catalogPagination"),productGrid:document.querySelector("#productGrid"),categoryTree:document.querySelector("#categoryTree"),
  productCount:document.querySelector("#productCount"),categoryCount:document.querySelector("#categoryCount"),searchInput:document.querySelector("#searchInput"),sortSelect:document.querySelector("#sortSelect"),currencySelect:document.querySelector("#currencySelect"),currencyControl:document.querySelector("#currencyControl"),resultsMeta:document.querySelector("#resultsMeta"),activeCategoryTitle:document.querySelector("#activeCategoryTitle"),clearCategory:document.querySelector("#clearCategory"),sidebar:document.querySelector("#sidebar"),sidebarClose:document.querySelector("#sidebarClose"),filtersToggle:document.querySelector("#filtersToggle"),emptyState:document.querySelector("#emptyState"),
  productDialog:document.querySelector("#productDialog"),dialogContent:document.querySelector("#dialogContent"),dialogClose:document.querySelector("#dialogClose"),requestButton:document.querySelector("#requestButton"),requestCount:document.querySelector("#requestCount"),mobileRequestButton:document.querySelector("#mobileRequestButton"),mobileRequestCount:document.querySelector("#mobileRequestCount"),requestDialog:document.querySelector("#requestDialog"),requestDialogClose:document.querySelector("#requestDialogClose"),requestItems:document.querySelector("#requestItems"),requestEmpty:document.querySelector("#requestEmpty"),copyRequestButton:document.querySelector("#copyRequestButton"),template:document.querySelector("#productCardTemplate")
};

function escapeHtml(v=""){return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
function normalize(v=""){return String(v).toLowerCase().replaceAll("ё","е").replace(/\s+/g," ").trim()}
function money(v,c){if(v==null||Number.isNaN(Number(v)))return null;const s={KZT:"₸",RUB:"₽",USD:"$"};const n=new Intl.NumberFormat("ru-RU",{maximumFractionDigits:0}).format(Number(v));return c==="USD"?`${s[c]}${n}`:`${n} ${s[c]}`}
function priceText(p){const v=p.priceFrom?.[state.currency];if(v==null)return null;return(state.currency==="KZT"?"от ":"≈ от ")+money(v,state.currency)}

function descendants(id){if(!id)return null;const ids=new Set([id]);let changed=true;while(changed){changed=false;for(const c of state.categories){if(c.parentId&&ids.has(c.parentId)&&!ids.has(c.id)){ids.add(c.id);changed=true}}}return ids}
function productCountForCategory(id){const ids=descendants(id);return state.products.filter(p=>(p.categoryIds||[]).some(x=>ids.has(x))).length}
function filteredProducts(){const q=normalize(state.query),ids=descendants(state.selectedCategoryId);let p=state.products.filter(x=>{if(ids&&!(x.categoryIds||[]).some(id=>ids.has(id)))return false;if(!q)return true;return normalize([x.title,x.brand,x.article,...(x.colors||[]),...(x.sizes||[])].filter(Boolean).join(" ")).includes(q)});p=[...p];if(state.sort==="default")p.sort((a,b)=>(a.popularityRank??Infinity)-(b.popularityRank??Infinity)||(a.title||"").localeCompare(b.title||"","ru"));if(state.sort==="title")p.sort((a,b)=>(a.title||"").localeCompare(b.title||"","ru"));if(state.sort==="brand")p.sort((a,b)=>(a.brand||"").localeCompare(b.brand||"","ru")||(a.title||"").localeCompare(b.title||"","ru"));if(state.sort==="priceAsc")p.sort((a,b)=>(a.priceFrom?.[state.currency]??Infinity)-(b.priceFrom?.[state.currency]??Infinity));if(state.sort==="priceDesc")p.sort((a,b)=>(b.priceFrom?.[state.currency]??-Infinity)-(a.priceFrom?.[state.currency]??-Infinity));return p}
function categoryPath(id){const path=[];let c=state.categoryById.get(id),seen=new Set();while(c&&!seen.has(c.id)){seen.add(c.id);path.unshift(c);c=c.parentId?state.categoryById.get(c.parentId):null}return path}
function closeSidebar(){el.sidebar.classList.remove("open");document.body.classList.remove("sidebar-open")}
function selectCategory(id,{scroll=true,updateUrl=true}={}){state.selectedCategoryId=id||null;state.page=1;closeSidebar();if(updateUrl){const url=new URL(window.location.href);if(state.selectedCategoryId)url.searchParams.set("category",state.selectedCategoryId);else url.searchParams.delete("category");history.replaceState({},"",url.pathname+url.search+url.hash)}render();if(scroll)document.querySelector("#catalog")?.scrollIntoView({behavior:"smooth",block:"start"})}

function childrenOf(parentId){return state.categories.filter(c=>(c.parentId||null)===(parentId||null))}
function renderCategories(){
  el.categoryTree.innerHTML="";
  const renderBranch=(parentId,level)=>{
    for(const c of childrenOf(parentId)){
      if(productCountForCategory(c.id)===0)continue;
      const b=document.createElement("button");b.type="button";b.className=`category-button level-${Math.min(level,2)}`;b.textContent=c.name+" · "+productCountForCategory(c.id);b.classList.toggle("active",c.id===state.selectedCategoryId);b.setAttribute("aria-pressed",String(c.id===state.selectedCategoryId));b.addEventListener("click",()=>selectCategory(c.id));el.categoryTree.appendChild(b);renderBranch(c.id,level+1)
    }
  };
  renderBranch(null,0)
}
function topLevelCategories(){return childrenOf(null)}
// Sport navigation flattens the combat group for buyers; source taxonomy stays unchanged.
function buyerDirections(){
  const ids=["judo","bjj","combat-boxing-mma","karate"];
  const combat=state.categories.find(c=>c.id==="combat");
  const combatSports=combat?childrenOf(combat.id):[];
  const ordered=[...ids.map(id=>combatSports.find(c=>c.id===id)).filter(Boolean),...combatSports.filter(c=>!ids.includes(c.id)),...topLevelCategories().filter(c=>c.id!=="combat")];
  return ordered.filter(c=>c.active!==false&&productCountForCategory(c.id)>0);
}
function directionLabel(c){return ({"bjj":"Джиу-джитсу","combat-boxing-mma":"Бокс / ММА","karate":"Карате"})[c.id]||c.name}
function selectedDirection(){const path=categoryPath(state.selectedCategoryId);return buyerDirections().find(c=>path.some(p=>p.id===c.id))}
function renderSportChoices(){
  const query=normalize(document.querySelector("#sportSearch").value);
  const list=document.querySelector("#sportChoices");list.replaceChildren();
  const choices=[{id:null,name:"Все виды спорта"},...buyerDirections()];
  const combat=state.categoryById.get("combat");
  if(combat&&productCountForCategory(combat.id)>0)choices.push({...combat,name:"Все единоборства"});
  let found=0;
  for(const c of choices){
    const name=c.id?directionLabel(c):c.name;
    if(query&&!normalize(name).includes(query))continue;
    found++;
    const button=document.createElement("button");button.type="button";button.className="sport-choice";
    const active=c.id===state.selectedCategoryId||selectedDirection()?.id===c.id;
    button.setAttribute("aria-pressed",String(active));
    const label=document.createElement("span");label.textContent=name;
    const count=document.createElement("span");count.textContent=c.id?productCountForCategory(c.id):state.products.length;
    button.append(label,count);button.addEventListener("click",()=>{
      document.querySelector("#sportPicker").close();
      selectCategory(c.id,{scroll:false});
    });list.appendChild(button);
  }
  document.querySelector("#sportNoResults").hidden=found>0;
}
function sizeSportPicker(){
  const viewport=window.visualViewport;
  const picker=document.querySelector("#sportPicker");
  picker.style.setProperty("--picker-height",Math.max(120,(viewport?.height||window.innerHeight)-24)+"px");
  picker.style.setProperty("--picker-top",((viewport?.offsetTop||0)+12)+"px");
}
window.visualViewport?.addEventListener("resize",sizeSportPicker);
window.visualViewport?.addEventListener("scroll",sizeSportPicker);
window.addEventListener("resize",sizeSportPicker);
function openSportPicker(){
  document.querySelector("#sportSearch").value="";
  renderSportChoices();sizeSportPicker();document.querySelector("#sportPicker").showModal();
  document.querySelector("#sportPickerClose").focus({preventScroll:true});
}
function renderQuickCategories(){
  const direction=selectedDirection(),current=state.categoryById.get(state.selectedCategoryId);
  const parent=direction||current;
  const rail=document.querySelector("#sportRail"),left=rail.scrollLeft;
  rail.replaceChildren();
  for(const c of [{id:null,name:"Все"},...buyerDirections()]){
    const button=document.createElement("button");button.type="button";
    button.textContent=c.id==="bjj"?"Джиу-джитсу":c.id?directionLabel(c):c.name;
    button.className="sport-tab";button.setAttribute("aria-pressed",String(c.id===(parent?.id||null)));
    button.addEventListener("click",()=>selectCategory(c.id,{scroll:false}));rail.appendChild(button);
  }
  rail.scrollLeft=left;
  const type=document.querySelector("#productType");
  type.replaceChildren();
  const all=document.createElement("option");all.value=parent?.id||"";all.textContent="Все товары";type.appendChild(all);
  const addTypes=(id,prefix="",target=type)=>{
    for(const c of childrenOf(id).filter(c=>c.active!==false&&productCountForCategory(c.id)>0)){
      const option=document.createElement("option");option.value=c.id;option.textContent=prefix+c.name+" · "+productCountForCategory(c.id);
      target.appendChild(option);addTypes(c.id,prefix+"— ",target);
    }
  };
  if(parent)addTypes(parent.id);
  else for(const sport of buyerDirections()){
    const group=document.createElement("optgroup");group.label=directionLabel(sport);
    addTypes(sport.id,"",group);if(group.children.length)type.appendChild(group);
  }
  type.disabled=false;
  type.value=current?.id||"";
  document.querySelector("#typeValue").textContent=current&&current.id!==parent?.id?current.name:"Все товары";
  const tags=document.querySelector("#activeFilters");tags.replaceChildren();
  const addTag=(label,remove)=>{
    const button=document.createElement("button");button.type="button";button.className="active-filter";
    button.textContent=label+" ×";button.setAttribute("aria-label","Убрать фильтр: "+label);button.addEventListener("click",remove);tags.appendChild(button);
  };
  if(parent)addTag(directionLabel(parent),()=>selectCategory(null,{scroll:false}));
  if(current&&parent&&current.id!==parent.id)addTag(current.name,()=>selectCategory(parent.id,{scroll:false}));
  tags.hidden=!tags.childElementCount;
}


function firstColor(p){const c=p.colors||[];return c.length===0?"":c.length===1?c[0]:`${c[0]} +${c.length-1}`}
function renderCard(product){
  const f=el.template.content.cloneNode(true),card=f.querySelector(".product-card"),imageButton=f.querySelector(".product-image-button"),img=f.querySelector(".product-image"),ph=f.querySelector(".image-placeholder"),brand=f.querySelector(".product-brand"),title=f.querySelector(".product-title"),color=f.querySelector(".product-color"),size=f.querySelector(".product-size-count"),article=f.querySelector(".product-article"),price=f.querySelector(".product-price"),priceWrap=f.querySelector(".price-wrap"),add=f.querySelector(".add-button"),addLabel=f.querySelector(".add-label"),addIcon=f.querySelector(".add-icon");
  const photo=product.photos?.[0];
  if(photo){
    const showImage=()=>{img.classList.add("visible");ph.hidden=true};
    const showPlaceholder=()=>{img.classList.remove("visible");ph.hidden=false};

    img.alt=product.title||"Товар";
    img.addEventListener("load",showImage,{once:true});
    img.addEventListener("error",showPlaceholder,{once:true});
    img.src=photo;

    // Local cached images can finish loading before the load listener fires.
    // Handle the browser cache case explicitly so grid images never stay hidden.
    if(img.complete){
      if(img.naturalWidth>0) showImage();
      else showPlaceholder();
    }
  }
  brand.textContent=product.brand||"Lucky";title.textContent=product.title||"Без названия";article.textContent=product.article||"";
  const pv=priceText(product);if(pv)price.textContent=pv;else priceWrap.hidden=true;
  const ct=firstColor(product);if(ct){color.textContent=ct;color.classList.add("visible")}const sizes=product.sizes||[];if(sizes.length){size.textContent=sizes.length===1?sizes[0]:`${sizes.length} размеров`;size.classList.add("visible")}
  const open=()=>openProduct(product);imageButton.addEventListener("click",open);title.addEventListener("click",open);
  const added=state.requestIds.has(product.id);add.classList.toggle("added",added);addLabel.textContent=added?"В заявке":"В заявку";addIcon.textContent=added?"✓":"＋";add.addEventListener("click",()=>toggleRequest(product.id));card.dataset.productId=product.id;return f
}
function changePage(page){
  state.page=page;
  renderProducts();
  document.querySelector("#catalog")?.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"});
  el.pagination.querySelector("select")?.focus({preventScroll:true});
}
function renderPagination(total){
  const pages=Math.ceil(total/PAGE_SIZE);
  el.pagination.replaceChildren();
  el.pagination.hidden=pages<=1;
  if(pages<=1)return;
  const previous=document.createElement("button");
  previous.type="button";previous.textContent="←";previous.setAttribute("aria-label","Предыдущая страница");previous.disabled=state.page===1;
  previous.addEventListener("click",()=>changePage(state.page-1));
  const label=document.createElement("label");
  label.textContent="Страница ";
  const select=document.createElement("select");
  select.setAttribute("aria-label","Страница каталога");
  for(let page=1;page<=pages;page++){
    const option=document.createElement("option");
    option.value=page;option.textContent=`${page} из ${pages}`;option.selected=page===state.page;
    select.appendChild(option);
  }
  select.addEventListener("change",()=>changePage(Number(select.value)));
  label.appendChild(select);
  const next=document.createElement("button");
  next.type="button";next.textContent="→";next.setAttribute("aria-label","Следующая страница");next.disabled=state.page===pages;
  next.addEventListener("click",()=>changePage(state.page+1));
  el.pagination.append(previous,label,next);
}
function renderProducts(){
  document.querySelector("#sortValue").textContent=el.sortSelect.selectedOptions[0]?.textContent||"По популярности";
  const p=filteredProducts();
  state.page=Math.max(1,Math.min(state.page,Math.ceil(p.length/PAGE_SIZE)||1));
  const start=(state.page-1)*PAGE_SIZE,visible=p.slice(start,start+PAGE_SIZE);
  el.productGrid.innerHTML="";el.emptyState.hidden=p.length>0;
  const f=document.createDocumentFragment();
  for(const x of visible)f.appendChild(renderCard(x));
  el.productGrid.appendChild(f);
  const pathText=categoryPath(state.selectedCategoryId).map(x=>x.name).join(" / ");
  el.activeCategoryTitle.textContent=state.categoryById.get(state.selectedCategoryId)?.name||"Все оптовые товары";
  const count=p.length?`${start+1}–${start+visible.length} из ${p.length} товаров`:"0 товаров";
  el.resultsMeta.textContent=pathText?`${pathText} · ${count}`:count;
  renderPagination(p.length);
}

function wildberriesProductUrl(product){
  const match=/^wb-([1-9][0-9]*)$/.exec(String(product.id||""));
  return match?"https://www.wildberries.ru/catalog/"+match[1]+"/detail.aspx":null;
}
function openProduct(p){
 const wbUrl=wildberriesProductUrl(p),variants=new Map((p.photoVariants||[]).filter(v=>v&&typeof v.url==="string").map(v=>[v.url,String(v.color||"")]));
 const photos=[...new Set((p.photos||[]).filter(url=>typeof url==="string"&&url))].map(url=>({url,color:variants.get(url)||(p.modelGroupId&&p.colors?.length===1?p.colors[0]:"")}));
 const siblings=p.modelGroupId?state.products.filter(product=>product.modelGroupId===p.modelGroupId):[];
 const variantChoices=siblings.length>1?`<div class="info-block"><div class="info-label">Другие цвета этой модели</div><div class="product-variants">${siblings.map(product=>`<button type="button" class="product-variant" data-variant-id="${escapeHtml(product.id)}" aria-pressed="${product.id===p.id}" aria-label="${escapeHtml(product.colors?.[0]||product.article||product.title)}">${product.photos?.[0]?`<img src="${escapeHtml(product.photos[0])}" alt="" loading="lazy" />`:""}<span>${escapeHtml(product.colors?.[0]||"Цвет не указан")}</span></button>`).join("")}</div></div>`:"";
 const colors=[...new Set([...(p.colors||[]),...photos.map(x=>x.color).filter(Boolean)])],sizes=p.sizes||[],cats=(p.categoryIds||[]).map(id=>state.categoryById.get(id)?.name).filter(Boolean);
 const media=photos.length?`<div class="product-gallery"><img id="productPhotoMain" class="product-photo-main" src="${escapeHtml(photos[0].url)}" alt="${escapeHtml(p.title||"Товар")}" /><p id="productPhotoCaption" class="product-photo-caption" aria-live="polite"></p>${photos.length>1?`<div class="product-photo-thumbs" aria-label="Фото и цвета товара">${photos.map((photo,i)=>`<button type="button" class="product-photo-thumb" data-photo-index="${i}" aria-pressed="${i===0}" aria-label="${escapeHtml(photo.color||`Фото ${i+1}`)}"><img src="${escapeHtml(photo.url)}" alt="" loading="lazy" />${photo.color?`<span>${escapeHtml(photo.color)}</span>`:""}</button>`).join("")}</div>`:""}</div>`:"";
 el.dialogContent.innerHTML=`<div class="dialog-product"><div class="dialog-media">${media}</div><div class="dialog-info"><div class="section-kicker dark">${escapeHtml(p.brand||"Lucky")}</div><h2>${escapeHtml(p.title||"Без названия")}</h2><div class="product-article">Артикул: ${escapeHtml(p.article||"—")}</div>${priceText(p)?`<div class="info-block"><div class="info-label">Оптовая цена</div><div class="dialog-price">${escapeHtml(priceText(p))}</div></div>`:""}${variantChoices}${colors.length?`<div class="info-block"><div class="info-label">Цвета этой модели</div><div class="chip-row">${colors.map(color=>photos.some(photo=>photo.color===color)?`<button type="button" class="chip product-color" data-color="${escapeHtml(color)}" aria-pressed="false">${escapeHtml(color)}</button>`:`<span class="chip">${escapeHtml(color)}</span>`).join("")}</div></div>`:""}${sizes.length?`<div class="info-block"><div class="info-label">Размеры</div><div class="chip-row">${sizes.map(x=>`<span class="chip">${escapeHtml(x)}</span>`).join("")}</div></div>`:""}${cats.length?`<div class="info-block"><div class="info-label">Категория</div><div class="chip-row">${cats.map(x=>`<span class="chip">${escapeHtml(x)}</span>`).join("")}</div></div>`:""}${p.description?`<div class="info-block"><div class="info-label">Описание</div><div class="dialog-description">${escapeHtml(p.description)}</div></div>`:""}${wbUrl?`<div class="product-retail-reference"><a href="${escapeHtml(wbUrl)}" target="_blank" rel="noopener noreferrer">На Вайлдберриз <span aria-hidden="true">↗</span></a><small>Оптовую цену и наличие уточнит менеджер.</small></div>`:""}<div class="info-block"><button id="dialogAddButton" class="dialog-primary wide" type="button">${state.requestIds.has(p.id)?"Убрать из заявки":"Добавить в заявку"}</button></div></div></div>`;
 function selectPhoto(index){const photo=photos[index];if(!photo)return;const img=document.querySelector("#productPhotoMain");img.src=photo.url;img.alt=(p.title||"Товар")+(photo.color?" · "+photo.color:"");document.querySelector("#productPhotoCaption").textContent=(photo.color?photo.color+" · ":"")+`Фото ${index+1} из ${photos.length}`;el.dialogContent.querySelectorAll("[data-photo-index]").forEach(b=>b.setAttribute("aria-pressed",String(Number(b.dataset.photoIndex)===index)));el.dialogContent.querySelectorAll("[data-color]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.color===photo.color)));}
 el.dialogContent.querySelectorAll("[data-photo-index]").forEach(b=>b.addEventListener("click",()=>selectPhoto(Number(b.dataset.photoIndex))));el.dialogContent.querySelectorAll("[data-color]").forEach(b=>b.addEventListener("click",()=>selectPhoto(photos.findIndex(photo=>photo.color===b.dataset.color))));if(photos.length)selectPhoto(0);
 el.dialogContent.querySelectorAll("[data-variant-id]").forEach(button=>button.addEventListener("click",()=>{const variant=state.products.find(product=>product.id===button.dataset.variantId);if(variant)openProduct(variant);}));if(!el.productDialog.open)el.productDialog.showModal();document.querySelector("#dialogAddButton")?.addEventListener("click",()=>{toggleRequest(p.id);el.productDialog.close()});
}

function saveRequest(){localStorage.setItem("lucky-wholesale-request",JSON.stringify([...state.requestIds]));const n=state.requestIds.size;el.requestCount.textContent=n;el.mobileRequestCount.textContent=n;el.mobileRequestButton.hidden=n===0}
function toggleRequest(id){state.requestIds.has(id)?state.requestIds.delete(id):state.requestIds.add(id);saveRequest();renderProducts()}
function renderRequest(){const items=state.products.filter(p=>state.requestIds.has(p.id));el.requestItems.innerHTML="";el.requestEmpty.hidden=items.length>0;el.copyRequestButton.hidden=items.length===0;for(const p of items){const row=document.createElement("div");row.className="request-item";row.innerHTML=`${p.photos?.[0]?`<img src="${escapeHtml(p.photos[0])}" alt="" />`:"<div></div>"}<div><div class="request-item-title">${escapeHtml(p.title||"Без названия")}</div><div class="request-item-meta">${escapeHtml(p.article||"")}${p.colors?.length?" · "+escapeHtml(p.colors.join(", ")):""}${priceText(p)?" · "+escapeHtml(priceText(p)):""}</div></div><button class="remove-button" type="button">Удалить</button>`;row.querySelector(".remove-button").addEventListener("click",()=>{state.requestIds.delete(p.id);saveRequest();renderRequest();renderProducts()});el.requestItems.appendChild(row)}}
async function copyRequest(){const items=state.products.filter(p=>state.requestIds.has(p.id));const lines=["Оптовая заявка Lucky — оптовые поставки","",...items.map((p,i)=>`${i+1}. ${p.title} | ${p.article||"без артикула"} | ${(p.colors||[]).join(", ")||"цвет не указан"}${priceText(p)?" | "+priceText(p):""}`)];await navigator.clipboard.writeText(lines.join("\n"));el.copyRequestButton.textContent="Скопировано";setTimeout(()=>el.copyRequestButton.textContent="Скопировать список",1400)}
function openRequest(){renderRequest();el.requestDialog.showModal()}
function renderShowcase(){
  const ranked=[...state.products]
    .filter(p=>p.photos?.[0])
    .sort((a,b)=>(a.popularityRank??Infinity)-(b.popularityRank??Infinity));

  const rootCategoryId=(product)=>{
    const firstId=product?.categoryIds?.[0];
    if(!firstId)return null;
    const path=categoryPath(firstId);
    return path[0]?.id||firstId;
  };

  const first=ranked[0]||null;
  const firstRoot=rootCategoryId(first);
  const second=
    ranked.find(p=>p.id!==first?.id&&rootCategoryId(p)!==firstRoot) ||
    ranked.find(p=>p.id!==first?.id&&p.brand!==first?.brand) ||
    ranked.find(p=>p.id!==first?.id) ||
    first;

  const bind=(product,card,img,title,brand)=>{
    if(!product||!card||!img||!title||!brand)return;
    img.src=product.photos[0];
    img.alt=product.title||"Товар";
    title.textContent=product.title||"Товар Lucky";
    brand.textContent=product.brand||"Lucky";
    card.onclick=()=>openProduct(product);
  };

  bind(first,el.showcaseCardOne,el.showcaseImageOne,el.showcaseTitleOne,el.showcaseBrandOne);
  bind(second,el.showcaseCardTwo,el.showcaseImageTwo,el.showcaseTitleTwo,el.showcaseBrandTwo);
}
function render(){renderCategories();renderQuickCategories();renderProducts();saveRequest()}

async function init(){try{const [cr,gr]=await Promise.all([fetch("./data/catalog.json",{cache:"no-store"}),fetch("./data/categories.json",{cache:"no-store"})]);if(!cr.ok||!gr.ok)throw new Error("load");const c=await cr.json(),g=await gr.json();state.products=Array.isArray(c.products)?c.products:[];try{const response=await fetch("./warehouse-catalog.php",{cache:"no-store"});if(response.ok){const warehouse=await response.json();if(Array.isArray(warehouse.products))state.products.push(...warehouse.products);}}catch(e){console.warn("Складской каталог временно недоступен");}state.categories=Array.isArray(g)?g.map(c=>({...c,name:c.name.replace(/BJJ\s*\/\s*Джиу-джитсу/gi,"Джиу-джитсу").replace(/MMA/g,"ММА")})):[];state.categoryById=new Map(state.categories.map(x=>[x.id,x]));const initialCategory=new URLSearchParams(window.location.search).get("category");if(initialCategory&&state.categoryById.has(initialCategory))state.selectedCategoryId=initialCategory;const top=topLevelCategories().filter(x=>productCountForCategory(x.id)>0).length;if(el.productCount)el.productCount.textContent=state.products.length;if(el.categoryCount)el.categoryCount.textContent=top;el.currencySelect.value=state.currency;const hasPrice=state.products.some(p=>p.priceFrom?.KZT!=null);el.currencyControl.hidden=!hasPrice;if(!hasPrice)[...el.sortSelect.options].forEach(o=>{if(o.value==="priceAsc"||o.value==="priceDesc")o.hidden=true});renderShowcase();render()}catch(e){console.error(e);el.resultsMeta.textContent="Ошибка загрузки каталога";el.productGrid.innerHTML="";el.emptyState.hidden=false}}
el.searchInput.addEventListener("input",e=>{state.query=e.target.value;state.page=1;renderProducts()});el.sortSelect.addEventListener("change",e=>{state.sort=e.target.value;state.page=1;renderProducts()});el.currencySelect.addEventListener("change",e=>{state.currency=e.target.value;state.page=1;localStorage.setItem("lucky-wholesale-currency",state.currency);renderProducts()});el.clearCategory.addEventListener("click",()=>selectCategory(null,{scroll:false}));el.filtersToggle.addEventListener("click",openSportPicker);el.sidebarClose.addEventListener("click",closeSidebar);el.dialogClose.addEventListener("click",()=>el.productDialog.close());el.requestDialogClose.addEventListener("click",()=>el.requestDialog.close());el.requestButton.addEventListener("click",openRequest);el.mobileRequestButton.addEventListener("click",openRequest);el.copyRequestButton.addEventListener("click",copyRequest);el.productDialog.addEventListener("click",e=>{if(e.target===el.productDialog)el.productDialog.close()});el.requestDialog.addEventListener("click",e=>{if(e.target===el.requestDialog)el.requestDialog.close()});document.querySelectorAll("[data-scroll-to-catalog]").forEach(b=>b.addEventListener("click",()=>document.querySelector("#catalog")?.scrollIntoView({behavior:"smooth",block:"start"})));document.querySelectorAll("[data-category-shortcut]").forEach(b=>b.addEventListener("click",()=>{const id=b.dataset.categoryShortcut;if(state.categoryById.has(id))selectCategory(id)}));
if(el.menuToggle&&el.mobileNav){
  el.menuToggle.addEventListener("click",()=>{
    const open=el.mobileNav.classList.toggle("open");
    el.menuToggle.setAttribute("aria-expanded",String(open));
  });
  el.mobileNav.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>{
    el.mobileNav.classList.remove("open");
    el.menuToggle.setAttribute("aria-expanded","false");
  }));
}
document.querySelector("#sportPicker").addEventListener("keydown",e=>{
  if(e.key==="Escape"){e.preventDefault();document.querySelector("#sportPicker").close();}
});
document.querySelector("#sportSearch").addEventListener("input",renderSportChoices);
document.querySelector("#sportPickerClose").addEventListener("click",()=>document.querySelector("#sportPicker").close());
document.querySelector("#sportPicker").addEventListener("click",e=>{
  if(e.target===e.currentTarget){const rect=e.currentTarget.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)e.currentTarget.close();}
});
document.querySelector("#productType").addEventListener("change",e=>selectCategory(e.target.value||null,{scroll:false}));
init();
