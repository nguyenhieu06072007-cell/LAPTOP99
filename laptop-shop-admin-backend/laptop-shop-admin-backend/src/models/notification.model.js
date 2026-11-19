const { pool } = require('../config/db');
const { can, orderScope } = require('../config/permissions');

const orderLabels = {
  pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', shipping: 'Đang giao',
  delivered: 'Đã giao', completed: 'Hoàn tất', cancelled: 'Đã hủy',
};
const paymentLabels = {
  pending_verification: 'Khách báo đã chuyển khoản',
  paid: 'Thanh toán đã được xác nhận',
  collecting: 'Chờ đối soát COD',
  refund_pending: 'Chờ hoàn tiền',
  refunded: 'Đã ghi nhận hoàn tiền',
};

function formatEvent(id, type, title, message, date, link, subType) {
  if (!date || Number.isNaN(new Date(date).getTime())) return null;
  return { id, type, title, message, timestamp: new Date(date).toISOString(), read: false, link, subType };
}

async function getNotifications({ user, limit = 30 }) {
  const jobs = [];
  const add = (query, values, map) => jobs.push(pool.query(query, values).then(([rows]) => rows.map(map)));
  if (can(user, 'order:read:all') || can(user, 'order:read:own')) {
    const constraints = Object.entries(orderScope(user));
    const where = constraints.length ? ' WHERE ' + constraints.map(([column]) => `${column} = ?`).join(' AND ') : '';
    add(`SELECT id, code, total_amount, status, payment_status, ordered_at, updated_at, created_at
      FROM orders${where} ORDER BY updated_at DESC, id DESC LIMIT ?`,
    [...constraints.map(([, value]) => value || null), limit], (order) => {
      const payment = paymentLabels[order.payment_status];
      const title = payment || (order.status === 'pending' ? 'Đơn hàng mới' : orderLabels[order.status] || 'Cập nhật đơn hàng');
      const orderChanged = order.status !== 'pending' || Boolean(payment);
      return formatEvent(`order-${order.id}-${order.status}-${order.payment_status}`, 'order', `${title} · ${order.code}`,
        `${Number(order.total_amount).toLocaleString('vi-VN')} ₫ · ${orderLabels[order.status] || order.status}`,
        orderChanged ? order.updated_at : order.ordered_at || order.created_at,
        `/orders?search=${encodeURIComponent(order.code)}`, order.payment_status === 'pending_verification' ? 'payment_verify' : undefined);
    });
  }
  if (can(user, 'inventory:read')) {
    add(`SELECT id, sku, name, stock_quantity, updated_at FROM products
      WHERE deleted_at IS NULL AND status <> 'discontinued' AND stock_quantity <= low_stock_threshold
      ORDER BY updated_at DESC, id DESC LIMIT ?`, [limit], (item) => formatEvent(
      `stock-${item.id}-${item.stock_quantity}-${new Date(item.updated_at).getTime()}`, 'stock',
      Number(item.stock_quantity) === 0 ? 'Hết hàng' : 'Sắp hết hàng',
      `${item.name} (${item.sku}) · Còn ${item.stock_quantity}`,
      item.updated_at, '/inventory', Number(item.stock_quantity) === 0 ? 'out_of_stock' : 'low_stock'));
  }
  if (can(user, 'rma:manage') || can(user, 'warranty:read') || can(user, 'finance:refund')) {
    const constraints = Object.entries(orderScope(user));
    const where = constraints.length ? ' WHERE ' + constraints.map(([column]) => `o.${column} = ?`).join(' AND ') : '';
    add(`SELECT r.id, r.code, r.order_code, r.status, r.created_at, r.updated_at, rf.created_at AS refunded_at
      FROM rmas r LEFT JOIN admin_rma_refunds rf ON rf.rma_id = r.id
      LEFT JOIN orders o ON o.code = r.order_code${where}
      ORDER BY GREATEST(r.updated_at, COALESCE(rf.created_at, r.updated_at)) DESC, r.id DESC LIMIT ?`,
    [...constraints.map(([, value]) => value || null), limit], (row) => formatEvent(
      `rma-${row.id}-${row.status}-${Boolean(row.refunded_at)}`, 'rma', `Đổi trả · ${row.code}`,
      `Đơn ${row.order_code} · ${row.refunded_at ? 'Đã ghi nhận hoàn tiền' : row.status}`,
      row.refunded_at || row.updated_at || row.created_at, '/returns'));
  }
  if (can(user, 'tradein:estimate') || can(user, 'order:read:all')) {
    add('SELECT id, code, brand, model, status, created_at, updated_at FROM trade_ins ORDER BY updated_at DESC, id DESC LIMIT ?',
      [limit], (row) => formatEvent(`tradein-${row.id}-${row.status}`, 'tradein', `Thu cũ đổi mới · ${row.code}`,
        `${row.brand || ''} ${row.model || ''} · ${row.status}`, row.updated_at || row.created_at, '/trade-in'));
  }
  if (can(user, 'report:read') || can(user, 'review:manage')) {
    add("SELECT id, product_name, rating, created_at FROM product_reviews WHERE status = 'pending' ORDER BY created_at DESC, id DESC LIMIT ?",
      [limit], (row) => formatEvent(`review-${row.id}`, 'review', 'Đánh giá mới chờ duyệt',
        `${row.product_name || 'Sản phẩm'} · ${row.rating} sao`, row.created_at, '/reports?tab=customers'));
  }
  const results = await Promise.allSettled(jobs);
  if (results.length && results.every((result) => result.status === 'rejected')) throw results[0].reason;
  for (const result of results) {
    if (result.status === 'rejected') console.warn('Admin notifications source unavailable:', result.reason.message);
  }
  const events = results.flatMap((result) => result.status === 'fulfilled' ? result.value : [])
    .filter(Boolean).sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, limit);
  if (!events.length) return events;
  const [read] = await pool.query('SELECT event_id FROM admin_notification_reads WHERE user_id = ? AND event_id IN (?)',
    [user.id, events.map((event) => event.id)]);
  const readIds = new Set(read.map((row) => row.event_id));
  return events.map((event) => ({ ...event, read: readIds.has(event.id) }));
}

async function markRead(userId, eventIds) {
  await pool.query('INSERT IGNORE INTO admin_notification_reads (user_id, event_id) VALUES ?',
    [eventIds.map((id) => [userId, id])]);
}

module.exports = { getNotifications, markRead };
