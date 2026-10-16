const { z } = require('zod');
const { pool, withTransaction } = require('../config/db');
const { ApiError, asyncHandler, uniqueSlug, toInt, escapeLike, diff } = require('../utils/helpers');
const { writeAudit } = require('../services/audit');
const BrandModel = require('../models/brand.model');

const nstr = (max) => z.string().trim().max(max).nullish().transform((v) => (v === '' ? null : v));
const flag = z.union([z.boolean(), z.literal(0), z.literal(1)]).transform((v) => (v ? 1 : 0));

const base = z.object({
  name: z.string().trim().min(1).max(100),
  slug: z.string().trim().min(1).max(120).optional(),
  country: nstr(80),
  logo_url: nstr(255),
  description: z.string().max(5000).nullish(),
  sort_order: z.number().int().optional(),
  status: flag.optional(),
});
const createSchema = base;
const updateSchema = base.partial();
const FIELDS = ['name', 'slug', 'country', 'logo_url', 'description', 'sort_order', 'status'];

const BrandsController = {
  listBrands: asyncHandler(async (req, res) => {
    const where = [];
    const params = [];
    if (req.query.search) {
      where.push('b.name LIKE ?');
      params.push(`%${escapeLike(req.query.search)}%`);
    }
    if (['0', '1'].includes(req.query.status)) {
      where.push('b.status = ?');
      params.push(Number(req.query.status));
    }
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await BrandModel.findBrands(whereClause, params);
    res.json({ data: rows });
  }),

  getBrand: asyncHandler(async (req, res) => {
    const row = await BrandModel.findBrandById(toInt(req.params.id));
    if (!row) throw new ApiError(404, 'Không tìm thấy hãng');
    res.json({ data: row });
  }),

  createBrand: asyncHandler(async (req, res) => {
    const b = createSchema.parse(req.body);
    const id = await withTransaction(async (conn) => {
      const slug = await uniqueSlug(conn, 'brands', b.slug || b.name);
      const row = { ...b, slug };
      const insertId = await BrandModel.insertBrand(conn, row);
      await writeAudit(conn, req, { action: 'create', entity: 'brand', entityId: insertId, newValues: row });
      return insertId;
    });
    const row = await BrandModel.findBrandById(id);
    res.status(201).json({ data: row });
  }),

  updateBrand: asyncHandler(async (req, res) => {
    const id = toInt(req.params.id);
    const b = updateSchema.parse(req.body);
    const changes = {};
    for (const k of FIELDS) if (b[k] !== undefined) changes[k] = b[k];
    if (!Object.keys(changes).length) throw new ApiError(400, 'Không có dữ liệu để cập nhật');

    await withTransaction(async (conn) => {
      const [[old]] = await conn.query('SELECT * FROM brands WHERE id = ? FOR UPDATE', [id]);
      if (!old) throw new ApiError(404, 'Không tìm thấy hãng');
      if (changes.slug) changes.slug = await uniqueSlug(conn, 'brands', changes.slug, { excludeId: id });
      await BrandModel.updateBrand(conn, id, changes);
      const { oldValues, newValues } = diff(old, changes);
      await writeAudit(conn, req, { action: 'update', entity: 'brand', entityId: id, oldValues, newValues });
    });
    const row = await BrandModel.findBrandById(id);
    res.json({ data: row });
  }),

  deleteBrand: asyncHandler(async (req, res) => {
    const id = toInt(req.params.id);
    await withTransaction(async (conn) => {
      const [[old]] = await conn.query('SELECT * FROM brands WHERE id = ? FOR UPDATE', [id]);
      if (!old) throw new ApiError(404, 'Không tìm thấy hãng');
      const n = await BrandModel.countBrandProducts(conn, id);
      if (n > 0) {
        throw new ApiError(409, `Hãng đang có ${n} sản phẩm (kể cả đã xoá mềm). Hãy chuyển sản phẩm sang hãng khác hoặc ẩn hãng thay vì xoá.`);
      }
      await BrandModel.deleteBrand(conn, id);
      await writeAudit(conn, req, { action: 'delete', entity: 'brand', entityId: id, oldValues: old });
    });
    res.json({ data: { id, deleted: true } });
  }),
};

module.exports = BrandsController;

