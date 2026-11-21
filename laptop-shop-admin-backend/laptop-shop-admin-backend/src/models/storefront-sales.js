// Prefer normalized order lines, then checkout baskets, then legacy single-product orders.
async function loadDeliveredSales(pool) {
  const [rows] = await pool.query(`
    SELECT i.id AS line_id, i.product_id AS line_product, i.product_sku AS line_sku,
           i.quantity AS line_qty, o.product_id, o.sku, o.quantity,
           CASE WHEN i.id IS NULL THEN o.items_json END AS items_json
    FROM orders o LEFT JOIN order_items i ON i.order_id = o.id
    WHERE o.status IN ('delivered', 'completed')
      AND COALESCE(o.payment_status, '') <> 'refunded'
  `);
  const ids = new Map();
  const skus = new Map();
  function add(id, sku, quantity) {
    const qty = Number(quantity);
    if ((!id && !sku) || !Number.isSafeInteger(qty) || qty <= 0) return;
    const map = id ? ids : skus;
    const key = id ? String(id) : String(sku).trim().toUpperCase();
    map.set(key, (map.get(key) || 0) + qty);
  }
  for (const row of rows) {
    if (row.line_id != null) {
      add(row.line_product, row.line_sku, row.line_qty);
      continue;
    }
    const items = typeof row.items_json === 'string' ? JSON.parse(row.items_json) : row.items_json;
    if (Array.isArray(items) && items.length) {
      for (const item of items) {
        if (item) add(item.pid ?? item.product_id, item.sku, item.qty ?? item.quantity);
      }
    } else {
      add(row.product_id, row.sku, row.quantity);
    }
  }
  return p => (ids.get(String(p.id)) || 0) + (skus.get(String(p.sku || '').trim().toUpperCase()) || 0);
}
module.exports = { loadDeliveredSales };
