<?php
require __DIR__.'/../public/warehouse/studio-review.php';require __DIR__.'/../public/warehouse/studio-domain.php';require __DIR__.'/studio-headguard-fit-v5-fixtures.php';
function expect_fit($v){if(!$v)throw new Exception('Fit regression');}
function fit_envelope($v){return json_encode(['status'=>'completed','output'=>[['content'=>[['type'=>'output_text','text'=>json_encode($v)]]]]]);}
expect_fit(studio_review_decode(fit_envelope(fit_profile()),false)['ready']);
expect_fit(studio_review_decode(fit_envelope(fit_review()),true)['passed']);
foreach(['structure','openings','markings','color_material','fit'] as $key)foreach(['mismatch','uncertain'] as $verdict){$r=fit_review();$r[$key]['verdict']=$verdict;expect_fit(!studio_review_decode(fit_envelope($r),true)['passed']);}
$r=fit_review();$r['structure']['source_evidence']='';expect_fit(!studio_review_decode(fit_envelope($r),true)['passed']);
$p=fit_profile();$p['parts']=[];expect_fit(!studio_review_decode(fit_envelope($p),false)['ready']);
$p=fit_profile();$p['unknowns']=['Front protector function ambiguous'];expect_fit(!studio_review_decode(fit_envelope($p),false)['ready']);
$r=fit_review();$r['fit']['extra']='unexpected';try{studio_review_decode(fit_envelope($r),true);throw new Exception('Malformed evidence accepted');}catch(RuntimeException $expected){}
expect_fit(strpos(studio_review_instruction(true,['SECRET_INVENTORY_ANCHOR']), 'SECRET_INVENTORY_ANCHOR')===false);
$job=['categoryId'=>'combat-boxing-mma-helmets','sourceIds'=>['s'],'options'=>['mode'=>'model','instructions'=>''],'sourceInventory'=>fit_profile()];expect_fit(strpos(studio_prompt($job),'continuous')!==false);
unset($job['sourceInventory']);try{studio_prompt($job);throw new Exception('No plan accepted');}catch(DomainException $expected){}
$s=['products'=>['p'=>['status'=>'review','revision'=>1,'categoryId'=>'combat-boxing-mma-helmets','photos'=>['s'],'studioResults'=>['c']]],'photos'=>['s'=>['original'=>'s.png'],'c'=>['processed'=>'c.png','studio'=>['mode'=>'model','pipelineVersion'=>'headguard-v5','integrityReview'=>['passed'=>false]]]]];
$before=$s;try{studio_decide($s,['id'=>'p','revision'=>1,'photoId'=>'c','decision'=>'append']);throw new Exception('Failed review accepted');}catch(DomainException $expected){}expect_fit($s===$before);
$s['photos']['c']['studio']['integrityReview']=fit_review();studio_decide($s,['id'=>'p','revision'=>1,'photoId'=>'c','decision'=>'append']);expect_fit($s['products']['p']['photos']===['s','c']);
echo "PASS evidence schema, contradictory verdicts, independent review, required wearing plan, accept gate\n";
