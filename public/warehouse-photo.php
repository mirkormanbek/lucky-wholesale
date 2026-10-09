<?php
declare(strict_types=1);
require __DIR__ . '/warehouse/storage.php';
try {
    $id = $_GET['id'] ?? '';
    if (!preg_match('/^[a-f0-9]{32}$/D', $id)) { http_response_code(404); exit; }
    $name = warehouse_state(function(&$s) use ($id) {
        $photo = $s['photos'][$id] ?? null;
        if (!$photo || !$photo['approved'] || !$photo['processed']) return null;
        foreach ($s['products'] as $p) if ($p['status'] === 'published' && in_array($id, $p['photos'], true)) return $photo['processed'];
        return null;
    });
    if (!$name || !is_file(warehouse_photo_path($name))) { http_response_code(404); exit; }
    header('Content-Type: ' . (new finfo(FILEINFO_MIME_TYPE))->file(warehouse_photo_path($name)));
    header('Cache-Control: no-store');header('X-Content-Type-Options: nosniff');readfile(warehouse_photo_path($name));
} catch (Throwable $e) { http_response_code(503); }
