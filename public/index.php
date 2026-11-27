<?php
declare(strict_types=1);
require __DIR__.'/storefront-views.php';
header('Content-Type: text/html; charset=utf-8');header('Cache-Control: private, no-cache');header('Vary: Cookie');
$data=storefront_data();$config=require __DIR__.'/site-config.php';$currency=storefront_currency();$all=$data['products'];$page=max(1,min(10000,(int)($_GET['page']??1)));$pages=max(1,(int)ceil(count($all)/24));$page=min($page,$pages);
$html=(string)file_get_contents(__DIR__.'/index.html');
$html=preg_replace('~<meta property="og:[^"]+"[^>]*>\s*|<link rel="canonical"[^>]*>\s*~i','',$html);
$html=preg_replace_callback('~<title>.*?</title>\s*<meta name="description"[^>]*>~s',fn()=>sf_meta($config['title'],$config['description'],$page>1?'/?page='.$page:'/'),$html,1);
$cards='';foreach(array_slice($all,($page-1)*24,24) as $p)$cards.=sf_card($p,$data['categories'],$currency);
if($cards==='')$cards='<p>Каталог временно недоступен. Напишите менеджеру — подберём товары по вашему запросу.</p>';
$html=str_replace('<div id="productGrid" class="product-grid"></div>','<div id="productGrid" class="product-grid">'.$cards.'</div>',$html);
$html=str_replace('>Загрузка…</div>','>'.count($all).' товаров в каталоге</div>',$html);
$pagination='<nav class="ssr-pagination" aria-label="Страницы каталога">';for($i=1;$i<=$pages;$i++)$pagination.='<a href="/?page='.$i.'&amp;currency='.$currency.'#catalog"'.($i===$page?' aria-current="page"':'').'>'.$i.'</a>';$pagination.='</nav>';
$html=str_replace('<!-- SSR_PAGINATION -->',$pagination,$html);$html=str_replace('<!-- WHOLESALE_TERMS -->',sf_terms(),$html);
$html=str_replace('<div id="wholesaleTermsMount"></div>','',$html);
$bootstrap=sf_json(array_merge($data,['currency'=>$currency,'page'=>$page,'pricing'=>['minimumQuantity'=>(int)$config['minimumQuantity'],'dealerQuantity'=>(int)$config['dealerQuantity']]]));$html=sf_dealer_quantity($html);$html=str_replace('<!-- STOREFRONT_BOOTSTRAP -->','<script id="storefrontBootstrap" type="application/json">'.$bootstrap.'</script>',$html);
echo $html;
