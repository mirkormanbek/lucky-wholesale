<?php
require __DIR__.'/../public/warehouse/studio-domain.php';
function pause_assert($ok){if(!$ok)throw new Exception('Headguard pause regression');}
$base=['products'=>['p'=>['title'=>'test','categoryId'=>'combat-boxing-mma-helmets','revision'=>1,'status'=>'review','photos'=>['a'],'studioResults'=>['candidate']]],'photos'=>['a'=>['original'=>'a.jpg','processed'=>null],'candidate'=>['processed'=>'candidate.png','studio'=>['mode'=>'model','pipelineVersion'=>'headguard-v4','integrityReview'=>['passed'=>true]]]]];
$input=['id'=>'p','revision'=>1,'requestId'=>'pause-control-request-1234567','confirmed'=>true,'mode'=>'model','view'=>'front','model'=>'man','instructions'=>''];
foreach(['combat-boxing-mma-helmets','karate-helmets','kickboxing-helmets','muay-thai-helmets','mma-helmets'] as $category)foreach(['category','model','ghost'] as $mode){
$s=$base;$s['products']['p']['categoryId']=$category;$before=$s;
try{studio_reserve($s,array_replace($input,['mode'=>$mode]));throw new Exception('Paid modeling accepted');}catch(DomainException $e){pause_assert($e->getCode()===409);}
pause_assert($s===$before);
}
$s=$base;$job=studio_reserve($s,array_replace($input,['mode'=>'white']));pause_assert($job['options']['mode']==='white');
$s=$base;$s['products']['p']['categoryId']='boxing-shorts';$job=studio_reserve($s,$input);pause_assert($job['options']['mode']==='model');
$s=$base;$before=$s;try{studio_decide($s,['id'=>'p','revision'=>1,'photoId'=>'candidate','decision'=>'replace']);throw new Exception('Old portrait accepted');}catch(DomainException $e){pause_assert($e->getCode()===409);}pause_assert($s===$before);
$s=$base;studio_decide($s,['id'=>'p','revision'=>1,'photoId'=>'candidate','decision'=>'discard']);pause_assert($s['products']['p']['photos']===['a']);
echo "PASS all headguard modeling blocked atomically; white and other categories retained; old modeled variants cannot be accepted but may be discarded\n";

$s=$base;$s['photos']['a']['studio']=['mode'=>'model'];$before=$s;
try{studio_reserve($s,array_replace($input,['mode'=>'white']));throw new Exception('Portrait reused as source');}catch(DomainException $e){pause_assert($e->getCode()===400);}pause_assert($s===$before);
echo "PASS previous modeled portrait cannot be recycled through white mode\n";
