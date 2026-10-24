<?php
declare(strict_types=1);
require __DIR__.'/../public/traffic-domain.php';
function verify($condition,string $message): void {if(!$condition)throw new RuntimeException($message);}
function event(string $name,string $id='',string $session='12345678-1234-1234-1234-123456789012'): array {
 return traffic_input(['event'=>$name,'id'=>$id,'session'=>$session,'source'=>'instagram','medium'=>'social','campaign'=>'sambo','device'=>'mobile']);
}
$s=['days'=>['2026-01-01'=>['sessions'=>[],'events'=>[]]]];
traffic_record($s,event('page_view'),'2026-10-24');
traffic_record($s,event('page_view'),'2026-10-24');
traffic_record($s,event('product_view','warehouse-test'),'2026-10-24');
traffic_record($s,event('cart_add','warehouse-test'),'2026-10-24');
traffic_record($s,event('request_copy'),'2026-10-24');
traffic_record($s,event('whatsapp_click'),'2026-10-24');
verify(!isset($s['days']['2026-01-01']),'Retention');
$r=traffic_report($s,7,'2026-10-24');
verify($r['visits']===1&&$r['events']['page_view']===2,'Refresh is another view, same visit');
verify($r['stages']['cart_add']===1&&$r['stages']['whatsapp_click']===1,'Distinct sessions per action');
verify($r['products']['warehouse-test']===1&&$r['sources']['instagram']===1,'Product and source attribution');
verify(count($r['days'])===7,'Zero-filled days');
traffic_record($s,event('page_view'),'2026-10-25');
verify(traffic_report($s,7,'2026-10-25')['visits']===1,'Same session across midnight dedup');
$bad=event('page_view');verify(strlen($bad['session'])===64,'Session hashed at rest');
foreach([['event'=>'search','session'=>str_repeat('a',20)],['event'=>'product_view','session'=>str_repeat('a',20),'id'=>'email@example.com']] as $input){
 try{traffic_input($input);throw new RuntimeException('Invalid event accepted');}catch(InvalidArgumentException $expected){}
}
$input=['event'=>'page_view','session'=>str_repeat('a',20),'source'=>'https://example.org/private?phone=123456789','medium'=>'name@example.org','campaign'=>'1234567890','device'=>'<script>'];
$clean=traffic_input($input);verify($clean['source']==='other'&&$clean['medium']===''&&$clean['campaign']==='','Reject URLs, emails and long numeric tags');
$safe=json_encode($s);verify(strpos($safe,'12345678-1234')===false,'No raw identifier');
echo "PASS traffic: aggregation, session/action dedup, attribution, midnight, retention, validation and privacy filtering\n";
