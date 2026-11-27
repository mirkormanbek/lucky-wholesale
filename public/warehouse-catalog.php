<?php
declare(strict_types=1);
// Published warehouse products with public club prices (same records as the storefront).
require __DIR__ . '/storefront-data.php';
try {
    $fx = storefront_json(__DIR__ . '/data/fx.json');$rates = $fx['kztPerUnit'] ?? [];$rates['KZT'] = 1;
    warehouse_json(['products' => storefront_warehouse($rates)]);
} catch (Throwable $e) { warehouse_json(['products' => [], 'error' => 'Складской каталог временно недоступен.'], 503); }
