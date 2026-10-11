<?php
declare(strict_types=1);
require __DIR__ . '/warehouse/wb-pricing.php';
// Published catalog only; safe for the additional GitHub Pages preview.
header('Access-Control-Allow-Origin: *');
try { warehouse_json(['products' => wb_public_products()]); }
catch (Throwable $e) { warehouse_json(['error' => 'Каталог временно недоступен.'], 503); }
