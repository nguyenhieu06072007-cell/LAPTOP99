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
  await pool.query('INSERT INTO roles (id, name, permissions) VALUES ?', [[
    [4, 'sales_manager', JSON.stringify(['order:write', 'order:read:all'])],
    [6, 'warehouse_manager', JSON.stringify(['inventory:read', 'inventory:write', 'inventory:serial:manage', 'import:batch'])],
    [7, 'accountant', JSON.stringify(['finance:read', 'finance:reconcile', 'report:read', 'order:read:all'])],
    [8, 'product_manager', JSON.stringify(['product:read', 'product:write', 'inventory:read', 'import:batch'])],
  ]]);
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
  // The bell counts beyond the display cutoff and keeps the purchase when its status changes.
  const baseline = (await call('/notifications?limit=1', 1)).body.unread_count;
  await pool.query(`INSERT INTO orders (id, code, customer_id, customer_name, product_id, product_name, sku, status, payment_status, total_amount, unit_price)
    VALUES (24, 'TEST-NEW-PURCHASE', 1, 'Test customer', 11, 'Laptop A', 'SKU-A', 'pending', 'unpaid', 10000, 10000)`);
  const purchased = await call('/notifications?limit=1', 1);
  assert.equal(purchased.body.data.length, 1);
  assert.equal(purchased.body.unread_count, baseline + 1);
  assert.equal((await call('/orders/24/status', 1, 'PATCH', { status: 'confirmed' })).status, 200);
  assert.equal((await call('/notifications?limit=1', 1)).body.unread_count, baseline + 2);
  const [review] = await pool.query("INSERT INTO product_reviews (customer_name, product_name, rating, comment) VALUES ('Test customer', 'Laptop A', 5, 'Test review')");
  assert.equal((await call('/notifications?limit=1', 1)).body.unread_count, baseline + 3);
  await pool.query("UPDATE product_reviews SET status = 'approved' WHERE id = ?", [review.insertId]);
  assert.equal((await call('/notifications?limit=1', 1)).body.unread_count, baseline + 3);
  assert.equal((await call('/notifications/read', 1, 'POST', { all: true })).status, 204);
  assert.equal((await call('/notifications?limit=1', 1)).body.unread_count, 0);
  assert.ok((await call('/notifications?limit=1', 2)).body.unread_count > 0);

  const password = 'Test-staff-login-only-8122';
  for (const [roleId, role, perms] of [
    [4, 'sales_manager', ['order:read:all']],
    [5, 'sales_executive', ['order:read:own']],
    [6, 'warehouse_manager', ['inventory:read']],
    [7, 'accountant', ['finance:read']],
    [8, 'product_manager', ['product:read']],
  ]) {
    if (roleId === 5) await pool.query('INSERT INTO roles (id, name, permissions) VALUES (?, ?, ?)', [roleId, role, JSON.stringify(perms)]);
    const email = role + '@example.test';
    const account = await call('/users', 1, 'POST', { email, password, role_id: roleId, full_name: role });
    assert.equal(account.status, 201, JSON.stringify(account.body));
    const login = await fetch(url + '/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const signedIn = await login.json();
    assert.equal(login.status, 200, JSON.stringify(signedIn));
    assert.equal(signedIn.data.user.role, role);
    const me = await fetch(url + '/auth/me', { headers: { Authorization: 'Bearer ' + signedIn.data.token } });
    assert.equal(me.status, 200);
    const current = (await me.json()).data;
    assert.equal(current.role, role);
    assert.equal(current.permissions.includes('*'), false);
    assert.ok(perms.every((permission) => current.permissions.includes(permission)));
  }

  const roleUsers = await call('/users?limit=50', 1);
  const team = Object.fromEntries(roleUsers.body.data.map(({ role, id }) => [role, id]));
  await pool.query("UPDATE users SET branch = 'Branch A', data_visibility = 'branch' WHERE id IN (?)", [[team.sales_manager, team.warehouse_manager]]);
  await pool.query("UPDATE users SET branch = 'Branch A', data_visibility = 'own' WHERE id = ?", [team.sales_executive]);
  await pool.query("UPDATE products SET warehouse_location = IF(id = 11, 'Branch A', 'Branch B'), low_stock_threshold = 100");
  const [[{ permissions }]] = await pool.query("SELECT permissions FROM roles WHERE name = 'accountant'");
  assert.ok(JSON.parse(permissions).includes('finance:refund'));
  assert.equal((await call('/inventory/low-stock', team.warehouse_manager)).body.data.map((item) => item.sku).join(), 'SKU-A');
  assert.equal((await call('/inventory/threshold', team.warehouse_manager, 'PATCH', { sku: 'SKU-B', threshold: 1 })).status, 404);
  assert.equal((await call('/inventory/threshold', team.sales_executive, 'PATCH', { sku: 'SKU-A', threshold: 1 })).status, 403);
  assert.equal((await call('/inventory/threshold', team.warehouse_manager, 'PATCH', { sku: 'SKU-A', threshold: 15 })).status, 204);
  const branchReceipt = { ...receipt, request_key: '32345678-1234-4234-8234-123456789abc', warehouse: 'Branch A',
    rows: [{ sku: 'SKU-A', quantity: 1, serials: ['BRANCH-SERIAL'] }] };
  assert.equal((await call('/inventory/receipts', team.warehouse_manager, 'POST', { ...branchReceipt, warehouse: 'Branch B' })).status, 403);
  const branchImport = await call('/inventory/receipts', team.warehouse_manager, 'POST', branchReceipt);
  assert.equal(branchImport.status, 201, JSON.stringify(branchImport.body));
  assert.deepEqual((await call('/inventory/receipts', team.warehouse_manager)).body.data.map((row) => row.warehouse), ['Branch A']);
  const otherReceipt = { ...branchReceipt, warehouse: 'Branch B', request_key: '42345678-1234-4234-8234-123456789abc',
    rows: [{ sku: 'SKU-B', quantity: 1, serials: [] }] };
  assert.equal((await call('/inventory/receipts', 1, 'POST', otherReceipt)).status, 201);
  const branchMovements = await call('/inventory/movements', team.warehouse_manager);
  assert.equal(branchMovements.status, 200, JSON.stringify(branchMovements.body));
  assert.deepEqual(branchMovements.body.data.map((row) => row.sku), ['SKU-A']);

  await pool.query(`INSERT INTO orders (id, code, customer_id, customer_name, customer_phone, product_id, product_name, sku,
    status, payment_status, total_amount, unit_price, serial_number, branch, items_json)
    VALUES (25, 'TEST-WEB-QUEUE', 1, 'Test customer', '0900000000', 11, 'Laptop A', 'SKU-A', 'confirmed', 'unpaid', 10000, 10000,
      'CHỜ XUẤT KHO', 'Toàn hệ thống (HQ)', JSON_ARRAY(JSON_OBJECT('pid', 11, 'qty', 1, 'serials', JSON_ARRAY('CHỜ XUẤT KHO'))))`);
  const queue = await call('/orders/assignment-queue', team.sales_manager);
  assert.equal(queue.status, 200, JSON.stringify(queue.body));
  assert.ok(queue.body.data.some((row) => row.code === 'TEST-WEB-QUEUE' && row.customer_phone === undefined));
  assert.equal((await call('/orders/assignment-queue', team.sales_executive)).status, 403);
  assert.equal((await call('/orders/25/assignee', team.sales_manager, 'PATCH', { staff_id: 2 })).status, 403);
  const assigned = await call('/orders/25/assignee', team.sales_manager, 'PATCH', { staff_id: team.sales_executive });
  assert.equal(assigned.status, 204, JSON.stringify(assigned.body));
  assert.equal((await call('/orders/25', team.sales_executive)).body.data.branch, 'Branch A');
  assert.ok((await call('/notifications', team.sales_executive)).body.data.some((item) => item.id.startsWith('order-assigned-25-')));
  assert.equal((await call('/orders/25/status', team.sales_manager, 'PATCH', { status: 'shipping' })).status, 409);
  assert.equal((await call('/orders/25/serials', team.sales_executive, 'PATCH', { lines: [['BRANCH-SERIAL']] })).status, 403);
  assert.ok((await call('/orders/serial-queue', team.warehouse_manager)).body.data.some((row) => row.code === 'TEST-WEB-QUEUE'));
  const serialized = await call('/orders/25/serials', team.warehouse_manager, 'PATCH', { lines: [['BRANCH-SERIAL']] });
  assert.equal(serialized.status, 204, JSON.stringify(serialized.body));
  assert.equal((await call('/orders/25/status', team.sales_manager, 'PATCH', { status: 'shipping' })).status, 200);
  assert.equal((await call('/orders/25/status', team.sales_manager, 'PATCH', { status: 'delivered' })).status, 200);

  await pool.query('UPDATE users SET custom_permissions = ? WHERE id = ?', [JSON.stringify(['warranty:read', 'warranty:write']), team.warehouse_manager]);
  const warranty = { order_code: 'TEST-WEB-QUEUE', serial: 'BRANCH-SERIAL', issue: "Will not power on" };
  assert.equal((await call('/orders/warranty/cases', team.sales_executive, 'POST', warranty)).status, 403);
  const received = await call('/orders/warranty/cases', team.warehouse_manager, 'POST', warranty);
  assert.equal(received.status, 201, JSON.stringify(received.body));
  assert.equal((await call('/orders/warranty/cases', team.warehouse_manager, 'POST', warranty)).status, 409);
  assert.equal((await call('/orders/warranty/cases/' + received.body.data.id, team.warehouse_manager, 'PATCH', {
    status: 'repairing', note: 'Diagnosed power supply',
  })).status, 204);
  const cases = await call('/orders/warranty/cases?order_code=TEST-WEB-QUEUE&serial=BRANCH-SERIAL', team.warehouse_manager);
  assert.equal(cases.body.data[0].history.length, 2);

  await pool.query('UPDATE users SET custom_permissions = ? WHERE id = ?', [JSON.stringify(['review:manage', 'role:manage']), team.sales_executive]);
  assert.equal((await call('/users/roles', team.sales_executive)).status, 200);
  assert.equal((await call('/users', team.sales_executive)).status, 403);
  assert.equal((await call('/users/roles', team.sales_executive, 'POST', { name: 'reviewer', display_name: 'Reviewer', permissions: ['review:manage'] })).status, 201);
  assert.equal((await call('/reviews', team.sales_executive)).status, 200);
  assert.equal((await call('/reviews/' + review.insertId + '/status', team.sales_executive, 'PATCH', { status: 'hidden' })).status, 200);
  assert.equal((await call('/dashboard', team.sales_executive)).status, 403);
  const financeReport = await call('/dashboard?range=all', team.accountant);
  assert.equal(financeReport.status, 200, JSON.stringify(financeReport.body));
  assert.deepEqual(financeReport.body.data.customer_metrics.topSpenders, []);
  assert.ok(financeReport.body.data.recent_orders.every((order) => order.customer_phone === null));

});
