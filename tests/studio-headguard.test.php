<?php
require __DIR__.'/../public/warehouse/studio-domain.php';
foreach(['combat-boxing-mma-helmets','karate-helmets','kickboxing-helmets','muay-thai-helmets','mma-helmets'] as $id){
 foreach(['category','model','white'] as $mode){
 $p=studio_prompt(['categoryId'=>$id,'title'=>'Шлем','sourceIds'=>['a'],'options'=>['mode'=>$mode,'view'=>'front','model'=>'man','instructions'=>'']]);
 if((strpos($p,'PIPELINE v2')!==false)!==($mode!=='white'))throw new Exception('Wrong mode');
 }
}
echo "PASS five headguard categories and mode isolation\n";
