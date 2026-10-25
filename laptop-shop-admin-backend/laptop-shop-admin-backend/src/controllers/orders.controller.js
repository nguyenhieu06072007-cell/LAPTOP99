const { z } = require('zod');
const { pool, withTransaction } = require('../config/db');
const { can } = require('../config/permissions');
const { ApiError, asyncHandler, paging, pageMeta, escapeLike, toInt, generateUniqueCode, addCalendarMonths } = require('../utils/helpers');
const { writeAudit } = require('../services/audit');
const OrderModel = require('../models/order.model');
const OrderService = require('../services/order.service');

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
  unit_price:      z.number().min(0).max(1e13).nullish(),
  total_amount:    z.number().min(0).max(1e13).nullish(),
  discount_amount: z.number().min(0).max(1e13).default(0),
  payment_method:  z.string().trim().max(100).default('Tiền mặt'),
  payment_status:  z.enum(['pending', 'unpaid', 'paid', 'collecting', 'refunded']).default('unpaid'),
  gateway_code:    nstr(100),
  gateway_fee:     z.number().min(0).max(1e13).default(0),
  net_received:    z.number().min(0).max(1e13).default(0),
  status:          z.enum(['pending', 'confirmed', 'shipping', 'delivered', 'cancelled']).default('pending'),
  branch:          z.string().trim().max(100).default('Toàn hệ thống (HQ)'),
  notes:           nstr(5000),
});

const ORDER_STATUSES = ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'];
const VALID_RMA_STATUSES = ['Chờ duyệt', 'Đã duyệt', 'Từ chối', 'Hoàn tất'];
const VALID_TRADEIN_STATUSES = ['Chờ định giá', 'Đã định giá', 'Đã chấp nhận', 'Đã dùng'];

const OrdersController = {
  getFinanceSummary: asyncHandler(async (req, res) => {
    if (!can(req.user, 'finance:read') && !can(req.user, 'report:sales') && !can(req.user, 'report:read')) {
      throw new ApiError(403, 'Bạn không có quyền xem thống kê tài chính');
    }
    const stats = await OrderModel.getFinanceSummary();
    res.json({ data: stats });
  }),

  getSerialsList: asyncHandler(async (req, res) => {
    const q = req.query;
    const { page, limit, offset } = paging(q, 20, 100);
    const search = q.search ? `%${escapeLike(String(q.search).trim())}%` : null;

    let whereSql = "WHERE o.status != 'cancelled'";
    const params = [];
    if (search) {
      whereSql += ' AND (o.serial_number LIKE ? OR o.code LIKE ? OR o.customer_name LIKE ? OR o.customer_phone LIKE ?)';
      params.push(search, search, search, search);
    }

    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM orders o ${whereSql}`, params);

    const [orders] = await pool.query(`
      SELECT o.id, o.code AS order_code, o.customer_name, o.customer_phone,
             o.product_id, o.product_name, o.sku, o.serial_number,
             o.items_json, o.status, o.ordered_at, o.delivered_at,
             p.warranty_months
        FROM orders o
        LEFT JOIN products p ON p.id = o.product_id
       ${whereSql}
       ORDER BY o.ordered_at DESC
       LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    const list = [];
    for (const o of orders) {
      const isDelivered = o.status === 'delivered';
      const baseDate = new Date(o.delivered_at || o.ordered_at);
      const purchaseStr = baseDate.toLocaleDateString('vi-VN');

      let items = [];
      try {
        if (o.items_json) items = typeof o.items_json === 'string' ? JSON.parse(o.items_json) : o.items_json;
      } catch (e) {}

      if (items.length) {
        for (const it of items) {
          const months = Number(it.warranty_months || o.warranty_months || 12);
          const expDate = addCalendarMonths(baseDate, months);
          const serials = Array.isArray(it.serials) && it.serials.length ? it.serials : (o.serial_number ? [o.serial_number] : []);
          for (const sn of serials) {
            const isActive = isDelivered && expDate.getTime() > Date.now();
            list.push({
              serial: sn,
              order_code: o.order_code,
              product: it.name || o.product_name,
              sku: it.sku || o.sku || '',
              customer: `${o.customer_name}${o.customer_phone ? ' - ' + o.customer_phone : ''}`,
              purchaseDate: purchaseStr,
              warrantyMonths: months,
              expiryDate: expDate.toLocaleDateString('vi-VN'),
              status: isActive ? 'active' : isDelivered ? 'expired' : 'pending_activation',
              order_status: o.status,
              history: [
                {
                  date: purchaseStr,
                  action: isDelivered ? `Bảo hành điện tử có hiệu lực theo đơn ${o.order_code}` : `Chờ kích hoạt bảo hành (đơn ${o.status})`,
                  staff: 'Hệ thống tự động',
                },
              ],
            });
          }
        }
      } else if (o.serial_number) {
        const months = Number(o.warranty_months || 12);
        const expDate = addCalendarMonths(baseDate, months);
        const isActive = isDelivered && expDate.getTime() > Date.now();
        list.push({
          serial: o.serial_number,
          order_code: o.order_code,
          product: o.product_name,
          sku: o.sku || '',
          customer: `${o.customer_name}${o.customer_phone ? ' - ' + o.customer_phone : ''}`,
          purchaseDate: purchaseStr,
          warrantyMonths: months,
          expiryDate: expDate.toLocaleDateString('vi-VN'),
          status: isActive ? 'active' : isDelivered ? 'expired' : 'pending_activation',
          order_status: o.status,
          history: [
            {
              date: purchaseStr,
              action: isDelivered ? `Bảo hành điện tử có hiệu lực theo đơn ${o.order_code}` : `Chờ kích hoạt bảo hành (đơn ${o.status})`,
              staff: 'Hệ thống tự động',
            },
          ],
        });
      }
    }

    res.json({ data: list, meta: pageMeta(page, limit, total) });
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
    if (!VALID_RMA_STATUSES.includes(status)) {
      throw new ApiError(400, `Trạng thái RMA không hợp lệ. Chỉ chấp nhận: ${VALID_RMA_STATUSES.join(', ')}`);
    }

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
    if (!VALID_TRADEIN_STATUSES.includes(status)) {
      throw new ApiError(400, `Trạng thái thu cũ không hợp lệ. Chỉ chấp nhận: ${VALID_TRADEIN_STATUSES.join(', ')}`);
    }

    const finalPrice = req.body.final_price !== undefined ? Number(req.body.final_price) : null;
    if (finalPrice !== null) {
      if (finalPrice < 0) throw new ApiError(400, 'Giá định giá không được âm');
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

    // Phân quyền phạm vi dữ liệu: Sales executive chỉ xem đơn do mình phụ trách
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
    if (['pending', 'unpaid', 'paid', 'collecting', 'refunded'].includes(q.payment_status)) {
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

    // Chặn thay đổi ID để xem đơn của nhân viên khác
    if (!can(req.user, 'order:read:all') && can(req.user, 'order:read:own') && order.assigned_to !== req.user.id) {
      throw new ApiError(403, 'Bạn không có quyền xem đơn hàng này');
    }
    res.json({ data: order });
  }),

  /**
   * Tạo đơn hàng tại Admin có kiểm tra và trừ tồn kho, đối soát giá chuẩn backend
   */
  createOrder: asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body);

    const id = await withTransaction(async (conn) => {
      let unitPrice = 0;
      let calculatedTotal = 0;
      let sku = body.sku || null;
      let prodName = body.product_name;

      // 1. Kiểm tra sản phẩm và khóa dòng để kiểm tra tồn kho
      if (body.product_id) {
        const [[prod]] = await conn.query(
          'SELECT id, sku, name, price, sale_price, stock_quantity, status, deleted_at FROM products WHERE id = ? FOR UPDATE',
          [body.product_id]
        );
        if (!prod || prod.deleted_at || prod.status !== 'active') {
          throw new ApiError(400, `Sản phẩm "${prod ? prod.name : body.product_id}" đã ngừng bán hoặc không hoạt động`);
        }
        if (prod.stock_quantity < body.quantity) {
          throw new ApiError(400, `Sản phẩm "${prod.name}" chỉ còn ${prod.stock_quantity} máy trong kho (yêu cầu ${body.quantity})`);
        }

        unitPrice = prod.sale_price ? Number(prod.sale_price) : Number(prod.price);
        calculatedTotal = unitPrice * body.quantity;
        sku = prod.sku;
        prodName = prod.name;

        // Trừ tồn kho và ghi nhật ký kho
        const stockBefore = Number(prod.stock_quantity);
        const stockAfter = stockBefore - body.quantity;
        await conn.query(
          'UPDATE products SET stock_quantity = ?, sold_count = sold_count + ? WHERE id = ?',
          [stockAfter, body.quantity, prod.id]
        );
        await conn.query(`
          INSERT INTO inventory_movements (product_id, type, quantity, stock_before, stock_after, reason, created_by)
          VALUES (?, 'export', ?, ?, ?, ?, ?)
        `, [prod.id, -body.quantity, stockBefore, stockAfter, `Bán hàng tại quầy Admin (Nhân viên ID: ${req.user.id})`, req.user.id]);
      } else {
        unitPrice = Number(body.unit_price || 0);
        calculatedTotal = unitPrice * body.quantity;
      }

      // 2. Kiểm tra quyền giảm giá
      const discount = Number(body.discount_amount || 0);
      if (discount > 0) {
        if (!can(req.user, 'order:discount:approve') && discount > 500000) {
          throw new ApiError(403, 'Chiết khấu vượt quá 500,000đ yêu cầu quyền duyệt giảm giá (order:discount:approve)');
        }
      }

      const finalTotal = Math.max(0, calculatedTotal - discount);

      // 3. Sinh mã đơn duy nhất an toàn chống trùng
      const code = await generateUniqueCode(conn, 'orders', 'DH');

      // 4. Xác định tiền thực nhận: Chỉ ghi nhận thực nhận khi đã thanh toán thực tế
      const isPaid = body.payment_status === 'paid';
      const netReceived = isPaid ? Math.max(0, finalTotal - (body.gateway_fee || 0)) : 0;

      const row = {
        code,
        customer_id:     body.customer_id   ?? null,
        customer_name:   body.customer_name,
        customer_phone:  body.customer_phone ?? null,
        product_id:      body.product_id    ?? null,
        product_name:    prodName,
        sku,
        serial_number:   body.serial_number || 'CHỜ GÁN S/N',
        quantity:        body.quantity,
        unit_price:      unitPrice,
        total_amount:    finalTotal,
        discount_amount: discount,
        payment_method:  body.payment_method,
        payment_status:  isPaid ? 'paid' : 'unpaid',
        gateway_code:    body.gateway_code  ?? null,
        gateway_fee:     body.gateway_fee || 0,
        net_received:    netReceived,
        status:          body.status || 'pending',
        branch:          body.branch || req.user.branch || 'Toàn hệ thống (HQ)',
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

  /**
   * Cập nhật trạng thái đơn hàng theo state-machine và đồng bộ hoàn kho khi hủy
   */
  updateOrderStatus: asyncHandler(async (req, res) => {
    const id = toInt(req.params.id);
    const { status } = z.object({ status: z.enum(['pending', 'confirmed', 'shipping', 'delivered', 'cancelled']) })
      .parse(req.body);

    await withTransaction(async (conn) => {
      const [[old]] = await conn.query(
        'SELECT id, code, status, customer_id, total_amount, payment_status, payment_method, assigned_to FROM orders WHERE id = ? FOR UPDATE',
        [id],
      );
      if (!old) throw new ApiError(404, 'Không tìm thấy đơn hàng');

      // Nhân viên chỉ được thao tác trên đơn hàng được phân công
      if (!can(req.user, 'order:read:all') && can(req.user, 'order:read:own') && old.assigned_to !== req.user.id) {
        throw new ApiError(403, 'Bạn không được phép chỉnh sửa đơn hàng của nhân viên khác');
      }

      // Xử lý HỦY ĐƠN: Hoàn kho đồng bộ, kiểm tra quyền order:cancel
      if (status === 'cancelled') {
        if (!can(req.user, 'order:cancel')) {
          throw new ApiError(403, 'Bạn không có quyền hủy đơn hàng (order:cancel)');
        }
        await OrderService.cancelOrder(conn, {
          orderId: id,
          reason: req.body.reason || `Admin ID ${req.user.id} hủy đơn`,
          cancelledBy: req.user.id,
          isCustomer: false,
        });
        return;
      }

      // Kiểm tra ma trận chuyển trạng thái hợp lệ
      const allowed = OrderService.ALLOWED_ORDER_TRANSITIONS[old.status] || [];
      if (!allowed.includes(status) && status !== old.status) {
        throw new ApiError(400, `Không thể chuyển trạng thái từ "${old.status}" sang "${status}"`);
      }

      // Đơn chuyển sang delivered: Cập nhật delivered_at, xử lý COD độc lập
      if (status === 'delivered') {
        let newPaymentStatus = old.payment_status;
        let newNetReceived = old.net_received;
        // Nếu là COD và chưa thanh toán: Chuyển sang collecting (chờ đơn vị giao vận đối soát tiền)
        if (old.payment_status !== 'paid' && (old.payment_method?.toLowerCase().includes('cod') || old.payment_method?.toLowerCase().includes('tiền mặt'))) {
          newPaymentStatus = 'collecting';
        }

        await conn.query(
          'UPDATE orders SET status = ?, payment_status = ?, delivered_at = NOW() WHERE id = ?',
          [status, newPaymentStatus, id],
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

  /**
   * Nghiệp vụ đối soát thanh toán dành riêng cho Kế toán / Quản trị viên
   */
  reconcilePayment: asyncHandler(async (req, res) => {
    if (!can(req.user, 'finance:reconcile') && !can(req.user, 'finance:read') && req.user.role !== 'super_admin') {
      throw new ApiError(403, 'Bạn không có quyền thực hiện đối soát thanh toán (finance:reconcile)');
    }

    const id = toInt(req.params.id);
    const { gateway_code, gateway_fee } = z.object({
      gateway_code: z.string().trim().min(1).nullish(),
      gateway_fee: z.number().min(0).nullish(),
    }).parse(req.body);

    await withTransaction(async (conn) => {
      const [[order]] = await conn.query('SELECT * FROM orders WHERE id = ? FOR UPDATE', [id]);
      if (!order) throw new ApiError(404, 'Không tìm thấy đơn hàng');
      if (order.status === 'cancelled') throw new ApiError(400, 'Đơn hàng đã hủy, không thể đối soát thanh toán');

      const fee = gateway_fee !== undefined && gateway_fee !== null ? Number(gateway_fee) : Number(order.gateway_fee || 0);
      const netReceived = Math.max(0, Number(order.total_amount) - fee);

      await conn.query(`
        UPDATE orders 
        SET payment_status = 'paid', 
            payment_verification_status = 'verified',
            gateway_code = COALESCE(?, gateway_code),
            gateway_fee = ?,
            net_received = ?
        WHERE id = ?
      `, [gateway_code || null, fee, netReceived, id]);

      if (order.customer_id) {
        await OrderModel.syncCustomerStats(conn, order.customer_id);
      }

      await writeAudit(conn, req, {
        action: 'reconcile_payment', entity: 'order', entityId: id,
        newValues: { payment_status: 'paid', net_received: netReceived },
      });
    });

    const updated = await OrderModel.findOrderById(pool, id);
    res.json({ success: true, message: 'Đã hoàn tất đối soát thanh toán', data: updated });
  }),
};

module.exports = OrdersController;
