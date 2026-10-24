<?php
declare(strict_types=1);
require_once __DIR__.'/storage.php';
header('Cache-Control: no-store');header('X-Content-Type-Options: nosniff');
if(($_SERVER['REMOTE_USER']??'')!==WAREHOUSE_OWNER){http_response_code(403);exit('Статистика доступна только владельцу через защищённый вход склада.');}
if(isset($_GET['report'])){
 header('Content-Type: application/json; charset=utf-8');
 require_once __DIR__.'/../traffic-domain.php';
 $range=(int)($_GET['days']??7);if(!in_array($range,[1,7,30,90],true)){http_response_code(400);exit('{"error":"Неверный период"}');}
 try{echo json_encode(traffic_store(function(array &$s)use($range){return traffic_report($s,$range,traffic_day());}),JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);}
 catch(Throwable $e){http_response_code(503);echo '{"error":"Статистика временно недоступна. Попробуйте обновить позже."}';}
 exit;
}
header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'none'");
?><!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Статистика магазина · Lucky</title><link rel="stylesheet" href="./analytics.css?v=20261024"></head><body><main>
<header><div><a href="./">← Управление товарами</a><p class="eyebrow">LUCKY · СТАТИСТИКА МАГАЗИНА</p><h1>Посетители и интерес к товарам</h1></div><label>Период<select id="period"><option value="1">Сегодня</option><option value="7" selected>7 дней</option><option value="30">30 дней</option><option value="90">90 дней</option></select></label></header>
<p id="status" role="status">Загружаем статистику…</p><section id="metrics" class="metrics" aria-label="Основные показатели"></section>
<section class="panel"><h2>Действия посетителей</h2><p>Число визитов, в которых совершили действие. Один визит может попасть в несколько строк; это не подтверждённые заказы.</p><div id="stages"></div></section>
<div class="columns"><section class="panel"><h2>Откуда приходят</h2><div id="sources"></div></section><section class="panel"><h2>Устройства</h2><div id="devices"></div></section></div>
<div class="columns"><section class="panel"><h2>Популярные категории</h2><div id="categories"></div></section><section class="panel"><h2>Просмотры товаров</h2><div id="products"></div></section></div>
<section class="panel"><h2>Рекламные кампании</h2><p>Источник / канал / кампания из UTM-меток. Пример ссылки для Instagram:</p><code>https://opt.luckysport.kz/?utm_source=instagram&amp;utm_medium=social&amp;utm_campaign=sambo</code><div id="campaigns"></div></section>
<section class="panel"><h2>По дням</h2><div id="days"></div></section>
<footer><p>Визит — активность одного браузера с перерывом не более 30 минут. Данные начинаются с подключения статистики, хранятся до 90 дней. День считается по времени Казахстана (UTC+5). Блокировщики, запрет отслеживания и отключённый JavaScript могут уменьшать показатели.</p><p>Сохраняем агрегаты событий и случайный идентификатор визита в закрытом хранилище. Аналитика не сохраняет IP, телефоны, тексты заявок или поисковые запросы и не отправляет данные сторонним сервисам. Технические журналы хостинга существуют отдельно.</p><button id="exclude" type="button"></button><span id="excludedStatus" role="status"></span></footer>
</main><script type="module" src="./analytics-ui.js?v=20261024"></script></body></html>
