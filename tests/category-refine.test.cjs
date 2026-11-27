// Club prices use the category a customer sees. The catalog refines WB categories by title in app.js;
// public/storefront-categories.php repeats that on the server. This test keeps both in step on every product.
const fs=require('fs'),path=require('path'),vm=require('vm'),cp=require('child_process'),assert=require('assert');
const root=path.resolve(__dirname,'..'),src=fs.readFileSync(path.join(root,'public/app.js'),'utf8');
function extract(name){const start=src.indexOf('function '+name+'(');assert(start>=0,name);let depth=0;for(let i=src.indexOf('{',start);i<src.length;i++){if(src[i]==='{')depth++;else if(src[i]==='}'&&--depth===0)return src.slice(start,i+1);}throw Error(name);}
const ctx={};vm.createContext(ctx);vm.runInContext(['additionalProductCategory','legacyRefinedProductCategories','refinedProductCategories'].map(extract).join('\n')+';this.refine=refinedProductCategories;',ctx);
const products=JSON.parse(fs.readFileSync(path.join(root,'public/data/catalog.json'),'utf8')).products;
const extra=[['wb-1','Пояс для BJJ синий',['bjj']],['wb-2','Шлем ММА открытый',['combat-boxing-mma-helmets']],['wb-3','Самбовки детские',[]],['wb-4','Кимоно для самбо комплект',['sambo']],['wb-5','Боксерки Everlast',[]],['wb-6','Шорты для бокса',['combat-boxing-mma']],['wb-7','Капа для кикбоксинга',[]],['wb-8','Перчатки MMA спарринг',[]],['wb-9','Belt black',[]],['wb-10','Пояс спортивный каратэ',['karate']],['warehouse-1','Шлем ММА',['judo-gi']]].map(([id,title,categoryIds])=>({id,title,categoryIds}));
const all=[...products,...extra].map(p=>({id:p.id,title:p.title,categoryIds:p.categoryIds||[]}));
const php=process.env.PHP_BIN||'php';
const out=cp.execFileSync(php,['-r','require $argv[1];$in=json_decode(stream_get_contents(STDIN),true);$r=[];foreach($in as $p)$r[$p["id"]]=storefront_refined_categories($p);echo json_encode($r,JSON_UNESCAPED_UNICODE);',path.join(root,'public/storefront-categories.php')],{input:JSON.stringify(all)});
const server=JSON.parse(out);let checked=0;
for(const p of all){assert.deepStrictEqual(server[p.id],JSON.parse(JSON.stringify(ctx.refine(p))),p.id+' '+p.title);checked++;}
console.log(`PASS server category refinement matches app.js on ${checked} products`);
