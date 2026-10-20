<?php
declare(strict_types=1);
require __DIR__.'/../public/warehouse/studio-domain.php';
$p=studio_preset_prompt('wraps');
foreach(['SOURCE STRUCTURE IS THE HIGHEST PRIORITY','exact count, position, dimensions','do not clone the visible label','coil density','otherwise retain its photographed rolled/folded state','preserve the source arrangement and viewing angles'] as $rule)if(strpos($p,$rule)===false)throw new RuntimeException('Missing fidelity guard: '.$rule);
echo "PASS wraps: structure before pose, label count/location, coil geometry, visible-end-only unrolling and source-view fallback. No paid calls.\n";
