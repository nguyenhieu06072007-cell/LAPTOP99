const { pool } = require('../config/db');

const CustomerModel = {
  async countCustomers(whereClause, params) {
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM customers c ${whereClause}`, params);
    return total;
  },

  async findCustomers({ whereClause, params, limit, offset }) {
    const [rows] = await pool.query(
      `SELECT c.*,
              (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id AND o.status != 'cancelled') AS real_order_count,
              (SELECT COALESCE(SUM(o.total_amount), 0) FROM orders o WHERE o.customer_id = c.id AND o.status != 'cancelled') AS real_total_spent
         FROM customers c
         ${whereClause}
        ORDER BY real_total_spent DESC, c.id DESC
        LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return rows;
  },

  async findLatestOrders(custIds) {
    if (!custIds.length) return [];
    const [ords] = await pool.query(
      `SELECT id, customer_id, code, product_name, status, total_amount, ordered_at
         FROM orders
        WHERE customer_id IN (?)
        ORDER BY ordered_at DESC, id DESC`,
      [custIds],
    );
    return ords;
  },

  async findCustomerDetail(id) {
    const [[customer]] = await pool.query('SELECT * FROM customers WHERE id = ?', [id]);
    if (!customer) return null;

    const [orders] = await pool.query(
      `SELECT o.*, u.full_name AS assigned_to_name
         FROM orders o
         LEFT JOIN users u ON u.id = o.assigned_to
        WHERE o.customer_id = ?
        ORDER BY o.ordered_at DESC, o.id DESC`,
      [id],
    );

    const nonCancelled = orders.filter((o) => o.status !== 'cancelled');
    const totalSpent = nonCancelled.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    const orderCount = nonCancelled.length;
    const tier = totalSpent >= 100_000_000 ? 'VIP' : totalSpent >= 50_000_000 ? 'Thân thiết' : 'Khách mới';

    return {
      ...customer,
      total_spent: totalSpent,
      order_count: orderCount,
      tier,
      orders,
    };
  },

  async insertCustomer(conn, row) {
    const [res] = await conn.query('INSERT INTO customers SET ?', [row]);
    return res.insertId;
  },

  async updateCustomer(conn, id, changes) {
    await conn.query('UPDATE customers SET ? WHERE id = ?', [changes, id]);
  },

  async findCustomerById(id) {
    const [[c]] = await pool.query('SELECT * FROM customers WHERE id = ?', [id]);
    return c || null;
  },
};

module.exports = CustomerModel;

