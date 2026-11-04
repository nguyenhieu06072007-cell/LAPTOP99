const { pool } = require('../config/db');

const OrderModel = {
  async getFinanceSummary() {
    const [[stats]] = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN status != 'cancelled' AND payment_status = 'paid' THEN total_amount ELSE 0 END), 0) AS total_paid,
        COALESCE(SUM(CASE WHEN status != 'cancelled' AND payment_status != 'paid' AND (payment_method LIKE '%COD%' OR payment_method LIKE '%Tiền mặt%') THEN total_amount ELSE 0 END), 0) AS total_cod_pending,
        COALESCE(SUM(CASE WHEN payment_status = 'collecting' THEN total_amount ELSE 0 END), 0) AS collecting,
        COALESCE(SUM(CASE WHEN status != 'cancelled' THEN gateway_fee ELSE 0 END), 0) AS total_gateway_fees,
        COALESCE(SUM(CASE WHEN status != 'cancelled' AND payment_status = 'paid' THEN net_received ELSE 0 END), 0) AS total_net_received,
        COALESCE(SUM(CASE WHEN status != 'cancelled' THEN 1 ELSE 0 END), 0) AS total_orders,
        COALESCE(SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END), 0) AS delivered_orders,
        COALESCE(SUM(CASE WHEN status = 'delivered' AND payment_status = 'paid' THEN total_amount ELSE 0 END), 0) AS delivered_revenue
      FROM orders
    `);
    return stats;
  },

  async getSerialsList() {
    const [orders] = await pool.query(`
      SELECT o.id, o.code AS order_code, o.customer_name, o.customer_phone,
             o.product_id, o.product_name, o.sku, o.serial_number,
             o.items_json, o.status, o.ordered_at,
             p.warranty_months
        FROM orders o
        LEFT JOIN products p ON p.id = o.product_id
       WHERE o.status != 'cancelled'
       ORDER BY o.ordered_at DESC
       LIMIT 100
    `);
    return orders;
  },

  async countOrders(whereClause, params) {
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM orders o ${whereClause}`, params);
    return total;
  },

  async findOrders({ whereClause, params, limit, offset }) {
    const [rows] = await pool.query(
      `SELECT o.*, u.full_name AS assigned_user_name
         FROM orders o
         LEFT JOIN users u ON u.id = o.assigned_to
         ${whereClause}
        ORDER BY o.ordered_at DESC, o.id DESC
        LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return rows;
  },

  async findOrderById(conn, id) {
    const db = conn || pool;
    const [[row]] = await db.query(
      `SELECT o.*, u.full_name AS assigned_user_name,
              c.code AS customer_code, c.tier AS customer_tier, c.email AS customer_email
         FROM orders o
         LEFT JOIN users u ON u.id = o.assigned_to
         LEFT JOIN customers c ON c.id = o.customer_id
        WHERE o.id = ?`,
      [id],
    );
    return row || null;
  },

  async insertOrder(conn, row) {
    const [res] = await conn.query('INSERT INTO orders SET ?', [row]);
    return res.insertId;
  },

  async updateOrder(conn, id, changes) {
    await conn.query('UPDATE orders SET ? WHERE id = ?', [changes, id]);
  },

  async deleteOrder(conn, id) {
    const [res] = await conn.query('DELETE FROM orders WHERE id = ?', [id]);
    return res.affectedRows;
  },

  async syncCustomerStats(conn, customerId) {
    if (!customerId) return;
    const [[stats]] = await conn.query(
      `SELECT COUNT(*) AS cnt, COALESCE(SUM(total_amount), 0) AS spent
         FROM orders
        WHERE customer_id = ? AND status = 'delivered' AND payment_status = 'paid'`,
      [customerId],
    );
    const spent = Number(stats?.spent || 0);
    const cnt = Number(stats?.cnt || 0);
    const tier = spent >= 100_000_000 ? 'VIP' : spent >= 30_000_000 ? 'Thân thiết' : 'Khách mới';
    await conn.query('UPDATE customers SET order_count = ?, total_spent = ?, tier = ? WHERE id = ?', [cnt, spent, tier, customerId]);
  },
};

module.exports = OrderModel;

