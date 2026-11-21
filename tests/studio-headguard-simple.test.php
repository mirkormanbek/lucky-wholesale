<?php
if(!defined('WAREHOUSE_OWNER'))define('WAREHOUSE_OWNER','owner-test');
require_once __DIR__.'/../public/warehouse/studio-domain.php';
function simple_assert($v){if(!$v)throw new Exception('Simple headguard regression');}
$base=['products'=>['p'=>['title'=>'test','categoryId'=>'combat-boxing-mma-helmets','revision'=>1,'status'=>'review','photos'=>['a'],'studioResults'=>[]]],'photos'=>['a'=>['original'=>'a.jpg','processed'=>null]]];
$input=['id'=>'p','revision'=>1,'requestId'=>'simple-control-request-1234567','confirmed'=>true,'mode'=>'model','view'=>'front','model'=>'man','instructions'=>''];
foreach(['combat-boxing-mma-helmets','karate-helmets','kickboxing-helmets','muay-thai-helmets','mma-helmets'] as $category)foreach(['category','model','white'] as $mode){
 $s=$base;$s['products']['p']['categoryId']=$category;$job=studio_reserve($s,array_replace($input,['mode'=>$mode]));
 simple_assert($job['options']['mode']===$mode);simple_assert($job['fitReferenceUsed']===false);
 if($mode!=='white')simple_assert(trim(studio_prompt($job))===trim(file_get_contents(__DIR__.'/../docs/HEADGUARD-PROMPT.txt')));
}
$s=$base;$job=studio_reserve($s,$input);studio_store_result($s,$job,'candidate','candidate.png');
simple_assert($s['products']['p']['photos']===['a']);simple_assert(!$s['photos']['candidate']['approved']);simple_assert($s['photos']['candidate']['studio']['manualReviewRequired']);
studio_decide($s,['id'=>'p','revision'=>2,'photoId'=>'candidate','decision'=>'append']);simple_assert($s['products']['p']['photos']===['a','candidate']);simple_assert($s['products']['p']['status']==='review');
echo "PASS five categories, three modes, approved prompt, no reference dependency, separate result and manual acceptance\n";
