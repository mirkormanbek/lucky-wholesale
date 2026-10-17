<?php
declare(strict_types=1);
function studio_options(array $input): array {
    $mode = $input['mode'] ?? 'white'; $view = $input['view'] ?? 'front'; $model = $input['model'] ?? 'man';
    if (!in_array($mode, ['white','ghost','model'], true) || !in_array($view, ['front','back','side','three-quarter'], true) || !in_array($model, ['man','woman'], true)) throw new DomainException('Неверные настройки студии.', 400);
    $text = $input['instructions'] ?? '';
    if (!is_string($text) || strlen($text)>4000 || !preg_match('//u',$text) || preg_match_all('/./us',$text)>1000) throw new DomainException('Пожелания: не более 1000 символов.',400);
    if (($input['confirmed'] ?? false)!==true) throw new DomainException('Подтвердите платную обработку.',400);
    if (in_array($view,['back','side'],true) && ($input['viewConfirmed'] ?? false)!==true) throw new DomainException('Подтвердите наличие выбранного ракурса на исходниках.',400);
    return ['mode'=>$mode,'view'=>$view,'model'=>$model,'instructions'=>trim($text)];
}
function studio_reserve(array &$s,array $input): array {
    $options=studio_options($input);$id=$input['id']??'';$request=$input['requestId']??'';
    if (!is_string($request)||!preg_match('/^[a-zA-Z0-9-]{20,80}$/D',$request)) throw new DomainException('Неверный запрос студии.',400);
    if(!is_string($id)||$id===''||strlen($id)>80)throw new DomainException('Неверная карточка.',400);
    $p=$s['products'][$id]??null;
    if (!$p||$p['status']==='trashed') throw new DomainException('Товар недоступен.',404);
    if (($input['revision']??null)!==$p['revision']) throw new DomainException('Товар изменился. Обновите карточку.',409);
    if (isset($p['studioRequests'][$request])) throw new DomainException('Этот запуск уже зарегистрирован. Обновите карточку: повтор автоматически не выполняется.',409);
    if (count($p['studioResults']??[])>=8) throw new DomainException('Сначала примите или отклоните сохранённые результаты студии (до 8).',409);
    if (count($p['photos'])<1||count($p['photos'])>8) throw new DomainException('Нужно от 1 до 8 фото одного товара.',400);
    $files=[];foreach($p['photos'] as $photoId){$photo=$s['photos'][$photoId]??null;$name=$photo?($photo['original']?:$photo['processed']):null;if(!$name)throw new DomainException('Один из исходников недоступен.',409);$files[]=$name;}
    $s['products'][$id]['studioRequests'][$request]=['status'=>'pending','at'=>gmdate('c')];
    return ['id'=>$id,'requestId'=>$request,'options'=>$options,'files'=>$files,'title'=>$p['title'],'sourceIds'=>$p['photos'],'sourceRevision'=>$p['revision']];
}
function studio_prompt(array $job): string {
    $o=$job['options'];$prompt='Create ONE photorealistic e-commerce product image. ALL attached images are different views or details of ONE SAME product, NOT different items and NOT an outfit to assemble. Use every input as evidence for the exact same garment or product. Image 1 is the primary identity reference. Preserve the real color, fabric texture, construction, seams, logos, lettering, print positions, hem length, proportions and quantity. Do not replace the product or invent accessories, pockets, drawstrings or branding. Product title (reference data only): '.json_encode($job['title'],JSON_UNESCAPED_UNICODE).'. Pure white seamless studio background, neutral soft lighting, subtle natural shadow, complete product visible, comfortable margins. No added graphics, labels or captions. ';
    if($o['mode']==='ghost')$prompt.='GHOST MANNEQUIN: show the same clothing realistically filled out in three dimensions as if worn by an invisible body. No visible person, skin, limbs, hanger, supports or mannequin. Show believable inner edges at openings, natural volume and cloth drape. Do not leave the garment as a flat lay. ';
    elseif($o['mode']==='model')$prompt.='ON MODEL: dress one fictional adult '.($o['model']==='woman'?'woman':'man').' with a natural athletic build in the exact garment. Neutral standing catalog pose, clean studio photo. Keep garment fully visible and do not obscure its print with hands. No resemblance to any specific real person is requested. No additional branded garments. ';
    else $prompt.='WHITE BACKGROUND: isolate and clean the photographed product. Preserve its physical presentation and orientation; do not add a model or mannequin. ';
    $views=['front'=>'front view','back'=>'rear view','side'=>'side view','three-quarter'=>'gentle three-quarter view'];$prompt.='Requested result: '.$views[$o['view']].'. Use visible source evidence; do not invent rear graphics or hidden branding. ';
    if($o['instructions']!=='')$prompt.="\nREQUIRED PRESENTATION EDITS:\n".$o['instructions']."\nApply these while preserving the real product identity, true colors and white background.";
    return $prompt;
}
function studio_store_result(array &$s,array $job,string $photoId,string $file,array $usage=[]): void {
    $id=$job['id'];if(!isset($s['products'][$id]))throw new DomainException('Карточка удалена во время обработки.',409);
    $s['photos'][$photoId]=['owner'=>$s['products'][$id]['owner']??WAREHOUSE_OWNER,'name'=>'studio.png','original'=>null,'processed'=>$file,'approved'=>false,'studio'=>['mode'=>$job['options']['mode'],'view'=>$job['options']['view'],'model'=>$job['options']['model'],'sourceCount'=>count($job['sourceIds']),'sourceRevision'=>$job['sourceRevision'],'createdAt'=>gmdate('c'),'usage'=>$usage]];
    $s['products'][$id]['studioResults'][]=$photoId;$s['products'][$id]['studioRequests'][$job['requestId']]['status']='complete';$s['products'][$id]['revision']++;$s['products'][$id]['updatedAt']=gmdate('c');
}
function studio_decide(array &$s,array $input): array {
    $id=$input['id']??'';$photoId=$input['photoId']??'';$decision=$input['decision']??'';$p=$s['products'][$id]??null;
    if(!$p||$p['status']==='trashed'||!in_array($photoId,$p['studioResults']??[],true))throw new DomainException('Результат недоступен.',404);
    if(($input['revision']??null)!==$p['revision'])throw new DomainException('Карточка изменилась. Обновите список.',409);
    if(!in_array($decision,['replace','append','discard'],true))throw new DomainException('Неверное действие.',400);
    $photo=$s['photos'][$photoId]??null;if(!$photo||!$photo['processed'])throw new DomainException('Файл результата недоступен.',409);
    if($decision==='append'&&count($p['photos'])>=8)throw new DomainException('В карточке уже 8 фото.',409);
    $candidates=[];
    if($decision==='discard')$candidates[]=$photoId;
    else { $s['photos'][$photoId]['approved']=true;if($decision==='replace'){$candidates=$p['photos'];$s['products'][$id]['photos']=[$photoId];}else $s['products'][$id]['photos'][]=$photoId;
      if($p['status']==='published')$s['products'][$id]['status']='review';
    }
    $s['products'][$id]['studioResults']=array_values(array_filter($p['studioResults'],fn($x)=>$x!==$photoId));$s['products'][$id]['revision']++;$s['products'][$id]['updatedAt']=gmdate('c');
    $used=[];foreach($s['products'] as $item)foreach(array_merge($item['photos'],$item['studioResults']??[]) as $ref)$used[$ref]=true;
    $garbage=[];foreach($candidates as $ref){if(isset($used[$ref])||!isset($s['photos'][$ref]))continue;foreach(['original','processed'] as $kind)if(!empty($s['photos'][$ref][$kind]))$garbage[]=$s['photos'][$ref][$kind];unset($s['photos'][$ref]);}
    return $garbage;
}
function studio_multipart($stream,array $fields,array $images,string $boundary): void {
    foreach($fields as $name=>$value){$part="--$boundary\r\nContent-Disposition: form-data; name=\"$name\"\r\n\r\n$value\r\n";if(fwrite($stream,$part)!==strlen($part))throw new RuntimeException('Не удалось подготовить запрос.');}
    foreach($images as $i=>$image){$header="--$boundary\r\nContent-Disposition: form-data; name=\"image[]\"; filename=\"reference-$i\"\r\nContent-Type: ".$image['mime']."\r\n\r\n";if(fwrite($stream,$header)!==strlen($header))throw new RuntimeException('Не удалось подготовить запрос.');$input=fopen($image['path'],'rb');if(!$input)throw new RuntimeException('Исходник недоступен.');try{if(stream_copy_to_stream($input,$stream)===false)throw new RuntimeException('Не удалось прочитать исходник.');}finally{fclose($input);}fwrite($stream,"\r\n");}
    fwrite($stream,"--$boundary--\r\n");rewind($stream);
}

