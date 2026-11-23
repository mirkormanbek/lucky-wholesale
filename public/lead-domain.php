<?php
declare(strict_types=1);
function lead_text($value,int $limit): string {
 if(!is_string($value)||!preg_match('//u',$value)||preg_match_all('/./us',$value)>$limit)throw new InvalidArgumentException('Проверьте длину и формат полей заявки.');
 return trim(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u','',$value));
}
function lead_phone(string $raw,string $country=''): string {
 if(!preg_match('/^[+0-9\s().-]+$/D',$raw))throw new InvalidArgumentException('Укажите телефон с кодом страны, например +7 747 780 61 82.');
 $digits=preg_replace('/\D/','',$raw);
 if(strlen($digits)===11&&$digits[0]==='8')$digits='7'.substr($digits,1);
 if(!preg_match('/^[1-9][0-9]{7,14}$/D',$digits)||($country!=='OTHER'&&$country!==''&&(strlen($digits)!==11||$digits[0]!=='7')))throw new InvalidArgumentException('Проверьте телефон и код страны. Для Казахстана и России нужен номер +7 из 11 цифр.');
 return '+'.$digits;
}
function lead_input(array $input): array {
 $out=[];foreach(['name'=>100,'phone'=>40,'city'=>100,'country'=>10,'role'=>30,'interest'=>400,'quantity'=>10,'comment'=>700,'page'=>300] as $key=>$limit)$out[$key]=lead_text($input[$key]??'',$limit);
 if(!in_array($out['country'],['','KZ','RU','OTHER'],true)||!in_array($out['role'],['','club','school','shop','coach','other'],true))throw new InvalidArgumentException('Проверьте страну и тип клиента.');
 if(($input['consent']??false)!==true)throw new InvalidArgumentException('Нужно согласие на обработку персональных данных.');
 $out['phone']=lead_phone($out['phone'],$out['country']);
 if($out['quantity']!==''&&(!ctype_digit($out['quantity'])||(int)$out['quantity']<1||(int)$out['quantity']>1000000))throw new InvalidArgumentException('Укажите примерное количество целым положительным числом.');
 $page=parse_url($out['page']);
 if(!$page||!in_array($page['scheme']??'', ['http','https'],true)||empty($page['host'])||isset($page['user'])||isset($page['pass']))throw new InvalidArgumentException('Не удалось определить страницу заявки. Обновите страницу.');
 $out['utm']=[];$utm=$input['utm']??[];if(!is_array($utm))throw new InvalidArgumentException('Неверные UTM-метки.');
 foreach(['utm_source','utm_medium','utm_campaign','utm_term','utm_content','utm_id'] as $key)if(isset($utm[$key]))$out['utm'][$key]=lead_text($utm[$key],80);
 $out['requestId']=lead_text($input['requestId']??'',80);
 if(!preg_match('/^[a-zA-Z0-9-]{20,80}$/D',$out['requestId']))throw new InvalidArgumentException('Обновите страницу и повторите отправку.');
 return $out;
}
function lead_almaty_time(): DateTimeImmutable {
 $zone=new DateTimeZone('Asia/Almaty');
 // PHP 7.4 can bundle tzdata from before Kazakhstan's 2024 UTC+5 transition.
 if((new DateTimeImmutable('2025-01-01',$zone))->getOffset()!==18000)$zone=new DateTimeZone('+05:00');
 return new DateTimeImmutable('now',$zone);
}
function lead_message(array $p): string {
 $countries=['KZ'=>'Казахстан','RU'=>'Россия','OTHER'=>'Другое'];$roles=['club'=>'Клуб','school'=>'Спортшкола','shop'=>'Магазин','coach'=>'Тренер','other'=>'Другое'];
 $line=fn($v)=>$v!==''?$v:'Не указано';
 $lines=['Новая оптовая заявка Lucky','Дата: '.lead_almaty_time()->format('d.m.Y H:i:s').' (Asia/Almaty, UTC+05:00)',
 'Имя: '.$line($p['name']),'Телефон: '.$p['phone'],'Город: '.$line($p['city']),'Страна: '.($countries[$p['country']]??'Не указано'),'Клиент: '.($roles[$p['role']]??'Не указано'),
 'Интересует: '.$line($p['interest']),'Количество: '.$line($p['quantity']),'Комментарий: '.$line($p['comment']),'Согласие на обработку данных: получено','Страница: '.$p['page']];
 foreach($p['utm'] as $key=>$value)$lines[]=$key.': '.$value;
 return implode("\n",$lines);
}
function lead_private(): string {
 $root=realpath($_SERVER['DOCUMENT_ROOT']??'');if(!$root)throw new RuntimeException('Storage unavailable');
 $path=dirname($root).'/lucky-wholesale-private';
 if(!is_dir($path)&&!@mkdir($path,0700,true)&&!is_dir($path))throw new RuntimeException('Storage unavailable');
 $real=realpath($path);if(!$real||strpos(str_replace('\\','/',$real).'/',str_replace('\\','/',$root).'/')===0)throw new RuntimeException('Storage outside document root required');
 return $real;
}
function lead_store(callable $fn){
 $dir=lead_private();$lock=fopen($dir.'/leads.lock','c+');if(!$lock||!flock($lock,LOCK_EX))throw new RuntimeException('Storage unavailable');
 try{$file=$dir.'/leads-state.json';$raw=is_file($file)?file_get_contents($file):'';$s=$raw===''?['attempts'=>[],'requests'=>[]]:json_decode($raw,true);
  if(!is_array($s)||!isset($s['attempts'],$s['requests']))throw new RuntimeException('Storage invalid');
  $now=time();foreach($s['attempts'] as $key=>$times){$s['attempts'][$key]=array_values(array_filter($times,fn($t)=>$t>$now-600));if(!$s['attempts'][$key])unset($s['attempts'][$key]);}
  foreach($s['requests'] as $key=>$r)if(($r['at']??0)<=$now-600)unset($s['requests'][$key]);
  $result=$fn($s);$json=json_encode($s,JSON_THROW_ON_ERROR);$tmp=tempnam($dir,'lead-');
  if(!$tmp||file_put_contents($tmp,$json)!==strlen($json)||!rename($tmp,$file))throw new RuntimeException('Storage unavailable');@chmod($file,0600);return $result;
 }finally{flock($lock,LOCK_UN);fclose($lock);}
}
function lead_reserve(array &$s,string $ipKey,string $requestKey,int $now): string {
 if(isset($s['requests'][$requestKey]))return $s['requests'][$requestKey]['status'];
 if(count($s['attempts'][$ipKey]??[])>=5)throw new OverflowException('Не больше 5 заявок за 10 минут. Напишите нам в WhatsApp или Telegram.');
 if(count($s['requests'])>=10000)throw new OverflowException('Форма временно перегружена. Напишите менеджеру.');
 $s['attempts'][$ipKey][]=$now;$s['requests'][$requestKey]=['status'=>'pending','at'=>$now];return 'reserved';
}
function lead_telegram(string $token,string $chat,string $text): int {
 if(!function_exists('curl_init'))throw new RuntimeException('Telegram unavailable');
 $url='https://api.telegram.org/bot'.$token.'/sendMessage';
 // A local mock is allowed only by an explicit test router in PHP's development server.
 if(PHP_SAPI==='cli-server'&&defined('LUCKY_LEADS_LOCAL_TEST')&&LUCKY_LEADS_LOCAL_TEST===true)$url='http://127.0.0.1:4231/sendMessage';
 $curl=curl_init($url);curl_setopt_array($curl,[CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>json_encode(['chat_id'=>$chat,'text'=>$text,'link_preview_options'=>['is_disabled'=>true]],JSON_THROW_ON_ERROR),CURLOPT_HTTPHEADER=>['Content-Type: application/json'],CURLOPT_RETURNTRANSFER=>true,CURLOPT_CONNECTTIMEOUT=>3,CURLOPT_TIMEOUT=>8]);
 try{$body=curl_exec($curl);$http=(int)curl_getinfo($curl,CURLINFO_HTTP_CODE);$r=is_string($body)?json_decode($body,true):null;
  if($http!==200||!is_array($r)||($r['ok']??false)!==true||!is_int($r['result']['message_id']??null))throw new RuntimeException('Telegram delivery not confirmed');
  return $r['result']['message_id'];
 }finally{curl_close($curl);}
}
