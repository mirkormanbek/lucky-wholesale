<?php
declare(strict_types=1);
// Club prices shown on the site. Base prices stay in the supplier cabinet; markups, the Russia surcharge and
// volume discounts come from the private pricing-settings.json next to lead-settings.json (never in Git).
// Only finished prices leave this file: base prices and percentages must not reach HTML, JSON or the API.
require_once __DIR__.'/lead-domain.php';
require_once __DIR__.'/storefront-categories.php';

const CLUB_PRICING_FILE='pricing-settings.json';

function club_percent($value,float $min,float $max): ?float {
 if($value===null)return null;
 if(!is_int($value)&&!is_float($value))throw new RuntimeException('Pricing percent must be a number');
 $value=(float)$value;if(!is_finite($value)||$value<$min||$value>$max)throw new RuntimeException('Pricing percent out of range');
 return $value;
}

// Parsed settings. state: missing (no file: base prices as before), ok, or broken (prices hidden, never base).
function club_pricing_parse(?array $data,int $minimumQuantity): array {
 if($data===null)return ['state'=>'missing'];
 foreach(array_keys($data) as $key)if(!in_array($key,['categoryMarkupPercent','russiaSurchargePercent','volumeDiscountPercent'],true)&&strpos((string)$key,'_')!==0)throw new RuntimeException('Unknown pricing setting');
 $markups=$data['categoryMarkupPercent']??[];if(!is_array($markups))throw new RuntimeException('categoryMarkupPercent must be an object');
 $markup=[];$default=null;
 foreach($markups as $id=>$value){$pct=club_percent($value,0,1000);if($pct===null)continue;if($id==='default')$default=$pct;else $markup[(string)$id]=$pct;}
 $surcharge=club_percent($data['russiaSurchargePercent']??null,0,1000)??0.0;
 $discounts=$data['volumeDiscountPercent']??[];if(!is_array($discounts))throw new RuntimeException('volumeDiscountPercent must be an object');
 $tiers=[];
 foreach($discounts as $qty=>$value){
  if(!preg_match('/^[1-9][0-9]{0,5}$/D',(string)$qty)||(int)$qty<=$minimumQuantity)throw new RuntimeException('Volume discount threshold invalid');
  $pct=club_percent($value,0,99);if($pct!==null)$tiers[(int)$qty]=$pct;
 }
 ksort($tiers);
 return ['state'=>'ok','markup'=>$markup,'default'=>$default,'surcharge'=>$surcharge,'tiers'=>$tiers];
}

function club_pricing_settings(): array {
 static $settings=null;if($settings!==null)return $settings;
 $config=require __DIR__.'/site-config.php';
 try{$settings=club_pricing_parse(lead_private_json(CLUB_PRICING_FILE,65536),(int)$config['minimumQuantity']);}
 catch(Throwable $e){error_log('Lucky pricing: private pricing settings rejected: '.$e->getMessage());$settings=['state'=>'broken'];}
 return $settings;
}

function club_category_parents(): array {
 static $parents=null;if($parents!==null)return $parents;$parents=[];
 $raw=is_file(__DIR__.'/data/categories.json')?json_decode((string)file_get_contents(__DIR__.'/data/categories.json'),true):[];
 foreach(is_array($raw)?$raw:[] as $c)if(isset($c['id']))$parents[(string)$c['id']]=isset($c['parentId'])?(string)$c['parentId']:null;
 return $parents;
}

// Nearest markup: the product's own category, then its parents; the first category that resolves wins; then "default".
function club_markup(array $settings,array $categoryIds,array $parents): ?float {
 foreach($categoryIds as $id){$seen=[];while(is_string($id)&&$id!==''&&!isset($seen[$id])){$seen[$id]=true;if(isset($settings['markup'][$id]))return $settings['markup'][$id];$id=$parents[$id]??null;}}
 return $settings['default'];
}

function club_round(float $value,int $step): int {return (int)(round($value/$step)*$step);}

// One price in every public currency from a Kazakhstan price in tenge.
function club_currencies(int $kzt,float $surcharge,array $rates): array {
 $out=['KZT'=>$kzt];
 if(is_numeric($rates['RUB']??null)&&$rates['RUB']>0)$out['RUB']=club_round($kzt*(1+$surcharge/100)/$rates['RUB'],10);
 if(is_numeric($rates['USD']??null)&&$rates['USD']>0)$out['USD']=club_round($kzt/$rates['USD'],1);
 return $out;
}

/**
 * Public prices for a base price in tenge. Returns ['priceFrom'=>[...], 'priceTiers'=>[...]]; priceFrom is null
 * when the private settings are broken, so a mistake in the file hides prices instead of exposing base prices.
 * Without a markup for the category (and no "default") the base price is shown as before, without tiers.
 */
function club_prices(float $baseKzt,array $categoryIds,array $rates,?array $settings=null,?array $parents=null): array {
 $settings=$settings??club_pricing_settings();
 if($settings['state']==='broken'||!is_finite($baseKzt)||$baseKzt<=0)return ['priceFrom'=>null,'priceTiers'=>[]];
 $markup=$settings['state']==='ok'?club_markup($settings,$categoryIds,$parents??club_category_parents()):null;
 if($markup===null){
  $prices=['KZT'=>round($baseKzt,2)];
  foreach(['RUB','USD'] as $c)if(is_numeric($rates[$c]??null)&&$rates[$c]>0)$prices[$c]=round($baseKzt/$rates[$c],2);
  return ['priceFrom'=>$prices,'priceTiers'=>[]];
 }
 $kzt=club_round($baseKzt*(1+$markup/100),100);
 $tiers=[];foreach($settings['tiers'] as $qty=>$discount)$tiers[]=['min'=>$qty]+club_currencies(club_round($kzt*(1-$discount/100),100),$settings['surcharge'],$rates);
 return ['priceFrom'=>club_currencies($kzt,$settings['surcharge'],$rates),'priceTiers'=>$tiers];
}

// WB cards get their markup by the category the catalog shows (title-based refinement), not the raw WB one.
function club_apply_refined(array $p,?float $baseKzt,array $rates): array {
 $shown=$p;$shown['categoryIds']=storefront_refined_categories($p);
 $priced=club_apply($shown,$baseKzt,$rates);$priced['categoryIds']=$p['categoryIds']??[];return $priced;
}
// Replaces whatever price fields a product record carries with public club prices.
function club_apply(array $p,?float $baseKzt,array $rates): array {
 unset($p['priceFromKzt'],$p['priceFrom'],$p['priceTiers'],$p['minOrderQuantity']);
 if($baseKzt===null){$p['priceFrom']=null;$p['priceTiers']=[];return $p;}
 return array_merge($p,club_prices($baseKzt,$p['categoryIds']??[],$rates));
}
