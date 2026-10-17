<?php
declare(strict_types=1);
const WAREHOUSE_OWNER = 'meiram';
function warehouse_private(): string {
    $root = realpath($_SERVER['DOCUMENT_ROOT'] ?? '');
    $path = $root ? realpath(dirname($root) . '/lucky-wholesale-private') : false;
    if (!$path || strpos($path . '/', $root . '/') === 0) throw new RuntimeException('Закрытое хранилище не найдено.');
    return $path;
}
function warehouse_state(callable $callback) {
    $path = warehouse_private();
    $lock = @fopen($path . '/warehouse.lock', 'c+');
    if (!$lock || !flock($lock, LOCK_EX)) throw new RuntimeException('Хранилище недоступно.');
    try {
        $file = $path . '/warehouse-state.json';
        $raw = is_file($file) ? file_get_contents($file) : '';
        $state = $raw === '' ? ['products' => [], 'photos' => []] : json_decode($raw, true);
        if (!is_array($state) || !isset($state['products'], $state['photos'])) throw new RuntimeException('Не удалось прочитать хранилище.');
        $before = $state;
        $garbage = warehouse_expire_trash($state);
        $result = $callback($state);
        if ($state !== $before) {
            $json = json_encode($state, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
            $temp = tempnam($path, 'warehouse-');
            if (!$temp || file_put_contents($temp, $json) !== strlen($json) || !rename($temp, $file)) throw new RuntimeException('Не удалось сохранить товар.');
            @chmod($file, 0600);
        }
        foreach ($garbage as $name) { $file = warehouse_photo_path($name); if (is_file($file)) @unlink($file); }
        return $result;
    } finally { flock($lock, LOCK_UN); fclose($lock); }
}
function warehouse_photo_path(string $name): string {
    if (!preg_match('/^[a-f0-9]{32}\.(jpg|png|webp)$/D', $name)) throw new RuntimeException('Неверное имя фото.');
    return warehouse_private() . '/warehouse-photos/' . $name;
}
function warehouse_json(array $data, int $status = 200): void {
    http_response_code($status); header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store'); header('X-Content-Type-Options: nosniff');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit;
}

function warehouse_expire_trash(array &$state): array {
    foreach ($state['products'] as &$product) if (empty($product['createdAt'])) $product['createdAt'] = $product['updatedAt'] ?? gmdate('c');
    unset($product);
    $candidates = [];$now = time();
    foreach ($state['products'] as $id => $p) {
        if (($p['status'] ?? '') !== 'trashed' || empty($p['deleteAfter']) || strtotime($p['deleteAfter']) > $now) continue;
        foreach (array_merge($p['photos'], $p['studioResults'] ?? []) as $photoId) $candidates[$photoId] = true;
        unset($state['products'][$id]);
        foreach ($state['batches'] ?? [] as $key => $batch) if (in_array($id, $batch['ids'] ?? [], true)) unset($state['batches'][$key]);
    }
    $used = [];
    foreach ($state['products'] as $p) foreach (array_merge($p['photos'], $p['studioResults'] ?? []) as $photoId) $used[$photoId] = true;
    $files = [];
    foreach ($candidates as $photoId => $_) {
        if (isset($used[$photoId]) || !isset($state['photos'][$photoId])) continue;
        foreach (['original', 'processed'] as $kind) if (!empty($state['photos'][$photoId][$kind])) $files[] = $state['photos'][$photoId][$kind];
        unset($state['photos'][$photoId]);
    }
    foreach ($state['wbPrices'] ?? [] as $id => $p) if (($p['status'] ?? '') === 'trashed' && !empty($p['deleteAfter']) && strtotime($p['deleteAfter']) <= $now) {
        $state['wbDeleted'][$id] = true;unset($state['wbPrices'][$id]);
    }
    $retained = [];foreach ($state['photos'] as $photo) foreach (['original', 'processed'] as $kind) if (!empty($photo[$kind])) $retained[$photo[$kind]] = true;
    return array_values(array_filter(array_unique($files), fn($name) => !isset($retained[$name])));
}

