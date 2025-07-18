<?php
function buildOrderTable($conn, $orderId, $deliveryFee = 5.0)
{
    $rows   = '';
    $subttl = 0.0;

    $stmt = $conn->prepare(
        "SELECT name, price, quantity
           FROM order_items
          WHERE order_id = ?");
    $stmt->bind_param("i", $orderId);
    $stmt->execute();
    $res = $stmt->get_result();

    while ($r = $res->fetch_assoc()) {
        $line    = $r['price'] * $r['quantity'];
        $subttl += $line;
        $rows   .= "
        <tr>
          <td style=\"padding:6px 8px;border:1px solid #ccc;\">{$r['name']}</td>
          <td style=\"padding:6px 8px;border:1px solid #ccc;text-align:center;\">{$r['quantity']}</td>
          <td style=\"padding:6px 8px;border:1px solid #ccc;text-align:right;\">RM ".number_format($r['price'],2)."</td>
          <td style=\"padding:6px 8px;border:1px solid #ccc;text-align:right;\">RM ".number_format($line,2)."</td>
        </tr>";
    }
    $res->free();
    $stmt->close();

    $grand = $subttl + $deliveryFee;

    /* HTML TABLE (inline CSS for e‑mail clients) */
    return "
    <table style=\"border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;font-size:14px;width:100%;max-width:480px;margin:16px 0;\">
      <thead>
        <tr style=\"background:#f2f2f2;\">
          <th style=\"padding:8px;border:1px solid #ccc;text-align:left;\">Item</th>
          <th style=\"padding:8px;border:1px solid #ccc;text-align:center;\">Qty</th>
          <th style=\"padding:8px;border:1px solid #ccc;text-align:right;\">Unit&nbsp;Price</th>
          <th style=\"padding:8px;border:1px solid #ccc;text-align:right;\">Line&nbsp;Total</th>
        </tr>
      </thead>
      <tbody>{$rows}</tbody>
      <tfoot>
        <tr>
          <td colspan=\"3\" style=\"padding:8px;border:1px solid #ccc;text-align:right;\">Subtotal</td>
          <td style=\"padding:8px;border:1px solid #ccc;text-align:right;\">RM ".number_format($subttl,2)."</td>
        </tr>
        <tr>
          <td colspan=\"3\" style=\"padding:8px;border:1px solid #ccc;text-align:right;\">Delivery&nbsp;Fee</td>
          <td style=\"padding:8px;border:1px solid #ccc;text-align:right;\">RM ".number_format($deliveryFee,2)."</td>
        </tr>
        <tr>
          <td colspan=\"3\" style=\"padding:8px;border:1px solid #ccc;text-align:right;font-weight:bold;\">Grand&nbsp;Total</td>
          <td style=\"padding:8px;border:1px solid #ccc;text-align:right;font-weight:bold;\">RM ".number_format($grand,2)."</td>
        </tr>
      </tfoot>
    </table>";
}
?>