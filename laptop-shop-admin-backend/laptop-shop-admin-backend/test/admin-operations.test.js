const assert = require('node:assert/strict');
const { test } = require('node:test');
const { can, inOrderScope, orderScope } = require('../src/config/permissions');

const dbModule = require.resolve('../src/config/db');
let query;
let transaction;
require.cache[dbModule] = {
  id: dbModule, filename: dbModule, loaded: true,
  exports: {
    pool: {
      query: (...args) => query(...args),
      escape: (value) => typeof value === 'number' ? String(value) : "'" + String(value).replaceAll("'", "''") + "'",
    },
    withTransaction: (fn) => transaction(fn),
  },
};
const Notifications = require('../src/models/notification.model');
const Inventory = require('../src/models/inventory.model');
const Dashboard = require('../src/models/dashboard.model');
const Orders = require('../src/controllers/orders.controller');
const OrderService = require('../src/services/order.service');

function invoke(handler, req) {
  return new Promise((resolve, reject) => {
    handler(req, { json: resolve }, reject);
  });
}

test('stored role edits and member overrides are used by the server', () => {
  const accountant = { id: 3, role: 'accountant', role_permissions: '["finance:read"]' };
  assert.equal(can(accountant, 'finance:read'), true);
  assert.equal(can(accountant, 'finance:reconcile'), false);
  assert.equal(can({ ...accountant, custom_permissions: ['finance:refund'] }, 'finance:refund'), true);
  assert.equal(can({ ...accountant, role_permissions: '[]' }, 'finance:read'), false);

  const salesperson = { id: 15, role: 'sales_executive', data_visibility: 'branch', branch: 'HN' };
  assert.deepEqual(orderScope(salesperson), { assigned_to: 15, branch: 'HN' });
  assert.equal(inOrderScope(salesperson, { assigned_to: 15, branch: 'HN' }), true);
  assert.equal(inOrderScope(salesperson, { assigned_to: 15, branch: 'HCM' }), false);
});

test('finance read permission does not allow reconciliation', async () => {
  transaction = () => assert.fail('Must reject before touching the database');
  await assert.rejects(invoke(Orders.reconcilePayment, {
    user: { id: 3, role: 'accountant', role_permissions: ['finance:read'] },
    params: { id: '42' }, body: { gateway_code: 'example-reference' },
  }), { status: 403 });
});

test('cancelling a paid order persists refund_pending', async () => {
  const calls = [];
  const conn = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.startsWith('SELECT * FROM orders')) return [[{ id: 42, status: 'pending', payment_status: 'paid' }]];
      return [[]];
    },
  };
  await OrderService.cancelOrder(conn, { orderId: 42, reason: 'Yêu cầu hủy', cancelledBy: 9 });
  assert.equal(calls.find(({ sql }) => sql.startsWith('UPDATE orders')).params[0], 'refund_pending');
});

test('notifications only load assigned orders and read state for the signed-in employee', async () => {
  const calls = [];
  query = async (sql, params) => {
    calls.push({ sql, params });
    if (sql.includes('FROM orders')) return [[{
      id: 12, code: 'ORD-12', status: 'confirmed', payment_status: 'paid', total_amount: 2000,
      updated_at: '2026-11-19T02:00:00Z',
    }]];
    return [[{ event_id: 'order-12-confirmed-paid' }]];
  };
  const events = await Notifications.getNotifications({
    user: { id: 9, role: 'sales_executive', role_permissions: ['order:read:own'] },
  });
  assert.match(calls[0].sql, /WHERE assigned_to = \?/);
  assert.deepEqual(calls[0].params, [9, 30]);
  assert.deepEqual(calls[1].params, [9, ['order-12-confirmed-paid']]);
  assert.equal(events[0].read, true);
  assert.match(events[0].title, /Thanh toán/);
});

test('batch stock intake writes a movement and serial through the same transaction', async () => {
  const calls = [];
  const conn = { async query(sql, params) {
    calls.push({ sql, params });
    if (sql.includes('SELECT r.row_number')) return [[]];
    if (sql.includes('SELECT id, sku')) return [[{ id: 7, sku: 'ABC' }]];
    if (sql.includes('SELECT id, stock_quantity')) return [[{ id: 7, stock_quantity: 10, cost_price: 100 }]];
    return [{ insertId: 18 }];
  } };
  transaction = async (fn) => fn(conn);
  const req = { user: { id: 7 }, headers: {}, ip: '127.0.0.1' };
  const result = await Inventory.receiveStock({
    request_key: '12345678-1234-4234-8234-123456789abc',
    supplier: 'Nhà cung cấp', warehouse: 'Kho', rows: [{ sku: 'ABC', quantity: 1, serials: ['SERIAL-A'] }],
  }, req);
  assert.deepEqual(result.data, [{ row_number: 1, product_id: 7 }]);
  assert.deepEqual(calls.find(({ sql }) => sql.includes('UPDATE products')).params, [11, 7]);
  assert.deepEqual(calls.find(({ sql }) => sql.includes('INSERT INTO admin_inventory_serials')).params, [[['SERIAL-A', 18]]]);
});

test('dashboard filters real orders and masks detailed cost data', async () => {
  const calls = [];
  query = async (sql) => {
    calls.push(sql);
    if (sql.includes('AS stock_cost_value')) return [[{ stock_cost_value: 42 }]];
    if (sql.includes('AS total_revenue,') && sql.includes(' AS paid_orders')) return [[{ total_revenue: 2000, paid_orders: 1 }]];
    if (sql.includes('COUNT(*) AS total_customers')) return [[{ total_customers: 1 }]];
    if (sql.includes(' AS rma_total')) return [[{ rma_total: 0 }]];
    if (sql.includes(' AS review_count')) return [[{ review_count: 0, average_rating: null }]];
    return [[]];
  };
  const result = await Dashboard.getDashboardData({ range: 'all', category_id: '4', scope: { assigned_to: 17 } });
  const revenueSql = calls.find((sql) => sql.includes(' AS paid_orders'));
  assert.match(revenueSql, /base\.payment_status = 'paid'/);
  assert.match(revenueSql, /base\.assigned_to = 17/);
  assert.match(revenueSql, /cp\.category_id = 4/);
  assert.equal(result.total_revenue, 2000);
  assert.equal(result.cogs, null);
  assert.equal(result.summary.stock_cost_value, undefined);
  assert.deepEqual(result.profit_margins, []);
  assert.equal(calls.some((sql) => sql.includes(' AS margin_pct')), false);
});
