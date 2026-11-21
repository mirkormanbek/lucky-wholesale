<?php
require __DIR__.'/../public/warehouse/studio-review.php';
function check_review($v){if(!$v)throw new Exception('Review regression');}
function envelope($r){return json_encode(['status'=>'completed','output'=>[['content'=>[['type'=>'output_text','text'=>json_encode($r)]]]]]);}
$r=studio_review_decode(envelope(['passed'=>true,'issues'=>['added_structure']]),true);check_review($r['passed']===false);
$r=studio_review_decode(envelope(['ready'=>true,'construction'=>'open','visible_parts'=>['shell'],'absent_parts'=>['cage'],'unknowns'=>['back hidden']]),false);check_review($r['ready']===false);
foreach([['status'=>'incomplete'],['status'=>'completed','output'=>[['content'=>[['type'=>'refusal']]]]]] as $bad){try{studio_review_decode(json_encode($bad),true);throw new Exception('Unsafe output accepted');}catch(RuntimeException|JsonException $expected){}}
try{studio_review_decode(envelope(['passed'=>true,'issues'=>['invented_code']]),true);throw new Exception('Unknown issue accepted');}catch(RuntimeException $expected){}
$tmp=tempnam(sys_get_temp_dir(),'review-fixture');file_put_contents($tmp,str_repeat('a',49152).'bc');$s=fopen('php://temp','w+b');
studio_review_request($s,[['path'=>$tmp,'mime'=>'image/png']],false);$body=json_decode(stream_get_contents($s),true,512,JSON_THROW_ON_ERROR);
check_review($body['store']===false);check_review($body['text']['format']['strict']===true);
$encoded=$body['input'][0]['content'][1]['image_url'];check_review(base64_decode(explode(',',$encoded,2)[1],true)===file_get_contents($tmp));
fclose($s);unlink($tmp);echo "PASS review fail-closed validation and streaming base64 request\n";

require __DIR__.'/../public/warehouse/studio-domain.php';
$s=['products'=>['p'=>['status'=>'review','revision'=>1,'photos'=>['original'],'studioResults'=>['candidate']]],'photos'=>['candidate'=>['processed'=>'candidate.png','studio'=>['pipelineVersion'=>'headguard-v4','integrityReview'=>['passed'=>false]]]]];
$before=$s;try{studio_decide($s,['id'=>'p','photoId'=>'candidate','revision'=>1,'decision'=>'replace']);throw new Exception('Rejected candidate accepted');}catch(DomainException $expected){}check_review($before===$s);echo "PASS rejected candidate cannot replace originals\n";
