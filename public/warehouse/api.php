<?php
declare(strict_types=1);
require __DIR__ . '/storage.php';
function stop(string $message, int $code = 400): void { warehouse_json(['error' => $message], $code); }
$user = $_SERVER['REMOTE_USER'] ?? '';
if ($user === '') stop('Нужен защищённый вход Plesk.', 403);
$owner = $user === WAREHOUSE_OWNER;
$action = $_GET['action'] ?? 'list';
$post = ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST';
if ($post && (($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') !== 'LuckyWarehouse' || ($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '') === 'cross-site')) stop('Недопустимый запрос.', 403);
if (!$post && !in_array($action, ['list', 'photo'], true)) stop('Нужен POST-запрос.', 405);
function can_read(array $record): bool { global $user, $owner; return $owner || ($record['owner'] ?? '') === $user; }
function clean_text($value, int $max): string { if (!is_string($value) || strlen($value) > $max) stop('Неверное поле.'); return trim($value); }
function clean_list($value): array { if (!is_array($value) || count($value) > 20) stop('Неверный список характеристик.'); return array_values(array_unique(array_filter(array_map(fn($v) => clean_text($v, 180), $value)))); }
function present(array $product, array $state): array {
    $product['photos'] = array_values(array_map(function($id) use ($state) {
        $photo = $state['photos'][$id];
        return ['id' => $id, 'serverId' => $id, 'name' => $photo['name'], 'original' => $photo['original'] ? './api.php?action=photo&id=' . $id . '&kind=original' : null, 'processed' => $photo['processed'] ? './api.php?action=photo&id=' . $id . '&kind=processed' : null, 'processingStatus' => $photo['approved'] ? 'approved' : ($photo['processed'] ? 'needs_review' : 'pending')];
    }, $product['photos']));
    return $product;
}
try {
    if ($action === 'list') warehouse_json(warehouse_state(function(&$state) use ($user, $owner) { return ['user' => $user, 'role' => $owner ? 'owner' : 'manager', 'products' => array_values(array_map(fn($p) => present($p, $state), array_filter($state['products'], fn($p) => can_read($p))))]; }));
    if ($action === 'photo') {
        $id = $_GET['id'] ?? ''; $kind = $_GET['kind'] ?? 'original';
        $photo = warehouse_state(fn(&$s) => $s['photos'][$id] ?? null);
        if (!$photo || !can_read($photo) || !in_array($kind, ['original', 'processed'], true) || !$photo[$kind]) stop('Фото недоступно.', 404);
        $file = warehouse_photo_path($photo[$kind]);
        if (!is_file($file)) stop('Фото недоступно.', 404);
        header('Content-Type: ' . (new finfo(FILEINFO_MIME_TYPE))->file($file));header('Cache-Control: no-store');header('X-Content-Type-Options: nosniff');readfile($file);exit;
    }
    if ($action === 'upload') {
        $upload = $_FILES['photo'] ?? null; $kind = $_POST['kind'] ?? 'original'; $id = $_POST['id'] ?? '';
        if (!in_array($kind, ['original', 'processed'], true) || ($kind === 'processed' && !$owner)) stop('Нет доступа к обработанным фото.', 403);
        if (!$upload || $upload['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($upload['tmp_name']) || $upload['size'] > 12 * 1024 * 1024) stop('Нужен JPEG, PNG или WebP до 12 МБ.');
        $mime = (new finfo(FILEINFO_MIME_TYPE))->file($upload['tmp_name']);$types = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];$dims = @getimagesize($upload['tmp_name']);
        if (!isset($types[$mime]) || !$dims || $dims[0] * $dims[1] > 40000000) stop('Неверное фото.');
        $folder = warehouse_private() . '/warehouse-photos';if (!is_dir($folder) && !mkdir($folder, 0700)) stop('Не удалось создать папку фото.', 503);
        $name = bin2hex(random_bytes(16)) . '.' . $types[$mime];
        if (!move_uploaded_file($upload['tmp_name'], warehouse_photo_path($name))) stop('Не удалось сохранить фото.', 503);
        @chmod(warehouse_photo_path($name), 0600);
        try {
            $result = warehouse_state(function(&$s) use ($id, $kind, $name, $upload, $user) {
                if ($kind === 'processed') {
                    if (!isset($s['photos'][$id])) stop('Оригинал не найден.', 404);
                    // Published/approved photos cannot be silently overwritten.
                    if ($s['photos'][$id]['approved']) stop('Для замены утверждённого фото добавьте новый ракурс.');
                    if ($s['photos'][$id]['processed']) stop('Результат уже сохранён. Сначала проверьте его.');
                    $s['photos'][$id]['processed'] = $name;
                } else { $id = bin2hex(random_bytes(16)); $s['photos'][$id] = ['owner' => $user, 'name' => basename($upload['name']), 'original' => $name, 'processed' => null, 'approved' => false]; }
                return ['id' => $id];
            });
        } catch (Throwable $e) { @unlink(warehouse_photo_path($name)); throw $e; }
        warehouse_json($result);
    }
    if (strlen((string)file_get_contents('php://input')) > 65536) stop('Слишком большой запрос.');
    $input = json_decode((string)file_get_contents('php://input'), true);if (!is_array($input)) stop('Неверные данные.');
    if ($action === 'batch-save') {
        $batchId = clean_text($input['batchId'] ?? '', 80);
        if (!preg_match('/^[a-zA-Z0-9-]{10,80}$/D', $batchId)) stop('Неверная партия.');
        $items = $input['items'] ?? [];if (!is_array($items) || count($items) < 1 || count($items) > 8) stop('В партии должно быть от 1 до 8 фото.');
        $category = clean_text($input['categoryId'] ?? '', 120);$categories = json_decode((string)file_get_contents(dirname(__DIR__) . '/data/categories.json'), true);
        if (!array_filter($categories ?: [], fn($c) => $c['id'] === $category && ($c['active'] ?? true)) || array_filter($categories ?: [], fn($c) => ($c['parentId'] ?? null) === $category && ($c['active'] ?? true))) stop('Выберите конкретный тип товара.');
        $price = $input['price'] ?? null;if (!is_numeric($price) || !is_finite((float)$price) || $price <= 0 || $price > 100000000) stop('Укажите корректную цену.');
        $title = clean_text($input['title'] ?? '', 480);if (!$title) stop('Название не сформировано.');
        $material = clean_text($input['material'] ?? '', 240);$sizes = clean_list($input['sizes'] ?? []);$colors = clean_list($input['colors'] ?? []);if (count($colors) > 1) stop('Укажите один общий цвет или оставьте цвет пустым.');
        $fingerprint = hash('sha256', json_encode($input, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
        $records = warehouse_state(function(&$s) use ($batchId, $items, $input, $category, $price, $title, $material, $sizes, $colors, $fingerprint, $user, $owner) {
            $batch = $s['batches'][$batchId] ?? null;
            if ($batch) {
                if ($batch['owner'] !== $user) stop('Нет доступа к партии.', 403);
                if ($batch['fingerprint'] !== $fingerprint) stop('Эта партия уже сохранена с другими данными. Обновите список товаров.', 409);
                return array_map(fn($id) => present($s['products'][$id], $s), $batch['ids']);
            }
            $ids = []; $photoIds = [];
            foreach ($items as $item) {
                $id = clean_text($item['id'] ?? '', 80);$photoId = clean_text($item['photoId'] ?? '', 80);
                if (!preg_match('/^[a-zA-Z0-9-]{10,80}$/D', $id) || isset($s['products'][$id]) || in_array($id, $ids, true)) stop('Неверный или повторный товар.');
                if (!isset($s['photos'][$photoId]) || !can_read($s['photos'][$photoId])) stop('Нет доступа к фото.', 403);
                if (in_array($photoId, $photoIds, true)) stop('Каждому товару нужно отдельное фото.');
                $ids[] = $id;$photoIds[] = $photoId;
            }
            $settings = json_decode((string)file_get_contents(__DIR__ . '/fields.json'), true);
            foreach ($ids as $i => $id) $s['products'][$id] = ['id' => $id, 'article' => 'LW-' . strtoupper(substr(str_replace('-', '', $id), 0, 12)), 'modelGroupId' => $id, 'owner' => $user, 'title' => $title . ' — вариант ' . ($i + 1), 'categoryId' => $category, 'price' => (float)$price, 'currency' => $settings['currency'] ?? 'KZT', 'material' => $material, 'sizes' => $sizes, 'colors' => $colors, 'photos' => [$photoIds[$i]], 'status' => !$owner && !empty($input['submit']) ? 'review' : 'draft', 'comment' => '', 'revision' => 1, 'updatedAt' => gmdate('c')];
            $s['batches'][$batchId] = ['owner' => $user, 'ids' => $ids, 'fingerprint' => $fingerprint];
            return array_map(fn($id) => present($s['products'][$id], $s), $ids);
        });warehouse_json(['products' => $records]);
    }
    if ($action === 'save') {
        $id = clean_text($input['id'] ?? '', 80);if (!preg_match('/^[a-zA-Z0-9-]{10,80}$/D', $id)) stop('Неверный идентификатор.');
        $category = clean_text($input['categoryId'] ?? '', 120);$categories = json_decode((string)file_get_contents(dirname(__DIR__) . '/data/categories.json'), true);
        $valid = array_filter($categories ?: [], fn($c) => $c['id'] === $category && ($c['active'] ?? true));
        $children = array_filter($categories ?: [], fn($c) => ($c['parentId'] ?? null) === $category && ($c['active'] ?? true));
        if (!$valid || $children) stop('Выберите конкретный тип товара.');
        $price = $input['price'] ?? null;if (!is_numeric($price) || !is_finite((float)$price) || $price <= 0 || $price > 100000000) stop('Укажите корректную цену.');
        $ids = $input['photos'] ?? [];if (!is_array($ids) || count($ids) < 1 || count($ids) > 8) stop('Добавьте от 1 до 8 фото.');
        $record = warehouse_state(function(&$s) use ($input, $id, $category, $price, $ids, $user, $owner) {
            $old = $s['products'][$id] ?? null;
            if ($old && !can_read($old)) stop('Нет доступа.', 403);
            if ($old && ($input['revision'] ?? null) !== $old['revision']) stop('Товар изменился на другом устройстве. Обновите список.', 409);
            if ($old && !$owner && in_array($old['status'], ['review', 'published'], true)) stop('Товар уже на проверке. Дождитесь возврата.', 403);
            foreach ($ids as $photoId) if (!is_string($photoId) || !isset($s['photos'][$photoId]) || !can_read($s['photos'][$photoId])) stop('Нет доступа к фото.', 403);
            $derived = clean_text($input['derivedFrom'] ?? '', 80);
            $modelGroupId = $old['modelGroupId'] ?? $id;
            if (!$old && $derived !== '') {
                $source = $s['products'][$derived] ?? null;
                if (!$source || !can_read($source)) stop('Исходная модель недоступна.', 403);
                if ($source['categoryId'] !== $category) stop('Для другой категории создайте новую модель.');
                $modelGroupId = $source['modelGroupId'] ?? $source['id'];
            }
            $colors = clean_list($input['colors'] ?? []);
            if (count($colors) > 1) stop('Каждый цвет — отдельный товар. Оставьте один цвет или создайте другой вариант.');
            $settings = json_decode((string)file_get_contents(__DIR__ . '/fields.json'), true);
            $record = ['id' => $id, 'article' => $old['article'] ?? 'LW-' . strtoupper(substr(str_replace('-', '', $id), 0, 12)), 'owner' => $old['owner'] ?? $user, 'title' => clean_text($input['title'] ?? '', 540), 'categoryId' => $category, 'price' => (float)$price, 'currency' => $settings['currency'] ?? 'KZT', 'material' => clean_text($input['material'] ?? '', 240), 'sizes' => clean_list($input['sizes'] ?? []), 'colors' => clean_list($input['colors'] ?? []), 'photos' => array_values(array_unique($ids)), 'status' => $old && $old['status'] === 'published' ? 'review' : ($old['status'] ?? 'draft'), 'comment' => $old['comment'] ?? '', 'revision' => ($old['revision'] ?? 0) + 1, 'updatedAt' => gmdate('c')];
            if ($record['title'] === '') stop('Название не сформировано.');
            $record['modelGroupId'] = $modelGroupId;
            $s['products'][$id] = $record;return present($record, $s);
        });warehouse_json(['product' => $record]);
    }
    if ($action === 'transition') {
        $id = $input['id'] ?? ''; $to = $input['status'] ?? '';
        $record = warehouse_state(function(&$s) use ($id, $to, $input, $owner) {
            $p = $s['products'][$id] ?? null;if (!$p || !can_read($p)) stop('Товар не найден.', 404);
            if (($input['revision'] ?? null) !== $p['revision']) stop('Товар изменился. Обновите список.', 409);
            if (!$owner && ($to !== 'review' || !in_array($p['status'], ['draft', 'returned'], true))) stop('Нет доступа к публикации.', 403);
            if (!in_array($to, ['review', 'returned', 'published', 'hidden'], true)) stop('Неверный статус.');
            if ($to === 'published') foreach ($p['photos'] as $photoId) if (!$s['photos'][$photoId]['approved'] || !$s['photos'][$photoId]['processed']) stop('Сначала подтвердите обработанные фото.');
            $p['status'] = $to;$p['comment'] = $to === 'returned' ? clean_text($input['comment'] ?? '', 1500) : '';$p['revision']++;$p['updatedAt'] = gmdate('c');$s['products'][$id] = $p;return present($p, $s);
        });warehouse_json(['product' => $record]);
    }
    if ($action === 'reject-photo') {
        if (!$owner) stop('Нет доступа.', 403);
        $removed = warehouse_state(function(&$s) use ($input) {
            $id = $input['id'] ?? ''; $photoId = $input['photoId'] ?? '';
            $p = $s['products'][$id] ?? null;
            if (!$p || !in_array($photoId, $p['photos'], true)) stop('Фото не найдено.', 404);
            if (($input['revision'] ?? null) !== $p['revision']) stop('Товар изменился. Обновите список.', 409);
            if ($s['photos'][$photoId]['approved']) stop('Фото уже подтверждено. Добавьте новый ракурс.');
            $name = $s['photos'][$photoId]['processed'];$s['photos'][$photoId]['processed'] = null;$s['products'][$id]['revision']++;return $name;
        });if ($removed) @unlink(warehouse_photo_path($removed));warehouse_json(['ok' => true]);
    }
    if ($action === 'approve-photo') {
        if (!$owner) stop('Подтверждение доступно только владельцу.', 403);
        $id = $input['id'] ?? '';$photoId = $input['photoId'] ?? '';
        $removed = warehouse_state(function(&$s) use ($id, $photoId, $input) {
            $p = $s['products'][$id] ?? null;if (!$p || !in_array($photoId, $p['photos'], true)) stop('Фото не найдено.', 404);
            if (($input['revision'] ?? null) !== $p['revision']) stop('Товар изменился. Обновите список.', 409);
            $photo = $s['photos'][$photoId];if (!$photo['processed'] || !is_file(warehouse_photo_path($photo['processed']))) stop('Обработанное фото ещё не сохранено.');
            $original = $photo['original'];$s['photos'][$photoId]['approved'] = true;$s['photos'][$photoId]['original'] = null;$s['products'][$id]['revision']++;
            return $original;
        });
        // Delete only after the approved result and metadata have been committed.
        $deleted = !$removed || @unlink(warehouse_photo_path($removed));warehouse_json(['ok' => true, 'originalDeleted' => $deleted]);
    }
    stop('Неизвестное действие.', 404);
} catch (Throwable $e) { stop('Ошибка хранилища. Проверьте права закрытой папки и конфигурацию PHP.', 503); }
