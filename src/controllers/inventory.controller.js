const { z } = require('zod');
const InventoryModel = require('../models/inventory.model');
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
    const { rows, meta } = await InventoryModel.getMovements({ query: req.query, userRole: req.user.role });
    res.json({ data: rows, meta });
  }),

  getLowStock: asyncHandler(async (req, res) => {
    const rows = await InventoryModel.getLowStock();
    res.json({ data: rows });
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

