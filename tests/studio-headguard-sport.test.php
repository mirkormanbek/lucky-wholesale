<?php
require __DIR__.'/../public/warehouse/studio-domain.php';
$p=studio_preset_prompt('headguard');
foreach(['PHYSICAL FIT BEFORE EXPRESSION','correct physical fit takes precedence','Neutral light-gray studio background','actual product color accurate','no captions','ONLY if that exact component'] as $rule)if(strpos($p,$rule)===false)throw new Exception('Missing headguard rule: '.$rule);
foreach(['category','model'] as $mode){
 $p=studio_prompt(['categoryId'=>'combat-boxing-mma-helmets','title'=>'Шлем','options'=>['mode'=>$mode,'view'=>'front','model'=>'man','instructions'=>'']]);
 if(strpos($p,'PHYSICAL FIT BEFORE EXPRESSION')===false)throw new Exception('Missing sporty portrait');
}
$p=studio_prompt(['categoryId'=>'combat-boxing-mma-helmets','title'=>'Шлем','options'=>['mode'=>'white','view'=>'front','model'=>'man','instructions'=>'']]);
if(strpos($p,'PHYSICAL FIT BEFORE EXPRESSION')!==false)throw new Exception('White mode changed');
echo "PASS sporting headguard portrait, construction rules and mode isolation\n";
