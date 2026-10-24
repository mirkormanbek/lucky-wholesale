<?php
declare(strict_types=1);
header('Cache-Control: no-store');header('X-Content-Type-Options: nosniff');
if(($_SERVER['REQUEST_METHOD']??'')!=='POST'){http_response_code(405);exit;}
if(($_SERVER['HTTP_DNT']??'')==='1'||($_SERVER['HTTP_SEC_GPC']??'')==='1'){http_response_code(204);exit;}
$origin=parse_url($_SERVER['HTTP_ORIGIN']??'',PHP_URL_HOST);$host=explode(':',$_SERVER['HTTP_HOST']??'')[0];
if(($_SERVER['HTTP_X_REQUESTED_WITH']??'')!=='LuckyTraffic'||($_SERVER['HTTP_SEC_FETCH_SITE']??'')==='cross-site'||!$origin||strtolower($origin)!==strtolower($host)){http_response_code(403);exit;}
if(strpos($_SERVER['CONTENT_TYPE']??'','application/json')!==0){http_response_code(415);exit;}
if((int)($_SERVER['CONTENT_LENGTH']??0)>2048){http_response_code(413);exit;}
$raw=file_get_contents('php://input',false,null,0,2049);if(strlen($raw)>2048){http_response_code(413);exit;}
require __DIR__.'/traffic-domain.php';
try{$input=json_decode($raw,true,32,JSON_THROW_ON_ERROR);if(!is_array($input))throw new InvalidArgumentException('Invalid event');$e=traffic_input($input);traffic_store(function(array &$s)use($e){traffic_record($s,$e,traffic_day());});http_response_code(204);}
catch(InvalidArgumentException|JsonException $e){http_response_code(400);}
catch(OverflowException $e){http_response_code(429);}
catch(Throwable $e){error_log('Lucky traffic storage unavailable');http_response_code(503);}
