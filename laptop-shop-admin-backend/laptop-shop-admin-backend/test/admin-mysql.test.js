const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const { once } = require('node:events');
const path = require('node:path');
const { test } = require('node:test');

test('admin operations against a fresh MySQL schema and synthetic orders', {
  skip: process.env.CI_ADMIN_MYSQL !== '1',
}, async (t) => {
  assert.equal(process.env.DB_NAME, 'laptop99_ci', 'Use only the isolated MySQL test database');
  const { pool } = require('../src/config/db');
  t.after(() => pool.end());
  const { ensureAdminSchema } = require('../src/config/admin-schema');
  const schema = await readFile(path.join(__dirname, '../../../laptop_shop.sql'), 'utf8');
  const statements = schema.match(/^CREATE TABLE [\s\S]+?^\) ENGINE=[^\n]+;/gm);
  assert.ok(statements?.length > 15);
  const connection = await pool.getConnection();
  try {
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const statement of statements) await connection.query(statement);
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
  } finally {
    connection.release();
  }
  await ensureAdminSchema(pool);
  await ensureAdminSchema(pool);
  await pool.query("INSERT INTO roles (id, name, permissions) VALUES (1, 'super_admin', '[\"*\"]'), (2, 'test_sales', '[\"order:read:own\",\"report:read\",\"customer:read\"]'), (3, 'test_finance_read', '[\"finance:read\"]')");
  await pool.query("INSERT INTO users (id, role_id, full_name, email, password_hash) VALUES (1, 1, 'Test admin', 'admin@example.test', '-'), (2, 2, 'Test sales', 'sales@example.test', '-'), (3, 3, 'Read finance', 'finance@example.test', '-')");
  await pool.query("INSERT INTO brands (id, name, slug) VALUES (1, 'Test brand', 'test-brand')");
  await pool.query("INSERT INTO categories (id, name, slug) VALUES (10, 'A', 'a'), (20, 'B', 'b')");
  await pool.query("INSERT INTO products (id, sku, name, slug, brand_id, category_id, price, cost_price, stock_quantity, status) VALUES (11, 'SKU-A', 'Laptop A', 'laptop-a', 1, 10, 10000, 5000, 10, 'active'), (12, 'SKU-B', 'Laptop B', 'laptop-b', 1, 20, 20000, 9000, 20, 'active')");
  await pool.query("INSERT INTO customers (id, code, full_name, password_hash) VALUES (1, 'TEST-CUSTOMER', 'Test customer', 'fixture-hash')");
  await pool.query(`INSERT INTO orders (id, code, customer_id, customer_name, product_id, product_name, sku, status, payment_status, payment_method, total_amount, unit_price, assigned_to, serial_number, ordered_at)
    VALUES (21, 'TEST-OTHER', 1, 'Test customer', 12, 'Laptop B', 'SKU-B', 'delivered', 'paid', 'Chuyển khoản VietQR', 20000, 20000, 1, 'OTHER-SERIAL', NOW()),
           (22, 'TEST-PAID', 1, 'Test customer', 11, 'Laptop A', 'SKU-A', 'delivered', 'paid', 'Chuyển khoản VietQR', 10000, 10000, 2, 'OLD-SERIAL', NOW()),
           (23, 'TEST-COD', 1, 'Test customer', 11, 'Laptop A', 'SKU-A', 'pending', 'unpaid', 'COD', 10000, 10000, 2, NULL, NOW())`);
  await pool.query("INSERT INTO rmas (id, code, order_code, product_id, type, reason, status) VALUES (1, 'TEST-RMA', 'TEST-PAID', 11, 'Trả', 'Test return', 'Đã duyệt')");

  const jwt = require('jsonwebtoken');
  const server = require('../src/app').listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const url = 'http://127.0.0.1:' + server.address().port + '/api/admin';
  async function call(route, user, method = 'GET', input) {
    const token = jwt.sign({ sub: user, type: 'staff' }, process.env.JWT_SECRET);
    const response = await fetch(url + route, {
      method, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: input == null ? undefined : JSON.stringify(input),
    });
    return { status: response.status, body: response.status === 204 ? null : await response.json() };
  }

  const reportResponse = await call('/dashboard?range=all&category_id=10', 2);
  assert.equal(reportResponse.status, 200, JSON.stringify(reportResponse.body));
  const report = reportResponse.body.data;
  assert.equal(report.total_revenue, 10000);
  assert.equal(report.total_orders, 2);
  assert.equal(report.cod_pending, 10000);
  assert.equal(report.cogs, null);
  assert.equal(report.top_sold[0]?.sku, 'SKU-A');
  assert.deepEqual(report.profit_margins, []);
  assert.equal(report.revenue_timeline.reduce((sum, row) => sum + row.doanhThu, 0), 10000);

  assert.equal((await call('/orders/23/reconcile-payment', 3, 'PATCH', { gateway_code: 'TEST-REF' })).status, 403);
  assert.equal((await call('/orders/23/status', 1, 'PATCH', { status: 'confirmed' })).body.data.payment_status, 'unpaid');
  assert.equal((await call('/orders/serials/list?search=OLD-SERIAL', 1)).body.data[0]?.order_code, 'TEST-PAID');
  assert.equal((await call('/customers/1', 2)).body.data.password_hash, undefined);
  assert.equal((await call('/customers/1', 2)).body.data.orders.some((order) => order.code === 'TEST-OTHER'), false);

  const receipt = { request_key: '12345678-1234-4234-8234-123456789abc', supplier: 'Test', warehouse: 'Test', rows: [
    { sku: 'SKU-A', quantity: 1, unit_cost: 5000, serials: ['IMPORT-SERIAL'] },
  ] };
  assert.equal((await call('/inventory/receipts', 1, 'POST', receipt)).status, 201);
  assert.equal((await call('/inventory/receipts', 1, 'POST', receipt)).body.replayed, true);
  assert.equal((await call('/inventory/receipts', 1)).body.data[0]?.serials[0], 'IMPORT-SERIAL');
  assert.equal((await call('/inventory/receipts', 1, 'POST', { ...receipt, request_key: '22345678-1234-4234-8234-123456789abc' })).status, 409);
  const [[product]] = await pool.query('SELECT stock_quantity FROM products WHERE id = 11');
  assert.equal(product.stock_quantity, 11);

  const refund = { amount: 2000, reference: 'TEST-RMA-REF' };
  const refundResponse = await call('/orders/rmas/1/refund', 1, 'PATCH', refund);
  assert.equal(refundResponse.status, 200, JSON.stringify(refundResponse.body));
  assert.equal((await call('/orders/rmas/1/refund', 1, 'PATCH', refund)).status, 200);
  assert.equal((await call('/dashboard?range=all&category_id=10', 2)).body.data.total_revenue, 8000);

  const notifications = await call('/notifications?limit=30', 2);
  assert.equal(notifications.status, 200, JSON.stringify(notifications.body));
  assert.equal(notifications.body.data.some((item) => item.title.includes('TEST-OTHER')), false);
  const paid = notifications.body.data.find((item) => item.id === 'order-22-delivered-paid');
  assert.ok(paid);
  assert.equal((await call('/notifications/read', 2, 'POST', { ids: [paid.id] })).status, 204);
  assert.equal((await call('/notifications?limit=30', 2)).body.data.find((item) => item.id === paid.id).read, true);
  assert.equal((await call('/notifications?limit=30', 1)).body.data.find((item) => item.id === paid.id).read, false);
});
