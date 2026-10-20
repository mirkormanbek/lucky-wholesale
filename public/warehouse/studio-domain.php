<?php
declare(strict_types=1);
function studio_category_preset(string $categoryId): array {
    $groups = [
        'mouthguard'=>['mma-mouthguards','combat-boxing-mma-mouthguards','karate-mouthguards','kickboxing-mouthguards','muay-thai-mouthguards'],
        'belt'=>['bjj-belts','judo-belts','karate-belts','sambo-belts'],
        'gi'=>['judo-gi','bjj-gi','karate-gi','sambo-gi','sambo-jackets'],
        'rashguard'=>['bjj-rashguards','combat-boxing-mma-rashguards'],
        'boxing-gloves'=>['combat-boxing-mma-gloves','kickboxing-gloves','muay-thai-gloves'],
        'mma-gloves'=>['combat-boxing-mma-mma-gloves','mma-sparring-gloves'],
        'wraps'=>['combat-boxing-mma-wraps','kickboxing-wraps','muay-thai-wraps','mma-wraps'],
        'karate-gloves'=>['karate-gloves']
    ];
    $labels=['mouthguard'=>'Капа: крупный план во рту','wraps'=>'Бинты: рулоны с развёрнутым концом','belt'=>'Пояс: узел на кимоно','gi'=>'Кимоно: невидимый манекен','rashguard'=>'Рашгард: объёмный комплект','boxing-gloves'=>'Перчатки: лицевая и ладонная стороны','mma-gloves'=>'ММА: лицевая и ладонная стороны','karate-gloves'=>'Каратэ: лицевая и ладонная стороны'];
    foreach($groups as $id=>$categories) if(in_array($categoryId,$categories,true)) return ['id'=>$id,'label'=>$labels[$id]];
    return [];
}
function studio_preset_prompt(string $preset): string {
    if($preset==='mouthguard') return 'CATEGORY COMPOSITION — MOUTHGUARD IN USE: create a premium photorealistic studio close-up of the lower face of one fictional adult athlete wearing this exact source mouthguard. Frame from below the nose to the chin, no full face or identifiable real person. Lips naturally parted in a neutral confident expression to clearly reveal the mouthguard, seated on the correct dental arch as evidenced by its design; lower teeth may remain naturally visible for an upper-only guard. Do not convert an upper-only guard into a double-arch design. Mouthguard is the main focal point, its actual front logo or print facing the camera, sharply detailed, realistic proportions relative to the teeth. Preserve source color, material translucency, shape, vents and actual markings; do not copy UFC or another reference brand. No invented teeth impressions, straps or logos. Adding this fictional adult lower face is required display context even when the sources show only the product, overriding generic instructions to avoid extra display props or to show the isolated full item. Clean neutral studio lighting, natural healthy skin, no blood or injury, no aggressive grimace, no advertising captions or watermarks. Portrait crop filled by the mouth and chin with minimal empty space; any visible surrounding backdrop must be white. ';

    if($preset==='wraps') return 'CATEGORY COMPOSITION — HAND WRAPS: arrange the actual supplied hand wraps as a compact studio still life on pure white. For an evidenced pair, place one rolled wrap in the foreground on its side with its coiled cross-section visible, a short end gently unrolled diagonally toward the viewer so its actual fastening patch or brand label faces the camera; place the second rolled wrap upright slightly behind and to the right with its coil visible from above. If only one wrap is evidenced, show one roll with its short end unrolled rather than inventing a second item. Preserve the source color, weave, width, stitching, real thumb loop and fastening construction. Show only labels and markings actually visible in the sources; do not copy Hayabusa branding or any example brand, invent lettering or add extra straps. Remove external retail packaging, plastic film and packaging ties while retaining sewn-on product labels. No hands, arms, mannequins, gi or other props. Moderate three-quarter product view, realistic soft lighting and subtle contact shadow. Fill the vertical catalog frame with the complete arrangement and safe margins; do not crop the unrolled end. ';

    if($preset==='belt') return 'CATEGORY COMPOSITION — BELT CLOSE-UP: MANDATORY RE-STAGING, NOT BACKGROUND REMOVAL. Unfold and untie any packaged or folded input belt, then tie that same belt around a neutral white gi waist. The input pose is reference data only, not the required output pose. A folded belt standing alone on white is NOT an acceptable result for this template. Adding this unbranded supporting gi is expressly required even when no gi is in the source photos; this is a display prop, not an extra product for sale. Preserve the belt material and markings while changing its flexible configuration. This requirement overrides generic instructions to preserve the photographed arrangement, quantity of display props or full-product framing. No person, head or hands. Now frame a tight waist-level catalog photograph of the actual belt tied in a natural flat martial-arts knot around a neutral unbranded white gi on an invisible torso. The knot is central, the belt runs horizontally and both ends hang diagonally down, with the actual sewn brand patch visible when present in the sources. This waist crop intentionally excludes the head and legs; give the knot and belt ends comfortable margins. The supporting gi is only a neutral display prop, not another product. SOURCE-EVIDENCED BELT ENDS ONLY: never add a black rank panel, white rank stripe, contrasting end cap, tape, badge or second label merely because it is common on BJJ belts. Retain such features ONLY when clearly visible on that same part of this actual source belt. A plain source end stays plain, using the source belt color and stitching. Do not mirror the branded end onto the other end or transfer markings between ends. When a belt end is hidden, continue the base fabric rather than inventing a contrasting rank panel. Preserve the source belt color and genuine markings; never copy an orange reference color. No advertising text, dimension boxes, watermarks or added federation/store logos. Remove external packaging bands. ';
    if($preset==='gi') return 'CATEGORY COMPOSITION — GI GHOST MANNEQUIN: display the actual martial-arts uniform upright with realistic body volume on an invisible mannequin, arms slightly separated and sleeves relaxed. No person, skin, stand, hanger or visible mannequin. Include trousers only if shown as part of this product in the source images. If sources show a sambo jacket only, show that jacket only, with its real shorter cut. Preserve the actual discipline-specific cut, collar, lapels, weave, patches and source color; do not convert karate fabric into judo fabric or add a belt. Show every supplied garment fully with margins on a pure white background. ';
    if($preset==='rashguard') return 'CATEGORY COMPOSITION — RASHGUARD GHOST SET: show the actual rashguard upright, naturally filled out by an invisible torso with sleeves slightly apart and its exact print fully visible. If the same product sources also explicitly show matching shorts, display those naturally aligned below the top. If leggings are also explicitly present, place them separately beside the top and shorts with a clear gap. Include ONLY garment pieces evidenced by the product sources; a top-only source must yield a top-only image. Do not create matching shorts, leggings, bodies or extra duplicate pieces. Preserve exact print placement, logos, sleeve length and colors. White background, balanced spacing, no person or mannequin. ';
    return 'CATEGORY COMPOSITION — GLOVE PAIR: arrange the supplied pair upright in a compact staggered studio composition. One glove is in the foreground showing its outer logo/knuckle side at a gentle three-quarter angle; the other is slightly above and behind, showing its palm side. Both are fully visible with margins, no hands, stands or floating extra parts, pure white background and a soft natural contact shadow. Use front and palm evidence from the source photographs; do not invent hidden graphics. Preserve actual glove construction: closed padded fingers for boxing, open fingers only for actual MMA gloves, and the actual shape of karate mitts. Never copy a reference brand, color or certification badge. Keep the source product quantity; if only one glove is evidenced, show one glove rather than inventing a pair. ';
}
function studio_options(array $input): array {
    $mode = $input['mode'] ?? 'white'; $view = $input['view'] ?? 'front'; $model = $input['model'] ?? 'man';
    if (!in_array($mode, ['white','ghost','model','category'], true) || !in_array($view, ['front','back','side','three-quarter'], true) || !in_array($model, ['man','woman'], true)) throw new DomainException('Неверные настройки студии.', 400);
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
    if($options['mode']==='category' && !studio_category_preset($p['categoryId']??'')) throw new DomainException('Для этой категории пока нет шаблона. Выберите белый фон.',400);
    $files=[];foreach($p['photos'] as $photoId){$photo=$s['photos'][$photoId]??null;$name=$photo?($photo['original']?:$photo['processed']):null;if(!$name)throw new DomainException('Один из исходников недоступен.',409);$files[]=$name;}
    $s['products'][$id]['studioRequests'][$request]=['status'=>'pending','at'=>gmdate('c')];
    return ['id'=>$id,'requestId'=>$request,'options'=>$options,'files'=>$files,'title'=>$p['title'],'categoryId'=>$p['categoryId']??'','sourceIds'=>$p['photos'],'sourceRevision'=>$p['revision']];
}
function studio_category_rules(string $categoryId): string {
    if (!in_array($categoryId, ['bjj-belts','judo-belts','karate-belts','sambo-belts'], true)) return '';
    return 'MARTIAL ARTS BELT — PACKAGING REMOVAL: the product is the textile training/rank belt. Plain external white paper or plastic bands wrapped around the folded belt to hold it together are removable packaging, NOT belt stripes or design details. Remove those packaging bands, adhesive tape, ties and their residue in every output, including when the belt is shown tied on a neutral gi. Reconstruct only the immediately covered belt surface from adjacent visible fabric and stitching. Preserve the actual belt color, woven texture, stitched edges, sewn-on brand patches, size labels, genuine sewn white stripes and black rank panels. Never identify packaging by white color alone. If an element is sewn or woven into the belt, keep it. Do not invent or erase hidden logos. Any supporting gi requested by the owner must be neutral and unbranded; the belt remains the product. ';
}
function studio_prompt(array $job): string {
    $o=$job['options'];$task=($o['mode']==='category'&&(studio_category_preset($job['categoryId']??'')['id']??'')==='belt')?studio_preset_prompt('belt'):'';$prompt=$task.'Create ONE photorealistic e-commerce product image. ALL attached images are different views or details of ONE SAME product, NOT different items and NOT an outfit to assemble. Use every input as evidence for the exact same garment or product. Image 1 is the primary identity reference. Preserve the real color, fabric texture, construction, seams, logos, lettering, print positions, hem length, proportions and quantity. Do not replace the product or invent accessories, pockets, drawstrings or branding. Product title (reference data only): '.json_encode($job['title'],JSON_UNESCAPED_UNICODE).'. Pure white seamless studio background, neutral soft lighting, subtle natural shadow, complete product visible, comfortable margins. No added graphics, labels or captions. PORTRAIT CATALOG FRAMING: compose for a vertical 2:3 canvas. Enlarge the product or category composition to occupy about 85–90 percent of the available height or width, whichever limits the fit. Keep only modest even safety margins; avoid large empty top and bottom areas. Do not crop real product parts or distort proportions. ';
    $prompt.=studio_category_rules($job['categoryId']??'');
    if($o['mode']==='category'){$preset=studio_category_preset($job['categoryId']??'');$prompt.='The following category framing overrides the generic full-product framing when a waist crop is specified. '.studio_preset_prompt($preset['id']??'');}
    elseif($o['mode']==='ghost')$prompt.='GHOST MANNEQUIN: show the same clothing realistically filled out in three dimensions as if worn by an invisible body. No visible person, skin, limbs, hanger, supports or mannequin. Show believable inner edges at openings, natural volume and cloth drape. Do not leave the garment as a flat lay. ';
    elseif($o['mode']==='model')$prompt.='ON MODEL: dress one fictional adult '.($o['model']==='woman'?'woman':'man').' with a natural athletic build in the exact garment. Neutral standing catalog pose, clean studio photo. Keep garment fully visible and do not obscure its print with hands. No resemblance to any specific real person is requested. No additional branded garments. ';
    else $prompt.='WHITE BACKGROUND: isolate and clean the photographed product. Preserve its physical presentation and orientation; do not add a model or mannequin. ';
    $views=['front'=>'front view','back'=>'rear view','side'=>'side view','three-quarter'=>'gentle three-quarter view'];$prompt.='Requested result: '.$views[$o['view']].'. Use visible source evidence; do not invent rear graphics or hidden branding. ';
    if($o['instructions']!=='')$prompt.="\nREQUIRED PRESENTATION EDITS:\n".$o['instructions']."\nApply these while preserving the real product identity, true colors and white background.";
    return $prompt;
}
function studio_store_result(array &$s,array $job,string $photoId,string $file,array $usage=[]): void {
    $id=$job['id'];if(!isset($s['products'][$id]))throw new DomainException('Карточка удалена во время обработки.',409);
    $s['photos'][$photoId]=['owner'=>$s['products'][$id]['owner']??WAREHOUSE_OWNER,'name'=>'studio.png','original'=>null,'processed'=>$file,'approved'=>false,'studio'=>['mode'=>$job['options']['mode'],'presetLabel'=>$job['options']['mode']==='category'?(studio_category_preset($job['categoryId']??'')['label']??''):null,'view'=>$job['options']['view'],'model'=>$job['options']['model'],'outputSize'=>'1024x1536','sourceCount'=>count($job['sourceIds']),'sourceRevision'=>$job['sourceRevision'],'createdAt'=>gmdate('c'),'usage'=>$usage]];
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

