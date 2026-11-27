<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');header('Cache-Control: no-store');header('X-Content-Type-Options: nosniff');
require_once __DIR__.'/lead-domain.php';
$c=require __DIR__.'/site-config.php';
try{$id=lead_setting('YANDEX_METRIKA_ID');}catch(Throwable $e){$id='';}
if($id==='')$id=(string)($c['metrikaId']??'');
$id=is_string($id)&&preg_match('/^[1-9][0-9]{0,11}$/D',$id)?$id:null;
echo json_encode(['metrikaId'=>$id,'terms'=>$c['terms']],JSON_UNESCAPED_UNICODE);
