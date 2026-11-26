<?php
require __DIR__.'/../public/lead-domain.php';
$base=__DIR__.'/../work/settings-test-'.bin2hex(random_bytes(8));
mkdir($base,0700,true);mkdir($base.'/public',0700);mkdir($base.'/lucky-wholesale-private',0700);
$file=$base.'/lucky-wholesale-private/lead-settings.json';
$oldRoot=$_SERVER['DOCUMENT_ROOT']??null;
$names=['TELEGRAM_BOT_TOKEN','TELEGRAM_CHAT_ID','YANDEX_METRIKA_ID'];$old=[];
foreach($names as $name){$old[$name]=getenv($name);putenv($name);}
function setting_expect($ok){if(!$ok)throw new Exception('Settings regression');}
try {
 $_SERVER['DOCUMENT_ROOT']=$base.'/public';
 setting_expect(lead_setting('TELEGRAM_BOT_TOKEN')==='');
 file_put_contents($file,json_encode(['TELEGRAM_BOT_TOKEN'=>'TEST_SECRET_NOT_REAL','TELEGRAM_CHAT_ID'=>'123']));chmod($file,0600);
 setting_expect(lead_setting('TELEGRAM_BOT_TOKEN')==='TEST_SECRET_NOT_REAL');
 setting_expect(lead_setting('TELEGRAM_CHAT_ID')==='123');
 putenv('TELEGRAM_BOT_TOKEN=ENV_PRIORITY');setting_expect(lead_setting('TELEGRAM_BOT_TOKEN')==='ENV_PRIORITY');putenv('TELEGRAM_BOT_TOKEN');
 foreach(['{broken',json_encode(['TELEGRAM_BOT_TOKEN'=>['invalid']]),str_repeat('x',4097)] as $raw){
  file_put_contents($file,$raw);
  try{lead_setting('TELEGRAM_BOT_TOKEN');throw new Exception('Invalid settings accepted');}catch(RuntimeException $expected){}
 }
 file_put_contents($file,'{}');
 if(DIRECTORY_SEPARATOR==='/'){chmod($file,0644);clearstatcache();try{lead_setting('TELEGRAM_BOT_TOKEN');throw new Exception('Public permissions accepted');}catch(RuntimeException $expected){}chmod($file,0600);clearstatcache();}
 // Even a sibling path is rejected when it resolves back inside document root.
 unlink($file);rmdir($base.'/lucky-wholesale-private');
 if(function_exists('symlink')&&@symlink(realpath($base.'/public'),$base.'/lucky-wholesale-private')){
  try{lead_setting('TELEGRAM_BOT_TOKEN');throw new Exception('Public symlink accepted');}catch(RuntimeException $expected){}
  if(is_link($base.'/lucky-wholesale-private'))unlink($base.'/lucky-wholesale-private');
 }
 echo "PASS private configuration fallback, environment priority, invalid/oversized input and location/permission guards\n";
} finally {
 foreach($old as $name=>$value)putenv($value===false?$name:$name.'='.$value);
 if($oldRoot===null)unset($_SERVER['DOCUMENT_ROOT']);else $_SERVER['DOCUMENT_ROOT']=$oldRoot;
 if(is_file($file))unlink($file);
 if(is_dir($base.'/lucky-wholesale-private'))rmdir($base.'/lucky-wholesale-private');
 rmdir($base.'/public');rmdir($base);
}
