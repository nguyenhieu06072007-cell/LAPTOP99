const { ApiError, generateUniqueCode } = require('../utils/helpers');
const OrderModel = require('../models/order.model');

const ALLOWED_ORDER_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipping', 'cancelled'],
  shipping: ['delivered', 'cancelled'],
  delivered: [], // Đơn đã giao không thể hủy hoặc quay lại; phải qua quy trình RMA
  cancelled: [], // Trạng thái cuối
};

const OrderService = {
  ALLOWED_ORDER_TRANSITIONS,

  /**
   * Hủy đơn hàng dùng chung cho cả Admin và Khách hàng (Symmetrical & Idempotent)
   */
  async cancelOrder(conn, { orderId, reason, cancelledBy = 'system', isCustomer = false }) {
    const [[order]] = await conn.query(
      'SELECT * FROM orders WHERE id = ? FOR UPDATE',
      [orderId]
    );

    if (!order) throw new ApiError(404, 'Không tìm thấy đơn hàng');

    // Idempotent: Nếu đơn đã hủy từ trước, không xử lý lại để tránh hoàn kho 2 lần
    if (order.status === 'cancelled') {
      return { success: true, alreadyCancelled: true, order };
    }

    // Đơn đã giao thành công không thể hủy trực tiếp
    if (order.status === 'delivered') {
      throw new ApiError(400, 'Đơn hàng đã giao thành công không thể hủy trực tiếp. Vui lòng thực hiện yêu cầu đổi trả (RMA).');
    }

    // Khách hàng chỉ được tự hủy đơn khi đơn còn ở trạng thái Chờ xác nhận (pending)
    if (isCustomer && order.status !== 'pending') {
      throw new ApiError(400, 'Đơn hàng đã được xác nhận/đang giao. Vui lòng liên hệ tổng đài để yêu cầu hủy.');
    }

    // 1. Hoàn tồn kho chính xác theo từng sản phẩm trong đơn
    let items = [];
    try {
      items = typeof order.items_json === 'string' ? JSON.parse(order.items_json) : (order.items_json || []);
    } catch {
      items = [];
    }

    if (items.length > 0) {
      for (const it of items) {
        const pid = it.pid || it.product_id;
        const qty = Number(it.qty || it.quantity || 1);
        if (!pid) continue;

        const [[prod]] = await conn.query(
          'SELECT id, stock_quantity, sold_count FROM products WHERE id = ? FOR UPDATE',
          [pid]
        );
        if (prod) {
          const stockBefore = Number(prod.stock_quantity);
          const stockAfter = stockBefore + qty;
          await conn.query(
            'UPDATE products SET stock_quantity = ?, sold_count = GREATEST(0, sold_count - ?) WHERE id = ?',
            [stockAfter, qty, pid]
          );
          await conn.query(`
            INSERT INTO inventory_movements (product_id, type, quantity, stock_before, stock_after, reason, created_by)
            VALUES (?, 'return', ?, ?, ?, ?, NULL)
          `, [pid, qty, stockBefore, stockAfter, `Hoàn kho do hủy đơn ${order.code}: ${reason || 'Khách/Admin hủy'}`]);
        }
      }
    } else if (order.product_id) {
      const pid = order.product_id;
      const qty = Number(order.quantity || 1);
      const [[prod]] = await conn.query(
        'SELECT id, stock_quantity, sold_count FROM products WHERE id = ? FOR UPDATE',
        [pid]
      );
      if (prod) {
        const stockBefore = Number(prod.stock_quantity);
        const stockAfter = stockBefore + qty;
        await conn.query(
          'UPDATE products SET stock_quantity = ?, sold_count = GREATEST(0, sold_count - ?) WHERE id = ?',
          [stockAfter, qty, pid]
        );
        await conn.query(`
          INSERT INTO inventory_movements (product_id, type, quantity, stock_before, stock_after, reason, created_by)
          VALUES (?, 'return', ?, ?, ?, ?, NULL)
        `, [pid, qty, stockBefore, stockAfter, `Hoàn kho do hủy đơn ${order.code}: ${reason || 'Khách/Admin hủy'}`]);
      }
    }

    // 2. Hoàn lại lượt sử dụng mã khuyến mãi (nếu có)
    if (order.coupon_code) {
      await conn.query(
        'UPDATE promotions SET used_count = GREATEST(0, used_count - 1) WHERE code = ?',
        [order.coupon_code]
      );
    }

    // 3. Hoàn lại phiếu thu cũ (nếu có dùng phiếu thu cũ)
    if (order.trade_in_id) {
      await conn.query(
        "UPDATE trade_ins SET status = 'Đã định giá', used_in_order_id = NULL WHERE id = ?",
        [order.trade_in_id]
      );
    }

    // 4. Xử lý trạng thái tiền: Đơn đã thanh toán chuyển sang chờ hoàn tiền (refund_pending), không tự coi là đã hoàn
    let newPaymentStatus = order.payment_status;
    let cancelNote = `[Hủy đơn: ${reason || 'Không có lý do'}]`;
    if (order.payment_status === 'paid') {
      newPaymentStatus = 'unpaid'; // Giữ unpaid hoặc refund_pending trong ghi chú
      cancelNote += ' [ĐÃ THANH TOÁN: Chờ kế toán thực hiện hoàn tiền]';
    }

    const updatedNotes = [order.notes, cancelNote].filter(Boolean).join(' | ');

    await conn.query(
      'UPDATE orders SET status = "cancelled", notes = ? WHERE id = ?',
      [updatedNotes, order.id]
    );

    // 5. Cập nhật lại chỉ số chi tiêu và hạng khách hàng
    if (order.customer_id) {
      await OrderModel.syncCustomerStats(conn, order.customer_id);
    }

    return { success: true, orderId: order.id, code: order.code };
  },
};

module.exports = OrderService;

