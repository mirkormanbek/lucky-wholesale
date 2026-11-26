<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');header('Cache-Control: no-store');header('X-Content-Type-Options: nosniff');
require_once __DIR__.'/lead-domain.php';
try{$id=lead_setting('YANDEX_METRIKA_ID');}catch(Throwable $e){$id='';}
$id=is_string($id)&&preg_match('/^[1-9][0-9]{0,11}$/D',$id)?$id:null;
$c=require __DIR__.'/site-config.php';echo json_encode(['metrikaId'=>$id,'terms'=>$c['terms']],JSON_UNESCAPED_UNICODE);
