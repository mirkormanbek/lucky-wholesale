<?php
require __DIR__.'/../public/warehouse/studio-domain.php';
$p=studio_headguard_prompt(['sourceIds'=>['a'],'options'=>['instructions'=>'']]);
foreach(['Do not assume a named helmet type','only where present','rigid face guard stands away','Missing cheeks, chin sections, bars, visors or straps must remain absent','Focused intense sporting gaze'] as $text)if(strpos($p,$text)===false)throw new Exception('Missing universal construction rule');
if(strpos($p,'Venum')!==false)throw new Exception('Brand-specific fit');
echo "PASS source-driven geometry, rigid clearance and no invented components\n";
