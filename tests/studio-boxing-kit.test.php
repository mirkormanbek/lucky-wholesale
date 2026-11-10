<?php
declare(strict_types=1);
require __DIR__.'/../public/warehouse/studio-domain.php';
function check_boxing($ok){if(!$ok)throw new RuntimeException('Unexpected boxing kit prompt');}
check_boxing(studio_category_preset('boxing-shorts')['id']==='boxing-kit');
foreach(['category','white','ghost','model'] as $mode){
 $p=studio_prompt(['categoryId'=>'boxing-shorts','title'=>'Форма для бокса','options'=>['mode'=>$mode,'view'=>'front','model'=>'man','instructions'=>'']]);
 foreach(['exactly those two pieces','No jacket, sleeves, zipper','shorts alone, show shorts alone'] as $rule)check_boxing(strpos($p,$rule)!==false);
 check_boxing(strpos($p,'GLOVE PAIR')===false);
 check_boxing((strpos($p,'CATEGORY COMPOSITION — BOXING KIT')!==false)===($mode==='category'));
}
check_boxing(studio_preset_prompt('')==='');
check_boxing(strpos(studio_preset_prompt('boxing-gloves'),'GLOVE PAIR')!==false);
check_boxing(studio_category_preset('sambo-uniforms')['id']==='sambo-set');
echo "PASS Boxing kit inventory, short-only inputs, all modes, and preset isolation\n";
