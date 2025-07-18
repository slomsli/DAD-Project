<?php
// Include database configuration
require_once 'config.php';
require_once 'mail.php';
require_once 'user.php';
require_once 'email_templates.php';


// Create a new order
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'create_order') {
    // Check if user is logged in and has customer role
    if (!hasRole('customer')) {
        echo json_encode([
            'success' => false,
            'message' => 'Unauthorized access'
        ]);
        exit;
    }

    // Get order data
    $customer_id = $_SESSION['user_id'];
    $customer_name = sanitize($_SESSION['name']);
    $customer_phone = sanitize($_POST['phone']);
    $delivery_address = sanitize($_POST['delivery_address']);
    $payment_method = sanitize($_POST['payment_method']);
    $subtotal = floatval($_POST['subtotal']);
    $delivery_fee = floatval($_POST['delivery_fee']);
    $total = floatval($_POST['total']);
    $items = json_decode($_POST['items'], true);

    // Start transaction
    $conn->begin_transaction();

    try {
        // Insert order
        $stmt = $conn->prepare("INSERT INTO orders (customer_id, customer_name, customer_phone, delivery_address, payment_method, subtotal, delivery_fee, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("issssddd", $customer_id, $customer_name, $customer_phone, $delivery_address, $payment_method, $subtotal, $delivery_fee, $total);
        $stmt->execute();

        $order_id = $stmt->insert_id;

        // Insert order items
        $stmt = $conn->prepare("INSERT INTO order_items (order_id, menu_item_id, name, price, quantity) VALUES (?, ?, ?, ?, ?)");

        foreach ($items as $item) {
            $menu_item_id = intval($item['id']);
            $name = sanitize($item['name']);
            $price = floatval($item['price']);
            $quantity = intval($item['quantity']);

            $stmt->bind_param("iisdi", $order_id, $menu_item_id, $name, $price, $quantity);
            $stmt->execute();
        }



        echo json_encode([
            'success' => true,
            'message' => 'Order placed successfully',
            'order_id' => $order_id
        ]);
    } catch (Exception $e) {
        // Rollback transaction on error
        $conn->rollback();

        echo json_encode([
            'success' => false,
            'message' => 'Failed to place order: ' . $e->getMessage()
        ]);
    }

    $conn->commit();

    $user = getUser($customer_id);               // ['name','email'] or null

    /* 3) Build invoice table (subtotal + delivery fee) */
    $tableHtml = buildOrderTable($conn, $order_id, $delivery_fee);

    /* 4) Build HTML body                          */
    $html = "
  <p style=\"font-family:Arial,Helvetica,sans-serif;font-size:15px;\">
     Dear {$user['name']},<br><br>
     Thank you for choosing ZZ&nbsp;Restaurant. Your order
     <strong>#{$order_id}</strong> has been received.
  </p>
  {$tableHtml}
  <p style=\"font-family:Arial,Helvetica,sans-serif;font-size:15px;\">
     We will notify you once your meal is delivered.<br><br>
     Kind regards,<br>ZZ&nbsp;Restaurant&nbsp;Team
  </p>";

    try {
        sendMail(
            $user['email'],
            $user['name'],
            "Order #{$order_id} confirmed – ZZ Restaurant",
            $html
        );
    } catch (Throwable $e) {
        error_log('SendGrid confirmation error: ' . $e->getMessage());
    }

    exit;
}

// Get customer orders
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'get_customer_orders') {
    // Check if user is logged in and has customer role
    if (!hasRole('customer')) {
        echo json_encode([
            'success' => false,
            'message' => 'Unauthorized access'
        ]);
        exit;
    }

    $customer_id = $_SESSION['user_id'];

    $stmt = $conn->prepare("SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC");
    $stmt->bind_param("i", $customer_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $orders = [];
    while ($row = $result->fetch_assoc()) {
        $orders[] = $row;
    }

    echo json_encode([
        'success' => true,
        'orders' => $orders
    ]);
    exit;
}

// Get staff orders by status
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'get_staff_orders') {
    // Check if user is logged in and has staff role
    if (!hasRole('staff')) {
        echo json_encode([
            'success' => false,
            'message' => 'Unauthorized access'
        ]);
        exit;
    }

    $status = isset($_GET['status']) ? sanitize($_GET['status']) : null;

    if ($status && $status !== 'all') {
        $stmt = $conn->prepare("SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC");
        $stmt->bind_param("s", $status);
    } else {
        $stmt = $conn->prepare("SELECT * FROM orders ORDER BY created_at DESC");
    }

    $stmt->execute();
    $result = $stmt->get_result();

    $orders = [];
    while ($row = $result->fetch_assoc()) {
        $orders[] = $row;
    }

    echo json_encode([
        'success' => true,
        'orders' => $orders
    ]);
    exit;
}

// Get runner orders
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'get_runner_orders') {
    // Check if user is logged in and has runner role
    if (!hasRole('runner')) {
        echo json_encode([
            'success' => false,
            'message' => 'Unauthorized access'
        ]);
        exit;
    }

    $runner_id = $_SESSION['user_id'];
    $platform = $_SESSION['platform']; // The runner's own platform
    $status_filter = isset($_GET['status']) ? sanitize($_GET['status']) : null; // Renamed to avoid conflict with order.status

    if ($status_filter === 'available') {
        // Get orders that are CONFIRMED for the runner's platform and not yet picked up by any runner
        $stmt = $conn->prepare("SELECT * FROM orders WHERE status = 'confirmed' AND assigned_platform = ? AND assigned_runner_id IS NULL ORDER BY created_at ASC");
        $stmt->bind_param("s", $platform);
    } else if ($status_filter === 'active') {
        // Get orders assigned to THIS specific runner and in progress (picked_up or in_transit)
        $stmt = $conn->prepare("SELECT * FROM orders WHERE assigned_runner_id = ? AND status IN ('picked_up', 'in_transit') ORDER BY created_at ASC");
        $stmt->bind_param("i", $runner_id);
    } else if ($status_filter === 'history') {
        // Get orders delivered by THIS specific runner
        $stmt = $conn->prepare("SELECT * FROM orders WHERE assigned_runner_id = ? AND status = 'delivered' ORDER BY created_at DESC");
        $stmt->bind_param("i", $runner_id);
    } else {
        // Default or invalid status_filter: Do not fetch all orders, or handle as an error.
        // For now, let's return empty if no valid filter, or you can define a default.
        echo json_encode([
            'success' => true,
            'orders' => [] // Return empty for non-specific or invalid status filters
        ]);
        exit;
    }

    $stmt->execute();
    $result = $stmt->get_result();

    $orders = [];
    while ($row = $result->fetch_assoc()) {
        $orders[] = $row;
    }

    echo json_encode([
        'success' => true,
        'orders' => $orders
    ]);
    exit;
}

// Get order details
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'get_order_details') {
    $order_id = intval($_GET['order_id']);

    // Check if user is authorized to view this order
    if (!isLoggedIn()) {
        echo json_encode([
            'success' => false,
            'message' => 'Unauthorized access'
        ]);
        exit;
    }

    // Get order details
    $stmt = $conn->prepare("SELECT * FROM orders WHERE id = ?");
    $stmt->bind_param("i", $order_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        echo json_encode([
            'success' => false,
            'message' => 'Order not found'
        ]);
        exit;
    }

    $order = $result->fetch_assoc();

    // Check if user has permission to view this order
    $user_id = $_SESSION['user_id'];
    $user_role = $_SESSION['role'];

    if ($user_role === 'customer' && $order['customer_id'] !== $user_id) {
        echo json_encode([
            'success' => false,
            'message' => 'Unauthorized access'
        ]);
        exit;
    }

    if ($user_role === 'runner') {
        $platform = $_SESSION['platform'];
        // Runners can only view orders assigned to their platform or specifically to them
        if (
            $order['assigned_runner_id'] !== $user_id &&
            !($order['status'] === 'assigned' && $order['assigned_platform'] === $platform && $order['assigned_runner_id'] === null)
        ) {
            echo json_encode([
                'success' => false,
                'message' => 'Unauthorized access'
            ]);
            exit;
        }
    }

    // Get order items
    $stmt = $conn->prepare("SELECT * FROM order_items WHERE order_id = ?");
    $stmt->bind_param("i", $order_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $items = [];
    while ($row = $result->fetch_assoc()) {
        $items[] = $row;
    }

    echo json_encode([
        'success' => true,
        'order' => $order,
        'items' => $items
    ]);
    exit;
}

// Update order status (staff)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'update_order_status_staff') {
    // Check if user is logged in and has staff role
    if (!hasRole('staff')) {
        echo json_encode([
            'success' => false,
            'message' => 'Unauthorized access'
        ]);
        exit;
    }

    $order_id = intval($_POST['order_id']);
    $status = sanitize($_POST['status']);

    // Validate status transition
    $valid_statuses = ['confirmed', 'cancelled'];
    if (!in_array($status, $valid_statuses)) {
        echo json_encode([
            'success' => false,
            'message' => 'Invalid status'
        ]);
        exit;
    }

    // Get current order status
    $stmt = $conn->prepare("SELECT status FROM orders WHERE id = ?");
    $stmt->bind_param("i", $order_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        echo json_encode([
            'success' => false,
            'message' => 'Order not found'
        ]);
        exit;
    }

    $current_status = $result->fetch_assoc()['status'];

    // Check if status transition is valid
    if ($current_status !== 'pending' && $status !== 'cancelled') {
        echo json_encode([
            'success' => false,
            'message' => 'Invalid status transition'
        ]);
        exit;
    }

    // Update order status
    $stmt = $conn->prepare("UPDATE orders SET status = ? WHERE id = ?");
    $stmt->bind_param("si", $status, $order_id);

    if ($stmt->execute()) {
        echo json_encode([
            'success' => true,
            'message' => 'Order status updated successfully'
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Failed to update order status: ' . $stmt->error
        ]);
    }
    exit;
}

// Assign order to platform (staff)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'assign_platform') {
    // Check if user is logged in and has staff role
    if (!hasRole('staff')) {
        echo json_encode([
            'success' => false,
            'message' => 'Unauthorized access'
        ]);
        exit;
    }

    $order_id = intval($_POST['order_id']);
    $platform = sanitize($_POST['platform']);

    // Validate platform
    $valid_platforms = ['grab', 'foodpanda'];
    if (!in_array($platform, $valid_platforms)) {
        echo json_encode([
            'success' => false,
            'message' => 'Invalid platform'
        ]);
        exit;
    }

    // Get current order status
    $stmt = $conn->prepare("SELECT status FROM orders WHERE id = ?");
    $stmt->bind_param("i", $order_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        echo json_encode([
            'success' => false,
            'message' => 'Order not found'
        ]);
        exit;
    }

    $current_status = $result->fetch_assoc()['status'];

    // Check if status transition is valid
    if ($current_status !== 'confirmed') {
        echo json_encode([
            'success' => false,
            'message' => 'Order must be confirmed before assigning to a platform'
        ]);
        exit;
    }

    // Update order status and platform
    $status = 'assigned';
    $stmt = $conn->prepare("UPDATE orders SET status = ?, assigned_platform = ? WHERE id = ?");
    $stmt->bind_param("ssi", $status, $platform, $order_id);

    if ($stmt->execute()) {
        echo json_encode([
            'success' => true,
            'message' => 'Order assigned to platform successfully'
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Failed to assign order to platform: ' . $stmt->error
        ]);
    }
    exit;
}

// Pick up order (runner)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'pickup_order') {
    // Check if user is logged in and has runner role
    if (!hasRole('runner')) {
        echo json_encode([
            'success' => false,
            'message' => 'Unauthorized access'
        ]);
        exit;
    }

    $order_id = intval($_POST['order_id']);
    $runner_id = $_SESSION['user_id'];
    $runner_name = $_SESSION['name'];
    $runner_platform = $_SESSION['platform']; // Runner's own platform

    // Get current order details to check its state before attempting pickup
    $stmt = $conn->prepare("SELECT status, assigned_platform, assigned_runner_id FROM orders WHERE id = ?");
    $stmt->bind_param("i", $order_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        echo json_encode([
            'success' => false,
            'message' => 'Order not found'
        ]);
        exit;
    }

    $order = $result->fetch_assoc();
    $stmt->close(); // Close this statement before preparing another

    // NEW LOGIC: Check if order can be picked up by this runner
    if (
        $order['status'] !== 'confirmed' ||
        $order['assigned_platform'] !== $runner_platform ||
        $order['assigned_runner_id'] !== null
    ) {

        $error_message = 'Order cannot be picked up. ';
        if ($order['status'] !== 'confirmed') {
            $error_message .= 'It is not in a confirmed state (current: ' . $order['status'] . '). ';
        }
        if ($order['assigned_platform'] !== $runner_platform) {
            $error_message .= 'It is not assigned to your platform (assigned: ' . $order['assigned_platform'] . ', yours: ' . $runner_platform . '). ';
        }
        if ($order['assigned_runner_id'] !== null) {
            $error_message .= 'It has already been picked up by another runner. ';
        }

        echo json_encode([
            'success' => false,
            'message' => trim($error_message)
        ]);
        exit;
    }

    // Update order status and assign runner
    // The WHERE clause ensures atomicity: the order must still be in 'confirmed' state,
    // assigned to the runner's platform, and not yet taken by another runner.
    $new_status = 'picked_up';
    $stmt = $conn->prepare("UPDATE orders SET status = ?, assigned_runner_id = ?, assigned_runner_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'confirmed' AND assigned_platform = ? AND assigned_runner_id IS NULL");
    $stmt->bind_param("sisis", $new_status, $runner_id, $runner_name, $order_id, $runner_platform);

    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) {
            echo json_encode([
                'success' => true,
                'message' => 'Order picked up successfully'
            ]);
        } else {
            // If affected_rows is 0, it means the order was likely snatched by another runner
            // or its status changed just before this update.
            echo json_encode([
                'success' => false,
                'message' => 'Failed to pick up order. It might have been taken by another runner or its status changed.'
            ]);
        }
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Failed to pick up order due to a database error: ' . $stmt->error
        ]);
    }
    $stmt->close();
    exit;
}

// Update order status (runner)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'update_order_status_runner') {
    // Check if user is logged in and has runner role
    if (!hasRole('runner')) {
        echo json_encode([
            'success' => false,
            'message' => 'Unauthorized access'
        ]);
        exit;
    }

    $order_id = intval($_POST['order_id']);
    $status = sanitize($_POST['status']);
    $runner_id = $_SESSION['user_id']; // This should be an integer

    // Validate status transition for runner
    $valid_statuses = ['in_transit', 'delivered'];
    if (!in_array($status, $valid_statuses)) {
        echo json_encode([
            'success' => false,
            'message' => 'Invalid status for runner update'
        ]);
        exit;
    }

    // Get current order details
    $stmt_select = $conn->prepare(
        "SELECT status, assigned_runner_id, customer_id
       FROM orders
      WHERE id = ?"
    );

    $stmt_select->bind_param("i", $order_id);
    $stmt_select->execute();
    $result = $stmt_select->get_result();

    if ($result->num_rows === 0) {
        echo json_encode([
            'success' => false,
            'message' => 'Order not found'
        ]);
        $stmt_select->close();
        exit;
    }

    $order = $result->fetch_assoc();
    $stmt_select->close(); // Close the select statement here

    // Check if runner is assigned to this order (casting to int for robust comparison)
    if ((int) $order['assigned_runner_id'] !== (int) $runner_id) {
        echo json_encode([
            'success' => false,
            // More specific error message for debugging:
            'message' => 'Unauthorized: You are not assigned to this order. Order assigned to: ' . $order['assigned_runner_id'] . ', Your ID: ' . $runner_id
        ]);
        exit;
    }

    // Check if status transition is valid based on current order status
    $current_status = $order['status'];
    if (
        ($status === 'in_transit' && $current_status !== 'picked_up') ||
        ($status === 'delivered' && $current_status !== 'in_transit')
    ) {
        echo json_encode([
            'success' => false,
            'message' => 'Invalid status transition from ' . $current_status . ' to ' . $status
        ]);


        exit;
    }

    // Update order status and timestamp
    $stmt_update = $conn->prepare(
        "UPDATE orders
        SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND assigned_runner_id = ?"
    );

    $stmt_update->bind_param("sii", $status, $order_id, $runner_id);

    if ($stmt_update->execute()) {

        /* 3) successful DB change? */
        if ($stmt_update->affected_rows > 0) {

            /* 3‑A) send finished e‑mail only for 'delivered' */
            if ($status === 'delivered') {

                $cust = getUser((int) $order['customer_id']);   // we fetched earlier
                if ($cust) {
                    $tableHtml = buildOrderTable($conn, $order_id, floatval($order['delivery_fee']));

                    $html = "
  <p style=\"font-family:Arial,Helvetica,sans-serif;font-size:15px;\">
     Dear {$cust['name']},<br><br>
     We are pleased to inform you that your order
     <strong>#{$order_id}</strong> has been delivered.
  </p>
  {$tableHtml}
  <p style=\"font-family:Arial,Helvetica,sans-serif;font-size:15px;\">
     We hope you enjoy your meal. Thank you for dining with us!<br><br>
     Sincerely,<br>ZZ Restaurant Team
  </p>";

                    try {

                        sendMail(
                            $cust['email'],
                            $cust['name'],
                            "Order #{$order_id} delivered – Enjoy!",
                            $html
                        );
                    } catch (Throwable $e) {
                        error_log('SendGrid delivery‑mail error: ' . $e->getMessage());
                        /* we DON'T fail the API just because e‑mail failed */
                    }
                }
            }

            /* 3‑B) JSON success response */
            echo json_encode([
                'success' => true,
                'message' => 'Order status updated successfully to ' . $status
            ]);

        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Failed to update order status. Order may have been modified or unassigned.'
            ]);
        }

    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Database error while updating order status: ' . $stmt_update->error
        ]);
    }

    $stmt_update->close();
    exit;
}

// Handle Confirm and Assign Platform by Staff
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'confirm_and_assign_platform') {
    if (!hasRole('staff')) {
        echo json_encode([
            'success' => false,
            'message' => 'Unauthorized: Staff role required.'
        ]);
        exit;
    }

    $order_id = isset($_POST['order_id']) ? intval($_POST['order_id']) : null;
    $platform = isset($_POST['platform']) ? sanitize($_POST['platform']) : null;
    // Status is implicitly 'confirmed' based on the action name and client-side logic

    if (!$order_id || !$platform) {
        echo json_encode([
            'success' => false,
            'message' => 'Missing order ID or platform.'
        ]);
        exit;
    }

    $allowed_platforms = ['grab', 'foodpanda'];
    if (!in_array($platform, $allowed_platforms)) {
        echo json_encode([
            'success' => false,
            'message' => 'Invalid platform specified.'
        ]);
        exit;
    }

    $stmt = $conn->prepare("UPDATE orders SET status = 'confirmed', assigned_platform = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'pending'");
    $stmt->bind_param("si", $platform, $order_id);

    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) {
            echo json_encode([
                'success' => true,
                'message' => 'Order confirmed and assigned to platform ' . strtoupper($platform) . ' successfully.'
            ]);
        } else {
            // Check if the order was not in 'pending' state or didn't exist
            $check_stmt = $conn->prepare("SELECT status FROM orders WHERE id = ?");
            $check_stmt->bind_param("i", $order_id);
            $check_stmt->execute();
            $result = $check_stmt->get_result();
            if ($result->num_rows > 0) {
                $current_order = $result->fetch_assoc();
                if ($current_order['status'] !== 'pending') {
                    echo json_encode([
                        'success' => false,
                        'message' => 'Order could not be updated. It may not be in a pending state anymore. Current status: ' . $current_order['status']
                    ]);
                } else {
                    echo json_encode([
                        'success' => false,
                        'message' => 'Order confirmation failed. Please check order ID.' // Generic, as pending status means it should have updated
                    ]);
                }
            } else {
                echo json_encode([
                    'success' => false,
                    'message' => 'Order not found or already processed.'
                ]);
            }
            $check_stmt->close();
        }
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Database error: ' . $stmt->error
        ]);
    }
    $stmt->close();
    exit;
}

// If no valid action is specified, return error
echo json_encode([
    'success' => false,
    'message' => 'Invalid request'
]);
?>