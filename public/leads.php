<?php
declare(strict_types=1);
require __DIR__.'/lead-domain.php';
header('Content-Type: application/json; charset=utf-8');header('Cache-Control: no-store');header('X-Content-Type-Options: nosniff');
function lead_reply(array $data,int $status=200): void {http_response_code($status);echo json_encode($data,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);exit;}
if(($_SERVER['REQUEST_METHOD']??'')!=='POST')lead_reply(['error'=>'Нужен POST-запрос.'],405);
$origin=parse_url($_SERVER['HTTP_ORIGIN']??'');$host=strtolower($_SERVER['HTTP_HOST']??'');$originHost=strtolower(($origin['host']??'').(isset($origin['port'])?':'.$origin['port']:''));
if(($_SERVER['HTTP_X_REQUESTED_WITH']??'')!=='LuckyWholesale'||($_SERVER['HTTP_SEC_FETCH_SITE']??'')==='cross-site'||!$originHost||$originHost!==$host)lead_reply(['error'=>'Отправьте заявку с нашего сайта.'],403);
if(strpos($_SERVER['CONTENT_TYPE']??'','application/json')!==0)lead_reply(['error'=>'Неверный формат заявки.'],415);
if((int)($_SERVER['CONTENT_LENGTH']??0)>8192)lead_reply(['error'=>'Заявка слишком большая.'],413);
$raw=(string)file_get_contents('php://input',false,null,0,8193);if(strlen($raw)>8192)lead_reply(['error'=>'Заявка слишком большая.'],413);
$key=null;$reference=bin2hex(random_bytes(6));
try{
 $input=json_decode($raw,true,32,JSON_THROW_ON_ERROR);if(!is_array($input))throw new InvalidArgumentException('Проверьте данные заявки.');
 if(!empty($input['website']))lead_reply(['ok'=>true]);
 $p=lead_input($input);$page=parse_url($p['page']);$pageHost=strtolower(($page['host']??'').(isset($page['port'])?':'.$page['port']:''));if($pageHost!==$host)throw new InvalidArgumentException('Неверная страница заявки.');
 $message=lead_message($p);if(preg_match_all('/./us',$message)+preg_match_all('/[\x{10000}-\x{10FFFF}]/u',$message)>4096)throw new InvalidArgumentException('Сократите комментарий или список интересующих товаров.');
 $token=getenv('TELEGRAM_BOT_TOKEN');$chat=getenv('TELEGRAM_CHAT_ID');
 if(!is_string($token)||!preg_match('/^[0-9]{5,}:[A-Za-z0-9_-]{20,}$/D',$token)||!is_string($chat)||!preg_match('/^-?[0-9]+$/D',$chat))throw new RuntimeException('Telegram environment not configured');
 $ip=$_SERVER['REMOTE_ADDR']??'';if(!filter_var($ip,FILTER_VALIDATE_IP))throw new RuntimeException('Client IP unavailable');
 $ipKey=hash_hmac('sha256',$ip,$token);$key=hash_hmac('sha256',$ip.'|'.$p['requestId'],$token);
 $status=lead_store(fn(&$s)=>lead_reserve($s,$ipKey,$key,time()));
 if($status==='delivered')lead_reply(['ok'=>true,'duplicate'=>true]);
 if($status!=='reserved')lead_reply(['error'=>'Предыдущая отправка ещё обрабатывается или её доставка не подтверждена. Напишите менеджеру через WhatsApp или Telegram.'],409);
 $messageId=lead_telegram($token,$chat,$message);
 lead_store(function(&$s)use($key,$messageId){$s['requests'][$key]['status']='delivered';$s['requests'][$key]['messageId']=$messageId;});
 lead_reply(['ok'=>true]);
}catch(InvalidArgumentException|JsonException $e){lead_reply(['error'=>$e instanceof InvalidArgumentException?$e->getMessage():'Проверьте данные заявки.'],400);}
catch(OverflowException $e){header('Retry-After: 600');lead_reply(['error'=>$e->getMessage()],429);}
catch(Throwable $e){if($key)try{lead_store(function(&$s)use($key){if(isset($s['requests'][$key])&&$s['requests'][$key]['status']!=='delivered')$s['requests'][$key]['status']='unconfirmed';});}catch(Throwable $ignored){}
 error_log('Lucky lead delivery unconfirmed ref='.$reference);lead_reply(['error'=>'Не удалось подтвердить отправку. Пожалуйста, напишите нам в WhatsApp или Telegram.','reference'=>$reference],503);}
