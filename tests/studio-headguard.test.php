<?php
require __DIR__.'/../public/warehouse/studio-domain.php';
foreach(['combat-boxing-mma-helmets','karate-helmets','kickboxing-helmets','muay-thai-helmets','mma-helmets'] as $id)foreach(['category','model','white'] as $mode){
$p=studio_prompt(['categoryId'=>$id,'sourceIds'=>['a'],'title'=>'test','options'=>['mode'=>$mode,'view'=>'front','model'=>'man','instructions'=>'']]);
if((strpos($p,'SOURCE-DRIVEN PORTRAIT v3')!==false)!==($mode!=='white'))throw new Exception('Mode isolation');
}
echo "PASS category and mode isolation\n";
