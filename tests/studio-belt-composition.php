<?php
declare(strict_types=1);
require __DIR__.'/../public/warehouse/studio-domain.php';
foreach(['bjj-belts','judo-belts','karate-belts'] as $category){
 $j=['categoryId'=>$category,'title'=>'White belt','options'=>['mode'=>'category','view'=>'front','model'=>'man','instructions'=>'']];
 $p=studio_prompt($j);
 if(strpos($p,'CATEGORY COMPOSITION — BELT CLOSE-UP: MANDATORY RE-STAGING')!==0)throw new RuntimeException('Belt task must come first');
 foreach(['A folded belt standing alone on white is NOT an acceptable result','even when no gi is in the source','PACKAGING REMOVAL'] as $required)if(strpos($p,$required)===false)throw new RuntimeException('Missing '.$required);
 $j['options']['mode']='white';if(strpos(studio_prompt($j),'MANDATORY RE-STAGING')!==false)throw new RuntimeException('Do not force pose in white mode');
}
echo "PASS belt composition priority, required prop, unfolded pose and manual white override. No paid calls.\n";
