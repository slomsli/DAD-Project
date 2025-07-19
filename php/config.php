<?php
require_once __DIR__ . '/vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

define('DB_SERVER', 'localhost');
define('DB_USERNAME', 'root');
define('DB_PASSWORD', '');
define('DB_NAME', 'restaurant_db');

define('SENDGRID_API_KEY', $_ENV['SENDGRID_API_KEY']);
define('SITE_FROM_EMAIL', $_ENV['SITE_FROM_EMAIL']);
define('SITE_FROM_NAME', $_ENV['SITE_FROM_NAME']);

$conn = new mysqli(DB_SERVER, DB_USERNAME, DB_PASSWORD, DB_NAME);

if ($conn->connect_error) {
    die("ERROR: Could not connect. " . $conn->connect_error);
}

if (!$conn->set_charset("utf8mb4")) {
    // Optional charset check
}

function sanitize($data) {
    global $conn;
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data);
    return $conn->real_escape_string($data);
}

function isLoggedIn() {
    return isset($_SESSION['user_id']) && !empty($_SESSION['user_id']);
}

function hasRole($role) {
    return isLoggedIn() && $_SESSION['role'] === $role;
}

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
?>
