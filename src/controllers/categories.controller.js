const { z } = require('zod');
const CategoryModel = require('../models/category.model');
const { ApiError, asyncHandler, toInt } = require('../utils/helpers');

const nstr = (max) => z.string().trim().max(max).nullish().transform((v) => (v === '' ? null : v));
const flag = z.union([z.boolean(), z.literal(0), z.literal(1)]).transform((v) => (v ? 1 : 0));

const base = z.object({
  parent_id: z.number().int().positive().nullish(),
  name: z.string().trim().min(1).max(100),
  slug: z.string().trim().min(1).max(120).optional(),
  description: z.string().max(5000).nullish(),
  image_url: nstr(255),
  sort_order: z.number().int().optional(),
  status: flag.optional(),
});
const updateSchema = base.partial();
const FIELDS = ['parent_id', 'name', 'slug', 'description', 'image_url', 'sort_order', 'status'];

const CategoriesController = {
  getAll: asyncHandler(async (req, res) => {
    const data = await CategoryModel.findAll({ tree: req.query.tree === '1' });
    res.json({ data });
  }),

  getById: asyncHandler(async (req, res) => {
    const row = await CategoryModel.findById(toInt(req.params.id));
    if (!row) throw new ApiError(404, 'Không tìm thấy danh mục');
    res.json({ data: row });
  }),

  create: asyncHandler(async (req, res) => {
    const b = base.parse(req.body);
    const row = await CategoryModel.create(b, req);
    res.status(201).json({ data: row });
  }),

  update: asyncHandler(async (req, res) => {
    const id = toInt(req.params.id);
    const b = updateSchema.parse(req.body);
    const changes = {};
    for (const k of FIELDS) if (b[k] !== undefined) changes[k] = b[k];
    if (!Object.keys(changes).length) throw new ApiError(400, 'Không có dữ liệu để cập nhật');

    const row = await CategoryModel.update(id, changes, req);
    res.json({ data: row });
  }),

  remove: asyncHandler(async (req, res) => {
    const id = toInt(req.params.id);
    const result = await CategoryModel.delete(id, req);
    res.json({ data: result });
  }),
};

module.exports = CategoriesController;

