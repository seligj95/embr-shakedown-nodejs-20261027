<?php

declare(strict_types=1);

header('Content-Type: text/plain; charset=utf-8');

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if ($path !== '/' && $path !== '/index.php') {
    http_response_code(404);
    echo "Not found\n";
    return;
}

$greeting = getenv('GREETING');
if ($greeting === false || $greeting === '') {
    $greeting = 'Hello';
}

http_response_code(200);
echo "App Service Builder / php-web: {$greeting} (PHP " . PHP_VERSION . ")\n";
