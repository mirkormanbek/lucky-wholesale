<?php
// CLI-only, offline preflight. Never reads credentials or contacts Telegram.
if (PHP_SAPI !== 'cli') exit;
if (in_array('-Inspect', $argv, true)) {
    echo json_encode(['curl' => extension_loaded('curl'), 'ca' => ini_get('curl.cainfo')]);
    exit;
}
if (!extension_loaded('curl')) {
    fwrite(STDERR, "PHP cURL is missing. No message sent.\n");
    exit(2);
}
$ca = ini_get('curl.cainfo');
if ($ca !== '' && (!is_readable($ca) || filesize($ca) === 0)) {
    fwrite(STDERR, "PHP CA bundle is not readable. No message sent.\n");
    exit(3);
}
echo "PHP and cURL ready.\n";
