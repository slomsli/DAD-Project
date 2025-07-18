<?php
// Include database configuration
require_once 'config.php';

// General API endpoint for common operations
// This file serves as a router for various API requests

// Get request parameters
$action = isset($_GET['action']) ? $_GET['action'] : (isset($_POST['action']) ? $_POST['action'] : null);

if (!$action) {
    echo json_encode([
        'success' => false,
        'message' => 'No action specified'
    ]);
    exit;
}

// Route to appropriate handler based on action
switch ($action) {
    // Authentication actions
    case 'login':
    case 'register':
    case 'logout':
    case 'check_auth':
        require_once 'auth.php';
        break;
        
    // Menu actions
    case 'get_all_items':
    case 'get_item':
    case 'add_item':
    case 'update_item':
    case 'toggle_availability':
    case 'delete_item':
        require_once 'menu.php';
        break;
        
    // Order actions
    case 'create_order':
    case 'get_customer_orders':
    case 'get_staff_orders':
    case 'get_runner_orders':
    case 'get_order_details':
    case 'update_order_status_staff':
    case 'assign_platform':
    case 'pickup_order':
    case 'update_order_status_runner':
    case 'confirm_and_assign_platform':
        require_once 'orders.php';
        break;
        
    // Default: invalid action
    default:
        echo json_encode([
            'success' => false,
            'message' => 'Invalid action: ' . $action
        ]);
        break;
}
?>
