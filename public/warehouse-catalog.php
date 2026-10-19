<?php
declare(strict_types=1);
require __DIR__ . '/warehouse/storage.php';
try {
    $fxFile = __DIR__ . '/data/fx.json';
    $fx = is_file($fxFile) ? json_decode((string)file_get_contents($fxFile), true) : [];
    $rates = $fx['kztPerUnit'] ?? []; $rates['KZT'] = 1;
    $products = warehouse_state(function(&$s) use ($rates) {
        $records = array_filter($s['products'], fn($p) => $p['status'] === 'published');
        return array_values(array_map(function($p) use ($s, $rates) {
            $photos = [];
            foreach ($p['photos'] as $id) if ($s['photos'][$id]['approved'] && $s['photos'][$id]['processed']) $photos[] = './warehouse-photo.php?id=' . $id;
            $prices = [$p['currency'] => $p['price']];
            $baseRate = $rates[$p['currency']] ?? null;
            if (is_numeric($baseRate) && is_finite((float)$baseRate) && $baseRate > 0) foreach (['KZT', 'RUB', 'USD'] as $currency) {
                $rate = $rates[$currency] ?? null;
                if (is_numeric($rate) && is_finite((float)$rate) && $rate > 0) $prices[$currency] = round($p['price'] * $baseRate / $rate, 2);
            }
            return ['id' => 'warehouse-' . $p['id'], 'modelGroupId' => $p['modelGroupId'] ?? $p['id'], 'article' => $p['article'], 'title' => $p['title'], 'brand' => 'Lucky', 'material' => $p['material'] ?? '', 'description' => $p['material'] ? 'Материал: ' . $p['material'] : '', 'categoryIds' => array_values(array_unique(array_merge([$p['categoryId']],$p['additionalCategoryIds']??[]))), 'colors' => $p['colors'], 'sizes' => $p['sizes'], 'photos' => $photos, 'priceFrom' => $prices];
        }, $records));
    });warehouse_json(['products' => $products]);
} catch (Throwable $e) { warehouse_json(['products' => [], 'error' => 'Складской каталог временно недоступен.'], 503); }
