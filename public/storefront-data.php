<?php
declare(strict_types=1);
require_once __DIR__.'/warehouse/wb-pricing.php';
function storefront_json(string $file): array {$r=is_file($file)?json_decode((string)file_get_contents($file),true):null;return is_array($r)?$r:[];}
function storefront_warehouse(array $rates): array {
 return warehouse_state(function(&$s)use($rates){$out=[];foreach($s['products'] as $p){if(($p['status']??'')!=='published')continue;$photos=[];
  foreach($p['photos'] as $id)if(!empty($s['photos'][$id]['approved'])&&!empty($s['photos'][$id]['processed']))$photos[]='/warehouse-photo.php?id='.$id;
  $rate=$rates[$p['currency']]??null;$base=is_numeric($p['price']??null)&&is_numeric($rate)&&$rate>0?(float)$p['price']*$rate:null;
  $out[]=club_apply(['id'=>'warehouse-'.$p['id'],'modelGroupId'=>$p['modelGroupId']??$p['id'],'article'=>$p['article'],'title'=>$p['title'],'brand'=>'Lucky','material'=>$p['material']??'','description'=>empty($p['material'])?'':'Материал: '.$p['material'],'categoryIds'=>array_values(array_unique(array_merge([$p['categoryId']],$p['additionalCategoryIds']??[]))),'colors'=>$p['colors'],'sizes'=>$p['sizes'],'photos'=>$photos],$base,$rates);
 }return $out;});
}
function storefront_data(): array {
 static $result;if($result!==null)return $result;
 $raw=storefront_json(__DIR__.'/data/catalog.json');$categories=storefront_json(__DIR__.'/data/categories.json');$fx=storefront_json(__DIR__.'/data/fx.json');$rates=$fx['kztPerUnit']??[];$rates['KZT']=1;$warning=false;$all=[];
 // Manual catalog entries: club price from their base price (priceFromKzt, or the first priced currency).
 foreach($raw['products']??[] as $p)if(!preg_match('/^wb-[1-9][0-9]*$/D',$p['id']??'')){$base=is_numeric($p['priceFromKzt']??null)?(float)$p['priceFromKzt']:null;if($base===null)foreach(['KZT','RUB','USD'] as $c)if(is_numeric($p['priceFrom'][$c]??null)&&$p['priceFrom'][$c]>0&&is_numeric($rates[$c]??null)&&$rates[$c]>0){$base=(float)$p['priceFrom'][$c]*$rates[$c];break;}$all[]=club_apply($p,$base,$rates);}
 try{$all=array_merge($all,wb_public_products());}catch(Throwable $e){$warning=true;error_log('Lucky storefront: published WB catalog unavailable');}
 try{$all=array_merge($all,storefront_warehouse($rates));}catch(Throwable $e){$warning=true;error_log('Lucky storefront: published warehouse catalog unavailable');}
 // Every source above already carries finished public prices; no further conversion here.
 $products=[];foreach($all as $p){if(is_string($p['id']??null))$products[$p['id']]=$p;}
 return $result=['products'=>array_values($products),'categories'=>$categories,'fx'=>$fx,'warning'=>$warning];
}
function storefront_currency(): string {$c=$_GET['currency']??$_COOKIE['lucky_currency']??'RUB';return is_string($c)&&in_array($c,['KZT','RUB','USD'],true)?$c:'RUB';}
function storefront_slug(array $p): string {return rawurlencode($p['id']);}
function storefront_product_url(array $p): string {return '/product/'.storefront_slug($p);}
function storefront_image(string $url): string {
 if(preg_match('~^https://[a-z0-9.-]+(?::[0-9]+)?/~i',$url))return $url;
 if(strpos($url,'./')===0)$url=substr($url,2);if($url!==''&&$url[0]!=='/'&&!strpos($url,':'))$url='/'.$url;
 return preg_match('~^/(?!/)[a-zA-Z0-9_./?=&%+:-]+$~D',$url)?$url:'/media/og-wholesale.png';
}
