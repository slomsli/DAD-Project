<?php
/**
 * user.php
 * Common user‑related helper functions
 */

require_once 'config.php';      // gives us $conn

/**
 * getUser
 * Return associative array with the user’s name + email (and anything else you SELECT)
 *
 * @param  int   $id  user_id (usually from $_SESSION['user_id'])
 * @return array|null ['id'=>…, 'name'=>…, 'email'=>…]  OR null if not found
 */
function getUser(int $id): ?array
{
    global $conn;                              // use the existing mysqli connection

    // Quick optimisation: if asking for the currently‑logged user and
    // the info is already in the session, avoid a SQL query.
    if (isset($_SESSION['user_id']) && (int) $_SESSION['user_id'] === $id) {
        return [
            'id' => $_SESSION['user_id'],
            'name' => $_SESSION['name'] ?? '',
            'email' => $_SESSION['email'] ?? ''
        ];
    }

    // Fallback to database lookup
    $stmt = $conn->prepare("SELECT id, name, email FROM users WHERE id = ? LIMIT 1");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $res = $stmt->get_result();
    if ($row = $res->fetch_assoc()) {
        return $row;           // ['id'=>..,'name'=>..,'email'=>..]
    }
    return null;               // caller should handle null if user not found
}
