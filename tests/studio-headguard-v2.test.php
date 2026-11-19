<?php
require __DIR__.'/../public/warehouse/studio-domain.php';
function check_universal($v){if(!$v)throw new Exception('Universal headguard regression');}
$state=['products'=>['product-test'=>['title'=>'test','categoryId'=>'combat-boxing-mma-helmets','revision'=>1,'status'=>'review','photos'=>['a']]],'photos'=>['a'=>['original'=>'a.jpg','processed'=>null]]];
$input=['id'=>'product-test','revision'=>1,'requestId'=>'headguard-universal-test-123456','mode'=>'model','view'=>'front','model'=>'man','instructions'=>'','confirmed'=>true,'sourceIds'=>['a']];
$job=studio_reserve($state,$input);check_universal($job['fitReferenceUsed']===false);
$p=studio_prompt($job);check_universal(strpos($p,'No external helmet is a construction template')!==false);check_universal(strpos($p,'SOURCE-DRIVEN PORTRAIT v3')!==false);
$job['fitReferenceUsed']=true;check_universal(strpos(studio_prompt($job),'Image 2 is an OPTIONAL FIT REFERENCE')!==false);
$state['products']['product-test']['studioRequests']=[];$state['photos']['a']['original']=null;$state['photos']['a']['processed']='ai.png';$before=$state;
try{studio_reserve($state,$input);throw new Exception('AI source accepted');}catch(DomainException $e){check_universal($e->getCode()===400);}check_universal($before===$state);
echo "PASS universal construction, optional reference, original-only inputs and atomic rejection\n";
