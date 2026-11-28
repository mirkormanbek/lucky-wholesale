<?php
declare(strict_types=1);
require __DIR__.'/../public/club-pricing.php';
function pricing_expect(bool $ok,string $what){if(!$ok)throw new Exception('Pricing regression: '.$what);}
$rates=['KZT'=>1,'RUB'=>5.59,'USD'=>458.85];
$parents=['judo-gi'=>'judo','judo-belts'=>'judo','judo'=>'combat','combat'=>null,'boxing-gloves'=>'boxing','boxing'=>'combat'];
$settings=club_pricing_parse(['_note'=>'comment','categoryMarkupPercent'=>['judo'=>25,'judo-belts'=>40,'default'=>null],'russiaSurchargePercent'=>0,'volumeDiscountPercent'=>['30'=>10,'10'=>5,'20'=>null]],5);

// Markup inherited from the parent category, rounding to 100 ₸ / 10 ₽ / 1 $, tiers sorted, null tier skipped.
$r=club_prices(10000,['judo-gi'],$rates,$settings,$parents);
pricing_expect($r['priceFrom']===['KZT'=>12500,'RUB'=>2240,'USD'=>27],'5 pcs price '.json_encode($r));
pricing_expect($r['priceTiers']===[['min'=>10,'KZT'=>11900,'RUB'=>2130,'USD'=>26],['min'=>30,'KZT'=>11300,'RUB'=>2020,'USD'=>25]],'tiers '.json_encode($r['priceTiers']));
// Own category markup wins over the parent.
pricing_expect(club_prices(10000,['judo-belts'],$rates,$settings,$parents)['priceFrom']['KZT']===14000,'own category markup');
// No markup and no default: base price as before, no tiers.
$base=club_prices(10000,['boxing-gloves'],$rates,$settings,$parents);
pricing_expect($base['priceTiers']===[]&&$base['priceFrom']['KZT']===10000.0&&$base['priceFrom']['RUB']===round(10000/5.59,2),'base without markup');
// "default" covers every other category, so every product gets tiers.
$withDefault=club_pricing_parse(['categoryMarkupPercent'=>['default'=>20],'volumeDiscountPercent'=>['10'=>5]],5);
pricing_expect(club_prices(10000,['boxing-gloves'],$rates,$withDefault,$parents)['priceFrom']['KZT']===12000,'default markup');
pricing_expect(count(club_prices(10000,['unknown'],$rates,$withDefault,$parents)['priceTiers'])===1,'default tiers');
// Russia surcharge applies to the rounded Kazakhstan price: 25 000 × 1.1 / 5.59 = 4 919.5 → 4 920 ₽.
$ru=club_pricing_parse(['categoryMarkupPercent'=>['judo'=>25],'russiaSurchargePercent'=>10],5);
pricing_expect(club_prices(20000,['judo-gi'],$rates,$ru,$parents)['priceFrom']===['KZT'=>25000,'RUB'=>4920,'USD'=>54],'russia surcharge');
// Missing file: as before. Broken file: prices hidden, never the base.
pricing_expect(club_prices(10000,['judo-gi'],$rates,['state'=>'missing'],$parents)['priceFrom']['KZT']===10000.0,'missing file');
pricing_expect(club_prices(10000,['judo-gi'],$rates,['state'=>'broken'],$parents)['priceFrom']===null,'broken file hides prices');
// Invalid settings are rejected instead of half-applied.
foreach([['categoryMarkupPercent'=>['judo'=>'25']],['categoryMarkupPercent'=>['judo'=>-5]],['volumeDiscountPercent'=>['5'=>3]],['volumeDiscountPercent'=>['10'=>100]],['russiaSurcharge'=>5],['categoryMarkupPercent'=>[1,2]]] as $bad){
 try{$parsed=club_pricing_parse($bad,5);if(($bad['categoryMarkupPercent']??null)===[1,2])pricing_expect(!isset($parsed['markup']['judo']),'list keys');else throw new Exception('Invalid pricing accepted: '.json_encode($bad));}catch(RuntimeException $expected){}
}
// Public records lose every base field.
$applied=club_apply(['id'=>'x','categoryIds'=>['judo-gi'],'priceFromKzt'=>10000,'minOrderQuantity'=>3,'priceFrom'=>['KZT'=>10000]],10000.0,$rates);
pricing_expect(!array_key_exists('priceFromKzt',$applied)&&!array_key_exists('minOrderQuantity',$applied),'base fields stripped');

// File loading: same location and permission guards as the lead settings.
$dir=__DIR__.'/../work/pricing-test-'.bin2hex(random_bytes(6));mkdir($dir.'/public',0700,true);mkdir($dir.'/lucky-wholesale-private',0700);
$file=$dir.'/lucky-wholesale-private/pricing-settings.json';$_SERVER['DOCUMENT_ROOT']=$dir.'/public';
try{
 pricing_expect(lead_private_json('pricing-settings.json',65536)===null,'missing file is null');
 file_put_contents($file,json_encode(['categoryMarkupPercent'=>['default'=>10]]));chmod($file,0600);
 pricing_expect(club_pricing_parse(lead_private_json('pricing-settings.json',65536),5)['default']===10.0,'file read');
 if(DIRECTORY_SEPARATOR==='/'){chmod($file,0644);clearstatcache();try{lead_private_json('pricing-settings.json',65536);throw new Exception('Readable pricing file accepted');}catch(RuntimeException $expected){}}
}finally{if(is_file($file))unlink($file);rmdir($dir.'/lucky-wholesale-private');rmdir($dir.'/public');rmdir($dir);}

// Dealer leads are marked on the first line of the Telegram message.
$lead=['name'=>'','phone'=>'+77000000001','city'=>'','country'=>'RU','role'=>'dealer','interest'=>'Кимоно','quantity'=>'60','comment'=>'','page'=>'https://opt.luckysport.kz/','utm'=>[]];
$text=lead_message($lead);pricing_expect(strpos($text,"ДИЛЕР — запрос дилерской цены\nНовая оптовая заявка Lucky")===0&&strpos($text,'Клиент: Дилер (магазин / от 50 шт.)')!==false,'dealer message');
pricing_expect(strpos(lead_message(['role'=>'club']+$lead),'ДИЛЕР')===false,'regular message unchanged');
echo "PASS club prices: markup by category with inheritance and default, 100 ₸ / 10 ₽ / 1 $ rounding, volume tiers, Russia surcharge, missing/broken file, private file guards, dealer mark\n";
