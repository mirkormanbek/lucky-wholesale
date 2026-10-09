<?php
declare(strict_types=1);
require __DIR__ . '/storage.php';
// Enable only behind web-server authentication (Plesk protected directory).
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Content-Type: application/json; charset=utf-8');
function answer(array $data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
if (empty($_SERVER['REMOTE_USER'])) answer(['error' => 'Сначала настройте закрытый доступ в Plesk.'], 403);
if ($_SERVER['REMOTE_USER'] !== WAREHOUSE_OWNER) answer(['error' => 'ИИ-обработка доступна только владельцу.'], 403);
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') answer(['error' => 'Нужен POST-запрос.'], 405);
if (($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') !== 'LuckyWarehouse' || ($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '') === 'cross-site') answer(['error' => 'Недопустимый запрос.'], 403);
$root = realpath($_SERVER['DOCUMENT_ROOT'] ?? '');
$private = $root ? realpath(dirname($root) . '/lucky-wholesale-private') : false;
if (!$private || !$root || strpos($private . '/', $root . '/') === 0) answer(['error' => 'Закрытая конфигурация не найдена.'], 503);
if (!function_exists('curl_init') || !function_exists('finfo_open')) answer(['error' => 'На сервере нужны расширения cURL и Fileinfo.'], 503);
$keyFile = $private . '/openai-key.php';
if (!is_readable($keyFile)) answer(['error' => 'Сервер не может прочитать ключ.'], 503);
$key = require $keyFile;
if (!is_string($key) || strlen(trim($key)) < 20) answer(['error' => 'Ключ не настроен.'], 503);
$photo = $_FILES['photo'] ?? null;
if (!$photo || $photo['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($photo['tmp_name']) || $photo['size'] > 12 * 1024 * 1024) answer(['error' => 'Загрузите JPEG, PNG или WebP до 12 МБ.'], 400);
$mime = (new finfo(FILEINFO_MIME_TYPE))->file($photo['tmp_name']);
$extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
$dimensions = @getimagesize($photo['tmp_name']);
if (!isset($extensions[$mime]) || !$dimensions || $dimensions[0] * $dimensions[1] > 40000000) answer(['error' => 'Неверный формат или слишком большое фото.'], 400);
// Reserve before the API call. Failures consume the allowance because provider billing
// may still occur after a timeout. No automatic retries or parallel provider requests.
$lock = @fopen($private . '/photo-processing-limit.json', 'c+');
if (!$lock || !flock($lock, LOCK_EX | LOCK_NB)) answer(['error' => 'Обработка уже идёт или хранилище недоступно. Попробуйте позже.'], 429);
$raw = stream_get_contents($lock);
$limit = $raw === '' ? [] : json_decode($raw, true);
if (!is_array($limit)) answer(['error' => 'Не удалось проверить лимит обработки.'], 503);
$day = gmdate('Y-m-d');
$count = ($limit['day'] ?? '') === $day ? (int)($limit['count'] ?? 0) : 0;
if ($count >= 10) answer(['error' => 'Достигнут тестовый лимит: 10 обработок в сутки.'], 429);
$encoded = json_encode(['day' => $day, 'count' => $count + 1]);
rewind($lock);
if (fwrite($lock, $encoded) !== strlen($encoded) || !ftruncate($lock, strlen($encoded)) || !fflush($lock)) answer(['error' => 'Не удалось сохранить лимит.'], 503);
$prompt = 'Edit the supplied product photograph for a wholesale product card. Isolate the exact photographed product on a plain pure white studio background. Center the product with comfortable margins, soft studio lighting and a subtle natural contact shadow. Preserve the actual product shape, proportions, color, material, seams, logos, labels and package contents. Do not invent or reconstruct unreadable lettering, add accessories, recolor or redesign the product. Remove only the surrounding scene. If multiple different product models are visible, preserve the whole group without inventing a selection.';
$curl = curl_init('https://api.openai.com/v1/images/edits');
curl_setopt_array($curl, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 15, CURLOPT_TIMEOUT => 100, CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . trim($key)], CURLOPT_POSTFIELDS => ['model' => 'gpt-image-1.5', 'image' => new CURLFile($photo['tmp_name'], $mime, 'product.' . $extensions[$mime]), 'prompt' => $prompt, 'input_fidelity' => 'high', 'quality' => 'medium', 'size' => '1024x1024', 'background' => 'opaque', 'output_format' => 'png']]);
$response = curl_exec($curl);
$status = (int)curl_getinfo($curl, CURLINFO_HTTP_CODE);
curl_close($curl);
flock($lock, LOCK_UN);
fclose($lock);
unset($key);
if ($response === false || $status < 200 || $status >= 300) answer(['error' => 'Сервис не завершил обработку. Оригинал сохранён. Проверьте доступ к Images API, баланс и лимиты. Повторный запуск может снова списать средства.'], 502);
$data = json_decode($response, true);
$base64 = $data['data'][0]['b64_json'] ?? null;
$bytes = is_string($base64) ? base64_decode($base64, true) : false;
if (!$bytes || strlen($bytes) > 20 * 1024 * 1024 || substr($bytes, 0, 8) !== "\x89PNG\r\n\x1a\n") answer(['error' => 'Сервис вернул неверное изображение. Оригинал сохранён.'], 502);
answer(['image' => 'data:image/png;base64,' . $base64, 'status' => 'needs_review']);
