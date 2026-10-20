<?php
declare(strict_types=1);
require __DIR__.'/../public/warehouse/studio-domain.php';
foreach(['mma-mouthguards','combat-boxing-mma-mouthguards','karate-mouthguards','kickboxing-mouthguards','muay-thai-mouthguards'] as $id){
 if((studio_category_preset($id)['id']??'')!=='mouthguard')throw new RuntimeException('Missing mouthguard category');
 $j=['title'=>'Actual guard','categoryId'=>$id,'options'=>['mode'=>'category','view'=>'front','model'=>'man','instructions'=>'Keep blue color']];
 $p=studio_prompt($j);foreach(['MOUTHGUARD IN USE','fictional adult','Do not convert an upper-only guard','do not copy UFC','Keep blue color'] as $text)if(strpos($p,$text)===false)throw new RuntimeException('Missing '.$text);
 $j['options']['mode']='white';if(strpos(studio_prompt($j),'MOUTHGUARD IN USE')!==false)throw new RuntimeException('White mode must remain available');
}
echo "PASS five mouthguard categories, fictional adult crop, product construction/brand retained, owner wishes and white override. No paid calls.\n";
