<?php
// Include database configuration
require_once 'config.php';

// Create tables
$tables = [
    // Users table
    "CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        role ENUM('customer', 'staff', 'runner') NOT NULL,
        platform ENUM('grab', 'foodpanda') NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )",

    // Menu categories and items
    "CREATE TABLE IF NOT EXISTS menu_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        category ENUM('SUP ZZ', 'MEE REBUS ZZ', 'SARAPAN', 'ROTI CANAI', 'LUNCH SETS', 'THAI DISHES', 'WESTERN', 'DRINKS') NOT NULL,
        image_url VARCHAR(500),
        is_available BOOLEAN DEFAULT TRUE
    )",

    // Orders
    "CREATE TABLE IF NOT EXISTS orders (
        id INT PRIMARY KEY AUTO_INCREMENT,
        customer_id INT NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(20) NOT NULL,
        delivery_address TEXT NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        subtotal DECIMAL(10,2) NOT NULL,
        delivery_fee DECIMAL(10,2) NOT NULL,
        total DECIMAL(10,2) NOT NULL,
        status ENUM('pending', 'confirmed', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled') DEFAULT 'pending',
        assigned_platform ENUM('grab', 'foodpanda') NULL,
        assigned_runner_id INT NULL,
        assigned_runner_name VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES users(id),
        FOREIGN KEY (assigned_runner_id) REFERENCES users(id)
    )",

    // Order items
    "CREATE TABLE IF NOT EXISTS order_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        order_id INT NOT NULL,
        menu_item_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        quantity INT NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
    )"
];

// Execute table creation queries
foreach ($tables as $sql) {
    if ($conn->query($sql) !== TRUE) {
        die("Error creating table: " . $conn->error);
    }
}

// Check if menu_items table is empty before inserting sample data
$result = $conn->query("SELECT COUNT(*) as count FROM menu_items");
$row = $result->fetch_assoc();

if ($row['count'] == 0) {
    // Sample menu data
    /* ---------------------------------------------------------
    Small helper: "Sup Gearbox" → sup-gearbox.jpg
    ----------------------------------------------------------*/
    function slugify($text)
    {
        $text = trim(mb_strtolower($text, 'UTF-8'));
        $text = preg_replace('/[^a-z0-9]+/u', '-', $text);   // spaces → dash
        return trim($text, '-') . '.jpg';
    }

    /* ---------------------------------------------------------
    Menu seed  – now pushes image_url as 4th value
    ----------------------------------------------------------*/
    $menuItems = [
        // name, price, category  (image added automatically)
        ['Sup Gearbox',        8.50, 'SUP ZZ', 'images/menu/sup-gearbox.jpg'],
        ['Sup Ayam',           7.00, 'SUP ZZ', 'images/menu/sup-ayam.jpg'],
        ['Sup Tulang',         9.00, 'SUP ZZ', 'images/menu/sup-tulang.jpg'],
        ['Sup Daging',         8.00, 'SUP ZZ', 'images/menu/sup-daging.jpg'],
        ['Mee Rebus Ayam',     6.50, 'MEE REBUS ZZ', 'images/menu/mee-rebus-ayam.jpg'],
        ['Mee Rebus Daging',   7.50, 'MEE REBUS ZZ', 'images/menu/mee-rebus-daging.jpg'],
        ['Mee Rebus Campur',   8.00, 'MEE REBUS ZZ', 'images/menu/mee-rebus-campur.jpg'],
        ['Mee Rebus Seafood',  9.50, 'MEE REBUS ZZ', 'images/menu/mee-rebus-seafood.jpg'],
        ['Nasi Lemak',         4.50, 'SARAPAN', 'images/menu/nasi-lemak.jpg'],
        ['Lontong',            5.00, 'SARAPAN', 'images/menu/lontong-s.jpg'],
        ['Laksa',              6.00, 'SARAPAN', 'images/menu/laksa-s.jpg'],
        ['Mee Soto',           5.50, 'SARAPAN', 'images/menu/mee-soto.jpg'],
        ['Roti Kosong',        1.50, 'ROTI CANAI', 'images/menu/roti-kosong.jpg'],
        ['Roti Telur',         2.50, 'ROTI CANAI', 'images/menu/roti-telur.jpg'],
        ['Roti Bawang',        2.00, 'ROTI CANAI', 'images/menu/roti-bawang.jpg'],
        ['Roti Planta',        2.20, 'ROTI CANAI', 'images/menu/roti-planta.jpg'],
        ['Nasi Bawal',        12.00, 'LUNCH SETS', 'images/menu/nasi-bawal.jpg'],
        ['Siakap Berlada',    15.00, 'LUNCH SETS', 'images/menu/siakap-berlada.jpg'],
        ['Ayam Masak Merah',  10.00, 'LUNCH SETS', 'images/menu/ayam-masak-merah.jpg'],
        ['Daging Rendang',    13.00, 'LUNCH SETS', 'images/menu/daging-rendang.jpg'],
        ['Paprik Ayam',       11.00, 'THAI DISHES', 'images/menu/paprik-ayam.jpg'],
        ['Black Pepper Beef', 12.50, 'THAI DISHES', 'images/menu/black-pepper-beef.jpg'],
        ['Tom Yam Soup',       8.50, 'THAI DISHES', 'images/menu/tom-yam-soup.jpg'],
        ['Thai Fried Rice',    9.00, 'THAI DISHES', 'images/menu/thai-fried-rice.jpg'],
        ['Chicken Chop',      13.00, 'WESTERN', 'images/menu/chicken-chop.jpg'],
        ['Fish & Chips',      14.00, 'WESTERN', 'images/menu/fish-chips.jpg'],
        ['Spaghetti Bolognese',12.00, 'WESTERN', 'images/menu/spaghetti-bolognese.jpg'],
        ['Burger Special',    10.50, 'WESTERN', 'images/menu/burger-special.jpg'],
        ['Teh Tarik',          2.50, 'DRINKS', 'images/menu/Teh_Tarik.jpg'],
        ['Kopi O',             2.00, 'DRINKS', 'images/menu/kopi-o.jpg'],
        ['Sirap Bandung',      3.00, 'DRINKS', 'images/menu/sirap-bandung.jpg'],
        ['Fresh Orange Juice', 4.50, 'DRINKS', 'images/menu/fresh-orange-juice.jpg']
    ];

    // Drop and recreate tables in correct order
    $conn->query("DROP TABLE IF EXISTS order_items");
    $conn->query("DROP TABLE IF EXISTS orders");
    $conn->query("DROP TABLE IF EXISTS menu_items");

    // Recreate menu_items table
    $conn->query("CREATE TABLE menu_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        category ENUM('SUP ZZ', 'MEE REBUS ZZ', 'SARAPAN', 'ROTI CANAI', 'LUNCH SETS', 'THAI DISHES', 'WESTERN', 'DRINKS') NOT NULL,
        image_url VARCHAR(500),
        is_available BOOLEAN DEFAULT TRUE
    )");

    // Prepare the insert statement
    $stmt = $conn->prepare(
        "INSERT INTO menu_items (name, price, category, image_url, is_available)
         VALUES (?, ?, ?, ?, 1)"
    );
    $stmt->bind_param("sdss", $name, $price, $category, $img);

    // Insert each menu item
    foreach ($menuItems as [$name, $price, $category, $img]) {
        if ($stmt->execute()) {
            echo "Inserted: $name<br>";
        } else {
            echo "Error inserting $name: " . $stmt->error . "<br>";
        }
    }
    $stmt->close();

    // Insert remaining menu items (IDs 26-32)
    $remainingItems = [
        ['Burger Special',    10.50, 'WESTERN', 'images/menu/burger-special.jpg'],
        ['Teh Tarik',          2.50, 'DRINKS', 'images/menu/Teh_Tarik.jpg'],
        ['Kopi O',             2.00, 'DRINKS', 'images/menu/kopi-o.jpg'],
        ['Sirap Bandung',      3.00, 'DRINKS', 'images/menu/sirap-bandung.jpg'],
        ['Fresh Orange Juice', 4.50, 'DRINKS', 'images/menu/fresh-orange-juice.jpg']
    ];

    $stmt = $conn->prepare(
        "INSERT INTO menu_items (name, price, category, image_url, is_available)
         VALUES (?, ?, ?, ?, 1)"
    );
    $stmt->bind_param("sdss", $name, $price, $category, $img);

    foreach ($remainingItems as [$name, $price, $category, $img]) {
        if ($stmt->execute()) {
            echo "Inserted: $name<br>";
        } else {
            echo "Error inserting $name: " . $stmt->error . "<br>";
        }
    }
    $stmt->close();

    // Recreate orders and order_items tables
    $conn->query("CREATE TABLE orders (
        id INT PRIMARY KEY AUTO_INCREMENT,
        customer_id INT NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(20) NOT NULL,
        delivery_address TEXT NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        subtotal DECIMAL(10,2) NOT NULL,
        delivery_fee DECIMAL(10,2) NOT NULL,
        total DECIMAL(10,2) NOT NULL,
        status ENUM('pending', 'confirmed', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled') DEFAULT 'pending',
        assigned_platform ENUM('grab', 'foodpanda') NULL,
        assigned_runner_id INT NULL,
        assigned_runner_name VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES users(id),
        FOREIGN KEY (assigned_runner_id) REFERENCES users(id)
    )");

    $conn->query("CREATE TABLE order_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        order_id INT NOT NULL,
        menu_item_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        quantity INT NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
    )");
}

// Check if users table is empty before inserting sample data
$result = $conn->query("SELECT COUNT(*) as count FROM users");
$row = $result->fetch_assoc();

if ($row['count'] == 0) {
    // Sample users
    $users = [
        ['customer@demo.com', MD5('password'), 'John Doe', '0123456789', 'customer', NULL],
        ['staff@demo.com', MD5('password'), 'Jane Smith', '0123456788', 'staff', NULL],
        ['grab@demo.com', MD5('password'), 'Mike Johnson', '0123456787', 'runner', 'grab'],
        ['foodpanda@demo.com', MD5('password'), 'Sarah Lee', '0123456786', 'runner', 'foodpanda']
    ];

    // Prepare and execute users insertion
    $stmt = $conn->prepare("INSERT INTO users (email, password, name, phone, role, platform) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("ssssss", $email, $password, $name, $phone, $role, $platform);

    foreach ($users as $user) {
        $email = $user[0];
        $password = $user[1];
        $name = $user[2];
        $phone = $user[3];
        $role = $user[4];
        $platform = $user[5];
        $stmt->execute();
    }
    $stmt->close();
}

echo "Database setup completed successfully!";
$conn->close();

// Enable error reporting for debugging
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
?>
