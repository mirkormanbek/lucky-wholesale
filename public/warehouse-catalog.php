<?php
declare(strict_types=1);
require __DIR__ . '/warehouse/storage.php';
try {
    $products = warehouse_state(function(&$s) {
        $records = array_filter($s['products'], fn($p) => $p['status'] === 'published');
        return array_values(array_map(function($p) use ($s) {
            $photos = [];
            foreach ($p['photos'] as $id) if ($s['photos'][$id]['approved'] && $s['photos'][$id]['processed']) $photos[] = './warehouse-photo.php?id=' . $id;
            return ['id' => 'warehouse-' . $p['id'], 'article' => $p['article'], 'title' => $p['title'], 'brand' => 'Lucky', 'description' => $p['material'] ? 'Материал: ' . $p['material'] : '', 'categoryIds' => [$p['categoryId']], 'colors' => $p['colors'], 'sizes' => $p['sizes'], 'photos' => $photos, 'priceFrom' => [$p['currency'] => $p['price']]];
        }, $records));
    });warehouse_json(['products' => $products]);
} catch (Throwable $e) { warehouse_json(['products' => [], 'error' => 'Складской каталог временно недоступен.'], 503); }
