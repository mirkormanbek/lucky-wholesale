<?php
declare(strict_types=1);
require __DIR__.'/../public/warehouse/studio-domain.php';
function expect_belt($ok, string $message): void { if (!$ok) throw new RuntimeException($message); }
foreach (['bjj-belts','judo-belts','karate-belts'] as $category) {
 foreach (['white','ghost','model'] as $mode) {
  $s=['products'=>['belt'=>['id'=>'belt','title'=>'Yellow belt','categoryId'=>$category,'owner'=>'manager','status'=>'review','photos'=>['a'],'revision'=>1]],'photos'=>['a'=>['original'=>'a.jpg','processed'=>null]]];
  $job=studio_reserve($s,['id'=>'belt','revision'=>1,'requestId'=>'belt-test-123456789012345','mode'=>$mode,'confirmed'=>true,'instructions'=>'Show tied on a neutral gi']);
  expect_belt($job['categoryId']===$category,'Server category must reach prompt');
  $prompt=studio_prompt($job);
  foreach (['PACKAGING REMOVAL','white paper or plastic bands','Never identify packaging by white color alone','sewn-on brand patches','genuine sewn white stripes','Show tied on a neutral gi'] as $rule) expect_belt(strpos($prompt,$rule)!==false,'Missing rule: '.$rule);
  expect_belt($s['products']['belt']['photos']===['a'],'Prompt preparation must preserve gallery');
 }
}
foreach (['judo-gi','bjj-tape','other-resistance-bands','kickboxing-pants',''] as $other) expect_belt(studio_category_rules($other)==='','Belt rules must not remove parts of unrelated products');
echo "PASS belt packaging rules: three categories, three modes, saved category, genuine details and owner wishes preserved, unrelated products excluded. No paid calls.\n";
