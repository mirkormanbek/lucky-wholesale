<?php
// Local PHP development only; production uses Apache .htaccess.
$path=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH);
if($path==='/'){require dirname(__DIR__).'/public/index.php';return true;}
if(preg_match('~^/product/([A-Za-z0-9_-]+)/?$~D',$path,$m)){$_GET['slug']=$m[1];require dirname(__DIR__).'/public/product.php';return true;}
if($path==='/sitemap.xml'){require dirname(__DIR__).'/public/sitemap.php';return true;}
if(preg_match('~^/(?:\.env|(?:site-config|lead-domain|storefront-data|storefront-views)\.php)~',$path)){http_response_code(403);return true;}
return false;
