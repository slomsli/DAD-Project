<?php
// Database configuration
define('DB_SERVER', 'localhost'); // or '127.0.0.1'
define('DB_USERNAME', 'root');    // Default XAMPP username
define('DB_PASSWORD', '');        // Default XAMPP password is empty
define('DB_NAME', 'restaurant_db'); // <<<<< IMPORTANT: Change this if your database name is different


define('SENDGRID_API_KEY', '');   // starts with SG.
define('SITE_FROM_EMAIL',  'b032310760@student.utem.edu.my');      // verified single sender
define('SITE_FROM_NAME',   'InfoNexus Group');


// Attempt to connect to MySQL database
$conn = new mysqli(DB_SERVER, DB_USERNAME, DB_PASSWORD, DB_NAME);

// Check connection
if ($conn->connect_error) {
    die("ERROR: Could not connect. " . $conn->connect_error);
}

// Optional: Set character set to utf8mb4 (good for handling various characters)
if (!$conn->set_charset("utf8mb4")) {
    // printf("Error loading character set utf8mb4: %s\n", $conn->error); // Optional: Log or handle if needed, ensure newline is escaped if uncommented
}

// The $conn variable is now your active database connection.
// Other PHP scripts that need database access can require_once 'config.php';
// and then use the $conn variable.

// Function to sanitize input data
function sanitize($data) {
    global $conn;
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data);
    $data = $conn->real_escape_string($data);
    return $data;
}

// Function to check if user is logged in
function isLoggedIn() {
    return isset($_SESSION['user_id']) && !empty($_SESSION['user_id']);
}

// Function to check user role
function hasRole($role) {
    return isLoggedIn() && $_SESSION['role'] === $role;
}

// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
?>
