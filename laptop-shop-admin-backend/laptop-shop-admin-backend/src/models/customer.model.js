const { pool } = require('../config/db');

const CUSTOMER_FIELDS = 'id, code, full_name, phone, email, tier, branch, total_spent, order_count, notes, address, created_at, updated_at';
const customerColumns = CUSTOMER_FIELDS.split(', ').map((name) => 'c.' + name).join(', ');
function orderFilters(scope, alias = 'o') {
  const fields = Object.entries(scope || {});
  return {
    sql: fields.map(([name]) => ` AND ${alias}.${name} = ?`).join(''),
    values: fields.map(([, value]) => value || null),
  };
}

const CustomerModel = {
  async countCustomers(whereClause, params) {
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM customers c ${whereClause}`, params);
    return total;
  },

  async findCustomers({ whereClause, params, limit, offset, scope }) {
    const orders = orderFilters(scope);
    const [rows] = await pool.query(
      `SELECT ${customerColumns},
              (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id AND o.status = 'delivered' AND o.payment_status = 'paid'${orders.sql}) AS real_order_count,
              (SELECT COALESCE(SUM(GREATEST(0, o.total_amount - COALESCE(r.amount, 0))), 0)
                 FROM orders o LEFT JOIN (SELECT order_id, SUM(amount) AS amount FROM admin_rma_refunds GROUP BY order_id) r ON r.order_id = o.id
                WHERE o.customer_id = c.id AND o.status = 'delivered' AND o.payment_status = 'paid'${orders.sql}) AS real_total_spent
         FROM customers c
         ${whereClause}
        ORDER BY real_total_spent DESC, c.id DESC
        LIMIT ? OFFSET ?`,
      [...orders.values, ...orders.values, ...params, limit, offset],
    );
    return rows;
  },

  async findLatestOrders(custIds, scope) {
    const filter = orderFilters(scope);
    if (!custIds.length) return [];
    const [ords] = await pool.query(
      `SELECT id, customer_id, code, product_name, status, total_amount, ordered_at
         FROM orders o
        WHERE customer_id IN (?)${filter.sql}
        ORDER BY ordered_at DESC, id DESC`,
      [custIds, ...filter.values],
    );
    return ords;
  },

  async findCustomerDetail(id, scope) {
    const filter = orderFilters(scope);
    const customer = await this.findCustomerById(id);
    if (!customer) return null;

    const [orders] = await pool.query(
      `SELECT o.*, u.full_name AS assigned_to_name, COALESCE(r.amount, 0) AS returned_amount
         FROM orders o
         LEFT JOIN users u ON u.id = o.assigned_to
         LEFT JOIN (SELECT order_id, SUM(amount) AS amount FROM admin_rma_refunds GROUP BY order_id) r ON r.order_id = o.id
        WHERE o.customer_id = ?${filter.sql}
        ORDER BY o.ordered_at DESC, o.id DESC`,
      [id, ...filter.values],
    );

    const paidDelivered = orders.filter((o) => o.status === 'delivered' && o.payment_status === 'paid');
    const totalSpent = paidDelivered.reduce((sum, o) => sum + Math.max(0, Number(o.total_amount || 0) - Number(o.returned_amount || 0)), 0);
    const orderCount = paidDelivered.length;
    const tier = totalSpent >= 100_000_000 ? 'VIP' : totalSpent >= 30_000_000 ? 'Thân thiết' : 'Khách mới';

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
    const [[c]] = await pool.query(`SELECT ${CUSTOMER_FIELDS} FROM customers WHERE id = ?`, [id]);
    return c || null;
  },
};

module.exports = CustomerModel;

