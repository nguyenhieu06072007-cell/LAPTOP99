const { z } = require('zod');
const { pool, withTransaction } = require('../config/db');
const { ApiError, asyncHandler, paging, pageMeta, escapeLike, toInt, diff } = require('../utils/helpers');
const { writeAudit } = require('../services/audit');
const PromotionModel = require('../models/promotion.model');

const baseSchema = z.object({
  code:            z.string().trim().min(1).max(50),
  title:           z.string().trim().min(1).max(255),
  type:            z.enum(['percent', 'cash', 'combo']).default('percent'),
  discount_value:  z.number().min(0).max(1e13).default(0),
  min_order_value: z.number().min(0).max(1e13).default(0),
  target_category: z.string().trim().max(100).default('Tất cả các dòng laptop'),
  gifts:           z.array(z.string()).nullish(),
  max_uses:        z.number().int().min(0).default(100),
  start_date:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày: YYYY-MM-DD'),
  end_date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày: YYYY-MM-DD'),
  status:          z.enum(['active', 'scheduled', 'ended']).default('active'),
});

const createSchema = baseSchema;
const updateSchema = baseSchema.partial();

function validateDates(start, end) {
  if (start && end && new Date(end) <= new Date(start)) {
    throw new ApiError(400, 'Ngày kết thúc phải sau ngày bắt đầu');
  }
}

const PromotionsController = {
  listPromotions: asyncHandler(async (req, res) => {
    const q = req.query;
    const { page, limit, offset } = paging(q);
    const where = [];
    const params = [];

    if (q.search) {
      const s = `%${escapeLike(String(q.search).trim())}%`;
      where.push('(p.code LIKE ? OR p.title LIKE ?)');
      params.push(s, s);
    }
    if (['active', 'scheduled', 'ended'].includes(q.status)) {
      where.push('p.status = ?'); params.push(q.status);
    }
    if (['percent', 'cash', 'combo'].includes(q.type)) {
      where.push('p.type = ?'); params.push(q.type);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const total = await PromotionModel.countPromotions(whereClause, params);
    const rows = await PromotionModel.findPromotions({ whereClause, params, limit, offset });

    res.json({ data: rows, meta: pageMeta(page, limit, total) });
  }),

  createPromotion: asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body);
    validateDates(body.start_date, body.end_date);

    const dup = await PromotionModel.findByCode(body.code);
    if (dup) throw new ApiError(409, `Mã khuyến mãi '${body.code}' đã tồn tại`);

    const id = await withTransaction(async (conn) => {
      const row = {
        ...body,
        gifts:      JSON.stringify(body.gifts ?? []),
        created_by: req.user.id,
      };
      const newId = await PromotionModel.insertPromotion(conn, row);
      await writeAudit(conn, req, {
        action: 'create', entity: 'promotion', entityId: newId, newValues: row,
      });
      return newId;
    });

    const created = await PromotionModel.findPromotionById(id);
    res.status(201).json({ data: created });
  }),

  updatePromotion: asyncHandler(async (req, res) => {
    const id = toInt(req.params.id);
    const body = updateSchema.parse(req.body);
    if (body.start_date || body.end_date) {
      const old = await PromotionModel.findPromotionById(id);
      if (!old) throw new ApiError(404, 'Không tìm thấy khuyến mãi');
      validateDates(body.start_date ?? old.start_date, body.end_date ?? old.end_date);
    }

    await withTransaction(async (conn) => {
      const old = await PromotionModel.findPromotionById(id);
      if (!old) throw new ApiError(404, 'Không tìm thấy khuyến mãi');

      const changes = { ...body };
      if (changes.gifts !== undefined) {
        changes.gifts = JSON.stringify(changes.gifts ?? []);
      }

      const { oldValues, newValues } = diff(old, changes);
      if (Object.keys(newValues).length) {
        await PromotionModel.updatePromotion(conn, id, newValues);
        await writeAudit(conn, req, {
          action: 'update', entity: 'promotion', entityId: id, oldValues, newValues,
        });
      }
    });

    const updated = await PromotionModel.findPromotionById(id);
    res.json({ data: updated });
  }),

  toggleStatus: asyncHandler(async (req, res) => {
    const id = toInt(req.params.id);
    const { status } = z.object({ status: z.enum(['active', 'scheduled', 'ended']) }).parse(req.body);

    await withTransaction(async (conn) => {
      const old = await PromotionModel.findPromotionById(id);
      if (!old) throw new ApiError(404, 'Không tìm thấy khuyến mãi');
      await PromotionModel.updateStatus(conn, id, status);
      await writeAudit(conn, req, {
        action: 'update_status', entity: 'promotion', entityId: id,
        oldValues: { status: old.status }, newValues: { status },
      });
    });

    res.json({ data: { id, status } });
  }),

  deletePromotion: asyncHandler(async (req, res) => {
    const id = toInt(req.params.id);
    await withTransaction(async (conn) => {
      const affected = await PromotionModel.deletePromotion(conn, id);
      if (!affected) throw new ApiError(404, 'Không tìm thấy khuyến mãi');
      await writeAudit(conn, req, { action: 'delete', entity: 'promotion', entityId: id });
    });
    res.json({ data: { id, deleted: true } });
  }),
};

module.exports = PromotionsController;

