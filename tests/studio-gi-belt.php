<?php
declare(strict_types=1);
require __DIR__.'/../public/warehouse/studio-domain.php';
foreach(['judo-gi','bjj-gi','karate-gi','sambo-jackets'] as $id){
 $j=['title'=>'Actual uniform','categoryId'=>$id,'options'=>['mode'=>'category','view'=>'front','model'=>'man','instructions'=>'']];
 $p=studio_prompt($j);
 foreach(['INCLUDED BELT','selected source images','tied in a natural flat knot','If no separate belt is visible','Thin side ties sewn into a karate jacket'] as $rule)if(strpos($p,$rule)===false)throw new RuntimeException('Missing '.$rule);
 $j['options']['mode']='white';if(strpos(studio_prompt($j),'INCLUDED BELT')!==false)throw new RuntimeException('Keep white-background mode');
}
echo "PASS included belt rule for judo/BJJ/karate/sambo, selected-source evidence, jacket-tie exclusion and white override. No paid calls.\n";
