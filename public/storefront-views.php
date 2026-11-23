<?php
declare(strict_types=1);
require_once __DIR__.'/storefront-data.php';
function sf_e($s): string {return htmlspecialchars((string)$s,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');}
function sf_json($v): string {return json_encode($v,JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);}
function sf_price(array $p,string $c): string {$n=$p['priceFrom'][$c]??null;if(!is_numeric($n)||$n<=0)return 'Цена по запросу';return 'от '.number_format((float)$n,$c==='KZT'?0:2,',',' ').' '.['KZT'=>'₸','RUB'=>'₽','USD'=>'$'][$c];}
function sf_sport(array $p,array $categories): string {$map=[];foreach($categories as $c)$map[$c['id']]=$c;$names=[];foreach($p['categoryIds']??[] as $id){$seen=[];$path=[];while(isset($map[$id])&&!isset($seen[$id])){$seen[$id]=true;$cat=$map[$id];array_unshift($path,$cat['name']);$id=$cat['parentId']??'';}$label=implode(' / ',array_slice($path,0,2));if($label!=='')$names[]=$label;}return implode(', ',array_unique($names))?:'Спортивная экипировка';}
function sf_card(array $p,array $cats,string $currency): string {
 $url=storefront_product_url($p);$image=storefront_image($p['photos'][0]??'');$title=$p['title']??'Спортивный товар';
 return '<article class="product-card ssr-product-card" data-product-id="'.sf_e($p['id']).'"><a class="product-image-button" href="'.sf_e($url).'"><img class="product-image" src="'.sf_e($image).'" alt="'.sf_e($title).'" loading="lazy" style="display:block"></a><div class="product-body"><div class="product-brand">'.sf_e($p['brand']??'Lucky').'</div><h3><a class="product-title" href="'.sf_e($url).'">'.sf_e($title).'</a></h3><p class="product-sport">'.sf_e(sf_sport($p,$cats)).'</p><div class="product-price" data-prices="'.sf_e(json_encode($p['priceFrom']??[])).'">'.sf_e(sf_price($p,$currency)).'</div><button class="dialog-primary quote-button" type="button" data-request-product="'.sf_e($p['id']).'" data-request-title="'.sf_e($title).'">Запросить оптовую цену</button></div></article>';
}
function sf_terms(): string {$config=require __DIR__.'/site-config.php';$html='<section id="wholesaleTerms" class="wholesale-terms"><div class="section-kicker dark">СОТРУДНИЧЕСТВО</div><h2>Условия опта</h2><ul>';foreach($config['terms'] as $text)$html.='<li>'.sf_e($text).'</li>';return $html.'</ul></section>';}
function sf_form(): string {$template=(string)file_get_contents(__DIR__.'/index.html');preg_match('~<!-- LEAD_DIALOG_START -->(.*?)<!-- LEAD_DIALOG_END -->~s',$template,$m);return $m[1]??'';}
function sf_meta(string $title,string $description,string $path,string $image='/media/og-wholesale.png',string $type='website'): string {
 $c=require __DIR__.'/site-config.php';$image=storefront_image($image);if(strpos($image,'https://')!==0)$image=$c['origin'].$image;
 return '<title>'.sf_e($title).'</title><meta name="description" content="'.sf_e($description).'"><link rel="canonical" href="'.sf_e($c['origin'].$path).'"><meta property="og:type" content="'.sf_e($type).'"><meta property="og:locale" content="ru_RU"><meta property="og:site_name" content="Lucky — оптом"><meta property="og:title" content="'.sf_e($title).'"><meta property="og:description" content="'.sf_e($description).'"><meta property="og:url" content="'.sf_e($c['origin'].$path).'"><meta property="og:image" content="'.sf_e($image).'"><meta name="twitter:card" content="summary_large_image">';
}
