<?php
require __DIR__.'/../public/warehouse/studio-domain.php';
function check_set($ok){if(!$ok)throw new Exception('Set inventory regression');}
foreach(['sambo-jackets','sambo-uniforms','karate-gi'] as $category){
$p=studio_prompt(['categoryId'=>$category,'title'=>'Форма самбо','options'=>['mode'=>'category','view'=>'front','model'=>'man','notes'=>'']]);
check_set(strpos($p,'Preserve every evidenced set component')!==false);
check_set(strpos($p,'NOT an outfit to assemble')===false);
}
$p=studio_preset_prompt('gi');
check_set(strpos($p,'MUST contain that exact jacket AND those exact shorts')!==false);
check_set(strpos($p,'only if no shorts or trousers are visible')!==false);
echo "PASS source set inventory and GI shorts preservation\n";
