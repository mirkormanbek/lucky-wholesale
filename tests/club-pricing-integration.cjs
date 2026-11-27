// Club prices end to end on a local copy of the site: every public output shows finished club prices and
// never the cabinet's base price or the private percentages; a broken private file hides prices.
const fs=require('fs'),path=require('path'),cp=require('child_process'),assert=require('assert');
const root=path.resolve(__dirname,'..'),work=path.join(root,'work','pricing-test-'+Date.now()),pub=path.join(work,'public'),priv=path.join(work,'lucky-wholesale-private');
fs.mkdirSync(priv,{recursive:true});fs.cpSync(path.join(root,'public'),pub,{recursive:true});
const php=process.env.PHP_BIN||'php',origin='http://127.0.0.1:4232';
const fx=JSON.parse(fs.readFileSync(path.join(pub,'data/fx.json'))).kztPerUnit;
const source=JSON.parse(fs.readFileSync(path.join(pub,'data/catalog.json'))).products;const wb=source.find(p=>p.id.startsWith('wb-'));
const now=new Date().toISOString(),item={id:'club-test',title:'Кимоно клубное тест',article:'CLUB',categoryId:'judo-gi',additionalCategoryIds:[],currency:'KZT',price:10000,material:'',sizes:['150'],colors:['белый'],photos:[],status:'published',createdAt:now,updatedAt:now,revision:1};
fs.writeFileSync(path.join(priv,'warehouse-state.json'),JSON.stringify({products:{'club-test':item},photos:{},wbPrices:{[wb.id]:{status:'published',price:17777,revision:1}},wbDeleted:{}}));
const settingsFile=path.join(priv,'pricing-settings.json');
const writeSettings=(data,mode=0o600)=>{fs.writeFileSync(settingsFile,JSON.stringify(data));fs.chmodSync(settingsFile,mode);};
writeSettings({categoryMarkupPercent:{judo:25,default:20},russiaSurchargePercent:0,volumeDiscountPercent:{'10':5,'30':10}});
const router=path.join(work,'router.php');fs.writeFileSync(router,`<?php $path=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH);if($path==='/'){require __DIR__.'/public/index.php';return true;}if(preg_match('~^/product/([A-Za-z0-9_-]+)/?$~D',$path,$m)){$_GET['slug']=$m[1];require __DIR__.'/public/product.php';return true;}return false;`);
const text=async url=>{const r=await fetch(origin+url);return {status:r.status,body:await r.text()};};
(async()=>{const server=cp.spawn(php,['-S','127.0.0.1:4232','-t',pub,router],{stdio:'ignore'});
try{let ready=false;for(let i=0;i<60&&!ready;i++){try{ready=(await fetch(origin+'/site-settings.php')).ok;}catch{}if(!ready)await new Promise(r=>setTimeout(r,100));}assert(ready,'PHP server');
 // 10 000 ₸ base, 25% judo markup → 12 500 ₸; tiers 5%/10% → 11 900 / 11 300 ₸; rubles at the NBK rate, 10 ₽ steps.
 const rub=k=>Math.round(k/fx.RUB/10)*10,fmt=n=>n.toLocaleString('ru-RU').replace(/ /g,' ');
 const outputs={home:(await text('/?currency=KZT')).body,product:(await text('/product/warehouse-club-test?currency=KZT')).body,productRub:(await text('/product/warehouse-club-test?currency=RUB')).body,wbProduct:(await text('/product/'+wb.id+'?currency=KZT')).body,wbApi:(await text('/wb-catalog.php')).body,warehouseApi:(await text('/warehouse-catalog.php')).body};
 const product=outputs.product;for(const v of ['12 500 ₸','от 10 шт. — 11 900 ₸','от 30 шт. — 11 300 ₸','от 5 шт.','дилерская цена по запросу'])assert(product.includes(v),'product page: '+v);
 assert(outputs.productRub.includes('≈ '+fmt(rub(12500))+' ₽'),'rubles '+rub(12500));
 const api=JSON.parse(outputs.warehouseApi).products.find(p=>p.id==='warehouse-club-test');assert.deepEqual(api.priceFrom,{KZT:12500,RUB:rub(12500),USD:Math.round(12500/fx.USD)});assert.deepEqual(api.priceTiers.map(t=>[t.min,t.KZT]),[[10,11900],[30,11300]]);
 const wbRecord=JSON.parse(outputs.wbApi).products.find(p=>p.id===wb.id);assert(wbRecord&&wbRecord.priceFrom.KZT%100===0&&wbRecord.priceFrom.KZT>17777,'WB club price '+JSON.stringify(wbRecord&&wbRecord.priceFrom));
 const boot=JSON.parse(outputs.home.match(/<script id="storefrontBootstrap" type="application\/json">([\s\S]*?)<\/script>/)[1]);assert.deepEqual(boot.products.find(p=>p.id==='warehouse-club-test').priceFrom.KZT,12500);assert.deepEqual(boot.pricing,{minimumQuantity:5,dealerQuantity:50});
 // Nothing private anywhere: no base fields, no percentages, no base prices.
 for(const [name,body] of Object.entries(outputs)){
  for(const secret of ['priceFromKzt','categoryMarkupPercent','russiaSurchargePercent','volumeDiscountPercent','minOrderQuantity','17777','17 777'])assert(!body.includes(secret),name+' leaks '+secret);
  assert(!/(?:^|[^0-9 ])10 000 ₸|"KZT":10000\b|"price":10000\b/.test(body),name+' leaks the 10 000 ₸ base');
 }
 // No markup for the category and no default: the base price as before, without tiers.
 writeSettings({categoryMarkupPercent:{boxing:30},volumeDiscountPercent:{'10':5}});
 const plain=(await text('/product/warehouse-club-test?currency=KZT')).body;assert(plain.includes('от 10 000 ₸')&&!plain.includes('от 10 шт.'),'base without markup');
 // Broken file (readable by others): prices hidden, base never shown.
 writeSettings({categoryMarkupPercent:{default:20}},0o644);
 const broken=(await text('/product/warehouse-club-test?currency=KZT')).body;assert(broken.includes('Цена по запросу')&&!broken.includes('10 000 ₸'),'broken file hides prices');
 const brokenApi=JSON.parse((await text('/warehouse-catalog.php')).body).products.find(p=>p.id==='warehouse-club-test');assert.equal(brokenApi.priceFrom,null);
 console.log('PASS club prices end to end: product page, catalog bootstrap, wb-catalog.php and warehouse-catalog.php show only finished tiered prices; no base price or percentages; no markup → base; broken file → prices hidden.');
}finally{server.kill();fs.rmSync(work,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
