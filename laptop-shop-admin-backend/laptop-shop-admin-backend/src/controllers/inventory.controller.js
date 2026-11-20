const { z } = require('zod');
const InventoryModel = require('../models/inventory.model');
const { withTransaction } = require('../config/db');
const { writeAudit } = require('../services/audit');
const { ApiError, asyncHandler } = require('../utils/helpers');

const movementSchema = z.object({
  product_id: z.number().int().positive(),
  type: z.enum(['import', 'export', 'adjust', 'return']),
  // import/export/return: số dương. adjust: số có dấu (+ tăng, - giảm).
  quantity: z.number().int().refine((n) => n !== 0, 'Số lượng phải khác 0').refine((n) => Math.abs(n) <= 1000000, 'Số lượng quá lớn'),
  unit_cost: z.number().min(0).max(1e13).nullish(),
  reason: z.string().trim().max(255).nullish(),
});

const InventoryController = {
  getMovements: asyncHandler(async (req, res) => {
    const { rows, meta } = await InventoryModel.getMovements({ query: req.query, userRole: req.user });
    res.json({ data: rows, meta });
  }),

  getReceipts: asyncHandler(async (req, res) => {
    res.json(await InventoryModel.getReceipts({ query: req.query, user: req.user }));
  }),

  receiveStock: asyncHandler(async (req, res) => {
    const body = z.object({
      request_key: z.string().uuid(),
      supplier: z.string().trim().min(1).max(150),
      warehouse: z.string().trim().min(1).max(150),
      notes: z.string().trim().max(255).optional(),
      rows: z.array(z.object({
        sku: z.string().trim().min(1).max(100),
        quantity: z.number().int().positive().max(10000),
        unit_cost: z.number().int().min(0).max(1e13).optional(),
        serials: z.array(z.string().trim().min(1).max(100).transform((value) => value.toUpperCase())).max(500).default([]),
      })).min(1).max(100),
    }).parse(req.body);
    res.status(201).json(await InventoryModel.receiveStock(body, req));
  }),

  getLowStock: asyncHandler(async (req, res) => {
    const rows = await InventoryModel.getLowStock(req.user);
    res.json({ data: rows });
  }),

  setThreshold: asyncHandler(async (req, res) => {
    const { sku, threshold } = z.object({
      sku: z.string().trim().min(1).max(50),
      threshold: z.number().int().min(0).max(100000),
    }).parse(req.body);
    const branch = InventoryModel.inventoryBranch(req.user);
    await withTransaction(async (conn) => {
      const [[product]] = await conn.query(`SELECT id, low_stock_threshold FROM products
        WHERE sku = ? AND deleted_at IS NULL${branch === null ? '' : ' AND warehouse_location = ?'} FOR UPDATE`,
      branch === null ? [sku] : [sku, branch || null]);
      if (!product) throw new ApiError(404, 'Không tìm thấy SKU trong phạm vi kho');
      if (product.low_stock_threshold === threshold) return;
      await conn.query('UPDATE products SET low_stock_threshold = ? WHERE id = ?', [threshold, product.id]);
      await writeAudit(conn, req, { action: 'set_stock_threshold', entity: 'product', entityId: product.id,
        oldValues: { threshold: product.low_stock_threshold }, newValues: { threshold } });
    });
    res.status(204).end();
  }),

  createMovement: asyncHandler(async (req, res) => {
    const b = movementSchema.parse(req.body);

    let delta;
    if (b.type === 'import' || b.type === 'return') {
      if (b.quantity < 0) throw new ApiError(400, 'Số lượng nhập/hoàn phải là số dương');
      delta = b.quantity;
    } else if (b.type === 'export') {
      if (b.quantity < 0) throw new ApiError(400, 'Số lượng xuất phải là số dương');
      delta = -b.quantity;
    } else {
      if (!b.reason) throw new ApiError(400, 'Điều chỉnh tồn kho bắt buộc phải có lý do');
      delta = b.quantity;
    }

    const movement = await InventoryModel.createMovement({
      productId: b.product_id,
      type: b.type,
      delta,
      unitCost: b.unit_cost,
      reason: b.reason,
      userId: req.user.id,
    }, req);

    res.status(201).json({ data: movement });
  }),
};

module.exports = InventoryController;

