<?php
require __DIR__.'/../public/warehouse/studio-domain.php';
function ok($v){if(!$v)throw new Exception('Headguard v2 regression');}
$job=['categoryId'=>'combat-boxing-mma-helmets','title'=>'test','sourceIds'=>['a'],'options'=>['mode'=>'model','view'=>'front','model'=>'man','instructions'=>'']];
$p=studio_prompt($job);ok(strpos($p,'HEADGUARD PORTRAIT PIPELINE v2')===0);ok(strpos($p,'FINAL image is a FIT REFERENCE')!==false);ok(strpos($p,'Create ONE photorealistic')===false);
$state=['products'=>['product-test'=>['title'=>'test','categoryId'=>$job['categoryId'],'revision'=>1,'status'=>'review','photos'=>['a']]],'photos'=>['a'=>['original'=>'a.jpg','processed'=>null]]];
$input=['id'=>'product-test','revision'=>1,'requestId'=>'request-headguard-test-123456789','mode'=>'model','view'=>'front','model'=>'man','instructions'=>'','confirmed'=>true,'sourceIds'=>['a']];
$before=$state;
try{studio_reserve($state,$input);throw new Exception('Missing reference accepted');}catch(DomainException $e){ok($e->getCode()===400);}
ok($state===$before);
$input['fitReferenceValidated']=true;$state['photos']['a']['original']=null;$state['photos']['a']['processed']='ai.png';$before=$state;
try{studio_reserve($state,$input);throw new Exception('AI source accepted');}catch(DomainException $e){ok($e->getCode()===400);}ok($state===$before);
$state['photos']['a']['original']='a.jpg';$reserved=studio_reserve($state,$input);ok($reserved['files']===['a.jpg']);
$job['options']['mode']='white';ok(strpos(studio_prompt($job),'PIPELINE v2')===false);
echo "PASS reference required, AI fallback blocked, original selected, isolated prompt and unchanged white mode\n";
