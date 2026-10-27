const { pool } = require('../config/db');

function timeAgo(date) {
  if (!date) return 'Vừa xong';
  const now = new Date();
  const past = new Date(date);
  const diffMs = now - past;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'Vừa xong';
  if (diffMin < 60) return `${diffMin} phút trước`;
  if (diffHr < 24) return `${diffHr} giờ trước`;
  if (diffDay === 1) return 'Hôm qua';
  if (diffDay < 7) return `${diffDay} ngày trước`;
  return past.toLocaleDateString('vi-VN');
}

function formatVnd(amount) {
  return Number(amount || 0).toLocaleString('vi-VN') + ' ₫';
}

const NotificationModel = {
  async getNotifications({ limit = 20 } = {}) {
    const notifs = [];

    // 1. Orders from customers (Storefront actions)
    try {
      const [orders] = await pool.query(
        `SELECT id, code, customer_name, product_name, total_amount, status, payment_status, payment_verification_status, ordered_at, created_at
           FROM orders
          ORDER BY ordered_at DESC
          LIMIT 12`
      );

      orders.forEach((o) => {
        const orderDate = o.ordered_at || o.created_at;
        if (o.payment_verification_status === 'pending_verification') {
          notifs.push({
            id: `pay-${o.id}`,
            type: 'order',
            title: `Xác nhận chuyển khoản: ${o.code}`,
            message: `Khách hàng ${o.customer_name} đã xác nhận chuyển khoản cho đơn #${o.code} (${formatVnd(o.total_amount)}) - Chờ đối soát.`,
            time: timeAgo(orderDate),
            timestamp: new Date(orderDate).toISOString(),
            read: false,
            link: '/orders',
          });
        } else {
          let statusText = 'Mới đặt hàng';
          let isRead = false;
          if (o.status === 'confirmed') {
            statusText = 'Đã duyệt';
          } else if (o.status === 'shipping') {
            statusText = 'Đang giao';
          } else if (o.status === 'delivered') {
            statusText = 'Giao thành công';
            isRead = true;
          } else if (o.status === 'cancelled') {
            statusText = 'Đã hủy đơn';
            isRead = true;
          }

          notifs.push({
            id: `ord-${o.id}`,
            type: 'order',
            title: o.status === 'pending' ? `Đơn hàng mới: ${o.code}` : `Đơn hàng: ${o.code}`,
            message: `Khách hàng ${o.customer_name} đặt ${o.product_name || 'laptop'} (${formatVnd(o.total_amount)}) · ${statusText}`,
            time: timeAgo(orderDate),
            timestamp: new Date(orderDate).toISOString(),
            read: isRead,
            link: '/orders',
          });
        }
      });
    } catch (err) {
      console.error('Error fetching orders for notifications:', err.message);
    }

    // 2. Real Low Stock & Out of Stock Alerts
    try {
      const [lowStock] = await pool.query(
        `SELECT id, name, sku, stock_quantity, low_stock_threshold, updated_at
           FROM products
          WHERE stock_quantity <= low_stock_threshold AND deleted_at IS NULL
          ORDER BY stock_quantity ASC
          LIMIT 8`
      );

      lowStock.forEach((p) => {
        const isOutOfStock = p.stock_quantity === 0;
        notifs.push({
          id: `stock-${p.id}`,
          type: 'stock',
          title: isOutOfStock ? 'Hết hàng trong kho (Out of Stock)' : 'Cảnh báo tồn kho tối thiểu',
          message: `Sản phẩm "${p.name}" (SKU: ${p.sku}) ${isOutOfStock ? 'hiện đã hết hàng trong kho.' : `chỉ còn ${p.stock_quantity} máy trong kho (ngưỡng: ${p.low_stock_threshold}).`}`,
          time: timeAgo(p.updated_at),
          timestamp: new Date(p.updated_at || Date.now()).toISOString(),
          read: false,
          link: '/inventory',
        });
      });
    } catch (err) {
      console.error('Error fetching low stock for notifications:', err.message);
    }

    // 3. Customer RMA (Return & Warranty) Requests
    try {
      const [rmas] = await pool.query(
        `SELECT id, code, order_code, product_name, type, reason, status, created_at
           FROM rmas
          ORDER BY created_at DESC
          LIMIT 5`
      );

      rmas.forEach((r) => {
        notifs.push({
          id: `rma-${r.id}`,
          type: 'rma',
          title: `Yêu cầu đổi trả ${r.code} (${r.status})`,
          message: `Đơn #${r.order_code} (${r.product_name}): ${r.reason}`,
          time: timeAgo(r.created_at),
          timestamp: new Date(r.created_at).toISOString(),
          read: r.status === 'Hoàn tất' || r.status === 'Từ chối',
          link: '/returns',
        });
      });
    } catch (err) {
      console.error('Error fetching RMAs for notifications:', err.message);
    }

    // 4. Customer Trade-In Requests
    try {
      const [tradeIns] = await pool.query(
        `SELECT id, code, customer_name, brand, model, status, created_at
           FROM trade_ins
          ORDER BY created_at DESC
          LIMIT 5`
      );

      tradeIns.forEach((t) => {
        notifs.push({
          id: `tradein-${t.id}`,
          type: 'tradein',
          title: `Thu cũ đổi mới: ${t.code}`,
          message: `Khách hàng ${t.customer_name} gửi yêu cầu định giá máy ${t.brand} ${t.model} (${t.status}).`,
          time: timeAgo(t.created_at),
          timestamp: new Date(t.created_at).toISOString(),
          read: t.status === 'Đã duyệt' || t.status === 'Đã đóng',
          link: '/trade-in',
        });
      });
    } catch (err) {
      // Optional table, ignore if not present
    }

    // Sort all notifications chronologically (newest first)
    notifs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return notifs.slice(0, limit);
  },
};

module.exports = NotificationModel;
