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
        $result = $callback($state);
        if ($state !== $before) {
            $json = json_encode($state, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
            $temp = tempnam($path, 'warehouse-');
            if (!$temp || file_put_contents($temp, $json) !== strlen($json) || !rename($temp, $file)) throw new RuntimeException('Не удалось сохранить товар.');
            @chmod($file, 0600);
        }
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
