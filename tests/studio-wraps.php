<?php
declare(strict_types=1);
require __DIR__.'/../public/warehouse/studio-domain.php';
foreach(['combat-boxing-mma-wraps','mma-wraps','kickboxing-wraps','muay-thai-wraps'] as $id){
 if((studio_category_preset($id)['id']??'')!=='wraps')throw new RuntimeException('Missing wrap category');
 $j=['title'=>'Actual wraps','categoryId'=>$id,'options'=>['mode'=>'category','view'=>'front','model'=>'man','instructions'=>'Keep blue color']];
 $p=studio_prompt($j);foreach(['HAND WRAPS','short end gently unrolled','only one wrap is evidenced','do not copy Hayabusa','Keep blue color'] as $text)if(strpos($p,$text)===false)throw new RuntimeException('Missing '.$text);
 $j['options']['mode']='white';if(strpos(studio_prompt($j),'HAND WRAPS')!==false)throw new RuntimeException('White mode must remain available');
}
if(studio_category_preset('bjj-tape'))throw new RuntimeException('Do not treat tape as hand wraps');
echo "PASS four wrap presets, composition, source quantity/identity, owner wishes, white override, tape excluded. No paid calls.\n";
