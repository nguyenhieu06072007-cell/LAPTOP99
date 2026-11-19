const { pool, withTransaction } = require('../config/db');
const { ApiError, paging, pageMeta, toInt } = require('../utils/helpers');
const { can } = require('../config/permissions');
const { writeAudit } = require('../services/audit');

function inventoryBranch(user) {
  return user?.role !== 'super_admin' && user?.data_visibility === 'branch' ? user.branch || '' : null;
}

const InventoryModel = {
  async getMovements({ query, userRole }) {
    const { page, limit, offset } = paging(query);
    const where = [];
    const params = [];
    if (toInt(query.product_id)) { where.push('m.product_id = ?'); params.push(toInt(query.product_id)); }
    if (['import', 'export', 'adjust', 'return'].includes(query.type)) { where.push('m.type = ?'); params.push(query.type); }
    if (query.from && !Number.isNaN(Date.parse(query.from))) { where.push('m.created_at >= ?'); params.push(new Date(query.from)); }
    if (query.to && !Number.isNaN(Date.parse(query.to))) { where.push('m.created_at <= ?'); params.push(new Date(query.to)); }
    const branch = inventoryBranch(userRole);
    const joins = `FROM inventory_movements m JOIN products p ON p.id = m.product_id
      LEFT JOIN admin_inventory_receipts r ON r.movement_id = m.id`;
    if (branch !== null) { where.push('COALESCE(r.warehouse, p.warehouse_location) = ?'); params.push(branch || null); }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total ${joins} ${w}`, params);
    const [rows] = await pool.query(
      `SELECT m.id, m.product_id, p.sku, p.name AS product_name, m.type, m.quantity,
              m.stock_before, m.stock_after, m.unit_cost, m.reason, m.created_at, u.full_name AS created_by
         ${joins}
         LEFT JOIN users u ON u.id = m.created_by
         ${w} ORDER BY m.id DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);

    if (!can(userRole, 'cost:read')) rows.forEach((r) => delete r.unit_cost);
    return { rows, meta: pageMeta(page, limit, total) };
  },

  async getLowStock(user) {
    const branch = inventoryBranch(user);
    const [rows] = await pool.query(
      `SELECT p.id, p.sku, p.name, b.name AS brand, p.stock_quantity, p.low_stock_threshold,
              p.warehouse_location, p.status,
              CASE WHEN p.stock_quantity = 0 THEN 'out_of_stock' ELSE 'low_stock' END AS stock_status
         FROM products p JOIN brands b ON b.id = p.brand_id
        WHERE p.deleted_at IS NULL AND p.status <> 'discontinued'
          AND p.stock_quantity <= p.low_stock_threshold
          ${branch === null ? '' : 'AND p.warehouse_location = ?'}
        ORDER BY p.stock_quantity, p.name`, branch === null ? [] : [branch || null]);
    return rows;
  },

  async createMovement({ productId, type, delta, unitCost, reason, userId }, req, connection) {
    const write = async (conn) => {
      const branch = inventoryBranch(req.user);
      const [[p]] = await conn.query(
        `SELECT id, stock_quantity, cost_price FROM products WHERE id = ? AND deleted_at IS NULL
          ${branch === null ? '' : 'AND warehouse_location = ?'} FOR UPDATE`,
        branch === null ? [productId] : [productId, branch || null]
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
    };
    return connection ? write(connection) : withTransaction(write);
  },

  async getReceipts({ query, user }) {
    const { page, limit, offset } = paging(query);
    const branch = inventoryBranch(user);
    const filter = branch === null ? '' : 'WHERE r.warehouse = ?';
    const params = branch === null ? [] : [branch || null];
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM admin_inventory_receipts r ${filter}`, params);
    const [rows] = await pool.query(`
      SELECT r.movement_id, r.supplier, r.warehouse, r.request_key, m.quantity, m.created_at,
             m.unit_cost, p.name, p.sku, u.full_name AS created_by
        FROM admin_inventory_receipts r
        JOIN inventory_movements m ON m.id = r.movement_id
        JOIN products p ON p.id = m.product_id
        LEFT JOIN users u ON u.id = m.created_by
       ${filter} ORDER BY r.movement_id DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
    if (rows.length) {
      const [serials] = await pool.query('SELECT movement_id, serial FROM admin_inventory_serials WHERE movement_id IN (?) ORDER BY serial',
        [rows.map((row) => row.movement_id)]);
      const byMovement = new Map();
      for (const item of serials) {
        const values = byMovement.get(item.movement_id) || [];
        values.push(item.serial);
        byMovement.set(item.movement_id, values);
      }
      for (const row of rows) {
        row.serials = byMovement.get(row.movement_id) || [];
        if (!can(user, 'cost:read')) delete row.unit_cost;
      }
    }
    return { data: rows, meta: pageMeta(page, limit, total) };
  },

  async receiveStock({ request_key, supplier, warehouse, notes, rows }, req) {
    const branch = inventoryBranch(req.user);
    if (branch !== null && (!branch || warehouse !== branch)) {
      throw new ApiError(403, 'Kho nhận phải thuộc chi nhánh của tài khoản');
    }
    const prior = async (db) => {
      const [records] = await db.query(`
        SELECT r.batch_line, m.product_id, m.created_by
          FROM admin_inventory_receipts r JOIN inventory_movements m ON m.id = r.movement_id
         WHERE r.request_key = ? ORDER BY r.batch_line`, [request_key]);
      if (!records.length) return null;
      if (records.some((row) => Number(row.created_by) !== Number(req.user.id))) {
        throw new ApiError(409, 'Mã phiếu nhập đã được sử dụng');
      }
      return { data: records.map(({ batch_line, product_id }) => ({ row_number: batch_line, product_id })), replayed: true };
    };
    try {
      return await withTransaction(async (conn) => {
        const existing = await prior(conn);
        if (existing) return existing;
        const skus = [...new Set(rows.map((row) => row.sku))].sort();
        const [products] = await conn.query('SELECT id, sku FROM products WHERE sku IN (?) AND deleted_at IS NULL ORDER BY id FOR UPDATE', [skus]);
        const productBySku = new Map(products.map((product) => [product.sku, product.id]));
        const allSerials = rows.flatMap((row) => row.serials);
        if (new Set(allSerials).size !== allSerials.length) throw new ApiError(400, 'Danh sách nhập có serial trùng');
        const result = [];
        for (const [index, row] of rows.entries()) {
          const productId = productBySku.get(row.sku);
          if (!productId) throw new ApiError(404, `Không tìm thấy SKU ${row.sku} ở dòng ${index + 1}`);
          if (row.serials.length && row.serials.length !== row.quantity) {
            throw new ApiError(400, `Số serial phải bằng số lượng ở dòng ${index + 1}`);
          }
          const movement = await this.createMovement({
            productId, type: 'import', delta: row.quantity, unitCost: row.unit_cost,
            reason: notes, userId: req.user.id,
          }, req, conn);
          await conn.query(`INSERT INTO admin_inventory_receipts (movement_id, supplier, warehouse, request_key, batch_line)
            VALUES (?, ?, ?, ?, ?)`, [movement.id, supplier, warehouse, request_key, index + 1]);
          if (row.serials.length) {
            await conn.query('INSERT INTO admin_inventory_serials (serial, movement_id) VALUES ?',
              [row.serials.map((serial) => [serial, movement.id])]);
          }
          result.push({ row_number: index + 1, product_id: productId });
        }
        return { data: result, replayed: false };
      });
    } catch (error) {
      if (error.code !== 'ER_DUP_ENTRY') throw error;
      const existing = await prior(pool);
      if (existing) return existing;
      throw new ApiError(409, 'Một hoặc nhiều serial đã tồn tại. Phiếu nhập chưa được lưu.');
    }
  },
};

module.exports = InventoryModel;
module.exports.inventoryBranch = inventoryBranch;

