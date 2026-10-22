<?php
require __DIR__.'/../public/warehouse/studio-domain.php';
foreach(['sambo-jackets','sambo-uniforms','bjj-gi'] as $category) {
$p=studio_prompt(['categoryId'=>$category,'title'=>'Товар','options'=>['mode'=>'category','view'=>'front','model'=>'man','notes'=>'']]);
foreach(['IDENTITY AND MARKING FIDELITY','original fabric panel','never become lettering on the leg hem','retain the photographed pose and viewing angle'] as $rule)if(strpos($p,$rule)===false)throw new Exception('Missing marking fidelity rule: '.$category);
}
echo "PASS marking fidelity for uniform categories\n";
