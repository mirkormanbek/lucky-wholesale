<?php
declare(strict_types=1);
// Server copy of the catalog's title-based category refinement for imported WB cards (app.js:
// additionalProductCategory, legacyRefinedProductCategories, refinedProductCategories). Club prices
// depend on the category a customer sees, so both sides must agree; tests/category-refine.test.cjs
// compares them on every catalog product. Regexes are copied verbatim from app.js.

// JavaScript regex semantics: \b only knows ASCII word characters, so Cyrillic letters never form a boundary.
function sc_re(string $js): string {
 $b='(?:(?<=[A-Za-z0-9_])(?![A-Za-z0-9_])|(?<![A-Za-z0-9_])(?=[A-Za-z0-9_]))';
 return '/'.str_replace('\\b',$b,$js).'/u';
}
function sc_t(string $js,string $text): bool {return preg_match(sc_re($js),$text)===1;}
function sc_text(array $p): string {return str_replace('ё','е',mb_strtolower((string)($p['title']??''),'UTF-8'));}

function sc_additional(string $text,array $ids): ?string {
 $within=function(string $root)use($ids):bool{foreach($ids as $id)if($id===$root||strpos($id,$root.'-')===0)return true;return false;};
 $t=fn(string $re):bool=>sc_t($re,$text);
 if($t('боксерк|boxing shoes'))return 'combat-boxing-mma-shoes';
 if($t('скакал'))return 'combat-boxing-mma-skipping-ropes';
 if($t('футзалк|обув.*футзал'))return 'football-futsal-shoes';
 if($t('вратар.*перчат|перчат.*вратар'))return 'football-goalkeeper-gloves';
 if($t('насос.*мяч|игл.*насос'))return 'other-pumps';
 if($t('жгут|борцовск.*резин|резин.*борьб'))return 'fitness-harness';
 if($t('эспандер|фитнес.*резин|резин.*фитнес'))return 'other-resistance-bands';
 if($t('коврик.*(?:тренир|йог|фитнес)'))return 'other-mats';
 if($t('шейкер|спортивн.*бутыл|бутыл.*спорт'))return 'other-bottles';
 $sport=$t('муай|тайск|muay')?'muay-thai':($t('кикбокс|kickbox')?'kickboxing':null);
 if($sport==='kickboxing'&&$t('штан|брюк|trousers|pants'))return 'kickboxing-pants';
 if($sport){if($t('шлем'))return $sport.'-helmets';if($t('кап[аыу](?:\s|$|[,.])'))return $sport.'-mouthguards';if($t('защит.*пах|ракушк'))return $sport.'-groin';}
 if($t('карат|киокуш')&&!$t('мма|mma')){
  if($t('щитк|футы'))return 'karate-shinguards';if($t('кап[аыу](?:\s|$|[,.])'))return 'karate-mouthguards';if($t('защит.*пах|ракушк'))return 'karate-groin';
 }
 $bjj=$t('bjj|бжж|джиу|jiu.?jitsu');$judo=$t('дзюдо|judo');
 if($bjj&&$t('защит.*уш|уш.*защит'))return 'bjj-earguards';
 if($bjj||$judo){if($t('наколен'))return ($bjj?'bjj':'judo').'-kneepads';if($t('тейп'))return ($bjj?'bjj':'judo').'-tape';}
 if($t('футбол')||$within('football')){
  if($t('щитк'))return 'football-shinguards';if($t('гетр'))return 'football-socks';
  if($t('форм|манишк'))return 'football-uniform';if($t('ворот|сетк'))return 'football-goals-nets';
  if($t('фишк|конус|координацион.*лестниц'))return 'football-training';
 }
 if($t('баскетбол')||$within('basketball')){
  if($t('кольц|сетк'))return 'basketball-hoops';if($t('форм'))return 'basketball-uniform';if($t('кроссов'))return 'basketball-shoes';
 }
 if($t('волейбол')||$within('volleyball')){
  if($t('наколен'))return 'volleyball-kneepads';if($t('мяч'))return 'volleyball-balls';if($t('форм'))return 'volleyball-uniform';if($t('кроссов'))return 'volleyball-shoes';
 }
 return null;
}

function sc_legacy(array $p): array {
 $ids=array_values($p['categoryIds']??[]);
 if(!preg_match('/^wb-\d+$/',(string)($p['id']??'')))return $ids;
 $text=sc_text($p);$t=fn(string $re):bool=>sc_t($re,$text);
 $additional=sc_additional($text,$ids);if($additional!==null)return [$additional];
 $bjj=$t('bjj|бжж|джиу|jiu.?jitsu');$karate=$t('карат|киокуш');$kick=$t('кикбокс|kickbox');$muay=$t('муай|муайтай|тайск|muay');
 $boxing=false;foreach($ids as $id)if(strpos($id,'combat-boxing-mma')===0)$boxing=true;if(!$boxing)$boxing=$t('бокс|мма|mma|ufc|черепаш');
 $leaf=null;$root=null;
 if($t('^(?:спортивный\s+)?пояс\b|^пояс|^belt\b')){
  if($bjj){$leaf='bjj-belts';$root='bjj';}elseif($karate){$leaf='karate-belts';$root='karate';}
 }elseif($bjj){
  $suffix=$t('рашгард|rashguard')?'rashguards':($t('шорт')?'shorts':($t('спатс|компрессион.*(?:штан|брюк|леггин)')?'spats':null));
  if($suffix){$leaf='bjj-'.$suffix;$root='bjj';}
 }elseif($kick||$muay){
  $root=$kick?'kickboxing':'muay-thai';
  $suffix=$t('бинт')?'wraps':($t('щитк|защит.*голен')?'shinguards':($t('шорт')?'shorts':($t('лап[аы]|пэд|макивар')?'pads':($t('перчат')?'gloves':($t('защит|кап[аыу]|шлем')?'protection':null)))));
  if($suffix)$leaf=$root.'-'.$suffix;
 }elseif($boxing){
  $root='combat-boxing-mma';
  $suffix=$t('черепаш|перчат.*(?:мма|mma|ufc)|(?:мма|mma).*перчат')?'mma-gloves':($t('кап[аыу](?:\s|$|[,.])|mouthguard')?'mouthguards':($t('защит.*пах|ракушк|бандаж.*пах')?'groin':($t('макивар|тай.?пэд|тайпэд')?'pads':($t('мешок|мешки|груш')?'bags':($t('рашгард|rashguard')?'rashguards':($t('шорт')?'shorts':null))))));
  if($suffix)$leaf=$root.'-'.$suffix;
 }
 if(!$leaf)return $ids;
 $related=fn(string $id):bool=>$id===$root||strpos($id,$root.'-')===0||strpos($id,'combat-boxing-mma')===0||strpos($id,'bjj-')===0||$id==='sports-unclassified';
 return array_values(array_unique(array_merge(array_values(array_filter($ids,fn($id)=>!$related($id))),[$leaf])));
}

function storefront_refined_categories(array $p): array {
 $ids=sc_legacy($p);
 if(!preg_match('/^wb-\d+$/',(string)($p['id']??'')))return $ids;
 $text=sc_text($p);$t=fn(string $re):bool=>sc_t($re,$text);
 $leaf=null;
 if($t('самбовк'))$leaf='sambo-shoes';
 elseif($t('самбо')){$suffix=$t('комплект|набор|кимоно|форма|куртк.*шорт|шорт.*куртк')?'uniforms':($t('пояс')?'belts':($t('шорт')?'shorts':($t('куртк')?'jackets':($t('защит')?'protection':null))));if($suffix)$leaf='sambo-'.$suffix;}
 elseif($t('борцовк'))$leaf='wrestling-shoes';
 elseif($t('борьб|борцов')){$suffix=$t('трико')?'singlets':($t('наколен')?'kneepads':($t('защит.*уш')?'earguards':null));if($suffix)$leaf='wrestling-'.$suffix;}
 elseif($t('мма|mma|ufc|черепаш')){
  $suffix=$t('перчат|черепаш')?($t('спарринг')?'mma-sparring-gloves':'combat-boxing-mma-mma-gloves'):($t('рашгард')?'combat-boxing-mma-rashguards':($t('шорт')?'combat-boxing-mma-shorts':($t('спатс|компрессион.*(?:штан|брюк|леггин)')?'mma-spats':($t('щитк|защит.*голен')?'mma-shinguards':($t('кап[аыу](?:\s|$|[,.])')?'mma-mouthguards':($t('защит.*пах|ракушк')?'mma-groin':($t('шлем')?'mma-helmets':null)))))));
  if($suffix)$leaf=$suffix;
 }elseif($t('бокс')&&!$t('кикбокс')&&$t('шорт|форм'))$leaf='boxing-shorts';
 if(!$leaf)return $ids;
 return array_values(array_unique(array_merge(array_values(array_filter($ids,fn($id)=>strpos($id,'combat-boxing-mma')!==0&&strpos($id,'mma-')!==0&&strpos($id,'sambo-')!==0&&strpos($id,'wrestling-')!==0&&$id!=='sports-unclassified')),[$leaf])));
}
