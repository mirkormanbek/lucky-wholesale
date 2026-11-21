<?php
require __DIR__.'/../public/warehouse/studio-domain.php';
require __DIR__.'/studio-headguard-fit-v5-fixtures.php';
foreach(['combat-boxing-mma-helmets','karate-helmets','kickboxing-helmets','muay-thai-helmets','mma-helmets'] as $id)foreach(['category','model','white'] as $mode){
 $job=['categoryId'=>$id,'sourceIds'=>['a'],'title'=>'test','sourceInventory'=>fit_profile(),'options'=>['mode'=>$mode,'view'=>'front','model'=>'man','instructions'=>'']];
 if(studio_headguard_portrait($job)!==($mode!=='white'))throw new Exception('Mode isolation');
 $prompt=studio_prompt($job);if($mode!=='white'&&strpos($prompt,'front-crosspiece')===false)throw new Exception('Evidence plan missing');
}
echo "PASS category and mode isolation\n";
