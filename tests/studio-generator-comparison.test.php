<?php
define('WAREHOUSE_OWNER','test-owner');
require __DIR__.'/../public/warehouse/studio-domain.php';
function comparison_assert($ok){if(!$ok)throw new Exception('Generator comparison regression');}
$state=['products'=>['p'=>['title'=>'Orange headguard','status'=>'review','revision'=>1,'categoryId'=>'combat-boxing-mma-helmets','photos'=>['source'],'studioResults'=>[]]],'photos'=>['source'=>['original'=>'source.jpg','processed'=>null]]];
$input=['id'=>'p','revision'=>1,'requestId'=>'comparison-control-123456789','confirmed'=>true,'mode'=>'category','view'=>'front','model'=>'man','instructions'=>''];
$baselineState=$state;$base=studio_reserve($baselineState,$input);$baseFields=studio_image_fields($base);comparison_assert($baseFields['model']==='gpt-image-1.5'&&$baseFields['input_fidelity']==='high');
$trialInput=$input+['comparisonTrial'=>true,'comparisonConfirmed'=>true];$trialState=$state;$trial=studio_reserve($trialState,$trialInput);$trialFields=studio_image_fields($trial);
comparison_assert($trial['sourceIds']===$base['sourceIds']);comparison_assert($trialFields['model']==='gpt-image-2.6-sunburst');comparison_assert(!isset($trialFields['input_fidelity']));
unset($baseFields['model'],$baseFields['input_fidelity'],$trialFields['model']);comparison_assert($baseFields===$trialFields);
$before=$trialState;try{studio_reserve($trialState,array_replace($trialInput,['requestId'=>'comparison-another-request-123456']));throw new Exception('Second trial permitted');}catch(DomainException $e){comparison_assert($e->getCode()===409);}comparison_assert($before===$trialState);
foreach([['comparisonTrial'=>'true'],['comparisonConfirmed'=>false],['mode'=>'white']] as $change){$s=$state;$before=$s;try{studio_reserve($s,array_replace($trialInput,$change));throw new Exception('Invalid trial permitted');}catch(DomainException $e){comparison_assert($e->getCode()===400);}comparison_assert($before===$s);}
$trial['imageModel']='gpt-image-2.6-sunburst';$trial['imageQuality']='medium';$trial['promptSha256']=hash('sha256',studio_prompt($trial));$trial['sourceFingerprints']=[['photoId'=>'source','sha256'=>str_repeat('a',64)]];
studio_store_result($trialState,$trial,'candidate','candidate.png');$meta=$trialState['photos']['candidate']['studio'];comparison_assert($meta['comparisonTrial']&&$meta['imageModel']==='gpt-image-2.6-sunburst');comparison_assert($meta['promptSha256']===$trial['promptSha256']&&$meta['sourceFingerprints']===$trial['sourceFingerprints']);comparison_assert(!$trialState['photos']['candidate']['approved']);
studio_decide($trialState,['id'=>'p','photoId'=>'candidate','revision'=>2,'decision'=>'append']);comparison_assert($trialState['products']['p']['photos']===['source','candidate']);
echo "PASS same source/prompt/render settings, correct model-specific fields, one trial per card, invalid requests atomic, audit metadata, separate result/manual acceptance\n";

