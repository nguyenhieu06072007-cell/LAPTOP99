const { z } = require('zod');
const { pool, withTransaction } = require('../config/db');
const { can } = require('../config/permissions');
const { ApiError, asyncHandler, paging, pageMeta, escapeLike, toInt } = require('../utils/helpers');
const { writeAudit } = require('../services/audit');
const OrderModel = require('../models/order.model');

const nstr = (max) => z.string().trim().max(max).nullish().transform((v) => (v === '' ? null : v));

const createSchema = z.object({
  customer_id:     z.number().int().positive().nullish(),
  customer_name:   z.string().trim().min(1).max(100),
  customer_phone:  nstr(20),
  product_id:      z.number().int().positive().nullish(),
  product_name:    z.string().trim().min(1).max(255),
  sku:             nstr(50),
  serial_number:   nstr(100),
  quantity:        z.number().int().min(1).default(1),
  unit_price:      z.number().min(0).max(1e13),
  total_amount:    z.number().min(0).max(1e13),
  discount_amount: z.number().min(0).max(1e13).default(0),
  payment_method:  z.string().trim().max(100).default('Tiền mặt'),
  payment_status:  z.enum(['pending', 'paid', 'collecting', 'refunded']).default('pending'),
  gateway_code:    nstr(100),
  gateway_fee:     z.number().min(0).max(1e13).default(0),
  net_received:    z.number().min(0).max(1e13).default(0),
  status:          z.enum(['pending', 'confirmed', 'shipping', 'delivered', 'cancelled']).default('pending'),
  branch:          z.string().trim().max(100).default('Toàn hệ thống (HQ)'),
  notes:           nstr(5000),
});

const ORDER_STATUSES = ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'];

const OrdersController = {
  getFinanceSummary: asyncHandler(async (req, res) => {
    if (!can(req.user, 'finance:read') && !can(req.user, 'report:read')) {
      throw new ApiError(403, 'Bạn không có quyền xem thống kê tài chính');
    }
    const stats = await OrderModel.getFinanceSummary();
    res.json({ data: stats });
  }),

  getSerialsList: asyncHandler(async (req, res) => {
    const orders = await OrderModel.getSerialsList();
    const list = [];
    for (const o of orders) {
      const purchaseDate = new Date(o.ordered_at);
      const purchaseStr = purchaseDate.toLocaleDateString('vi-VN');

      let items = [];
      try {
        if (o.items_json) items = typeof o.items_json === 'string' ? JSON.parse(o.items_json) : o.items_json;
      } catch (e) {}

      if (items.length) {
        for (const it of items) {
          const months = Number(it.warranty_months || o.warranty_months || 12);
          const expDate = new Date(purchaseDate.getTime() + months * 30.44 * 86400000);
          const serials = Array.isArray(it.serials) && it.serials.length ? it.serials : (o.serial_number ? [o.serial_number] : []);
          for (const sn of serials) {
            list.push({
              serial: sn,
              order_code: o.order_code,
              product: it.name || o.product_name,
              sku: it.sku || o.sku || '',
              customer: `${o.customer_name}${o.customer_phone ? ' - ' + o.customer_phone : ''}`,
              purchaseDate: purchaseStr,
              warrantyMonths: months,
              expiryDate: expDate.toLocaleDateString('vi-VN'),
              status: expDate.getTime() > Date.now() ? 'active' : 'expired',
              order_status: o.status,
              history: [
                {
                  date: purchaseStr,
                  action: `Kích hoạt bảo hành điện tử theo đơn hàng ${o.order_code}`,
                  staff: 'Hệ thống tự động',
                },
              ],
            });
          }
        }
      } else if (o.serial_number) {
        const months = Number(o.warranty_months || 12);
        const expDate = new Date(purchaseDate.getTime() + months * 30.44 * 86400000);
        list.push({
          serial: o.serial_number,
          order_code: o.order_code,
          product: o.product_name,
          sku: o.sku || '',
          customer: `${o.customer_name}${o.customer_phone ? ' - ' + o.customer_phone : ''}`,
          purchaseDate: purchaseStr,
          warrantyMonths: months,
          expiryDate: expDate.toLocaleDateString('vi-VN'),
          status: expDate.getTime() > Date.now() ? 'active' : 'expired',
          order_status: o.status,
          history: [
            {
              date: purchaseStr,
              action: `Kích hoạt bảo hành điện tử theo đơn hàng ${o.order_code}`,
              staff: 'Hệ thống tự động',
            },
          ],
        });
      }
    }
    res.json({ data: list });
  }),

  getRmasList: asyncHandler(async (req, res) => {
    const [rows] = await pool.query(`
      SELECT r.*, c.full_name AS customer_name, c.phone AS customer_phone,
             o.serial_number, o.ordered_at, o.total_amount
        FROM rmas r
        LEFT JOIN customers c ON c.id = r.customer_id
        LEFT JOIN orders o ON o.code = r.order_code
       ORDER BY r.created_at DESC, r.id DESC
    `);
    res.json({ data: rows });
  }),

  updateRmaStatus: asyncHandler(async (req, res) => {
    const id = toInt(req.params.id);
    const status = String(req.body.status || 'Chờ duyệt').trim();
    await pool.query('UPDATE rmas SET status = ? WHERE id = ?', [status, id]);
    const [[updated]] = await pool.query('SELECT * FROM rmas WHERE id = ?', [id]);
    res.json({ data: updated });
  }),

  getTradeInsList: asyncHandler(async (req, res) => {
    const [rows] = await pool.query('SELECT t.* FROM trade_ins t ORDER BY t.created_at DESC, t.id DESC');
    res.json({ data: rows });
  }),

  updateTradeInStatus: asyncHandler(async (req, res) => {
    const id = toInt(req.params.id);
    const status = String(req.body.status || 'Đã định giá').trim();
    const finalPrice = req.body.final_price !== undefined ? Number(req.body.final_price) : null;
    if (finalPrice !== null) {
      await pool.query('UPDATE trade_ins SET status = ?, final_price = ? WHERE id = ?', [status, finalPrice, id]);
    } else {
      await pool.query('UPDATE trade_ins SET status = ? WHERE id = ?', [status, id]);
    }
    const [[updated]] = await pool.query('SELECT * FROM trade_ins WHERE id = ?', [id]);
    res.json({ data: updated });
  }),

  listOrders: asyncHandler(async (req, res) => {
    if (!can(req.user, 'order:read:all') && !can(req.user, 'order:read:own')) {
      throw new ApiError(403, 'Bạn không có quyền xem đơn hàng');
    }
    const q = req.query;
    const { page, limit, offset } = paging(q);
    const where = [];
    const params = [];

    if (!can(req.user, 'order:read:all') && can(req.user, 'order:read:own')) {
      where.push('o.assigned_to = ?');
      params.push(req.user.id);
    }

    if (q.search) {
      const s = `%${escapeLike(String(q.search).trim())}%`;
      where.push('(o.customer_name LIKE ? OR o.code LIKE ? OR o.serial_number LIKE ?)');
      params.push(s, s, s);
    }
    if (ORDER_STATUSES.includes(q.status)) {
      where.push('o.status = ?'); params.push(q.status);
    }
    if (['pending', 'paid', 'collecting', 'refunded'].includes(q.payment_status)) {
      where.push('o.payment_status = ?'); params.push(q.payment_status);
    }
    if (q.branch) { where.push('o.branch = ?'); params.push(q.branch); }
    if (q.date_from) { where.push('DATE(o.ordered_at) >= ?'); params.push(q.date_from); }
    if (q.date_to)   { where.push('DATE(o.ordered_at) <= ?'); params.push(q.date_to); }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const total = await OrderModel.countOrders(whereClause, params);
    const rows = await OrderModel.findOrders({ whereClause, params, limit, offset });

    res.json({ data: rows, meta: pageMeta(page, limit, total) });
  }),

  getOrder: asyncHandler(async (req, res) => {
    if (!can(req.user, 'order:read:all') && !can(req.user, 'order:read:own')) {
      throw new ApiError(403, 'Bạn không có quyền xem đơn hàng');
    }
    const id = toInt(req.params.id);
    const order = await OrderModel.findOrderById(pool, id);
    if (!order) throw new ApiError(404, 'Không tìm thấy đơn hàng');

    if (!can(req.user, 'order:read:all') && can(req.user, 'order:read:own') && order.assigned_to !== req.user.id) {
      throw new ApiError(403, 'Bạn không có quyền xem đơn hàng này');
    }
    res.json({ data: order });
  }),

  createOrder: asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body);

    const id = await withTransaction(async (conn) => {
      const [[{ cnt }]] = await conn.query('SELECT COUNT(*) AS cnt FROM orders');
      const seq = String(Number(cnt) + 1).padStart(3, '0');
      const year = new Date().getFullYear();
      const code = `DH-${year}-${seq}`;

      const row = {
        code,
        customer_id:     body.customer_id   ?? null,
        customer_name:   body.customer_name,
        customer_phone:  body.customer_phone ?? null,
        product_id:      body.product_id    ?? null,
        product_name:    body.product_name,
        sku:             body.sku           ?? null,
        serial_number:   body.serial_number ?? null,
        quantity:        body.quantity,
        unit_price:      body.unit_price,
        total_amount:    body.total_amount,
        discount_amount: body.discount_amount,
        payment_method:  body.payment_method,
        payment_status:  body.payment_status,
        gateway_code:    body.gateway_code  ?? null,
        gateway_fee:     body.gateway_fee,
        net_received:    body.net_received,
        status:          body.status,
        branch:          body.branch,
        assigned_to:     req.user.id,
        notes:           body.notes         ?? null,
      };

      const newId = await OrderModel.insertOrder(conn, row);
      if (body.customer_id) {
        await OrderModel.syncCustomerStats(conn, body.customer_id);
      }

      await writeAudit(conn, req, {
        action: 'create', entity: 'order', entityId: newId, newValues: row,
      });
      return newId;
    });

    const created = await OrderModel.findOrderById(pool, id);
    res.status(201).json({ data: created });
  }),

  updateOrderStatus: asyncHandler(async (req, res) => {
    const id = toInt(req.params.id);
    const { status } = z.object({ status: z.enum(['pending', 'confirmed', 'shipping', 'delivered', 'cancelled']) })
      .parse(req.body);

    await withTransaction(async (conn) => {
      const [[old]] = await conn.query(
        'SELECT status, customer_id, total_amount, product_id, quantity, items_json FROM orders WHERE id = ? FOR UPDATE',
        [id],
      );
      if (!old) throw new ApiError(404, 'Không tìm thấy đơn hàng');

      if (old.status === 'cancelled' && status !== 'cancelled') {
        throw new ApiError(409, 'Đơn đã huỷ không thể chuyển sang trạng thái khác');
      }

      if (status === 'delivered') {
        await conn.query(
          'UPDATE orders SET status = ?, payment_status = "paid", net_received = total_amount WHERE id = ?',
          [status, id],
        );
      } else {
        await conn.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
      }

      if (old.customer_id) {
        await OrderModel.syncCustomerStats(conn, old.customer_id);
      }

      await writeAudit(conn, req, {
        action: 'update_status', entity: 'order', entityId: id,
        oldValues: { status: old.status }, newValues: { status },
      });
    });

    const updated = await OrderModel.findOrderById(pool, id);
    res.json({ data: updated });
  }),
};

module.exports = OrdersController;

