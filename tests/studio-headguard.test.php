<?php
require __DIR__.'/../public/warehouse/studio-domain.php';
foreach(['combat-boxing-mma-helmets','karate-helmets','kickboxing-helmets','muay-thai-helmets','mma-helmets'] as $id){
 if(studio_category_preset($id)['id']!=='headguard')throw new Exception('Missing preset');
 foreach(['category','model','white'] as $mode){
  $p=studio_prompt(['categoryId'=>$id,'title'=>'Шлем','options'=>['mode'=>$mode,'view'=>'front','model'=>'man','instructions'=>'']]);
  $has=strpos($p,'HEADGUARD CLOSE-UP ON MODEL')!==false;
  if($has!==($mode!=='white'))throw new Exception('Wrong mode');
  if($has&&strpos($p,'no captions, size labels')===false)throw new Exception('Missing caption guard');
  if($has&&strpos($p,'no torso, hands, shorts')===false)throw new Exception('Missing crop');
 }
}
if(studio_category_preset('boxing-shorts')['id']!=='boxing-kit')throw new Exception('Existing preset changed');
echo "PASS headguard framing, source construction, caption restrictions and white mode isolation\n";
