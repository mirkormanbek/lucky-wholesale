const PAGE_SIZE=24;
const state={page:1,products:[],categories:[],categoryById:new Map(),selectedCategoryId:null,selectedProductTypeId:null,query:"",sort:"default",currency:localStorage.getItem("lucky-wholesale-currency")||"RUB",requestIds:new Set(JSON.parse(localStorage.getItem("lucky-wholesale-request")||"[]"))};

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
function money(v,c){if(v==null||Number.isNaN(Number(v)))return null;const s={KZT:"₸",RUB:"₽",USD:"$"};const n=new Intl.NumberFormat("ru-RU",{maximumFractionDigits:c==="KZT"?0:2}).format(Number(v));return c==="USD"?`${s[c]}${n}`:`${n} ${s[c]}`}
function convertProductPrices(products,fx){
 const rates=fx?.kztPerUnit||{};rates.KZT=1;
 const valid=c=>typeof rates[c]==="number"&&Number.isFinite(rates[c])&&rates[c]>0;
 return products.map(p=>{const prices={...(p.priceFrom||{})};const base=["KZT","RUB","USD"].find(c=>typeof prices[c]==="number"&&Number.isFinite(prices[c])&&prices[c]>0&&valid(c));if(!base)return p;const kzt=prices[base]*rates[base];for(const c of ["KZT","RUB","USD"])if(valid(c))prices[c]=Math.round(kzt/rates[c]*100)/100;return {...p,priceFrom:prices};});
}
function priceText(p){const v=p.priceFrom?.[state.currency];if(v==null)return null;return(state.currency==="KZT"?"от ":"≈ от ")+money(v,state.currency)}

function descendants(id){if(!id)return null;const ids=new Set([id]);let changed=true;while(changed){changed=false;for(const c of state.categories){if(c.parentId&&ids.has(c.parentId)&&!ids.has(c.id)){ids.add(c.id);changed=true}}}return ids}
function productCountForCategory(id){const ids=descendants(id);return state.products.filter(p=>(p.categoryIds||[]).some(x=>ids.has(x))).length}
function filteredProducts(){const q=normalize(state.query),ids=descendants(state.selectedCategoryId);let p=state.products.filter(x=>{if(state.selectedProductTypeId&&!productTypesFor(x).includes(state.selectedProductTypeId))return false;if(ids&&!(x.categoryIds||[]).some(id=>ids.has(id)))return false;if(!q)return true;return normalize([x.title,x.brand,x.article,...(x.colors||[]),...(x.sizes||[])].filter(Boolean).join(" ")).includes(q)});p=[...p];if(state.sort==="default")p.sort((a,b)=>(a.popularityRank??Infinity)-(b.popularityRank??Infinity)||(a.title||"").localeCompare(b.title||"","ru"));if(state.sort==="title")p.sort((a,b)=>(a.title||"").localeCompare(b.title||"","ru"));if(state.sort==="brand")p.sort((a,b)=>(a.brand||"").localeCompare(b.brand||"","ru")||(a.title||"").localeCompare(b.title||"","ru"));if(state.sort==="priceAsc")p.sort((a,b)=>(a.priceFrom?.[state.currency]??Infinity)-(b.priceFrom?.[state.currency]??Infinity));if(state.sort==="priceDesc")p.sort((a,b)=>(b.priceFrom?.[state.currency]??-Infinity)-(a.priceFrom?.[state.currency]??-Infinity));return p}
function categoryPath(id){const path=[];let c=state.categoryById.get(id),seen=new Set();while(c&&!seen.has(c.id)){seen.add(c.id);path.unshift(c);c=c.parentId?state.categoryById.get(c.parentId):null}return path}
function closeSidebar(){el.sidebar.classList.remove("open");document.body.classList.remove("sidebar-open")}
function selectCategory(id,{scroll=true,updateUrl=true}={}){document.querySelector("#catalogBrowseTypes").setAttribute("aria-pressed","false");state.selectedCategoryId=id||null;state.selectedProductTypeId=null;state.page=1;closeSidebar();if(updateUrl){const url=new URL(window.location.href);url.searchParams.delete("productType");if(state.selectedCategoryId)url.searchParams.set("category",state.selectedCategoryId);else url.searchParams.delete("category");history.replaceState({},"",url.pathname+url.search+url.hash)}render();if(scroll)document.querySelector("#catalog")?.scrollIntoView({behavior:"smooth",block:"start"})}

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
  const ids=["combat-boxing-mma","mma","kickboxing","muay-thai","judo","bjj","karate","sambo","wrestling"];
  const combat=state.categories.find(c=>c.id==="combat");
  const combatSports=combat?childrenOf(combat.id):[];
  const ordered=[...ids.map(id=>combatSports.find(c=>c.id===id)).filter(Boolean),...combatSports.filter(c=>!ids.includes(c.id)),...topLevelCategories().filter(c=>c.id!=="combat")];
  return ordered.filter(c=>c.active!==false);
}
function directionLabel(c){return ({"bjj":"Джиу-джитсу","combat-boxing-mma":"Бокс","karate":"Карате"})[c.id]||c.name}
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
    for(const c of childrenOf(id).filter(c=>c.active!==false)){
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



const sportArtworkRules={
  "judo": {
    "image": "./images/sports/judo.png",
    "mark": "↗"
  },
  "bjj": {
    "image": "./images/sports/bjj.png",
    "mark": "↗"
  },
  "combat-boxing-mma": {
    "image": "./images/sports/boxing-mma.png",
    "mark": "↗"
  },
  "karate": {
    "image": "./images/sports/karate.png",
    "mark": "↗"
  },
  "kickboxing": {
    "image": "./images/sports/kickboxing.png",
    "mark": "↗"
  },
  "muay-thai": {
    "image": "./images/sports/muay-thai.png",
    "mark": "↗"
  },
  "football": {
    "image": "./images/sports/football.png",
    "mark": "↗"
  },
  "basketball": {
    "image": "./images/sports/basketball.png",
    "mark": "↗"
  },
  "volleyball": {
    "image": "./images/sports/volleyball.png",
    "mark": "↗"
  },
  "other": {
    "image": "./images/sports/other.png",
    "mark": "↗"
  }
  ,"mma":{"image":"./images/sports/mma.png","mark":"ММА"},"sambo":{"image":"./images/sports/sambo.png","mark":"САМБО"},"wrestling":{"image":"./images/sports/wrestling.png","mark":"БОРЬБА"},"fitness":{"image":"./images/sports/other.png","mark":"+"},"gym-equipment":{"image":"./images/sports/other.png","mark":"+"}
};
function syncSportsDiscoveryArrows(){
 const rail=document.querySelector("#sportsDiscoveryRail");
 if(!rail)return;
 const max=rail.scrollWidth-rail.clientWidth;
 document.querySelector("#sportsDiscoveryPrev").disabled=rail.scrollLeft<=6;
 document.querySelector("#sportsDiscoveryNext").disabled=rail.scrollLeft>=max-6;
}
function renderSportsDiscovery(){
 const section=document.querySelector("#sportsDiscovery"),rail=document.querySelector("#sportsDiscoveryRail");
 if(!section||!rail)return;
 const directions=buyerDirections().filter(c=>productCountForCategory(c.id)>0);
 section.hidden=!directions.length;
 const left=rail.scrollLeft;rail.replaceChildren();
 for(const c of directions){
  const art=sportArtworkRules[c.id]||{image:"./images/sports/other.png",mark:"↗"};
  const link=document.createElement("a");link.className="sport-discovery-card";
  const url=new URL(location.href);url.searchParams.set("category",c.id);url.hash="catalog";link.href=url.pathname+url.search+url.hash;
  const selected=selectedDirection()?.id===c.id;if(selected)link.setAttribute("aria-current","true");
  const copy=document.createElement("span");copy.className="sport-discovery-copy";
  const title=document.createElement("strong");title.textContent=directionLabel(c);
  const count=document.createElement("span"),n=productCountForCategory(c.id),last=n%10,lastTwo=n%100;
  count.textContent=n+" "+(last===1&&lastTwo!==11?"товар":last>=2&&last<=4&&(lastTwo<12||lastTwo>14)?"товара":"товаров");
  const arrow=document.createElement("span");arrow.className="sport-discovery-arrow";arrow.setAttribute("aria-hidden","true");arrow.textContent="↗";
  const fallback=document.createElement("span");fallback.className="sport-discovery-mark";fallback.setAttribute("aria-hidden","true");fallback.textContent=art.mark;
  copy.append(title,count);link.append(copy,fallback,arrow);
  if(art.image){const image=document.createElement("img");image.alt="";image.loading="lazy";image.decoding="async";image.addEventListener("load",()=>{fallback.hidden=true;image.classList.add("ready");});image.addEventListener("error",()=>{image.hidden=true;fallback.hidden=false;});image.width=384;image.height=384;image.src=art.image;link.append(image);}
  link.addEventListener("click",event=>{
   if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
   event.preventDefault();state.query="";el.searchInput.value="";selectCategory(c.id);
  });
  rail.append(link);
 }
 rail.scrollLeft=left;requestAnimationFrame(syncSportsDiscoveryArrows);
}

function renderCard(product){
  const f=el.template.content.cloneNode(true),card=f.querySelector(".product-card"),imageButton=f.querySelector(".product-image-button"),img=f.querySelector(".product-image"),ph=f.querySelector(".image-placeholder"),brand=f.querySelector(".product-brand"),title=f.querySelector(".product-title"),article=f.querySelector(".product-article"),price=f.querySelector(".product-price"),priceWrap=f.querySelector(".price-wrap"),add=f.querySelector(".add-button"),addLabel=f.querySelector(".add-label"),addIcon=f.querySelector(".add-icon");
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
  const open=()=>openProduct(product);imageButton.addEventListener("click",open);title.addEventListener("click",open);
  const added=state.requestIds.has(product.id);add.classList.toggle("added",added);addLabel.textContent=added?"В заявке":"В заявку";addIcon.textContent=added?"✓":"＋";add.addEventListener("click",()=>toggleRequest(product.id));card.dataset.productId=product.id;return f
}
function changePage(page){
  state.page=page;
  renderProducts();
  document.querySelector("#catalog")?.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"});
  el.pagination.querySelector('[aria-current="page"]')?.focus({preventScroll:true});
}
function renderPagination(total){
  const pages=Math.ceil(total/PAGE_SIZE);
  el.pagination.replaceChildren();
  el.pagination.hidden=pages<=1;
  if(pages<=1)return;

  const arrow=(label,text,target,disabled)=>{const b=document.createElement("button");b.type="button";b.textContent=text;b.setAttribute("aria-label",label);b.disabled=disabled;b.style.opacity=disabled?".35":"1";b.addEventListener("click",()=>changePage(target));return b;};
  el.pagination.append(arrow("Предыдущая страница","←",state.page-1,state.page===1));
  const visible=new Set([1,pages]);
  if(pages<=5){for(let page=1;page<=pages;page++)visible.add(page);}
  else {const center=Math.max(2,Math.min(pages-1,state.page));for(let page=Math.max(2,center-1);page<=Math.min(pages-1,center+1);page++)visible.add(page);}
  let last=0;
  for(const page of [...visible].sort((a,b)=>a-b)){
    if(last&&page-last>1){const gap=document.createElement("span");gap.className="pagination-gap";gap.textContent="…";gap.setAttribute("aria-hidden","true");el.pagination.append(gap);}
    const button=document.createElement("button");button.type="button";button.textContent=page;button.setAttribute("aria-label","Страница "+page);
    if(page===state.page)button.setAttribute("aria-current","page");
    button.addEventListener("click",()=>{if(page!==state.page)changePage(page);});el.pagination.append(button);last=page;
  }
  el.pagination.append(arrow("Следующая страница","→",state.page+1,state.page===pages));
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
  const pathText=state.selectedProductTypeId?catalogProductTypes[state.selectedProductTypeId]:categoryPath(state.selectedCategoryId).map(x=>x.name).join(" / ");
  el.activeCategoryTitle.textContent=state.selectedProductTypeId?catalogProductTypes[state.selectedProductTypeId]:(state.categoryById.get(state.selectedCategoryId)?.name||"Все оптовые товары");
  const count=p.length?`${start+1}–${start+visible.length} из ${p.length} товаров`:"0 товаров";
  el.resultsMeta.textContent=pathText?`${pathText} · ${count}`:count;
  renderPagination(p.length);
}

function wildberriesProductUrl(product){
  const match=/^wb-([1-9][0-9]*)$/.exec(String(product.id||""));
  return match?"https://www.wildberries.ru/catalog/"+match[1]+"/detail.aspx":null;
}
function productPhotos(product){
 const variants=new Map((product.photoVariants||[]).filter(v=>v&&typeof v.url==="string").map(v=>[v.url,String(v.color||"")]));
 const seen=new Set(),hasLocalCover=(product.photos||[]).some(url=>url===`./images/products/${product.id}.webp`);
 return (product.photos||[]).filter(url=>typeof url==="string"&&url).filter(url=>{
  let key=url;
  try{const parsed=new URL(url,location.href),match=/\/([0-9]+)\/images\/[^/]+\/([0-9]+)\.(?:webp|jpe?g|png)$/i.exec(parsed.pathname);
   if(/(?:^|\.)wbbasket\.ru$/i.test(parsed.hostname)&&match){if(hasLocalCover&&product.id===`wb-${match[1]}`&&match[2]==="1")return false;key=`wb:${match[1]}:${match[2]}`;}
  }catch{}
  if(seen.has(key))return false;seen.add(key);return true;
 }).map(url=>({url,color:variants.get(url)||(product.modelGroupId&&product.colors?.length===1?product.colors[0]:"")}));
}
function sortedProductSizes(values){
 const order=["XXXS","XXS","XS","S","M","L","XL","XXL","XXXL","4XL","5XL","6XL"];
 return [...new Set((values||[]).map(v=>String(v).trim()).filter(Boolean))].sort((a,b)=>{
  const left=order.indexOf(a.toUpperCase()),right=order.indexOf(b.toUpperCase());
  if(left>=0&&right>=0)return left-right;
  return a.localeCompare(b,"ru",{numeric:true,sensitivity:"base"});
 });
}
function productFacts(product){
 const sentences=String(product.description||"").split(/(?<=[.!?])\s+|\n+/).map(s=>s.trim()).filter(Boolean);
 const facts=[];
 for(const [label,pattern] of [["Плотность",/\d+\s*г\s*\/\s*м[²2]/i],["Состав",/\d+\s*%/i],["Комплект",/в комплект[еа]|комплектаци/i]]){
  const value=sentences.find(s=>pattern.test(s)&&s.length<=320);if(value)facts.push([label,value]);
 }
 if(product.material&&!facts.some(([label])=>label==="Состав"))facts.push(["Материал",String(product.material)]);
 return facts.length?`<dl class="product-facts">${facts.map(([label,value])=>`<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>`:"";
}
function openProduct(p){
 const wbUrl=wildberriesProductUrl(p),photos=productPhotos(p);
 const siblings=p.modelGroupId?state.products.filter(product=>product.modelGroupId===p.modelGroupId):[];
 const variantChoices=siblings.length>1?`<div class="info-block"><div class="info-label">Другие цвета этой модели</div><div class="product-variants">${siblings.map(product=>`<button type="button" class="product-variant" data-variant-id="${escapeHtml(product.id)}" aria-pressed="${product.id===p.id}" aria-label="${escapeHtml(product.colors?.[0]||product.article||product.title)}">${product.photos?.[0]?`<img src="${escapeHtml(product.photos[0])}" alt="" loading="lazy" />`:""}<span>${escapeHtml(product.colors?.[0]||"Цвет не указан")}</span></button>`).join("")}</div></div>`:"";
 const colors=[...new Set([...(p.colors||[]),...photos.map(x=>x.color).filter(Boolean)])],sizes=sortedProductSizes(p.sizes),cats=(p.categoryIds||[]).map(id=>state.categoryById.get(id)?.name).filter(Boolean);
 const media=photos.length?`<div class="product-gallery"><img id="productPhotoMain" class="product-photo-main" src="${escapeHtml(photos[0].url)}" alt="${escapeHtml(p.title||"Товар")}" /><p id="productPhotoCaption" class="product-photo-caption" aria-live="polite"></p>${photos.length>1?`<div class="product-photo-thumbs" aria-label="Фото и цвета товара">${photos.map((photo,i)=>`<button type="button" class="product-photo-thumb" data-photo-index="${i}" aria-pressed="${i===0}" aria-label="${escapeHtml(photo.color||`Фото ${i+1}`)}"><img src="${escapeHtml(photo.url)}" alt="" loading="lazy" />${photo.color?`<span>${escapeHtml(photo.color)}</span>`:""}</button>`).join("")}</div>`:""}</div>`:"";
 el.dialogContent.innerHTML=`<div class="dialog-product"><div class="dialog-media">${media}</div><div class="dialog-info"><div class="section-kicker dark">${escapeHtml(p.brand||"Lucky")}</div><h2>${escapeHtml(p.title||"Без названия")}</h2><div class="product-article">Артикул: ${escapeHtml(p.article||"—")}</div>${priceText(p)?`<div class="info-block"><div class="info-label">Оптовая цена</div><div class="dialog-price">${escapeHtml(priceText(p))}</div></div>`:""}${productFacts(p)}<p class="product-stock-note">Наличие и сроки поставки уточнит менеджер.</p>${variantChoices}${colors.length?`<div class="info-block"><div class="info-label">Цвета этой модели</div><div class="chip-row">${colors.map(color=>photos.some(photo=>photo.color===color)?`<button type="button" class="chip product-color" data-color="${escapeHtml(color)}" aria-pressed="false">${escapeHtml(color)}</button>`:`<span class="chip">${escapeHtml(color)}</span>`).join("")}</div></div>`:""}${sizes.length?`<div class="info-block"><div class="info-label">Размеры</div><div class="chip-row">${sizes.map(x=>`<span class="chip">${escapeHtml(x)}</span>`).join("")}</div></div>`:""}${cats.length?`<div class="info-block"><div class="info-label">Категория</div><div class="chip-row">${cats.map(x=>`<span class="chip">${escapeHtml(x)}</span>`).join("")}</div></div>`:""}${p.description?`<details class="info-block product-description-details"><summary>Подробное описание</summary><div class="dialog-description">${escapeHtml(p.description)}</div></details>`:""}${wbUrl?`<div class="product-retail-reference"><a href="${escapeHtml(wbUrl)}" target="_blank" rel="noopener noreferrer">На Вайлдберриз <span aria-hidden="true">↗</span></a><small>Оптовую цену и наличие уточнит менеджер.</small></div>`:""}<div class="info-block"><button id="dialogAddButton" class="dialog-primary wide" type="button">${state.requestIds.has(p.id)?"Убрать из заявки":"Добавить в заявку"}</button></div></div></div>`;
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

const catalogProductTypes={"gloves":"Перчатки","uniforms":"Кимоно и форма","belts":"Пояса","rashguards":"Рашгарды","bottoms":"Шорты и штаны","protection":"Защита","shoes":"Обувь","pads":"Лапы и пады","punching":"Мешки и груши","balls":"Мячи","accessories":"Аксессуары","fitness":"Фитнес-инвентарь","equipment":"Оборудование для зала"};
function productTypesFor(product){return [...new Set((product.categoryIds||[]).map(id=>state.categoryById.get(id)?.productTypeId).filter(Boolean))];}
function selectProductType(id){
 state.selectedProductTypeId=id||null;state.selectedCategoryId=null;state.query="";el.searchInput.value="";state.page=1;closeSidebar();
 const url=new URL(location.href);url.searchParams.delete("category");if(id)url.searchParams.set("productType",id);else url.searchParams.delete("productType");history.replaceState({},"",url.pathname+url.search+url.hash);
 render();document.querySelector("#catalog").scrollIntoView({behavior:"smooth",block:"start"});
}
function renderProductTypeNavigation(){
 const rail=document.querySelector("#productTypeRail");rail.replaceChildren();
 for(const [id,name]of [["","Все товары"],...Object.entries(catalogProductTypes)]){
  const count=id?state.products.filter(p=>productTypesFor(p).includes(id)).length:state.products.length;
  if(!count&&id)continue;
  const button=document.createElement("button");button.type="button";button.className="sport-tab";button.textContent=name;button.setAttribute("aria-pressed",String((state.selectedProductTypeId||"")===id));button.addEventListener("click",()=>selectProductType(id));rail.append(button);
 }
 const mode=state.selectedProductTypeId?"types":(document.querySelector("#catalogBrowseTypes").getAttribute("aria-pressed")==="true"?"types":"sports");
 document.querySelector("#catalogBrowseSports").setAttribute("aria-pressed",String(mode==="sports"));document.querySelector("#catalogBrowseTypes").setAttribute("aria-pressed",String(mode==="types"));
 document.querySelector(".sport-navigation").hidden=mode!=="sports";rail.hidden=mode!=="types";document.querySelector(".compact-filters .touch-select").hidden=mode==="types";
}

function render(){renderProductTypeNavigation();renderSportsDiscovery();renderCategories();renderQuickCategories();renderProducts();saveRequest()}

function additionalProductCategory(text,ids){
 const within=root=>ids.some(id=>id===root||id.startsWith(root+"-"));
 if(/боксерк|boxing shoes/.test(text))return "combat-boxing-mma-shoes";
 if(/скакал/.test(text))return "combat-boxing-mma-skipping-ropes";
 if(/футзалк|обув.*футзал/.test(text))return "football-futsal-shoes";
 if(/вратар.*перчат|перчат.*вратар/.test(text))return "football-goalkeeper-gloves";
 if(/насос.*мяч|игл.*насос/.test(text))return "other-pumps";
 if(/жгут|борцовск.*резин|резин.*борьб/.test(text))return "fitness-harness";
 if(/эспандер|фитнес.*резин|резин.*фитнес/.test(text))return "other-resistance-bands";
 if(/коврик.*(?:тренир|йог|фитнес)/.test(text))return "other-mats";
 if(/шейкер|спортивн.*бутыл|бутыл.*спорт/.test(text))return "other-bottles";
 const sport=/муай|тайск|muay/.test(text)?"muay-thai":/кикбокс|kickbox/.test(text)?"kickboxing":null;
 if(sport==="kickboxing"&&/штан|брюк|trousers|pants/.test(text))return "kickboxing-pants";
 if(sport){if(/шлем/.test(text))return sport+"-helmets";if(/кап[аыу](?:\s|$|[,.])/.test(text))return sport+"-mouthguards";if(/защит.*пах|ракушк/.test(text))return sport+"-groin";}
 if(/карат|киокуш/.test(text)&&!/мма|mma/.test(text)){
  if(/щитк|футы/.test(text))return "karate-shinguards";if(/кап[аыу](?:\s|$|[,.])/.test(text))return "karate-mouthguards";if(/защит.*пах|ракушк/.test(text))return "karate-groin";
 }
 const bjj=/bjj|бжж|джиу|jiu.?jitsu/.test(text),judo=/дзюдо|judo/.test(text);
 if(bjj&&/защит.*уш|уш.*защит/.test(text))return "bjj-earguards";
 if(bjj||judo){if(/наколен/.test(text))return (bjj?"bjj":"judo")+"-kneepads";if(/тейп/.test(text))return (bjj?"bjj":"judo")+"-tape";}
 if(/футбол/.test(text)||within("football")){
  if(/щитк/.test(text))return "football-shinguards";if(/гетр/.test(text))return "football-socks";
  if(/форм|манишк/.test(text))return "football-uniform";if(/ворот|сетк/.test(text))return "football-goals-nets";
  if(/фишк|конус|координацион.*лестниц/.test(text))return "football-training";
 }
 if(/баскетбол/.test(text)||within("basketball")){
  if(/кольц|сетк/.test(text))return "basketball-hoops";if(/форм/.test(text))return "basketball-uniform";if(/кроссов/.test(text))return "basketball-shoes";
 }
 if(/волейбол/.test(text)||within("volleyball")){
  if(/наколен/.test(text))return "volleyball-kneepads";if(/мяч/.test(text))return "volleyball-balls";if(/форм/.test(text))return "volleyball-uniform";if(/кроссов/.test(text))return "volleyball-shoes";
 }
 return null;
}
function legacyRefinedProductCategories(product){
 const ids=product.categoryIds||[];
 // Only refine imported WB cards. Explicit warehouse category selections remain authoritative.
 if(!/^wb-\d+$/.test(String(product.id||"")))return ids;
 const text=String(product.title||"").toLowerCase().replaceAll("ё","е");
 const additional=additionalProductCategory(text,ids);if(additional)return [additional];
 const bjj=/bjj|бжж|джиу|jiu.?jitsu/.test(text),karate=/карат|киокуш/.test(text),kick=/кикбокс|kickbox/.test(text),muay=/муай|муайтай|тайск|muay/.test(text);
 const boxing=ids.some(id=>id.startsWith("combat-boxing-mma"))||/бокс|мма|mma|ufc|черепаш/.test(text);
 let leaf=null,root=null;
 if(/^(?:спортивный\s+)?пояс\b|^пояс|^belt\b/.test(text)){
  if(bjj){leaf="bjj-belts";root="bjj";}else if(karate){leaf="karate-belts";root="karate";}
 }else if(bjj){
  const suffix=/рашгард|rashguard/.test(text)?"rashguards":/шорт/.test(text)?"shorts":/спатс|компрессион.*(?:штан|брюк|леггин)/.test(text)?"spats":null;
  if(suffix){leaf="bjj-"+suffix;root="bjj";}
 }else if(kick||muay){
  root=kick?"kickboxing":"muay-thai";
  const suffix=/бинт/.test(text)?"wraps":/щитк|защит.*голен/.test(text)?"shinguards":/шорт/.test(text)?"shorts":/лап[аы]|пэд|макивар/.test(text)?"pads":/перчат/.test(text)?"gloves":/защит|кап[аыу]|шлем/.test(text)?"protection":null;
  if(suffix)leaf=root+"-"+suffix;
 }else if(boxing){
  root="combat-boxing-mma";
  const suffix=/черепаш|перчат.*(?:мма|mma|ufc)|(?:мма|mma).*перчат/.test(text)?"mma-gloves":/кап[аыу](?:\s|$|[,.])|mouthguard/.test(text)?"mouthguards":/защит.*пах|ракушк|бандаж.*пах/.test(text)?"groin":/макивар|тай.?пэд|тайпэд/.test(text)?"pads":/мешок|мешки|груш/.test(text)?"bags":/рашгард|rashguard/.test(text)?"rashguards":/шорт/.test(text)?"shorts":null;
  if(suffix)leaf=root+"-"+suffix;
 }
 if(!leaf)return ids;
 const related=id=>id===root||id.startsWith(root+"-")||id.startsWith("combat-boxing-mma")||id.startsWith("bjj-")||id==="sports-unclassified";
 return [...new Set([...ids.filter(id=>!related(id)),leaf])];
}

function refinedProductCategories(product){
 const ids=legacyRefinedProductCategories(product);
 if(!/^wb-\d+$/.test(String(product.id||"")))return ids;
 const text=String(product.title||"").toLowerCase().replaceAll("ё","е");
 let leaf=null;
 if(/самбовк/.test(text))leaf="sambo-shoes";
 else if(/самбо/.test(text)){const suffix=/комплект|набор|кимоно|форма|куртк.*шорт|шорт.*куртк/.test(text)?"uniforms":/пояс/.test(text)?"belts":/шорт/.test(text)?"shorts":/куртк/.test(text)?"jackets":/защит/.test(text)?"protection":null;if(suffix)leaf="sambo-"+suffix;}
 else if(/борцовк/.test(text))leaf="wrestling-shoes";
 else if(/борьб|борцов/.test(text)){const suffix=/трико/.test(text)?"singlets":/наколен/.test(text)?"kneepads":/защит.*уш/.test(text)?"earguards":null;if(suffix)leaf="wrestling-"+suffix;}
 else if(/мма|mma|ufc|черепаш/.test(text)){
  const suffix=/перчат|черепаш/.test(text)?(/спарринг/.test(text)?"mma-sparring-gloves":"combat-boxing-mma-mma-gloves"):/рашгард/.test(text)?"combat-boxing-mma-rashguards":/шорт/.test(text)?"combat-boxing-mma-shorts":/спатс|компрессион.*(?:штан|брюк|леггин)/.test(text)?"mma-spats":/щитк|защит.*голен/.test(text)?"mma-shinguards":/кап[аыу](?:\s|$|[,.])/.test(text)?"mma-mouthguards":/защит.*пах|ракушк/.test(text)?"mma-groin":/шлем/.test(text)?"mma-helmets":null;
  if(suffix)leaf=suffix;
 }else if(/бокс/.test(text)&&!/кикбокс/.test(text)&&/шорт|форм/.test(text))leaf="boxing-shorts";
 if(!leaf)return ids;
 return [...new Set([...ids.filter(id=>!id.startsWith("combat-boxing-mma")&&!id.startsWith("mma-")&&!id.startsWith("sambo-")&&!id.startsWith("wrestling-")&&id!=="sports-unclassified"),leaf])];
}

async function init(){try{const [cr,gr]=await Promise.all([fetch("./data/catalog.json",{cache:"no-store"}),fetch("./data/categories.json",{cache:"no-store"})]);if(!cr.ok||!gr.ok)throw new Error("load");const c=await cr.json(),g=await gr.json();state.products=(Array.isArray(c.products)?c.products:[]).filter(p=>!/^wb-[1-9][0-9]*$/.test(p.id));const wbURL=location.hostname.endsWith("github.io")?"https://opt.luckysport.kz/wb-catalog.php":"./wb-catalog.php";const wr=await fetch(wbURL,{cache:"no-store"});if(!wr.ok)throw Error("Каталог ВБ временно недоступен");const wb=await wr.json();if(!Array.isArray(wb.products))throw Error("Каталог ВБ временно недоступен");state.products.push(...wb.products);try{const response=await fetch("./warehouse-catalog.php",{cache:"no-store"});if(response.ok){const warehouse=await response.json();if(Array.isArray(warehouse.products))state.products.push(...warehouse.products);}}catch(e){console.warn("Складской каталог временно недоступен");}try{const fr=await fetch("./data/fx.json",{cache:"no-store"});if(fr.ok){const fx=await fr.json();state.products=convertProductPrices(state.products,fx);el.currencyControl.title="Пересчёт по курсу Национального банка Казахстана"+(fx.effectiveDate?" на "+fx.effectiveDate:"");}}catch(e){console.warn("Курсы валют временно недоступны");}state.products=state.products.map(p=>({...p,categoryIds:refinedProductCategories(p)}));state.categories=Array.isArray(g)?g.map(c=>({...c,name:c.name.replace(/BJJ\s*\/\s*Джиу-джитсу/gi,"Джиу-джитсу").replace(/MMA/g,"ММА")})):[];state.categoryById=new Map(state.categories.map(x=>[x.id,x]));const initialType=new URLSearchParams(window.location.search).get("productType");if(catalogProductTypes[initialType])state.selectedProductTypeId=initialType;const initialCategory=new URLSearchParams(window.location.search).get("category");if(!state.selectedProductTypeId&&initialCategory&&state.categoryById.has(initialCategory))state.selectedCategoryId=initialCategory;const top=topLevelCategories().filter(x=>productCountForCategory(x.id)>0).length;if(el.productCount)el.productCount.textContent=state.products.length;if(el.categoryCount)el.categoryCount.textContent=top;el.currencySelect.value=state.currency;const hasPrice=state.products.some(p=>p.priceFrom?.KZT!=null);el.currencyControl.hidden=!hasPrice;if(!hasPrice)[...el.sortSelect.options].forEach(o=>{if(o.value==="priceAsc"||o.value==="priceDesc")o.hidden=true});renderShowcase();render()}catch(e){console.error(e);el.resultsMeta.textContent="Ошибка загрузки каталога";el.productGrid.innerHTML="";el.emptyState.hidden=false}}
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

const productionViewer=document.querySelector('#productionVideoViewer'),productionVideo=document.querySelector('#productionVideo');let productionTrigger=null;
if(productionViewer&&productionVideo){document.querySelectorAll('[data-production-video]').forEach(button=>button.addEventListener('click',()=>{productionTrigger=button;document.querySelector('#productionVideoTitle').textContent=button.dataset.videoTitle;productionVideo.src=button.dataset.productionVideo;productionViewer.showModal();productionVideo.play().catch(()=>{});}));document.querySelector('#productionVideoClose').addEventListener('click',()=>productionViewer.close());productionViewer.addEventListener('click',event=>{if(event.target===productionViewer){const bounds=productionViewer.getBoundingClientRect();if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)productionViewer.close();}});productionViewer.addEventListener('close',()=>{productionVideo.pause();productionVideo.removeAttribute('src');productionVideo.load();productionTrigger?.focus({preventScroll:true});});}

const reviewRail=document.querySelector('#reviewRail');
if(reviewRail){const previous=document.querySelector('#reviewPrevious'),next=document.querySelector('#reviewNext');const update=()=>{previous.disabled=reviewRail.scrollLeft<=4;next.disabled=reviewRail.scrollLeft+reviewRail.clientWidth>=reviewRail.scrollWidth-2;};const move=direction=>{const card=reviewRail.querySelector('.review-card');reviewRail.scrollBy({left:direction*(card.getBoundingClientRect().width+14),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});};previous.addEventListener('click',()=>move(-1));next.addEventListener('click',()=>move(1));reviewRail.addEventListener('scroll',update,{passive:true});window.addEventListener('resize',update);update();}

const reviewMediaDialog=document.querySelector('#reviewMediaViewer'),reviewMediaImage=document.querySelector('#reviewMediaImage'),reviewMediaVideo=document.querySelector('#reviewMediaVideo');let reviewMediaTrigger=null;
function localReviewAsset(value,video=false){const pattern=video?/^\.\/media\/reviews\/[a-z0-9-]+\.mp4$/:/^\.\/media\/reviews\/[a-z0-9-]+\.(?:webp|jpg|png)$/;return typeof value==='string'&&pattern.test(value)?value:null;}
if(reviewMediaDialog){
 const openReviewMedia=(src,video,button)=>{reviewMediaTrigger=button;reviewMediaImage.hidden=video;reviewMediaVideo.hidden=!video;document.querySelector('#reviewMediaTitle').textContent=video?'Видео покупателя':'Фото покупателя';if(video){reviewMediaVideo.src=src;}else reviewMediaImage.src=src;reviewMediaDialog.showModal();if(video)reviewMediaVideo.play().catch(()=>{});};
 document.querySelector('#reviewMediaClose').addEventListener('click',()=>reviewMediaDialog.close());reviewMediaDialog.addEventListener('close',()=>{reviewMediaVideo.pause();reviewMediaVideo.removeAttribute('src');reviewMediaVideo.load();reviewMediaImage.removeAttribute('src');reviewMediaTrigger?.focus({preventScroll:true});});
 reviewMediaDialog.addEventListener('click',event=>{if(event.target===reviewMediaDialog){const r=reviewMediaDialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)reviewMediaDialog.close();}});
 fetch('./data/selected-review-media.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(data=>{for(const item of data?.reviews||[]){if(!item.matched)continue;const card=[...document.querySelectorAll('[data-review-key]')].find(c=>c.dataset.reviewKey===item.key);if(!card)continue;const rail=document.createElement('div');rail.className='review-thumbnails';let index=0;for(const value of item.photos||[]){const src=localReviewAsset(value);if(!src)continue;const button=document.createElement('button');button.type='button';button.className='review-thumbnail';button.setAttribute('aria-label','Открыть фото '+(++index)+' к отзыву '+card.querySelector('footer strong').textContent);const image=document.createElement('img');image.src=src;image.alt='Фото покупателя';image.loading='lazy';button.append(image);button.addEventListener('click',()=>openReviewMedia(src,false,button));rail.append(button);}const video=localReviewAsset(item.video,true);if(video){const button=document.createElement('button');button.type='button';button.className='review-thumbnail';button.setAttribute('aria-label','Смотреть видео к отзыву '+card.querySelector('footer strong').textContent);const poster=localReviewAsset(item.photos?.[0]);if(poster){const image=document.createElement('img');image.src=poster;image.alt='';image.loading='lazy';button.append(image);}const label=document.createElement('span');label.className='review-video-label';label.textContent='▶ Видео';button.append(label);button.addEventListener('click',()=>openReviewMedia(video,true,button));rail.append(button);}if(rail.childElementCount)card.insertBefore(rail,card.querySelector('footer'));if(Number.isSafeInteger(item.nmId)&&item.nmId>0){const link=document.createElement('a');link.className='review-product-link';link.href='https://www.wildberries.ru/catalog/'+item.nmId+'/detail.aspx';link.target='_blank';link.rel='noopener noreferrer';link.textContent='Товар на Вайлдберриз ↗';card.querySelector('footer').append(link);}}}).catch(()=>{});
}

document.querySelector("#sportsDiscoveryAll").addEventListener("click",openSportPicker);
for(const [id,sign] of [["sportsDiscoveryPrev",-1],["sportsDiscoveryNext",1]])document.querySelector("#"+id).addEventListener("click",()=>{const rail=document.querySelector("#sportsDiscoveryRail");rail.scrollBy({left:sign*Math.max(240,rail.clientWidth*.8),behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});});
document.querySelector("#sportsDiscoveryRail").addEventListener("scroll",syncSportsDiscoveryArrows,{passive:true});
window.addEventListener("resize",syncSportsDiscoveryArrows);

document.querySelector("#catalogBrowseSports").addEventListener("click",()=>{document.querySelector("#catalogBrowseTypes").setAttribute("aria-pressed","false");selectCategory(null,{scroll:false});});
document.querySelector("#catalogBrowseTypes").addEventListener("click",()=>{document.querySelector("#catalogBrowseTypes").setAttribute("aria-pressed","true");selectProductType("");});
