<?php
declare(strict_types=1);
require_once __DIR__ . '/storage.php';
function wb_source(): array {
    $data = json_decode((string)file_get_contents(dirname(__DIR__) . '/data/catalog.json'), true);
    if (!is_array($data) || !isset($data['products'])) throw new RuntimeException('Каталог недоступен.');
    $products = [];
    foreach ($data['products'] as $p) if (preg_match('/^wb-[1-9][0-9]*$/D', $p['id'] ?? '')) $products[$p['id']] = $p;
    return $products;
}
function wb_existing(): array {
    $data = json_decode((string)file_get_contents(__DIR__ . '/wb-existing.json'), true);
    if (!isset($data['ids']) || !is_array($data['ids'])) throw new RuntimeException('Список опубликованных товаров недоступен.');
    return array_fill_keys($data['ids'], true);
}
function wb_admin_products(): array {
    $source = wb_source();$existing = wb_existing();
    return warehouse_state(function(&$s) use ($source, $existing) {
        $result = [];
        foreach ($source as $id => $p) {
            if (!empty($s['wbDeleted'][$id])) continue;
            $own = $s['wbPrices'][$id] ?? null;
            $result[] = ['id' => $id, 'title' => $p['title'], 'article' => $p['article'], 'photo' => $p['photos'][0] ?? '', 'price' => $own['price'] ?? null, 'status' => $own['status'] ?? (isset($existing[$id]) ? 'published' : 'draft'), 'revision' => $own['revision'] ?? 0, 'categoryIds' => $p['categoryIds'] ?? [], 'deleteAfter' => $own['deleteAfter'] ?? null];
        }
        return $result;
    });
}
function wb_save_prices(array $items): void {
    if (count($items) < 1 || count($items) > 50) warehouse_json(['error' => 'Выберите от 1 до 50 товаров.'], 400);
    $source = wb_source();$existing = wb_existing();
    warehouse_state(function(&$s) use ($items, $source, $existing) {
        $updates = [];
        foreach ($items as $item) {
            $id = $item['id'] ?? '';
            if (!is_string($id) || !isset($source[$id]) || isset($updates[$id])) warehouse_json(['error' => 'Товар не найден или указан повторно. Обновите список.'], 400);
            if (!empty($s['wbDeleted'][$id])) warehouse_json(['error' => 'Товар окончательно удалён.'], 404);
        $old = $s['wbPrices'][$id] ?? null;
            if (($item['revision'] ?? null) !== ($old['revision'] ?? 0)) warehouse_json(['error' => 'Цена изменена на другом устройстве. Обновите список.'], 409);
            $price = $item['price'] ?? null;
            if (!is_numeric($price) || !is_finite((float)$price) || $price < 0.01 || $price > 100000000) warehouse_json(['error' => 'Укажите корректную оптовую цену.'], 400);
            $status = !empty($item['publish']) ? 'published' : ($old['status'] ?? (isset($existing[$id]) ? 'published' : 'draft'));
            if (($old['status'] ?? '') === 'trashed') warehouse_json(['error' => 'Сначала восстановите товар.'], 409);
            $updates[$id] = ['price' => round((float)$price, 2), 'status' => $status, 'revision' => ($old['revision'] ?? 0) + 1, 'updatedAt' => gmdate('c')];
        }
        foreach ($updates as $id => $value) $s['wbPrices'][$id] = $value;
    });
}
function wb_hide_product(array $input): void {
    $source = wb_source();$id = $input['id'] ?? '';
    if (!is_string($id) || !isset($source[$id])) warehouse_json(['error' => 'Товар не найден.'], 404);
    warehouse_state(function(&$s) use ($input, $id) {
        if (!empty($s['wbDeleted'][$id])) warehouse_json(['error' => 'Товар окончательно удалён.'], 404);
        $old = $s['wbPrices'][$id] ?? null;
        if (($input['revision'] ?? null) !== ($old['revision'] ?? 0)) warehouse_json(['error' => 'Товар изменён на другом устройстве. Обновите список.'], 409);
        if (($old['status'] ?? '') === 'trashed') warehouse_json(['error' => 'Сначала восстановите товар.'], 409);
        $s['wbPrices'][$id] = ['price' => $old['price'] ?? null, 'status' => !empty($input['trash']) ? 'trashed' : 'hidden', 'revision' => ($old['revision'] ?? 0) + 1, 'updatedAt' => gmdate('c')];
        if (!empty($input['trash'])) { $s['wbPrices'][$id]['deleteAfter'] = gmdate('c', time() + 86400); $s['wbPrices'][$id]['previousStatus'] = $old['status'] ?? (isset(wb_existing()[$id]) ? 'published' : 'draft'); }
    });
}
function wb_public_products(): array {
    $source = wb_source();$existing = wb_existing();
    $fx = json_decode((string)file_get_contents(dirname(__DIR__) . '/data/fx.json'), true);
    return warehouse_state(function(&$s) use ($source, $existing, $fx) {
        $result = [];
        foreach ($source as $id => $p) {
            if (!empty($s['wbDeleted'][$id])) continue;
            $own = $s['wbPrices'][$id] ?? null;
            if ($own ? $own['status'] !== 'published' : !isset($existing[$id])) continue;
            if ($own && $own['price'] !== null) {
                $p['priceFromKzt'] = $own['price'];$p['priceFrom'] = ['KZT' => $own['price']];
                foreach (['RUB', 'USD'] as $currency) { $rate = $fx['kztPerUnit'][$currency] ?? 0;if (is_numeric($rate) && $rate > 0) $p['priceFrom'][$currency] = round($own['price'] / $rate, 2); }
            }
            $result[] = $p;
        }
        return $result;
    });
}

function wb_restore_product(array $input): void {
    $id = $input['id'] ?? '';if (!is_string($id)) warehouse_json(['error' => 'Неверный товар.'], 400);
    warehouse_state(function(&$s) use ($id, $input) {
        $old = $s['wbPrices'][$id] ?? null;
        if (!$old || ($old['status'] ?? '') !== 'trashed') warehouse_json(['error' => 'Товар не в корзине.'], 404);
        if (($input['revision'] ?? null) !== $old['revision']) warehouse_json(['error' => 'Товар изменён. Обновите список.'], 409);
        $old['status'] = $old['previousStatus'] ?? 'hidden';unset($old['deleteAfter'], $old['previousStatus']);
        $old['revision']++;$old['updatedAt'] = gmdate('c');$s['wbPrices'][$id] = $old;
    });
}
