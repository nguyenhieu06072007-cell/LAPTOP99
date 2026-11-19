const { z } = require('zod');
const { pool, withTransaction } = require('../config/db');
const { can, orderScope, inOrderScope } = require('../config/permissions');
const { ApiError, asyncHandler, escapeLike, paging, toInt } = require('../utils/helpers');
const { writeAudit } = require('../services/audit');

const HQ = 'Toàn hệ thống (HQ)';
const onlineQueue = "o.assigned_to IS NULL AND o.branch = ? AND o.items_json IS NOT NULL";
const openOrders = "o.status IN ('pending', 'confirmed')";
const serialSchema = z.string().trim().min(1).max(100).transform((value) => value.toUpperCase());
const warrantyStatuses = ['received', 'repairing', 'completed', 'returned'];
const parseJson = (value) => typeof value === 'string' ? JSON.parse(value) : value;
const itemsOf = (order) => parseJson(order.items_json) || [];
const ownsSerial = (order, serial) => [order.serial_number, ...itemsOf(order).flatMap((item) => item.serials || [])]
  .some((value) => value?.trim().toUpperCase() === serial);
const scopeEntries = (user) => Object.entries(orderScope(user));
const scopeSql = (scope) => scope.map(([key]) => ` AND o.${key} = ?`).join('');
const scopeValues = (scope) => scope.map(([, value]) => value || null);

async function findOrder(conn, id) {
  const [[order]] = await conn.query('SELECT * FROM orders WHERE id = ? FOR UPDATE', [id]);
  if (!order) throw new ApiError(404, 'Không tìm thấy đơn hàng');
  return order;
}

async function listAssignees(user, staffId, db = pool) {
  const scope = orderScope(user);
  const where = ["u.status = 'active'", "NULLIF(TRIM(u.branch), '') IS NOT NULL"];
  const params = [];
  if (scope.branch !== undefined) { where.push('u.branch = ?'); params.push(scope.branch); }
  if (scope.assigned_to !== undefined) { where.push('u.id = ?'); params.push(scope.assigned_to); }
  if (staffId != null) { where.push('u.id = ?'); params.push(staffId); }
  const [rows] = await db.query(`SELECT u.id, u.full_name, u.branch, u.custom_permissions, r.name AS role, r.permissions AS role_permissions
    FROM users u JOIN roles r ON r.id = u.role_id WHERE ${where.join(' AND ')} ORDER BY u.full_name${staffId != null ? ' FOR UPDATE' : ''}`, params);
  return rows.filter((row) => can(row, 'order:read:own') || can(row, 'order:read:all'))
    .map(({ id, full_name, branch }) => ({ id, full_name, branch }));
}

const FulfillmentController = {
  assignmentQueue: asyncHandler(async (req, res) => {
    const scope = scopeEntries(req.user);
    const { limit, offset } = paging(req.query, 30, 100);
    // The shared queue exposes fulfillment details only. Customer data is loaded
    // through the normal order route once the order belongs to the staff member.
    const [orders] = await pool.query(`SELECT o.id, o.code, o.branch, o.assigned_to, o.product_name, o.quantity
      FROM orders o WHERE ${openOrders} AND ((1 = 1${scopeSql(scope)}) OR (${onlineQueue}))
      ORDER BY (o.assigned_to IS NULL) DESC, o.ordered_at DESC, o.id DESC LIMIT ? OFFSET ?`,
    [...scopeValues(scope), HQ, limit, offset]);
    res.json({ data: orders, staff: await listAssignees(req.user) });
  }),

  assign: asyncHandler(async (req, res) => {
    const { staff_id } = z.object({ staff_id: z.number().int().positive() }).parse(req.body);
    await withTransaction(async (conn) => {
      const order = await findOrder(conn, toInt(req.params.id));
      const unassignedOnline = !order.assigned_to && order.branch === HQ && order.items_json != null;
      if (!inOrderScope(req.user, order) && !unassignedOnline) {
        throw new ApiError(403, 'Đơn hàng ngoài phạm vi phân công');
      }
      if (!['pending', 'confirmed'].includes(order.status)) throw new ApiError(409, 'Đơn đã qua bước phân công');
      const [staff] = await listAssignees(req.user, staff_id, conn);
      if (!staff) throw new ApiError(403, 'Nhân viên không thuộc phạm vi hoặc thiếu quyền xem đơn');
      if (Number(order.assigned_to) === staff.id && order.branch === staff.branch) return;
      const [[serials]] = await conn.query('SELECT serial FROM admin_order_serials WHERE order_id = ? LIMIT 1', [order.id]);
      if (serials && order.branch !== staff.branch) throw new ApiError(409, 'Đơn đã gán serial tại kho không thể chuyển sang chi nhánh khác');
      await conn.query(`INSERT INTO admin_order_assignments (order_id) VALUES (?)
        ON DUPLICATE KEY UPDATE created_at = CURRENT_TIMESTAMP`, [order.id]);
      await conn.query('UPDATE orders SET assigned_to = ?, branch = ? WHERE id = ?', [staff.id, staff.branch, order.id]);
      await writeAudit(conn, req, {
        action: 'assign_order', entity: 'order', entityId: order.id,
        oldValues: { assigned_to: order.assigned_to, branch: order.branch },
        newValues: { assigned_to: staff.id, branch: staff.branch },
      });
    });
    res.status(204).end();
  }),

  serialQueue: asyncHandler(async (req, res) => {
    const scope = scopeEntries(req.user);
    const { limit, offset } = paging(req.query, 30, 100);
    const [rows] = await pool.query(`SELECT o.id, o.code, o.branch, o.product_id, o.product_name, o.sku,
      o.quantity, o.serial_number, o.items_json
      FROM orders o WHERE ${openOrders}${scopeSql(scope)}
      AND (o.serial_number IS NULL OR o.serial_number = 'CHỜ XUẤT KHO')
      ORDER BY o.ordered_at DESC, o.id DESC LIMIT ? OFFSET ?`, [...scopeValues(scope), limit, offset]);
    const data = rows.map((order) => ({
      id: order.id, code: order.code, branch: order.branch,
      items: itemsOf(order).length ? itemsOf(order).map(({ pid, sku, name, qty }) => ({ pid, sku, name, qty }))
        : [{ pid: order.product_id, sku: order.sku, name: order.product_name, qty: order.quantity }],
    })).filter((order) => order.items.every((item) => item.pid));
    res.json({ data });
  }),

  assignSerials: asyncHandler(async (req, res) => {
    const { lines } = z.object({ lines: z.array(z.array(serialSchema).min(1).max(100)).min(1).max(100) }).parse(req.body);
    const serials = lines.flat();
    if (serials.length > 500) throw new ApiError(400, 'Tối đa 500 serial mỗi đơn');
    if (new Set(serials).size !== serials.length) throw new ApiError(400, 'Danh sách có serial bị trùng');
    try {
      await withTransaction(async (conn) => {
        const order = await findOrder(conn, toInt(req.params.id));
        if (!inOrderScope(req.user, order)) throw new ApiError(403, 'Đơn hàng ngoài phạm vi kho');
        const items = itemsOf(order);
        if (!['pending', 'confirmed'].includes(order.status) ||
            (order.serial_number && order.serial_number.trim().toUpperCase() !== 'CHỜ XUẤT KHO') ||
            items.some((item) => item.serials?.some((serial) => serial.trim().toUpperCase() !== 'CHỜ XUẤT KHO'))) {
          throw new ApiError(409, 'Đơn đã được gán serial hoặc đã qua bước xuất kho');
        }
        const orderLines = items.length ? items : [{ pid: order.product_id, qty: order.quantity }];
        if (lines.length !== orderLines.length || orderLines.some((item, index) => lines[index].length !== Number(item.qty))) {
          throw new ApiError(400, 'Số serial phải khớp số máy trên từng dòng đơn');
        }
        const [stock] = await conn.query(`SELECT s.serial, m.product_id, r.warehouse, a.order_id
          FROM admin_inventory_serials s
          JOIN inventory_movements m ON m.id = s.movement_id
          JOIN admin_inventory_receipts r ON r.movement_id = s.movement_id
          LEFT JOIN admin_order_serials a ON a.serial = s.serial
          WHERE s.serial IN (?) ORDER BY s.serial FOR UPDATE`, [serials]);
        const bySerial = new Map(stock.map((item) => [item.serial, item]));
        for (const [index, line] of lines.entries()) {
          for (const serial of line) {
            const entry = bySerial.get(serial);
            if (!entry || entry.order_id || Number(entry.product_id) !== Number(orderLines[index].pid) || entry.warehouse !== order.branch) {
              throw new ApiError(409, `Serial ${serial} chưa nhập kho chi nhánh này, sai SKU hoặc đã gán`);
            }
          }
        }
        const legacySerialSearch = serials.map(() => "JSON_SEARCH(items_json, 'one', ?, NULL, '$[*].serials[*]') IS NOT NULL").join(' OR ');
        const [[legacyMatch]] = await conn.query(`SELECT id FROM orders WHERE id <> ? AND status <> 'cancelled' AND (
          serial_number IN (?) OR ${legacySerialSearch}) LIMIT 1`, [order.id, serials, ...serials.map(escapeLike)]);
        if (legacyMatch) throw new ApiError(409, 'Một serial đã được dùng ở đơn hàng khác');
        await conn.query('INSERT INTO admin_order_serials (serial, order_id) VALUES ?', [serials.map((serial) => [serial, order.id])]);
        const serialized = items.length
          ? items.map((item, index) => ({ ...item, serials: lines[index] }))
          : orderLines.map((item, index) => ({ ...item, name: order.product_name, sku: order.sku, unit_price: order.unit_price, line_total: order.total_amount, serials: lines[index] }));
        await conn.query('UPDATE orders SET serial_number = ?, items_json = ? WHERE id = ?',
          [serials[0], JSON.stringify(serialized), order.id]);
        await writeAudit(conn, req, { action: 'assign_serials', entity: 'order', entityId: order.id, newValues: { serials } });
      });
    } catch (error) {
      if (error.code !== 'ER_DUP_ENTRY') throw error;
      throw new ApiError(409, 'Một serial đã được gán cho đơn hàng khác');
    }
    res.status(204).end();
  }),

  warrantyCases: asyncHandler(async (req, res) => {
    const { order_code, serial } = z.object({ order_code: z.string().trim().min(1).max(50), serial: serialSchema }).parse(req.query);
    const scope = scopeEntries(req.user);
    const [rows] = await pool.query(`SELECT w.id, w.issue, w.status, w.history, w.created_at
      FROM admin_warranty_cases w JOIN orders o ON o.id = w.order_id
      WHERE o.code = ? AND w.serial = ?${scopeSql(scope)} ORDER BY w.id DESC`, [order_code, serial, ...scopeValues(scope)]);
    res.json({ data: rows.map((row) => ({ ...row, history: parseJson(row.history) })) });
  }),

  createWarrantyCase: asyncHandler(async (req, res) => {
    const { order_code, serial, issue } = z.object({
      order_code: z.string().trim().min(1).max(50), serial: serialSchema, issue: z.string().trim().min(1).max(1000),
    }).parse(req.body);
    const id = await withTransaction(async (conn) => {
      const [[order]] = await conn.query('SELECT * FROM orders WHERE code = ? FOR UPDATE', [order_code]);
      if (!order || !inOrderScope(req.user, order)) throw new ApiError(404, 'Không tìm thấy đơn trong phạm vi');
      if (!['delivered', 'completed'].includes(order.status) || !ownsSerial(order, serial)) {
        throw new ApiError(409, 'Serial phải thuộc đơn đã giao');
      }
      const [[active]] = await conn.query("SELECT id FROM admin_warranty_cases WHERE order_id = ? AND serial = ? AND status <> 'returned' LIMIT 1", [order.id, serial]);
      if (active) throw new ApiError(409, 'Serial đã có phiếu đang xử lý');
      const history = [{ status: 'received', note: issue, date: new Date().toISOString(), staff: req.user.full_name }];
      const [result] = await conn.query('INSERT INTO admin_warranty_cases (order_id, serial, issue, history) VALUES (?, ?, ?, ?)',
        [order.id, serial, issue, JSON.stringify(history)]);
      await writeAudit(conn, req, { action: 'receive_warranty', entity: 'warranty', entityId: result.insertId });
      return result.insertId;
    });
    res.status(201).json({ data: { id } });
  }),

  updateWarrantyCase: asyncHandler(async (req, res) => {
    const { status, note } = z.object({ status: z.enum(warrantyStatuses), note: z.string().trim().min(1).max(1000) }).parse(req.body);
    const id = toInt(req.params.id);
    await withTransaction(async (conn) => {
      const [[record]] = await conn.query(`SELECT w.status, w.history, o.assigned_to, o.branch FROM admin_warranty_cases w
        JOIN orders o ON o.id = w.order_id WHERE w.id = ? FOR UPDATE`, [id]);
      if (!record || !inOrderScope(req.user, record)) throw new ApiError(404, 'Không tìm thấy phiếu trong phạm vi');
      const next = warrantyStatuses[warrantyStatuses.indexOf(record.status) + 1];
      if (record.status === 'returned' || (status !== next && status !== record.status)) {
        throw new ApiError(409, 'Trạng thái bảo hành không hợp lệ');
      }
      const history = [...parseJson(record.history), { status, note, date: new Date().toISOString(), staff: req.user.full_name }];
      await conn.query('UPDATE admin_warranty_cases SET status = ?, history = ? WHERE id = ?', [status, JSON.stringify(history), id]);
      await writeAudit(conn, req, { action: 'update_warranty', entity: 'warranty', entityId: id, newValues: { status } });
    });
    res.status(204).end();
  }),
};

module.exports = FulfillmentController;
