<?php
// Include database configuration
require_once 'config.php';

// Get all menu items
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'get_all_items') {
    $category = isset($_GET['category']) ? sanitize($_GET['category']) : null;

    if ($category && $category !== 'all') {
        $stmt = $conn->prepare("SELECT * FROM menu_items WHERE category = ? ORDER BY name");
        $stmt->bind_param("s", $category);
    } else {
        $stmt = $conn->prepare("SELECT * FROM menu_items ORDER BY category, name");
    }

    $stmt->execute();
    $result = $stmt->get_result();
    $menu_items = [];

    while ($row = $result->fetch_assoc()) {
        $menu_items[] = $row;
    }

    echo json_encode([
        'success' => true,
        'menu_items' => $menu_items
    ]);
    exit;
}

// Get menu item by ID
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'get_item') {
    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;

    $stmt = $conn->prepare("SELECT * FROM menu_items WHERE id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 1) {
        $menu_item = $result->fetch_assoc();
        echo json_encode([
            'success' => true,
            'menu_item' => $menu_item
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Menu item not found'
        ]);
    }
    exit;
}

// Add new menu item (staff only)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'add_item') {
    // Check if user is logged in and has staff role
    if (!hasRole('staff')) {
        echo json_encode([
            'success' => false,
            'message' => 'Unauthorized access'
        ]);
        exit;
    }

    $name = sanitize($_POST['name']);
    $price = floatval($_POST['price']);
    $category = sanitize($_POST['category']);
    $image_url = isset($_POST['image_url']) ? sanitize($_POST['image_url']) : null;
    $is_available = isset($_POST['is_available']) ? intval($_POST['is_available']) : 1;

    $stmt = $conn->prepare("INSERT INTO menu_items (name, price, category, image_url, is_available) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param("sdssi", $name, $price, $category, $image_url, $is_available);

    if ($stmt->execute()) {
        $item_id = $stmt->insert_id;
        echo json_encode([
            'success' => true,
            'message' => 'Menu item added successfully',
            'item_id' => $item_id
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Failed to add menu item: ' . $stmt->error
        ]);
    }
    exit;
}

// Update menu item (staff only)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'update_item') {
    // Check if user is logged in and has staff role
    if (!hasRole('staff')) {
        echo json_encode([
            'success' => false,
            'message' => 'Unauthorized access'
        ]);
        exit;
    }

    $id = intval($_POST['id']);
    $name = sanitize($_POST['name']);
    $price = floatval($_POST['price']);
    $category = sanitize($_POST['category']);
    $image_url = isset($_POST['image_url']) ? sanitize($_POST['image_url']) : null;
    $is_available = isset($_POST['is_available']) ? intval($_POST['is_available']) : 1;

    $stmt = $conn->prepare("UPDATE menu_items SET name = ?, price = ?, category = ?, image_url = ?, is_available = ? WHERE id = ?");
    $stmt->bind_param("sdssii", $name, $price, $category, $image_url, $is_available, $id);

    if ($stmt->execute()) {
        echo json_encode([
            'success' => true,
            'message' => 'Menu item updated successfully'
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Failed to update menu item: ' . $stmt->error
        ]);
    }
    exit;
}

// Toggle menu item availability (staff only)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'toggle_availability') {
    // Check if user is logged in and has staff role
    if (!hasRole('staff')) {
        echo json_encode([
            'success' => false,
            'message' => 'Unauthorized access'
        ]);
        exit;
    }

    $id = intval($_POST['id']);
    $is_available = intval($_POST['is_available']);

    $stmt = $conn->prepare("UPDATE menu_items SET is_available = ? WHERE id = ?");
    $stmt->bind_param("ii", $is_available, $id);

    if ($stmt->execute()) {
        echo json_encode([
            'success' => true,
            'message' => 'Menu item availability updated'
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Failed to update availability: ' . $stmt->error
        ]);
    }
    exit;
}

// Delete menu item (staff only)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'delete_item') {
    // Check if user is logged in and has staff role
    if (!hasRole('staff')) {
        echo json_encode([
            'success' => false,
            'message' => 'Unauthorized access'
        ]);
        exit;
    }

    $id = intval($_POST['id']);

    // Check if the item is used in any orders
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM order_items WHERE menu_item_id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();

    if ($row['count'] > 0) {
        // Item is used in orders, just mark as unavailable instead of deleting
        $is_available = 0;
        $stmt = $conn->prepare("UPDATE menu_items SET is_available = ? WHERE id = ?");
        $stmt->bind_param("ii", $is_available, $id);

        if ($stmt->execute()) {
            echo json_encode([
                'success' => true,
                'message' => 'Menu item marked as unavailable (cannot be deleted as it is used in orders)'
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Failed to update menu item: ' . $stmt->error
            ]);
        }
    } else {
        // Item is not used in orders, safe to delete
        $stmt = $conn->prepare("DELETE FROM menu_items WHERE id = ?");
        $stmt->bind_param("i", $id);

        if ($stmt->execute()) {
            echo json_encode([
                'success' => true,
                'message' => 'Menu item deleted successfully'
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Failed to delete menu item: ' . $stmt->error
            ]);
        }
    }
    exit;
}

// If no valid action is specified, return error
echo json_encode([
    'success' => false,
    'message' => 'Invalid request'
]);
?>