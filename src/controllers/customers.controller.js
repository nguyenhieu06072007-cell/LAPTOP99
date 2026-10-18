const { z } = require('zod');
const { pool, withTransaction } = require('../config/db');
const { ApiError, asyncHandler, paging, pageMeta, escapeLike, toInt, diff } = require('../utils/helpers');
const { writeAudit } = require('../services/audit');
const CustomerModel = require('../models/customer.model');

const nstr = (max) => z.string().trim().max(max).nullish().transform((v) => (v === '' ? null : v));

const createSchema = z.object({
  full_name:   z.string().trim().min(1).max(100),
  phone:       nstr(20),
  email:       z.string().trim().email().max(150).nullish().transform((v) => (v === '' ? null : v)),
  tier:        z.enum(['Khách mới', 'Thân thiết', 'VIP']).default('Khách mới'),
  branch:      z.string().trim().max(100).default('Toàn hệ thống (HQ)'),
  total_spent: z.number().min(0).default(0),
  order_count: z.number().int().min(0).default(0),
  notes:       nstr(5000),
});

const updateSchema = createSchema.partial();

const CustomersController = {
  listCustomers: asyncHandler(async (req, res) => {
    const q = req.query;
    const { page, limit, offset } = paging(q);
    const where = [];
    const params = [];

    if (q.search) {
      const s = `%${escapeLike(String(q.search).trim())}%`;
      where.push('(c.full_name LIKE ? OR c.phone LIKE ? OR c.email LIKE ? OR c.code LIKE ?)');
      params.push(s, s, s, s);
    }
    if (['Khách mới', 'Thân thiết', 'VIP'].includes(q.tier)) {
      where.push('c.tier = ?'); params.push(q.tier);
    }
    if (q.branch) { where.push('c.branch = ?'); params.push(q.branch); }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const total = await CustomerModel.countCustomers(whereClause, params);
    const rows = await CustomerModel.findCustomers({ whereClause, params, limit, offset });

    const custIds = rows.map((r) => r.id);
    const latestMap = {};
    if (custIds.length > 0) {
      const ords = await CustomerModel.findLatestOrders(custIds);
      for (const o of ords) {
        if (!latestMap[o.customer_id]) {
          latestMap[o.customer_id] = o;
        }
      }
    }

    const mapped = rows.map((c) => {
      const spent = Number(c.real_total_spent || 0);
      const cnt = Number(c.real_order_count || 0);
      const tier = spent >= 100_000_000 ? 'VIP' : spent >= 50_000_000 ? 'Thân thiết' : 'Khách mới';
      return {
        ...c,
        order_count: cnt,
        total_spent: spent,
        tier,
        latest_order: latestMap[c.id] || null,
      };
    });

    res.json({ data: mapped, meta: pageMeta(page, limit, total) });
  }),

  getCustomer: asyncHandler(async (req, res) => {
    const id = toInt(req.params.id);
    const detail = await CustomerModel.findCustomerDetail(id);
    if (!detail) throw new ApiError(404, 'Không tìm thấy khách hàng');
    res.json({ data: detail });
  }),

  createCustomer: asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body);

    const id = await withTransaction(async (conn) => {
      const [[{ cnt }]] = await conn.query('SELECT COUNT(*) AS cnt FROM customers');
      const seq = 1000 + Number(cnt) + 1;
      const code = `CUST-${seq}`;

      const row = {
        code,
        full_name:   body.full_name,
        phone:       body.phone       ?? null,
        email:       body.email       ?? null,
        tier:        body.tier,
        branch:      body.branch,
        total_spent: body.total_spent,
        order_count: body.order_count,
        notes:       body.notes       ?? null,
      };

      const newId = await CustomerModel.insertCustomer(conn, row);
      await writeAudit(conn, req, {
        action: 'create', entity: 'customer', entityId: newId, newValues: row,
      });
      return newId;
    });

    const created = await CustomerModel.findCustomerById(id);
    res.status(201).json({ data: created });
  }),

  updateCustomer: asyncHandler(async (req, res) => {
    const id = toInt(req.params.id);
    const body = updateSchema.parse(req.body);

    await withTransaction(async (conn) => {
      const old = await CustomerModel.findCustomerById(id);
      if (!old) throw new ApiError(404, 'Không tìm thấy khách hàng');

      const { oldValues, newValues } = diff(old, body);
      if (Object.keys(newValues).length) {
        await CustomerModel.updateCustomer(conn, id, newValues);
        await writeAudit(conn, req, {
          action: 'update', entity: 'customer', entityId: id, oldValues, newValues,
        });
      }
    });

    const updated = await CustomerModel.findCustomerById(id);
    res.json({ data: updated });
  }),
};

module.exports = CustomersController;

