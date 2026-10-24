<?php
declare(strict_types=1);
function traffic_day(): string { return (new DateTimeImmutable('now',new DateTimeZone('Asia/Qyzylorda')))->format('Y-m-d'); }
function traffic_input(array $v): array {
 $events=['page_view','category_view','type_view','product_view','cart_add','cart_remove','request_open','request_copy','whatsapp_click'];
 if(!in_array($v['event']??null,$events,true)||!is_string($v['session']??null)||!preg_match('/^[a-zA-Z0-9-]{20,64}$/D',$v['session']))throw new InvalidArgumentException('Invalid event');
 $id=$v['id']??'';if(!is_string($id)||!preg_match('/^[a-zA-Z0-9_-]{0,100}$/D',$id))throw new InvalidArgumentException('Invalid item');
 if(in_array($v['event'],['category_view','type_view','product_view','cart_add','cart_remove'],true)&&$id==='')throw new InvalidArgumentException('Missing item');
 $source=$v['source']??'direct';if(!is_string($source)||!preg_match('/^[\p{L}\p{N}_.-]{1,100}$/uD',$source)||preg_match('/[0-9]{7,}/',$source))$source='other';
 $tags=[];foreach(['medium','campaign'] as $k){$x=$v[$k]??'';$tags[$k]=is_string($x)&&preg_match('/^[\p{L}\p{N}_.-]{1,64}$/uD',$x)&&!preg_match('/[0-9]{7,}/',$x)?$x:'';}
 return ['event'=>$v['event'],'id'=>$id,'session'=>hash('sha256',$v['session']),'source'=>$source,'device'=>in_array($v['device']??null,['mobile','tablet','desktop'],true)?$v['device']:'desktop']+$tags;
}
function traffic_increment(array &$map,string $key): void { if(!isset($map[$key])&&count($map)>=500)$key='other';$map[$key]=($map[$key]??0)+1; }
function traffic_record(array &$state,array $e,string $day): void {
 $cutoff=(new DateTimeImmutable($day))->modify('-89 days')->format('Y-m-d');
 foreach(array_keys($state['days']??[]) as $date)if($date<$cutoff)unset($state['days'][$date]);
 if(empty($state['startedAt']))$state['startedAt']=$day;
 if(!isset($state['days'][$day]))$state['days'][$day]=['sessions'=>[],'events'=>[],'products'=>[],'categories'=>[],'types'=>[]];
 $d=&$state['days'][$day];$sid=$e['session'];
 if((!isset($d['sessions'][$sid])&&count($d['sessions'])>=20000)||array_sum($d['events'])>=200000)throw new OverflowException('Daily capacity');
 if(!isset($d['sessions'][$sid]))$d['sessions'][$sid]=['source'=>$e['source'],'medium'=>$e['medium'],'campaign'=>$e['campaign'],'device'=>$e['device'],'events'=>[],'count'=>0];
 $s=&$d['sessions'][$sid];if($s['count']>=500)throw new OverflowException('Session capacity');
 $s['count']++;$s['events'][$e['event']]=true;traffic_increment($d['events'],$e['event']);
 $dimensions=['product_view'=>'products','category_view'=>'categories','type_view'=>'types'];if(isset($dimensions[$e['event']]))traffic_increment($d[$dimensions[$e['event']]],$e['id']);
}
function traffic_report(array $state,int $range,string $today): array {
 $start=(new DateTimeImmutable($today))->modify('-'.($range-1).' days');$days=[];$sessions=[];$products=[];$categories=[];$types=[];$events=[];
 for($i=0;$i<$range;$i++){
  $date=$start->modify('+'.$i.' days')->format('Y-m-d');$d=$state['days'][$date]??[];$days[]=['date'=>$date,'visits'=>count($d['sessions']??[]),'views'=>$d['events']['page_view']??0];
  foreach($d['sessions']??[] as $id=>$s){if(!isset($sessions[$id]))$sessions[$id]=$s;else $sessions[$id]['events']+=$s['events'];}
  foreach(['products','categories','types','events'] as $map)foreach($d[$map]??[] as $k=>$n)${$map}[$k]=(${$map}[$k]??0)+$n;
 }
 $sources=[];$devices=[];$campaigns=[];$stages=['product_view'=>0,'cart_add'=>0,'request_open'=>0,'request_copy'=>0,'whatsapp_click'=>0];
 foreach($sessions as $s){traffic_increment($sources,$s['source']);traffic_increment($devices,$s['device']);if($s['campaign']!=='')traffic_increment($campaigns,$s['source'].' / '.$s['medium'].' / '.$s['campaign']);foreach($stages as $event=>$n)if(isset($s['events'][$event]))$stages[$event]++;}
 foreach(['products','categories','types','events','sources','devices','campaigns'] as $map)arsort(${$map});
 return ['startedAt'=>$state['startedAt']??null,'today'=>$today,'range'=>$range,'visits'=>count($sessions),'events'=>$events,'stages'=>$stages,'sources'=>$sources,'devices'=>$devices,'campaigns'=>$campaigns,'products'=>array_slice($products,0,20,true),'categories'=>array_slice($categories,0,20,true),'types'=>$types,'days'=>$days];
}
function traffic_store(callable $callback) {
 require_once __DIR__.'/warehouse/storage.php';
 $dir=warehouse_private();$lock=fopen($dir.'/traffic.lock','c+');if(!$lock||!flock($lock,LOCK_EX))throw new RuntimeException('Storage unavailable');
 try{
  $file=$dir.'/traffic-state.json';$state=is_file($file)?json_decode((string)file_get_contents($file),true,512,JSON_THROW_ON_ERROR):['days'=>[]];if(!is_array($state))throw new RuntimeException('Invalid storage');
  $before=$state;$cutoff=(new DateTimeImmutable(traffic_day()))->modify('-89 days')->format('Y-m-d');foreach(array_keys($state['days']??[]) as $day)if($day<$cutoff)unset($state['days'][$day]);$result=$callback($state);
  if($state!==$before){$json=json_encode($state,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);$tmp=tempnam($dir,'traffic-');if(!$tmp)throw new RuntimeException('Storage unavailable');try{if(file_put_contents($tmp,$json)!==strlen($json)||!rename($tmp,$file))throw new RuntimeException('Storage unavailable');@chmod($file,0600);}finally{if(is_file($tmp))@unlink($tmp);}}
  return $result;
 }finally{flock($lock,LOCK_UN);fclose($lock);}
}
