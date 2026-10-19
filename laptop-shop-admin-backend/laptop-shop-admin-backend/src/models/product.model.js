const { pool } = require('../config/db');

const ProductModel = {
  async countProducts(whereClause, params) {
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM products p ${whereClause}`, params);
    return total;
  },

  async findProducts({ whereClause, params, sortCol, dir, limit, offset }) {
    const [rows] = await pool.query(
      `SELECT p.id, p.sku, p.barcode, p.name, p.slug, p.brand_id, b.name AS brand,
              p.category_id, c.name AS category, p.condition_type,
              p.cost_price, p.price, p.sale_price, COALESCE(p.sale_price, p.price) AS final_price,
              p.stock_quantity, p.low_stock_threshold,
              CASE WHEN p.stock_quantity = 0 THEN 'out_of_stock'
                   WHEN p.stock_quantity <= p.low_stock_threshold THEN 'low_stock'
                   ELSE 'in_stock' END AS stock_status,
              p.status, p.is_featured, p.is_new, p.is_bestseller, p.view_count, p.sold_count,
              p.version, p.created_at, p.updated_at, p.deleted_at,
              (SELECT i.url FROM product_images i WHERE i.product_id = p.id AND i.is_thumbnail = 1
                ORDER BY i.sort_order LIMIT 1) AS thumbnail
         FROM products p
         JOIN brands b ON b.id = p.brand_id
         JOIN categories c ON c.id = p.category_id
         ${whereClause}
        ORDER BY ${sortCol} ${dir}, p.id DESC
        LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return rows;
  },

  async findProductDetail(dbConn, id) {
    const conn = dbConn || pool;
    const [[p]] = await conn.query(
      `SELECT p.*, COALESCE(p.sale_price, p.price) AS final_price,
              b.name AS brand_name, c.name AS category_name,
              u.full_name AS creator_name,
              s.cpu_brand, s.cpu_model, s.cpu_cores, s.cpu_threads,
              s.ram_gb, s.ram_type, s.ram_max_gb,
              s.storage_gb, s.storage_type,
              s.gpu_type, s.gpu_model, s.vram_gb,
              s.screen_size_inch, s.screen_resolution, s.screen_panel, s.refresh_rate_hz, s.touchscreen,
              s.battery_wh, s.charger_w, s.wifi, s.bluetooth, s.ports, s.os,
              s.keyboard, s.webcam, s.fingerprint, s.weight_kg, s.dimensions, s.color, s.material
         FROM products p
         JOIN brands b ON b.id = p.brand_id
         JOIN categories c ON c.id = p.category_id
         LEFT JOIN users u ON u.id = p.created_by
         LEFT JOIN product_specs s ON s.product_id = p.id
        WHERE p.id = ?`,
      [id],
    );
    if (!p) return null;

    const [images] = await conn.query(
      'SELECT id, url, alt_text, sort_order, is_thumbnail FROM product_images WHERE product_id = ? ORDER BY sort_order, id',
      [id],
    );
    p.images = images;
    return p;
  },

  async findPriceHistory(id) {
    const [rows] = await pool.query(
      `SELECT h.id, h.old_price, h.new_price, h.old_sale, h.new_sale, h.changed_at, u.full_name AS changed_by
         FROM price_history h LEFT JOIN users u ON u.id = h.changed_by
        WHERE h.product_id = ? ORDER BY h.changed_at DESC, h.id DESC LIMIT 200`,
      [id],
    );
    return rows;
  },

  async findByIdForUpdate(conn, id) {
    const [[row]] = await conn.query('SELECT * FROM products WHERE id = ? FOR UPDATE', [id]);
    return row;
  },

  async insertProduct(conn, row) {
    const [res] = await conn.query('INSERT INTO products SET ?', [row]);
    return res.insertId;
  },

  async insertSpecs(conn, id, specs) {
    if (Object.keys(specs).length) {
      await conn.query('INSERT INTO product_specs SET ?', [{ product_id: id, ...specs }]);
    }
  },

  async upsertSpecs(conn, id, specs) {
    if (Object.keys(specs).length) {
      await conn.query('INSERT INTO product_specs SET ? ON DUPLICATE KEY UPDATE ?', [
        { product_id: id, ...specs },
        specs,
      ]);
    }
  },

  async findSpecs(conn, id) {
    const [[specs]] = await conn.query('SELECT * FROM product_specs WHERE product_id = ?', [id]);
    return specs || null;
  },

  async updateProduct(conn, id, changes) {
    await conn.query('UPDATE products SET ?, version = version + 1 WHERE id = ?', [changes, id]);
  },

  async insertPriceHistory(conn, { productId, oldPrice, newPrice, oldSale, newSale, changedBy }) {
    await conn.query(
      `INSERT INTO price_history (product_id, old_price, new_price, old_sale, new_sale, changed_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [productId, oldPrice, newPrice, oldSale, newSale, changedBy],
    );
  },

  async softDelete(conn, id) {
    const [res] = await conn.query(
      `UPDATE products SET deleted_at = ?, status = 'hidden', version = version + 1
        WHERE id = ? AND deleted_at IS NULL`,
      [new Date(), id],
    );
    return res.affectedRows;
  },

  async restore(conn, id) {
    const [res] = await conn.query(
      'UPDATE products SET deleted_at = NULL, version = version + 1 WHERE id = ? AND deleted_at IS NOT NULL',
      [id],
    );
    return res.affectedRows;
  },

  async updateStatus(conn, id, status) {
    await conn.query('UPDATE products SET status = ?, version = version + 1 WHERE id = ?', [status, id]);
  },

  async findSlug(id) {
    const [[p]] = await pool.query('SELECT slug FROM products WHERE id = ? AND deleted_at IS NULL', [id]);
    return p ? p.slug : null;
  },

  async insertImages(conn, images) {
    if (images.length) {
      await conn.query(
        'INSERT INTO product_images (product_id, url, alt_text, sort_order, is_thumbnail) VALUES ?',
        [images],
      );
    }
  },

  async findImage(conn, id, imgId) {
    const [[img]] = await conn.query('SELECT * FROM product_images WHERE id = ? AND product_id = ?', [imgId, id]);
    return img || null;
  },

  async deleteImage(conn, id, imgId) {
    await conn.query('DELETE FROM product_images WHERE id = ? AND product_id = ?', [imgId, id]);
  },

  async setThumbnail(conn, id, imgId) {
    await conn.query('UPDATE product_images SET is_thumbnail = 0 WHERE product_id = ?', [id]);
    await conn.query('UPDATE product_images SET is_thumbnail = 1 WHERE id = ? AND product_id = ?', [imgId, id]);
  },

  async updateImageSortOrder(conn, id, imgId, sortOrder) {
    await conn.query('UPDATE product_images SET sort_order = ? WHERE id = ? AND product_id = ?', [sortOrder, imgId, id]);
  },

  async updateImage(conn, id, imgId, fields) {
    await conn.query('UPDATE product_images SET ? WHERE id = ? AND product_id = ?', [fields, imgId, id]);
  },
};

module.exports = ProductModel;

