const { pool } = require('../config/db');

let initialized = false;

/**
 * BannersModel — Tầng Model (MVC) quản lý bảng `banners` trong MySQL
 * Hỗ trợ 4 loại Banner:
 *   - 'hero': Slider chính đầu trang chủ
 *   - 'flash_sale': Dải banner Flash Sale giờ vàng đếm ngược
 *   - 'brand_showcase': Chuyên trang thương hiệu theo từng hãng (Apple, ASUS, Lenovo, MSI, Dell, HP, Acer...)
 *   - 'hot_deal': Banner Deal tâm điểm giảm sâu
 */
const BannersModel = {
  async ensureTableAndSeed() {
    if (initialized) return;
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS banners (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          position VARCHAR(50) DEFAULT 'hero',
          brand VARCHAR(50) NULL,
          title VARCHAR(255) NOT NULL,
          highlight_text VARCHAR(255) DEFAULT '',
          subtitle TEXT,
          badge_text VARCHAR(120) DEFAULT '🚀 Chiến dịch nổi bật',
          badge_style VARCHAR(30) DEFAULT 'blue',
          bg_theme VARCHAR(40) DEFAULT 'blue',
          cta_text VARCHAR(80) DEFAULT 'Khám phá ngay',
          cta_link VARCHAR(255) DEFAULT '#/products',
          secondary_cta_text VARCHAR(80) NULL,
          secondary_cta_link VARCHAR(255) NULL,
          perks_json TEXT NULL,
          countdown_end DATETIME NULL,
          tab_title VARCHAR(100) DEFAULT '',
          tab_sub VARCHAR(100) DEFAULT '',
          image_url VARCHAR(500) DEFAULT '',
          product_id INT UNSIGNED NULL,
          custom_price DECIMAL(15,0) NULL,
          custom_old_price DECIMAL(15,0) NULL,
          specs_json VARCHAR(255) DEFAULT '',
          sort_order INT DEFAULT 1,
          is_active TINYINT(1) DEFAULT 1,
          autoplay_ms INT DEFAULT 3000,
          image_mode VARCHAR(20) DEFAULT 'background',
          content_position VARCHAR(20) DEFAULT 'left',
          image_position VARCHAR(40) DEFAULT 'center center',
          overlay_style VARCHAR(30) DEFAULT 'gradient_dark',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      initialized = true;
    } catch (e) {
      console.warn('[BannersModel] ensureTable warning:', e.message);
    }
  },

  async getAll({ onlyActive = false, position = null, brand = null } = {}) {
    await this.ensureTableAndSeed();
    const conditions = [];
    const params = [];

    if (onlyActive) {
      conditions.push('b.is_active = 1');
    }
    if (position && position !== 'all') {
      conditions.push('b.position = ?');
      params.push(position);
    }
    if (brand && brand !== 'all') {
      conditions.push('b.brand = ?');
      params.push(brand);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `
      SELECT
        b.*,
        p.name AS product_name,
        p.price AS product_base_price,
        p.sale_price AS product_sale_price,
        p.slug AS product_slug,
        br.name AS product_brand,
        s.cpu_model, s.ram_gb, s.storage_gb, s.gpu_model,
        (SELECT i.url FROM product_images i WHERE i.product_id = p.id ORDER BY i.is_thumbnail DESC, i.sort_order ASC LIMIT 1) AS product_thumb
      FROM banners b
      LEFT JOIN products p ON p.id = b.product_id
      LEFT JOIN brands br ON br.id = p.brand_id
      LEFT JOIN product_specs s ON s.product_id = p.id
      ${where}
      ORDER BY b.position ASC, b.sort_order ASC, b.id ASC
    `,
      params
    );
    return rows;
  },

  async getById(id) {
    const numId = Number(id);
    if (!numId || isNaN(numId)) return null;
    await this.ensureTableAndSeed();
    const [rows] = await pool.query(
      `
      SELECT
        b.*,
        p.name AS product_name,
        p.price AS product_base_price,
        p.sale_price AS product_sale_price,
        p.slug AS product_slug,
        br.name AS product_brand,
        s.cpu_model, s.ram_gb, s.storage_gb, s.gpu_model,
        (SELECT i.url FROM product_images i WHERE i.product_id = p.id ORDER BY i.is_thumbnail DESC, i.sort_order ASC LIMIT 1) AS product_thumb
      FROM banners b
      LEFT JOIN products p ON p.id = b.product_id
      LEFT JOIN brands br ON br.id = p.brand_id
      LEFT JOIN product_specs s ON s.product_id = p.id
      WHERE b.id = ?
    `,
      [numId]
    );
    return rows[0] || null;
  },

  async create(data) {
    await this.ensureTableAndSeed();
    const [res] = await pool.query(
      `INSERT INTO banners
        (position, brand, title, highlight_text, subtitle, badge_text, badge_style, bg_theme,
         cta_text, cta_link, secondary_cta_text, secondary_cta_link, perks_json, countdown_end,
         tab_title, tab_sub, image_url, product_id,
         custom_price, custom_old_price, specs_json, sort_order, is_active, autoplay_ms,
         image_mode, content_position, image_position, overlay_style)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.position || 'hero',
        data.brand || null,
        data.title || 'Banner chiến dịch mới',
        data.highlight_text || '',
        data.subtitle || '',
        data.badge_text || '🚀 Chiến dịch nổi bật',
        data.badge_style || 'blue',
        data.bg_theme || 'blue',
        data.cta_text || 'Khám phá ngay',
        data.cta_link || '#/products',
        data.secondary_cta_text || null,
        data.secondary_cta_link || null,
        typeof data.perks_json === 'object' ? JSON.stringify(data.perks_json) : (data.perks_json || null),
        data.countdown_end || null,
        data.tab_title || data.title || 'Chiến dịch',
        data.tab_sub || 'Ưu đãi hấp dẫn',
        data.image_url || '',
        data.product_id ? Number(data.product_id) : null,
        data.custom_price !== undefined && data.custom_price !== '' ? Number(data.custom_price) : null,
        data.custom_old_price !== undefined && data.custom_old_price !== '' ? Number(data.custom_old_price) : null,
        data.specs_json || '',
        Number(data.sort_order) || 1,
        data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1,
        Number(data.autoplay_ms) || 3000,
        data.image_mode || 'background',
        data.content_position || 'left',
        data.image_position || 'center center',
        data.overlay_style || 'gradient_dark',
      ]
    );
    return this.getById(res.insertId);
  },

  async update(id, data) {
    await this.ensureTableAndSeed();
    const existing = await this.getById(id);
    if (!existing) return null;

    const perksVal = data.perks_json !== undefined
      ? (typeof data.perks_json === 'object' ? JSON.stringify(data.perks_json) : data.perks_json)
      : existing.perks_json;

    await pool.query(
      `UPDATE banners SET
        position = ?,
        brand = ?,
        title = ?,
        highlight_text = ?,
        subtitle = ?,
        badge_text = ?,
        badge_style = ?,
        bg_theme = ?,
        cta_text = ?,
        cta_link = ?,
        secondary_cta_text = ?,
        secondary_cta_link = ?,
        perks_json = ?,
        countdown_end = ?,
        tab_title = ?,
        tab_sub = ?,
        image_url = ?,
        product_id = ?,
        custom_price = ?,
        custom_old_price = ?,
        specs_json = ?,
        sort_order = ?,
        is_active = ?,
        autoplay_ms = ?,
        image_mode = ?,
        content_position = ?,
        image_position = ?,
        overlay_style = ?
       WHERE id = ?`,
      [
        data.position ?? existing.position ?? 'hero',
        data.brand !== undefined ? (data.brand || null) : existing.brand,
        data.title ?? existing.title,
        data.highlight_text ?? existing.highlight_text,
        data.subtitle ?? existing.subtitle,
        data.badge_text ?? existing.badge_text,
        data.badge_style ?? existing.badge_style,
        data.bg_theme ?? existing.bg_theme,
        data.cta_text ?? existing.cta_text,
        data.cta_link ?? existing.cta_link,
        data.secondary_cta_text !== undefined ? (data.secondary_cta_text || null) : existing.secondary_cta_text,
        data.secondary_cta_link !== undefined ? (data.secondary_cta_link || null) : existing.secondary_cta_link,
        perksVal,
        data.countdown_end !== undefined ? (data.countdown_end || null) : existing.countdown_end,
        data.tab_title ?? existing.tab_title,
        data.tab_sub ?? existing.tab_sub,
        data.image_url ?? existing.image_url,
        data.product_id !== undefined ? (data.product_id ? Number(data.product_id) : null) : existing.product_id,
        data.custom_price !== undefined ? (data.custom_price !== '' ? Number(data.custom_price) : null) : existing.custom_price,
        data.custom_old_price !== undefined ? (data.custom_old_price !== '' ? Number(data.custom_old_price) : null) : existing.custom_old_price,
        data.specs_json ?? existing.specs_json,
        data.sort_order !== undefined ? Number(data.sort_order) : existing.sort_order,
        data.is_active !== undefined ? (data.is_active ? 1 : 0) : existing.is_active,
        data.autoplay_ms !== undefined ? Number(data.autoplay_ms) : existing.autoplay_ms,
        data.image_mode ?? existing.image_mode ?? 'background',
        data.content_position ?? existing.content_position ?? 'left',
        data.image_position ?? existing.image_position ?? 'center center',
        data.overlay_style ?? existing.overlay_style ?? 'gradient_dark',
        id,
      ]
    );
    return this.getById(id);
  },

  async updateStatus(id, isActive) {
    await this.ensureTableAndSeed();
    await pool.query('UPDATE banners SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, id]);
    return this.getById(id);
  },

  async remove(id) {
    await this.ensureTableAndSeed();
    await pool.query('DELETE FROM banners WHERE id = ?', [id]);
    return true;
  },
};

module.exports = BannersModel;
