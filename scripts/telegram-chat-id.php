<?php
// CLI helper: prints chat IDs, never the token or Telegram request URL.
if(PHP_SAPI!=='cli')exit;
$token=getenv('TELEGRAM_BOT_TOKEN');if(!is_string($token)||!preg_match('/^[0-9]{5,}:[A-Za-z0-9_-]{20,}$/D',$token)){fwrite(STDERR,"Set TELEGRAM_BOT_TOKEN in this process first.\n");exit(2);}
$curl=curl_init('https://api.telegram.org/bot'.$token.'/getUpdates');curl_setopt_array($curl,[CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>['limit'=>20,'timeout'=>0],CURLOPT_RETURNTRANSFER=>true,CURLOPT_CONNECTTIMEOUT=>3,CURLOPT_TIMEOUT=>8]);$body=curl_exec($curl);$status=(int)curl_getinfo($curl,CURLINFO_HTTP_CODE);curl_close($curl);unset($token);
$data=is_string($body)?json_decode($body,true):null;if($status!==200||($data['ok']??false)!==true){fwrite(STDERR,"Telegram did not return chats. Check the token, connectivity and whether this bot already uses a webhook. No webhook was changed.\n");exit(3);}
$seen=[];foreach($data['result'] as $update){$chat=$update['message']['chat']??$update['channel_post']['chat']??null;if(!$chat||isset($seen[$chat['id']]))continue;$seen[$chat['id']]=true;echo 'chat_id: '.$chat['id'].' | type: '.($chat['type']??'unknown')."\n";}
if(!$seen){echo "No chats yet. Open your bot in Telegram, press Start or send /start, then run this helper again.\n";exit(4);}
