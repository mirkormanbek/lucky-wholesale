<?php
require __DIR__.'/../public/lead-domain.php';
function lead_assert($ok){if(!$ok)throw new Exception('Lead regression');}
$input=['phone'=>'+7 (747) 780-61-82','country'=>'KZ','name'=>'Тестовый клиент','city'=>'Алматы','role'=>'coach','interest'=>'Кимоно','quantity'=>'20','comment'=>'Тест','consent'=>true,'page'=>'http://localhost/product/wb-1','utm'=>['utm_source'=>'test'],'requestId'=>'lead-domain-test-1234567890'];
$p=lead_input($input);lead_assert($p['phone']==='+77477806182');lead_assert(lead_phone('8 999 123 45 67','RU')==='+79991234567');lead_assert(lead_phone('+44 20 7946 0958','OTHER')==='+442079460958');
foreach([['phone'=>'123'],['phone'=>'+7hello7477806182'],['consent'=>false],['country'=>'wrong'],['role'=>'wrong'],['quantity'=>'-1'],['page'=>'javascript:alert(1)'],['utm'=>['utm_source'=>[]]]] as $change){try{lead_input(array_replace($input,$change));throw new Exception('Bad input accepted');}catch(InvalidArgumentException $expected){}}
$s=['attempts'=>[],'requests'=>[]];for($i=0;$i<5;$i++)lead_assert(lead_reserve($s,'ip','request'.$i,time())==='reserved');$before=$s;try{lead_reserve($s,'ip','sixth',time());throw new Exception('Rate limit failed');}catch(OverflowException $expected){}lead_assert($before===$s);
$s['requests']['request0']['status']='delivered';lead_assert(lead_reserve($s,'ip','request0',time())==='delivered');lead_assert(count($s['attempts']['ip'])===5);
$message=lead_message($p);foreach(['Тестовый клиент','+77477806182','Алматы','Казахстан','Тренер','Кимоно','20','Тест','Asia/Almaty','utm_source: test','http://localhost/product/wb-1'] as $text)lead_assert(strpos($message,$text)!==false);lead_assert(lead_almaty_time()->getOffset()===18000);
echo "PASS field/phone/consent validation, 5-per-10-minute reservation, idempotency, complete Telegram message and Almaty UTC+5\n";
