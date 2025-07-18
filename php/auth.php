<?php
// Include database configuration
require_once 'config.php';

// Handle login request
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'login') {
    $email = sanitize($_POST['email']);
    $password = md5($_POST['password']); // Using MD5 as specified in requirements
    
    $stmt = $conn->prepare("SELECT id, name, email, role, platform FROM users WHERE email = ? AND password = ?");
    $stmt->bind_param("ss", $email, $password);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 1) {
        $user = $result->fetch_assoc();
        
        // Set session variables
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['name'] = $user['name'];
        $_SESSION['email'] = $user['email'];
        $_SESSION['role'] = $user['role'];
        $_SESSION['platform'] = $user['platform'];
        
        // Return success response with user data
        echo json_encode([
            'success' => true,
            'user' => [
                'id' => $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'role' => $user['role'],
                'platform' => $user['platform']
            ]
        ]);
    } else {
        // Return error response
        echo json_encode([
            'success' => false,
            'message' => 'Invalid email or password'
        ]);
    }
    exit;
}

// Handle registration request
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'register') {
    $name = sanitize($_POST['name']);
    $email = sanitize($_POST['email']);
    $phone = sanitize($_POST['phone']);
    $password = md5($_POST['password']); // Using MD5 as specified in requirements

    // --- BEGIN NEW CODE for Role and Platform ---
    $role = sanitize($_POST['role']); // Get role from POST
    $platform = null; // Default platform to null

    // Validate role
    $allowed_roles = ['customer', 'staff', 'runner'];
    if (!in_array($role, $allowed_roles)) {
        echo json_encode([
            'success' => false,
            'message' => 'Invalid role specified'
        ]);
        exit;
    }

    if ($role === 'runner') {
        if (isset($_POST['platform'])) {
            $platform = sanitize($_POST['platform']);
            // Optional: Validate platform value if needed (e.g., 'grab', 'foodpanda')
            $allowed_platforms = ['grab', 'foodpanda'];
            if (!in_array($platform, $allowed_platforms)) {
                echo json_encode([
                    'success' => false,
                    'message' => 'Invalid platform specified for runner'
                ]);
                exit;
            }
        } else {
            // Runner role requires a platform
            echo json_encode([
                'success' => false,
                'message' => 'Platform not specified for runner role'
            ]);
            exit;
        }
    }
    // --- END NEW CODE for Role and Platform ---
    
    // Check if email already exists
    $stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        // Email already exists
        echo json_encode([
            'success' => false,
            'message' => 'Email already registered'
        ]);
    } else {
        // Insert new user
        $stmt = $conn->prepare("INSERT INTO users (name, email, phone, password, role, platform) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("ssssss", $name, $email, $phone, $password, $role, $platform);
        
        if ($stmt->execute()) {
            $user_id = $stmt->insert_id;
            
            // Set session variables
            $_SESSION['user_id'] = $user_id;
            $_SESSION['name'] = $name;
            $_SESSION['email'] = $email;
            $_SESSION['role'] = $role;
            $_SESSION['platform'] = $platform;
            
            // Return success response
            echo json_encode([
                'success' => true,
                'user' => [
                    'id' => $user_id,
                    'name' => $name,
                    'email' => $email,
                    'role' => $role,
                    'platform' => $platform
                ]
            ]);
        } else {
            // Return error response
            echo json_encode([
                'success' => false,
                'message' => 'Registration failed: ' . $stmt->error
            ]);
        }
    }
    exit;
}

// Handle logout request
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'logout') {
    // Clear all session variables
    $_SESSION = array();
    
    // Destroy the session
    session_destroy();
    
    // Return success response
    echo json_encode([
        'success' => true,
        'message' => 'Logged out successfully'
    ]);
    exit;
}

// Check if user is logged in
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'check_auth') {
    if (isLoggedIn()) {
        echo json_encode([
            'success' => true,
            'user' => [
                'id' => $_SESSION['user_id'],
                'name' => $_SESSION['name'],
                'email' => $_SESSION['email'],
                'role' => $_SESSION['role'],
                'platform' => $_SESSION['platform']
            ]
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Not logged in'
        ]);
    }
    exit;
}

// If no valid action is specified, return error
echo json_encode([
    'success' => false,
    'message' => 'Invalid request'
]);
?>
