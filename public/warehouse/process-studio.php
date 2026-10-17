<?php
declare(strict_types=1);
require __DIR__.'/storage.php';
require __DIR__.'/studio-domain.php';
header('Cache-Control: no-store');header('X-Content-Type-Options: nosniff');
if(($_SERVER['REMOTE_USER']??'')!==WAREHOUSE_OWNER)warehouse_json(['error'=>'Фотостудия доступна только владельцу.'],403);
if(($_SERVER['REQUEST_METHOD']??'')!=='POST')warehouse_json(['error'=>'Нужен POST-запрос.'],405);
if(($_SERVER['HTTP_X_REQUESTED_WITH']??'')!=='LuckyWarehouse'||($_SERVER['HTTP_SEC_FETCH_SITE']??'')==='cross-site')warehouse_json(['error'=>'Недопустимый запрос.'],403);
$raw=(string)file_get_contents('php://input');$input=strlen($raw)<=16384?json_decode($raw,true):null;
if(!is_array($input))warehouse_json(['error'=>'Неверные данные.'],400);
$lock=null;$job=null;$copies=[];$savedFile=null;$committed=false;$body=null;
try{
 if(!function_exists('curl_init')||!function_exists('finfo_open'))throw new RuntimeException('На сервере нужны cURL и Fileinfo.');
 $private=warehouse_private();$keyFile=$private.'/openai-key.php';$key=is_readable($keyFile)?(require $keyFile):null;
 if(!is_string($key)||strlen(trim($key))<20)throw new RuntimeException('Серверный ключ обработки фото не настроен.');
 $lock=@fopen($private.'/photo-processing-limit.json','c+');if(!$lock||!flock($lock,LOCK_EX|LOCK_NB))throw new DomainException('Обработка уже идёт. Дождитесь её окончания.',429);
 $job=warehouse_state(function(&$s)use($input){return studio_reserve($s,$input);});
 $fields=['model'=>'gpt-image-1.5','prompt'=>studio_prompt($job),'input_fidelity'=>'high','quality'=>'medium','size'=>'1024x1024','background'=>'opaque','output_format'=>'png','n'=>'1'];
 $images=[];foreach($job['files'] as $i=>$name){$file=warehouse_photo_path($name);$mime=is_file($file)?(new finfo(FILEINFO_MIME_TYPE))->file($file):'';$dims=@getimagesize($file);
  if(!in_array($mime,['image/jpeg','image/png','image/webp'],true)||!$dims||filesize($file)>12*1024*1024||$dims[0]*$dims[1]>40000000)throw new DomainException('Один из исходников недоступен или превышает лимит фото.',400);
  $images[]=['path'=>$file,'mime'=>$mime];
 }
 $requestFile=tempnam($private,'studio-request-');if(!$requestFile)throw new RuntimeException('Не удалось подготовить запрос.');$copies[]=$requestFile;@chmod($requestFile,0600);$body=fopen($requestFile,'w+b');if(!$body)throw new RuntimeException('Не удалось подготовить запрос.');$boundary='LuckyStudio'.bin2hex(random_bytes(16));studio_multipart($body,$fields,$images,$boundary);$length=fstat($body)['size'];
 $curl=curl_init('https://api.openai.com/v1/images/edits');curl_setopt_array($curl,[CURLOPT_UPLOAD=>true,CURLOPT_CUSTOMREQUEST=>'POST',CURLOPT_INFILE=>$body,CURLOPT_INFILESIZE=>$length,CURLOPT_RETURNTRANSFER=>true,CURLOPT_CONNECTTIMEOUT=>15,CURLOPT_TIMEOUT=>100,CURLOPT_HTTPHEADER=>['Authorization: Bearer '.trim($key),'Content-Type: multipart/form-data; boundary='.$boundary,'Expect:']]);
 $response=curl_exec($curl);$status=(int)curl_getinfo($curl,CURLINFO_HTTP_CODE);curl_close($curl);unset($key);
 if($response===false||$status<200||$status>=300)throw new RuntimeException('Сервис не завершил обработку. Исходники сохранены. Повторный запуск может снова списать средства; автоматического повтора нет.');
 $data=json_decode($response,true);$bytes=is_string($data['data'][0]['b64_json']??null)?base64_decode($data['data'][0]['b64_json'],true):false;
 if(!$bytes||strlen($bytes)>20*1024*1024||substr($bytes,0,8)!=="\x89PNG\r\n\x1a\n"||!@getimagesizefromstring($bytes))throw new RuntimeException('Сервис вернул неверное изображение. Исходники сохранены.');
 $folder=$private.'/warehouse-photos';if(!is_dir($folder)&&!mkdir($folder,0700))throw new RuntimeException('Не удалось сохранить результат.');
 $savedFile=bin2hex(random_bytes(16)).'.png';if(file_put_contents(warehouse_photo_path($savedFile),$bytes)!==strlen($bytes))throw new RuntimeException('Не удалось сохранить результат.');@chmod(warehouse_photo_path($savedFile),0600);
 $photoId=bin2hex(random_bytes(16));$usage=[];foreach(['input_tokens','output_tokens','total_tokens']as $name)if(is_numeric($data['usage'][$name]??null))$usage[$name]=(int)$data['usage'][$name];
 warehouse_state(function(&$s)use($job,$photoId,$savedFile,$usage){studio_store_result($s,$job,$photoId,$savedFile,$usage);});$committed=true;
 $result=['ok'=>true,'photoId'=>$photoId,'sourceCount'=>count($job['sourceIds'])];$code=200;
}catch(Throwable $e){
 if($job)try{warehouse_state(function(&$s)use($job){if(isset($s['products'][$job['id']]))$s['products'][$job['id']]['studioRequests'][$job['requestId']]['status']='failed';});}catch(Throwable $ignored){}
 $code=$e instanceof DomainException&&in_array($e->getCode(),[400,404,409,429],true)?$e->getCode():502;
 $result=['error'=>$e instanceof DomainException?$e->getMessage():'Обработка не завершена. Исходники сохранены. Проверьте доступ к Images API и хранилищу. Автоматического повтора нет; новый запуск может списать средства.'];
}finally{
 if(is_resource($body))fclose($body);foreach($copies as $copy)@unlink($copy);if($savedFile&&!$committed)@unlink(warehouse_photo_path($savedFile));if(is_resource($lock)){flock($lock,LOCK_UN);fclose($lock);}
}
warehouse_json($result,$code);

