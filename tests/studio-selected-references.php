<?php
declare(strict_types=1);
require __DIR__.'/../public/warehouse/studio-domain.php';
function refs_fixture(){return ['products'=>['p'=>['title'=>'Actual item','categoryId'=>'judo-gi','status'=>'review','revision'=>1,'photos'=>['a','b']]],'photos'=>['a'=>['original'=>'a.jpg','processed'=>null],'b'=>['original'=>null,'processed'=>'b.png'],'foreign'=>['original'=>'secret.jpg','processed'=>null]]];}
$input=['id'=>'p','revision'=>1,'mode'=>'white','confirmed'=>true,'requestId'=>'selected-refs-123456789012'];
$s=refs_fixture();$j=studio_reserve($s,$input+['sourceIds'=>['b']]);if($j['files']!==['b.png']||$j['sourceIds']!==['b']||$s['products']['p']['photos']!==['a','b'])throw new RuntimeException('Only selected file, no gallery change');
$s=refs_fixture();$j=studio_reserve($s,$input+['sourceIds'=>['b','a']]);if($j['files']!==['b.png','a.jpg'])throw new RuntimeException('Primary reference order');
foreach([[],['a','a'],['foreign'],['missing'],null,'a',[[1]]] as $bad){$s=refs_fixture();try{studio_reserve($s,$input+['sourceIds'=>$bad]);throw new RuntimeException('Bad references accepted');}catch(DomainException $e){if($s!==refs_fixture())throw new RuntimeException('Failed validation mutated state');}}
$s=refs_fixture();$j=studio_reserve($s,$input);if($j['sourceIds']!==['a','b'])throw new RuntimeException('Legacy client defaults');
echo "PASS selected refs: subset only, primary order, gallery retained, foreign/missing/duplicate/empty/malformed rejected atomically, legacy default. No paid calls.\n";
