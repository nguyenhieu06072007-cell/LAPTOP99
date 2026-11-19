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

function scopedEvents(user) {
  const sources = [];
  const params = [];
  const scope = Object.entries(orderScope(user));
  // A UNION keeps counting, listing and marking notifications read under the same permission rules.
  function add(type, id, date, payload, from, conditions = [], values = []) {
    sources.push(`SELECT '${type}' AS type, CONVERT(${id} USING utf8mb4) COLLATE utf8mb4_bin AS event_id, ${date} AS occurred_at,
      JSON_OBJECT(${payload}) AS payload FROM ${from}
      ${conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''}`);
    params.push(...values);
  }
  if (can(user, 'order:read:all') || can(user, 'order:read:own')) {
    const conditions = scope.map(([column]) => `o.${column} = ?`);
    const values = scope.map(([, value]) => value || null);
    const fields = "'code', o.code, 'status', o.status, 'payment', o.payment_status, 'amount', o.total_amount";
    add('order_new', "CONCAT('order-', o.id, '-pending-unpaid')", 'COALESCE(o.ordered_at, o.created_at)',
      fields, 'orders o', conditions, values);
    add('order', "CONCAT('order-', o.id, '-', o.status, '-', o.payment_status)", 'o.updated_at',
      fields, 'orders o', [...conditions, "(o.status <> 'pending' OR o.payment_status <> 'unpaid')"], values);
  }
  if (can(user, 'inventory:read')) {
    add('stock', "CONCAT('stock-', id, '-', stock_quantity, '-', FLOOR(UNIX_TIMESTAMP(updated_at) * 1000))",
      'updated_at', "'name', name, 'sku', sku, 'quantity', stock_quantity", 'products',
      ["deleted_at IS NULL", "status <> 'discontinued'", 'stock_quantity <= low_stock_threshold']);
  }
  if (can(user, 'rma:manage') || can(user, 'warranty:read') || can(user, 'finance:refund')) {
    add('rma', "CONCAT('rma-', r.id, '-', r.status, '-', IF(rf.created_at IS NULL, 'false', 'true'))",
      'COALESCE(rf.created_at, r.updated_at, r.created_at)',
      "'code', r.code, 'orderCode', r.order_code, 'status', r.status, 'refunded', rf.created_at IS NOT NULL",
      'rmas r LEFT JOIN admin_rma_refunds rf ON rf.rma_id = r.id LEFT JOIN orders o ON o.code = r.order_code',
      scope.map(([column]) => `o.${column} = ?`), scope.map(([, value]) => value || null));
  }
  if (can(user, 'tradein:estimate') || can(user, 'order:read:all')) {
    add('tradein', "CONCAT('tradein-', id, '-', status)", 'COALESCE(updated_at, created_at)',
      "'code', code, 'brand', brand, 'model', model, 'status', status", 'trade_ins');
  }
  if (can(user, 'report:read') || can(user, 'review:manage')) {
    add('review', "CONCAT('review-', id)", 'created_at',
      "'name', product_name, 'rating', rating, 'status', status", 'product_reviews');
  }
  return { sql: sources.join(' UNION ALL '), params };
}

function presentEvent(row) {
  const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
  const base = { id: row.event_id, type: row.type, timestamp: new Date(row.occurred_at).toISOString(), read: Boolean(row.is_read) };
  switch (row.type) {
    case 'order_new':
    case 'order': {
      const isNew = row.type === 'order_new';
      const title = isNew ? 'Đơn hàng mới' : paymentLabels[payload.payment] || orderLabels[payload.status] || 'Cập nhật đơn hàng';
      return { ...base, type: 'order', title: `${title} · ${payload.code}`,
        message: `${Number(payload.amount).toLocaleString('vi-VN')} ₫ · ${isNew ? 'Đã đặt hàng' : orderLabels[payload.status] || payload.status}`,
        link: `/orders?search=${encodeURIComponent(payload.code)}`,
        subType: !isNew && payload.payment === 'pending_verification' ? 'payment_verify' : undefined };
    }
    case 'stock': {
      const empty = Number(payload.quantity) === 0;
      return { ...base, title: empty ? 'Hết hàng' : 'Sắp hết hàng',
        message: `${payload.name} (${payload.sku}) · Còn ${payload.quantity}`,
        link: '/inventory', subType: empty ? 'out_of_stock' : 'low_stock' };
    }
    case 'rma':
      return { ...base, title: `Đổi trả · ${payload.code}`,
        message: `Đơn ${payload.orderCode} · ${payload.refunded ? 'Đã ghi nhận hoàn tiền' : payload.status}`, link: '/returns' };
    case 'tradein':
      return { ...base, title: `Thu cũ đổi mới · ${payload.code}`,
        message: `${payload.brand || ''} ${payload.model || ''} · ${payload.status}`, link: '/trade-in' };
    case 'review':
      return { ...base, title: payload.status === 'pending' ? 'Đánh giá mới chờ duyệt' : 'Đánh giá sản phẩm',
        message: `${payload.name || 'Sản phẩm'} · ${payload.rating} sao`, link: '/reports?tab=customers' };
  }
}

async function getNotifications({ user, limit = 30 }) {
  const { sql, params } = scopedEvents(user);
  if (!sql) return { events: [], unreadCount: 0 };
  const [rows] = await pool.query(`SELECT e.*, r.event_id IS NOT NULL AS is_read,
    SUM(r.event_id IS NULL) OVER () AS unread_count
    FROM (${sql}) e LEFT JOIN admin_notification_reads r ON r.user_id = ? AND r.event_id = e.event_id
    WHERE e.occurred_at IS NOT NULL
    ORDER BY e.occurred_at DESC, e.event_id DESC LIMIT ?`, [...params, user.id, limit]);
  return { events: rows.map(presentEvent), unreadCount: Number(rows[0]?.unread_count || 0) };
}

async function markRead(user, { ids, all }) {
  const { sql, params } = scopedEvents(user);
  if (!sql) return;
  await pool.query(`INSERT IGNORE INTO admin_notification_reads (user_id, event_id)
    SELECT ?, e.event_id FROM (${sql}) e
    LEFT JOIN admin_notification_reads r ON r.user_id = ? AND r.event_id = e.event_id
    WHERE e.occurred_at IS NOT NULL AND r.event_id IS NULL${all ? '' : ' AND e.event_id IN (?)'}`,
  [user.id, ...params, user.id, ...(all ? [] : [ids])]);
}

module.exports = { getNotifications, markRead };
