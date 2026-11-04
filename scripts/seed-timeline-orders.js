const { pool } = require('../config/db');

async function seedOrders() {
  const [prods] = await pool.query('SELECT id, name, sku, price FROM products LIMIT 10');
  const [custs] = await pool.query('SELECT id, full_name, phone FROM customers');

  const payments = ['VNPAY QR', 'COD (Thu hộ)', 'Chuyển khoản Vietcombank', 'Trả góp 0% (Thẻ tín dụng)', 'Tiền mặt'];
  const statuses = ['delivered', 'delivered', 'delivered', 'delivered', 'shipping', 'shipping', 'confirmed', 'pending', 'cancelled'];
  const branches = ['Chi nhánh Hà Nội (123 Thái Hà)', 'Chi nhánh TP.HCM (456 Lê Hồng Phong)', 'Chi nhánh Đà Nẵng (789 Nguyễn Văn Linh)'];

  for (let i = 6; i <= 32; i++) {
    const p = prods[i % prods.length];
    const c = custs[i % custs.length];
    const daysAgo = Math.floor(Math.random() * 28);
    const orderDate = new Date();
    orderDate.setDate(orderDate.getDate() - daysAgo);
    orderDate.setHours(Math.floor(8 + Math.random() * 12), Math.floor(Math.random() * 60));

    const code = 'DH-2026-' + String(i).padStart(3, '0');
    const status = statuses[i % statuses.length];
    const pm = payments[i % payments.length];
    const fee = pm.includes('VNPAY') ? Math.round(p.price * 0.01) : pm.includes('Trả góp') ? Math.round(p.price * 0.02) : 0;
    const net = p.price - fee;
    const payStatus = status === 'delivered' ? 'paid' : status === 'shipping' ? (pm.includes('COD') ? 'collecting' : 'paid') : status === 'cancelled' ? 'refunded' : 'pending';

    await pool.query(
      `INSERT INTO orders (code, customer_id, customer_name, customer_phone, product_id, product_name, sku, serial_number, quantity, unit_price, total_amount, discount_amount, payment_method, payment_status, gateway_code, gateway_fee, net_received, status, branch, ordered_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE total_amount=VALUES(total_amount)`,
      [
        code, c.id, c.full_name, c.phone, p.id, p.name, p.sku, 'SN-' + p.sku + '-' + Math.floor(1000 + Math.random()*9000),
        1, p.price, p.price, 0, pm, payStatus, 'TRANS-' + Math.floor(100000 + Math.random()*900000),
        fee, net, status, branches[i % branches.length], orderDate
      ]
    );
  }

  // Update customer totals
  await pool.query(`
    UPDATE customers c
    LEFT JOIN (
      SELECT customer_id, COUNT(*) as cnt, SUM(total_amount) as spent
      FROM orders WHERE status = 'delivered' AND customer_id IS NOT NULL
      GROUP BY customer_id
    ) o ON o.customer_id = c.id
    SET c.order_count = COALESCE(o.cnt, 0),
        c.total_spent = COALESCE(o.spent, 0),
        c.tier = CASE 
          WHEN COALESCE(o.spent, 0) >= 100000000 THEN 'VIP'
          WHEN COALESCE(o.spent, 0) >= 50000000 THEN 'Thân thiết'
          ELSE 'Khách mới'
        END
  `);

  console.log('Successfully seeded dynamic real orders!');
  process.exit(0);
}

seedOrders().catch(err => {
  console.error(err);
  process.exit(1);
});
