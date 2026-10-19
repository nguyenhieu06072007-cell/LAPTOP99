const { pool, withTransaction } = require('../config/db');
const { ApiError, paging, pageMeta, toInt } = require('../utils/helpers');
const { can } = require('../config/permissions');
const { writeAudit } = require('../services/audit');

const InventoryModel = {
  async getMovements({ query, userRole }) {
    const { page, limit, offset } = paging(query);
    const where = [];
    const params = [];
    if (toInt(query.product_id)) { where.push('m.product_id = ?'); params.push(toInt(query.product_id)); }
    if (['import', 'export', 'adjust', 'return'].includes(query.type)) { where.push('m.type = ?'); params.push(query.type); }
    if (query.from && !Number.isNaN(Date.parse(query.from))) { where.push('m.created_at >= ?'); params.push(new Date(query.from)); }
    if (query.to && !Number.isNaN(Date.parse(query.to))) { where.push('m.created_at <= ?'); params.push(new Date(query.to)); }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM inventory_movements m ${w}`, params);
    const [rows] = await pool.query(
      `SELECT m.id, m.product_id, p.sku, p.name AS product_name, m.type, m.quantity,
              m.stock_before, m.stock_after, m.unit_cost, m.reason, m.created_at, u.full_name AS created_by
         FROM inventory_movements m
         JOIN products p ON p.id = m.product_id
         LEFT JOIN users u ON u.id = m.created_by
         ${w} ORDER BY m.id DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);

    if (!can(userRole, 'cost:read')) rows.forEach((r) => delete r.unit_cost);
    return { rows, meta: pageMeta(page, limit, total) };
  },

  async getLowStock() {
    const [rows] = await pool.query(
      `SELECT p.id, p.sku, p.name, b.name AS brand, p.stock_quantity, p.low_stock_threshold,
              p.warehouse_location, p.status,
              CASE WHEN p.stock_quantity = 0 THEN 'out_of_stock' ELSE 'low_stock' END AS stock_status
         FROM products p JOIN brands b ON b.id = p.brand_id
        WHERE p.deleted_at IS NULL AND p.status <> 'discontinued'
          AND p.stock_quantity <= p.low_stock_threshold
        ORDER BY p.stock_quantity, p.name`);
    return rows;
  },

  async createMovement({ productId, type, delta, unitCost, reason, userId }, req) {
    return withTransaction(async (conn) => {
      const [[p]] = await conn.query(
        'SELECT id, stock_quantity, cost_price FROM products WHERE id = ? AND deleted_at IS NULL FOR UPDATE',
        [productId]
      );
      if (!p) throw new ApiError(404, 'Không tìm thấy sản phẩm');

      const before = p.stock_quantity;
      const after = before + delta;
      if (after < 0) throw new ApiError(400, `Tồn kho hiện tại là ${before}, không đủ để trừ ${Math.abs(delta)}`);

      await conn.query('UPDATE products SET stock_quantity = ? WHERE id = ?', [after, p.id]);
      const finalUnitCost = type === 'import' ? (unitCost ?? null) : p.cost_price;
      const [r] = await conn.query(
        `INSERT INTO inventory_movements (product_id, type, quantity, stock_before, stock_after, unit_cost, reason, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.id, type, delta, before, after, finalUnitCost, reason ?? null, userId]
      );
      await writeAudit(conn, req, {
        action: `stock_${type}`, entity: 'product', entityId: p.id,
        oldValues: { stock_quantity: before }, newValues: { stock_quantity: after, reason: reason ?? null },
      });
      return { id: r.insertId, product_id: p.id, type, quantity: delta, stock_before: before, stock_after: after };
    });
  },
};

module.exports = InventoryModel;

