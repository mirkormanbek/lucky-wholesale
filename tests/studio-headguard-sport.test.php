<?php
require __DIR__.'/../public/warehouse/studio-domain.php';
$p=studio_headguard_prompt(['sourceIds'=>['a'],'options'=>['instructions'=>'']]);
foreach(['Focused intense sporting gaze','No shout','directional sports lighting','FIT REFERENCE','No torso'] as $text)if(strpos($p,$text)===false)throw new Exception('Missing portrait rule');
echo "PASS headguard v2 roles and sporting presentation\n";
