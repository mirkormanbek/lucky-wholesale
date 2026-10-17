<?php
declare(strict_types=1);
require __DIR__.'/../public/warehouse/studio-domain.php';
function expect_preset($value,string $why): void {if(!$value)throw new RuntimeException($why);}
$cases=['bjj-belts'=>'belt','judo-belts'=>'belt','karate-belts'=>'belt','judo-gi'=>'gi','bjj-gi'=>'gi','karate-gi'=>'gi','sambo-gi'=>'gi','sambo-jackets'=>'gi','bjj-rashguards'=>'rashguard','combat-boxing-mma-rashguards'=>'rashguard','combat-boxing-mma-gloves'=>'boxing-gloves','kickboxing-gloves'=>'boxing-gloves','muay-thai-gloves'=>'boxing-gloves','combat-boxing-mma-mma-gloves'=>'mma-gloves','karate-gloves'=>'karate-gloves'];
foreach($cases as $category=>$expected){
 $state=['products'=>['p'=>['title'=>'Actual product','categoryId'=>$category,'status'=>'review','revision'=>1,'photos'=>['a','b']]],'photos'=>['a'=>['original'=>'front.jpg','processed'=>null],'b'=>['original'=>'palm.jpg','processed'=>null]]];
 $job=studio_reserve($state,['id'=>'p','revision'=>1,'requestId'=>'preset-test-1234567890123','mode'=>'category','confirmed'=>true,'instructions'=>'Keep original markings']);
 expect_preset(studio_category_preset($category)['id']===$expected,'Category mapping');
 $prompt=studio_prompt($job);
 expect_preset(strpos($prompt,studio_preset_prompt($expected))!==false,'Preset reached generation');
 expect_preset(strpos($prompt,'Keep original markings')!==false,'Owner wishes retained');
 expect_preset(count($job['files'])===2&&$state['products']['p']['photos']===['a','b'],'All references and gallery retained');
 if($expected==='belt')expect_preset(strpos($prompt,'PACKAGING REMOVAL')!==false,'Belt packaging rule retained');
 $white=$job;$white['options']['mode']='white';expect_preset(strpos(studio_prompt($white),'CATEGORY COMPOSITION')===false,'White-background override');
}
expect_preset(strpos(studio_preset_prompt('rashguard'),'top-only source must yield a top-only image')!==false,'Do not invent set');
expect_preset(strpos(studio_preset_prompt('gi'),'sambo jacket only')!==false,'Sambo construction');
expect_preset(strpos(studio_preset_prompt('belt'),'No advertising text')!==false,'No text overlays');
expect_preset(strpos(studio_preset_prompt('mma-gloves'),'open fingers only for actual MMA')!==false,'Different glove construction');
$job['categoryId']='football-goalkeeper-gloves';$state['products']['p']['categoryId']=$job['categoryId'];
try{studio_reserve($state,['id'=>'p','revision'=>1,'requestId'=>'unknown-test-123456789012','mode'=>'category','confirmed'=>true]);throw new RuntimeException('Unknown category accepted');}catch(DomainException $e){expect_preset($e->getCode()===400,'Unknown category rejected');}
echo "PASS category presets: mappings, prompt selection, all references, owner wishes, packaging, no invented set, white override, unknown category. No paid calls.\n";
