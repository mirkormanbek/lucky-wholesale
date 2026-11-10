<?php
declare(strict_types=1);
require __DIR__.'/../public/warehouse/studio-domain.php';
$cases=[
 ['key',0,0,null,'key'],['storage',0,0,null,'storage'],
 ['provider',0,28,null,'timeout'],['provider',0,7,null,'connection'],
 ['provider',401,0,null,'authorization'],['provider',403,0,null,'model_access'],
 ['provider',429,0,'insufficient_quota','quota'],['provider',429,0,'rate_limit_exceeded','rate_limit'],
 ['provider',400,0,'moderation_blocked','moderation'],['provider',400,0,['raw'=>'secret'],'provider_input'],
 ['provider',503,0,null,'provider_unavailable'],['decode',200,0,null,'decode'],['save',200,0,null,'save'],
];
foreach($cases as [$stage,$status,$curl,$raw,$expected]){
 $result=studio_failure($stage,$status,$curl,$raw);
 if($result['reason']!==$expected||!$result['message']||strpos($result['message'],'secret')!==false)throw new RuntimeException('Unexpected diagnostic: '.$expected);
}
echo "PASS Studio diagnostics: preflight, timeout, authorization, quota, rate limit, input, moderation, decode and save\n";
