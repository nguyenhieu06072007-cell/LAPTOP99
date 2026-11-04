const { z } = require('zod');
const { pool, withTransaction } = require('../config/db');
const { can } = require('../config/permissions');
const {
  looksLikeImage, removeFiles, urlToPath,
} = require('../middlewares/upload');
const {
  ApiError, asyncHandler, uniqueSlug, pick, toInt, paging, pageMeta, escapeLike, diff,
} = require('../utils/helpers');
const { writeAudit } = require('../services/audit');
const ProductModel = require('../models/product.model');

const canCost = (req) => can(req.user.role, 'cost:read');

/* ------------------------------------------------------------------ */
/* Schemas & Validators                                               */
/* ------------------------------------------------------------------ */
const nstr = (max) => z.string().trim().max(max).nullish().transform((v) => (v === '' ? null : v));
const nint = z.number().int().min(0).max(4294967295).nullish();
const nnum = z.number().min(0).max(99999).nullish();
const flag = z.union([z.boolean(), z.literal(0), z.literal(1)]).transform((v) => (v ? 1 : 0));

const specsSchema = z.object({
  cpu_brand: nstr(30), cpu_model: nstr(80), cpu_cores: nint, cpu_threads: nint,
  ram_gb: nint, ram_type: nstr(30), ram_max_gb: nint,
  storage_gb: nint, storage_type: nstr(50),
  gpu_type: z.enum(['Onboard', 'Rời']).nullish(), gpu_model: nstr(100), vram_gb: nint,
  screen_size_inch: nnum, screen_resolution: nstr(40), screen_panel: nstr(40),
  refresh_rate_hz: nint, touchscreen: flag,
  battery_wh: nnum, charger_w: nint,
  wifi: nstr(30), bluetooth: nstr(10), ports: nstr(300), os: nstr(50),
  keyboard: nstr(100), webcam: nstr(50), fingerprint: flag,
  weight_kg: nnum, dimensions: nstr(60), color: nstr(40), material: nstr(60),
}).partial();
const SPEC_KEYS = Object.keys(specsSchema.shape);

const productBase = z.object({
  sku: z.string().trim().min(1).max(50),
  barcode: nstr(50),
  name: z.string().trim().min(1).max(255),
  slug: z.string().trim().min(1).max(280),
  brand_id: z.number().int().positive(),
  category_id: z.number().int().positive(),
  model_name: nstr(100),
  condition_type: z.enum(['new', 'like_new', 'used']),
  condition_percent: z.number().int().min(1).max(100),
  short_description: nstr(500),
  description: z.string().max(50000).nullish(),
  cost_price: z.number().min(0).max(1e13),
  price: z.number().positive().max(1e13),
  sale_price: z.number().positive().max(1e13).nullish(),
  sale_start: z.coerce.date().nullish(),
  sale_end: z.coerce.date().nullish(),
  vat_rate: z.number().min(0).max(99.99),
  stock_quantity: z.number().int().min(0).max(1000000),
  low_stock_threshold: z.number().int().min(0).max(100000),
  allow_backorder: flag,
  warehouse_location: nstr(50),
  warranty_months: z.number().int().min(0).max(120),
  warranty_policy: nstr(500),
  status: z.enum(['draft', 'active', 'hidden', 'discontinued']),
  is_featured: flag,
  is_new: flag,
  is_bestseller: flag,
  sort_order: z.number().int(),
  meta_title: nstr(255),
  meta_description: nstr(500),
  specs: specsSchema,
}).partial();

const PRODUCT_KEYS = Object.keys(productBase.shape).filter((k) => k !== 'specs' && k !== 'slug');

const createSchema = productBase.required({
  sku: true, name: true, brand_id: true, category_id: true, price: true,
});
const updateSchema = productBase.omit({ stock_quantity: true })
  .extend({ version: z.number().int().positive() });

function checkPricing(m) {
  if (m.sale_price != null && m.sale_price >= m.price) {
    throw new ApiError(400, 'Giá khuyến mãi phải nhỏ hơn giá bán');
  }
  if (m.sale_start && m.sale_end && new Date(m.sale_end) <= new Date(m.sale_start)) {
    throw new ApiError(400, 'Thời gian kết thúc khuyến mãi phải sau thời gian bắt đầu');
  }
}

const SORTS = {
  created_at: 'p.created_at', updated_at: 'p.updated_at', price: 'p.price', name: 'p.name',
  stock: 'p.stock_quantity', sold: 'p.sold_count', views: 'p.view_count', id: 'p.id',
};

const ProductsController = {
  listProducts: asyncHandler(async (req, res) => {
    const q = req.query;
    const { page, limit, offset } = paging(q);
    const where = [];
    const params = [];

    if (q.trashed === 'only') where.push('p.deleted_at IS NOT NULL');
    else if (q.trashed !== 'with') where.push('p.deleted_at IS NULL');

    if (q.search) {
      const s = `%${escapeLike(String(q.search).trim())}%`;
      where.push('(p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ? OR p.model_name LIKE ?)');
      params.push(s, s, s, s);
    }
    if (toInt(q.brand_id)) { where.push('p.brand_id = ?'); params.push(toInt(q.brand_id)); }
    if (toInt(q.category_id)) { where.push('p.category_id = ?'); params.push(toInt(q.category_id)); }
    if (['draft', 'active', 'hidden', 'discontinued'].includes(q.status)) { where.push('p.status = ?'); params.push(q.status); }
    if (['new', 'like_new', 'used'].includes(q.condition_type)) { where.push('p.condition_type = ?'); params.push(q.condition_type); }
    if (q.stock === 'out') where.push('p.stock_quantity = 0');
    else if (q.stock === 'low') where.push('p.stock_quantity > 0 AND p.stock_quantity <= p.low_stock_threshold');
    else if (q.stock === 'in') where.push('p.stock_quantity > p.low_stock_threshold');
    if (toInt(q.min_price) !== null) { where.push('p.price >= ?'); params.push(toInt(q.min_price)); }
    if (toInt(q.max_price) !== null) { where.push('p.price <= ?'); params.push(toInt(q.max_price)); }
    for (const f of ['is_featured', 'is_new', 'is_bestseller']) {
      if (q[f] === '1') where.push(`p.${f} = 1`);
    }
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const sortCol = SORTS[q.sort] || SORTS.created_at;
    const dir = String(q.order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const total = await ProductModel.countProducts(whereClause, params);
    const rows = await ProductModel.findProducts({ whereClause, params, sortCol, dir, limit, offset });

    if (!canCost(req)) rows.forEach((r) => delete r.cost_price);
    res.json({ data: rows, meta: pageMeta(page, limit, total) });
  }),

  getProduct: asyncHandler(async (req, res) => {
    const p = await ProductModel.findProductDetail(pool, toInt(req.params.id));
    if (!p) throw new ApiError(404, 'Không tìm thấy sản phẩm');
    if (!canCost(req)) delete p.cost_price;
    res.json({ data: p });
  }),

  getPriceHistory: asyncHandler(async (req, res) => {
    const rows = await ProductModel.findPriceHistory(toInt(req.params.id));
    res.json({ data: rows });
  }),

  createProduct: asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body);
    if (!canCost(req)) delete body.cost_price;
    checkPricing({ ...body });

    const id = await withTransaction(async (conn) => {
      const row = pick(body, PRODUCT_KEYS);
      row.slug = await uniqueSlug(conn, 'products', body.slug || body.name, { maxLen: 280 });
      row.created_by = req.user.id;

      const pid = await ProductModel.insertProduct(conn, row);

      const specs = body.specs ? pick(body.specs, SPEC_KEYS) : {};
      await ProductModel.insertSpecs(conn, pid, specs);

      const stock = body.stock_quantity || 0;
      if (stock > 0) {
        await conn.query(
          `INSERT INTO inventory_movements (product_id, type, quantity, stock_before, stock_after, unit_cost, reason, created_by)
           VALUES (?, 'import', ?, 0, ?, ?, 'Nhập kho khi tạo sản phẩm', ?)`,
          [pid, stock, stock, body.cost_price ?? 0, req.user.id],
        );
      }
      await ProductModel.insertPriceHistory(conn, {
        productId: pid, oldPrice: null, newPrice: body.price, oldSale: null, newSale: body.sale_price ?? null, changedBy: req.user.id,
      });

      await writeAudit(conn, req, {
        action: 'create', entity: 'product', entityId: pid,
        newValues: { ...row, specs: Object.keys(specs).length ? specs : undefined },
      });
      return pid;
    });

    const p = await ProductModel.findProductDetail(pool, id);
    if (!canCost(req)) delete p.cost_price;
    res.status(201).json({ data: p });
  }),

  updateProduct: asyncHandler(async (req, res) => {
    const id = toInt(req.params.id);
    const { version, specs, ...rest } = updateSchema.parse(req.body);
    if (!canCost(req)) delete rest.cost_price;

    await withTransaction(async (conn) => {
      const old = await ProductModel.findByIdForUpdate(conn, id);
      if (!old) throw new ApiError(404, 'Không tìm thấy sản phẩm');
      if (old.deleted_at) throw new ApiError(409, 'Sản phẩm đã bị xoá, hãy khôi phục trước khi sửa');
      if (old.version !== version) {
        throw new ApiError(409, 'Sản phẩm vừa được người khác cập nhật. Hãy tải lại dữ liệu rồi sửa tiếp.', {
          current_version: old.version,
        });
      }

      const changes = pick(rest, PRODUCT_KEYS);
      if (rest.slug) changes.slug = await uniqueSlug(conn, 'products', rest.slug, { excludeId: id, maxLen: 280 });
      checkPricing({ ...old, ...changes });

      const { oldValues, newValues } = diff(old, changes);

      const specChanges = specs ? pick(specs, SPEC_KEYS) : {};
      let specDiff = null;
      if (Object.keys(specChanges).length) {
        const oldSpecs = await ProductModel.findSpecs(conn, id);
        specDiff = diff(oldSpecs || {}, specChanges);
        await ProductModel.upsertSpecs(conn, id, specChanges);
      }

      if (!Object.keys(changes).length && !specDiff) return;

      await ProductModel.updateProduct(conn, id, Object.keys(changes).length ? changes : { sort_order: old.sort_order });

      if ('price' in newValues || 'sale_price' in newValues) {
        await ProductModel.insertPriceHistory(conn, {
          productId: id, oldPrice: old.price, newPrice: changes.price ?? old.price,
          oldSale: old.sale_price, newSale: 'sale_price' in changes ? changes.sale_price : old.sale_price,
          changedBy: req.user.id,
        });
      }

      await writeAudit(conn, req, {
        action: 'update', entity: 'product', entityId: id,
        oldValues: { ...oldValues, ...(specDiff && { specs: specDiff.oldValues }) },
        newValues: { ...newValues, ...(specDiff && { specs: specDiff.newValues }) },
      });
    });

    const p = await ProductModel.findProductDetail(pool, id);
    if (!canCost(req)) delete p.cost_price;
    res.json({ data: p });
  }),

  updateStatus: asyncHandler(async (req, res) => {
    const id = toInt(req.params.id);
    const { status } = z.object({ status: z.enum(['draft', 'active', 'hidden', 'discontinued']) }).parse(req.body);
    await withTransaction(async (conn) => {
      const old = await ProductModel.findByIdForUpdate(conn, id);
      if (!old) throw new ApiError(404, 'Không tìm thấy sản phẩm');
      if (old.deleted_at) throw new ApiError(409, 'Sản phẩm đã bị xoá');
      await ProductModel.updateStatus(conn, id, status);
      await writeAudit(conn, req, {
        action: 'update', entity: 'product', entityId: id,
        oldValues: { status: old.status }, newValues: { status },
      });
    });
    res.json({ data: { id, status } });
  }),

  deleteProduct: asyncHandler(async (req, res) => {
    const id = toInt(req.params.id);
    await withTransaction(async (conn) => {
      const affected = await ProductModel.softDelete(conn, id);
      if (!affected) throw new ApiError(404, 'Không tìm thấy sản phẩm (hoặc đã bị xoá)');
      await writeAudit(conn, req, { action: 'delete', entity: 'product', entityId: id });
    });
    res.json({ data: { id, deleted: true } });
  }),

  restoreProduct: asyncHandler(async (req, res) => {
    const id = toInt(req.params.id);
    await withTransaction(async (conn) => {
      const affected = await ProductModel.restore(conn, id);
      if (!affected) throw new ApiError(404, 'Không tìm thấy sản phẩm đã xoá');
      await writeAudit(conn, req, { action: 'restore', entity: 'product', entityId: id });
    });
    const p = await ProductModel.findProductDetail(pool, id);
    if (!canCost(req)) delete p.cost_price;
    res.json({ data: p });
  }),

  uploadImages: asyncHandler(async (req, res) => {
    const id = toInt(req.params.id);
    const files = req.files || [];
    if (!files.length) throw new ApiError(400, 'Chưa chọn file ảnh');

    const bad = files.find((f) => !looksLikeImage(f.path));
    if (bad) {
      await removeFiles(files.map((f) => f.path));
      throw new ApiError(400, 'File tải lên không phải ảnh hợp lệ');
    }

    const inserted = await withTransaction(async (conn) => {
      const [[{ maxSort }]] = await conn.query(
        'SELECT COALESCE(MAX(sort_order), -1) AS maxSort FROM product_images WHERE product_id = ?', [id],
      );
      const [[{ hasThumb }]] = await conn.query(
        'SELECT COUNT(*) AS hasThumb FROM product_images WHERE product_id = ? AND is_thumbnail = 1', [id],
      );

      const rows = files.map((f, i) => [
        id,
        `/uploads/products/${f.filename}`,
        f.originalname.slice(0, 255),
        maxSort + 1 + i,
        (!hasThumb && i === 0) ? 1 : 0,
      ]);

      await ProductModel.insertImages(conn, rows);
      await writeAudit(conn, req, {
        action: 'upload_images', entity: 'product', entityId: id,
        newValues: { count: files.length, files: files.map((f) => f.filename) },
      });
      const [imgs] = await conn.query(
        'SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order, id', [id],
      );
      return imgs;
    });

    res.status(201).json({ data: inserted });
  }),

  replaceImage: asyncHandler(async (req, res) => {
    const id = toInt(req.params.id);
    const imgId = toInt(req.params.imageId || req.params.imgId);
    const files = req.files || (req.file ? [req.file] : []);
    if (!files.length) throw new ApiError(400, 'Chưa chọn file ảnh mới');

    const file = files[0];
    if (!looksLikeImage(file.path)) {
      await removeFiles([file.path]);
      throw new ApiError(400, 'File tải lên không phải ảnh hợp lệ');
    }

    const newUrl = `/uploads/products/${file.filename}`;
    const oldFilePath = await withTransaction(async (conn) => {
      const img = await ProductModel.findImage(conn, id, imgId);
      if (!img) throw new ApiError(404, 'Không tìm thấy ảnh');

      const oldPath = urlToPath(img.url);
      await ProductModel.updateImage(conn, id, imgId, {
        url: newUrl,
        alt_text: file.originalname.slice(0, 255),
      });

      await writeAudit(conn, req, {
        action: 'replace_image',
        entity: 'product',
        entityId: id,
        oldValues: img,
        newValues: { id: imgId, url: newUrl },
      });

      return oldPath;
    });

    if (oldFilePath) await removeFiles([oldFilePath]);
    res.json({ data: { id: imgId, url: newUrl } });
  }),

  deleteImage: asyncHandler(async (req, res) => {
    const id = toInt(req.params.id);
    const imgId = toInt(req.params.imageId || req.params.imgId);

    const filePath = await withTransaction(async (conn) => {
      const img = await ProductModel.findImage(conn, id, imgId);
      if (!img) throw new ApiError(404, 'Không tìm thấy ảnh');

      await ProductModel.deleteImage(conn, id, imgId);

      if (img.is_thumbnail) {
        const [[next]] = await conn.query(
          'SELECT id FROM product_images WHERE product_id = ? ORDER BY sort_order, id LIMIT 1', [id],
        );
        if (next) {
          await conn.query('UPDATE product_images SET is_thumbnail = 1 WHERE id = ?', [next.id]);
        }
      }
      await writeAudit(conn, req, { action: 'delete_image', entity: 'product', entityId: id, oldValues: img });
      return urlToPath(img.url);
    });

    if (filePath) await removeFiles([filePath]);
    res.json({ data: { id: imgId, deleted: true } });
  }),

  setThumbnail: asyncHandler(async (req, res) => {
    const id = toInt(req.params.id);
    const imgId = toInt(req.params.imageId || req.params.imgId);
    await withTransaction(async (conn) => {
      const img = await ProductModel.findImage(conn, id, imgId);
      if (!img) throw new ApiError(404, 'Không tìm thấy ảnh');
      await ProductModel.setThumbnail(conn, id, imgId);
      await writeAudit(conn, req, { action: 'set_thumbnail', entity: 'product', entityId: id, newValues: { image_id: imgId } });
    });
    res.json({ data: { id: imgId, is_thumbnail: 1 } });
  }),

  reorderImages: asyncHandler(async (req, res) => {
    const id = toInt(req.params.id);
    const { order } = z.object({ order: z.array(z.number().int().positive()) }).parse(req.body);
    await withTransaction(async (conn) => {
      for (let i = 0; i < order.length; i++) {
        await ProductModel.updateImageSortOrder(conn, id, order[i], i);
      }
      await writeAudit(conn, req, { action: 'reorder_images', entity: 'product', entityId: id, newValues: { order } });
    });
    res.json({ data: { success: true } });
  }),
};

module.exports = ProductsController;

