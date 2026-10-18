const { pool } = require('../config/db');

let initialized = false;

/**
 * BannersModel — Tầng Model (MVC) quản lý bảng `banners` trong MySQL
 * Cho phép Admin tạo, sửa, bật/tắt, đổi thứ tự, thiết kế giao diện banner và hiển thị ra trang chủ.
 */
const BannersModel = {
  async ensureTableAndSeed() {
    if (initialized) return;
    await pool.query(`
      CREATE TABLE IF NOT EXISTS banners (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        highlight_text VARCHAR(255) DEFAULT '',
        subtitle TEXT,
        badge_text VARCHAR(120) DEFAULT '🔥 Chiến dịch nổi bật',
        badge_style VARCHAR(30) DEFAULT 'blue',
        bg_theme VARCHAR(40) DEFAULT 'blue',
        cta_text VARCHAR(80) DEFAULT 'Khám phá ngay',
        cta_link VARCHAR(255) DEFAULT '#/products',
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

    const [[countRow]] = await pool.query('SELECT COUNT(*) AS cnt FROM banners');
    if (Number(countRow.cnt) === 0) {
      // Lấy các sản phẩm tiêu biểu có thật trong DB để gắn mặc định
      const [prods] = await pool.query(`
        SELECT p.id, p.name, p.price, p.sale_price, b.name AS brand, p.category_id,
               s.cpu_model, s.ram_gb, s.storage_gb,
               (SELECT i.url FROM product_images i WHERE i.product_id = p.id ORDER BY i.is_thumbnail DESC, i.sort_order ASC LIMIT 1) AS thumb
        FROM products p
        JOIN brands b ON b.id = p.brand_id
        LEFT JOIN product_specs s ON s.product_id = p.id
        WHERE p.deleted_at IS NULL AND p.status = 'active'
        ORDER BY p.sold_count DESC, p.id ASC
        LIMIT 20
      `);

      const macProd = prods.find((x) => x.brand === 'Apple') || prods[0];
      const gameProd = prods.find((x) => Number(x.category_id) === 2) || prods[1] || prods[0];
      const officeProd = prods.find((x) => Number(x.category_id) === 1 || Number(x.category_id) === 6) || prods[2] || prods[0];
      const promoProd = prods.find((x) => x.sale_price && Number(x.sale_price) < Number(x.price)) || prods[3] || prods[0];

      const defaultBanners = [
        {
          title: 'MacBook chính hãng –',
          highlight_text: 'Hiệu năng vượt trội',
          subtitle: 'Thiết kế mỏng nhẹ, hiệu năng mạnh mẽ, thời lượng pin bền bỉ suốt ngày dài, phù hợp học tập và công việc chuyên nghiệp.',
          badge_text: '🍎 Apple Authorized · Chính Hãng VN/A',
          badge_style: 'blue',
          bg_theme: 'blue',
          cta_text: 'Khám phá ngay',
          cta_link: '#/products?brand=Apple',
          tab_title: 'MacBook Chính Hãng',
          tab_sub: 'Hiệu năng vượt trội',
          image_url: macProd ? macProd.thumb || '' : '',
          product_id: macProd ? macProd.id : null,
          custom_price: macProd ? (macProd.sale_price || macProd.price) : 24990000,
          custom_old_price: macProd ? macProd.price : 27990000,
          specs_json: macProd ? `${macProd.cpu_model || 'Apple M2'},RAM ${macProd.ram_gb || 16}GB,SSD ${macProd.storage_gb || 512}GB` : 'Apple M2,RAM 16GB,SSD 512GB',
          sort_order: 1,
          is_active: 1,
          autoplay_ms: 3000,
        },
        {
          title: 'Bứt phá mọi trận game',
          highlight_text: 'Đỉnh cao đồ họa RTX',
          subtitle: 'Hiệu năng đồ họa RTX mạnh mẽ, tản nhiệt kép tối ưu cùng màn hình tần số quét 144Hz–240Hz siêu mượt cho game thủ.',
          badge_text: '🔥 Chiến binh Gaming · Tần số quét cao',
          badge_style: 'red',
          bg_theme: 'indigo',
          cta_text: 'Chọn laptop gaming',
          cta_link: '#/products?cat=2',
          tab_title: 'Laptop Gaming RTX',
          tab_sub: 'Màn hình 144Hz+',
          image_url: gameProd ? gameProd.thumb || '' : '',
          product_id: gameProd ? gameProd.id : null,
          custom_price: gameProd ? (gameProd.sale_price || gameProd.price) : 21990000,
          custom_old_price: gameProd ? gameProd.price : 25490000,
          specs_json: gameProd ? `${gameProd.cpu_model || 'Core i7'},RAM ${gameProd.ram_gb || 16}GB,SSD ${gameProd.storage_gb || 512}GB` : 'Intel Core i7,RAM 16GB,RTX 4050',
          sort_order: 2,
          is_active: 1,
          autoplay_ms: 3000,
        },
        {
          title: 'Laptop cho công việc',
          highlight_text: 'Mỗi ngày hiệu quả',
          subtitle: 'Mỏng nhẹ, pin tốt, bàn phím êm ái và bảo mật cao, tối ưu năng suất làm việc văn phòng và di chuyển liên tục.',
          badge_text: '💼 Doanh nhân & Văn phòng · Bền bỉ',
          badge_style: 'blue',
          bg_theme: 'emerald',
          cta_text: 'Xem sản phẩm',
          cta_link: '#/products?cat=1',
          tab_title: 'Laptop Văn Phòng',
          tab_sub: 'Mỏng nhẹ, pin tốt',
          image_url: officeProd ? officeProd.thumb || '' : '',
          product_id: officeProd ? officeProd.id : null,
          custom_price: officeProd ? (officeProd.sale_price || officeProd.price) : 16990000,
          custom_old_price: officeProd ? officeProd.price : 19490000,
          specs_json: officeProd ? `${officeProd.cpu_model || 'Core i5'},RAM ${officeProd.ram_gb || 16}GB,SSD ${officeProd.storage_gb || 512}GB` : 'Intel Core i5,RAM 16GB,SSD 512GB',
          sort_order: 3,
          is_active: 1,
          autoplay_ms: 3000,
        },
        {
          title: 'Ưu đãi laptop nổi bật',
          highlight_text: 'Giảm sâu trực tiếp',
          subtitle: 'Khám phá chương trình khuyến mãi đang áp dụng toàn hệ thống — Nhập mã giảm thêm tới 2.000.000 ₫ tại bước thanh toán.',
          badge_text: '⚡ Săn Deal Công Nghệ · Giá Sốc',
          badge_style: 'red',
          bg_theme: 'rose',
          cta_text: 'Săn ưu đãi',
          cta_link: '#/promos',
          tab_title: 'Ưu Đãi Nổi Bật',
          tab_sub: 'Săn Voucher giảm sâu',
          image_url: promoProd ? promoProd.thumb || '' : '',
          product_id: promoProd ? promoProd.id : null,
          custom_price: promoProd ? (promoProd.sale_price || promoProd.price) : 18490000,
          custom_old_price: promoProd ? promoProd.price : 21990000,
          specs_json: promoProd ? `${promoProd.cpu_model || 'Core i5'},RAM ${promoProd.ram_gb || 16}GB,SSD ${promoProd.storage_gb || 512}GB` : 'Chính hãng 100%,Bảo hành S/N,Trả góp 0%',
          sort_order: 4,
          is_active: 1,
          autoplay_ms: 3000,
        },
      ];

      for (const b of defaultBanners) {
        await pool.query(
          `INSERT INTO banners
            (title, highlight_text, subtitle, badge_text, badge_style, bg_theme,
             cta_text, cta_link, tab_title, tab_sub, image_url, product_id,
             custom_price, custom_old_price, specs_json, sort_order, is_active, autoplay_ms)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            b.title,
            b.highlight_text,
            b.subtitle,
            b.badge_text,
            b.badge_style,
            b.bg_theme,
            b.cta_text,
            b.cta_link,
            b.tab_title,
            b.tab_sub,
            b.image_url,
            b.product_id,
            b.custom_price,
            b.custom_old_price,
            b.specs_json,
            b.sort_order,
            b.is_active,
            b.autoplay_ms,
          ],
        );
      }
    }
    initialized = true;
  },

  async getAll({ onlyActive = false } = {}) {
    await this.ensureTableAndSeed();
    const where = onlyActive ? 'WHERE b.is_active = 1' : '';
    const [rows] = await pool.query(`
      SELECT
        b.*,
        p.name AS product_name,
        p.price AS product_base_price,
        p.sale_price AS product_sale_price,
        br.name AS product_brand,
        s.cpu_model, s.ram_gb, s.storage_gb,
        (SELECT i.url FROM product_images i WHERE i.product_id = p.id ORDER BY i.is_thumbnail DESC, i.sort_order ASC LIMIT 1) AS product_thumb
      FROM banners b
      LEFT JOIN products p ON p.id = b.product_id
      LEFT JOIN brands br ON br.id = p.brand_id
      LEFT JOIN product_specs s ON s.product_id = p.id
      ${where}
      ORDER BY b.sort_order ASC, b.id ASC
    `);
    return rows;
  },

  async getById(id) {
    const numId = Number(id);
    if (!numId || isNaN(numId)) return null;
    await this.ensureTableAndSeed();
    const [rows] = await pool.query('SELECT * FROM banners WHERE id = ?', [numId]);
    return rows[0] || null;
  },

  async create(data) {
    await this.ensureTableAndSeed();
    const [res] = await pool.query(
      `INSERT INTO banners
        (title, highlight_text, subtitle, badge_text, badge_style, bg_theme,
         cta_text, cta_link, tab_title, tab_sub, image_url, product_id,
         custom_price, custom_old_price, specs_json, sort_order, is_active, autoplay_ms,
         image_mode, content_position, image_position, overlay_style)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.title || 'Banner chiến dịch mới',
        data.highlight_text || '',
        data.subtitle || '',
        data.badge_text || '🔥 Chiến dịch nổi bật',
        data.badge_style || 'blue',
        data.bg_theme || 'blue',
        data.cta_text || 'Khám phá ngay',
        data.cta_link || '#/products',
        data.tab_title || data.title || 'Chiến dịch',
        data.tab_sub || 'Ưu đãi hấp dẫn',
        data.image_url || '',
        data.product_id ? Number(data.product_id) : null,
        data.custom_price ? Number(data.custom_price) : null,
        data.custom_old_price ? Number(data.custom_old_price) : null,
        data.specs_json || '',
        Number(data.sort_order) || 1,
        data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1,
        Number(data.autoplay_ms) || 3000,
        data.image_mode || 'background',
        data.content_position || 'left',
        data.image_position || 'center center',
        data.overlay_style || 'gradient_dark',
      ],
    );
    return this.getById(res.insertId);
  },

  async update(id, data) {
    await this.ensureTableAndSeed();
    const existing = await this.getById(id);
    if (!existing) return null;

    await pool.query(
      `UPDATE banners SET
        title = ?,
        highlight_text = ?,
        subtitle = ?,
        badge_text = ?,
        badge_style = ?,
        bg_theme = ?,
        cta_text = ?,
        cta_link = ?,
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
        data.title ?? existing.title,
        data.highlight_text ?? existing.highlight_text,
        data.subtitle ?? existing.subtitle,
        data.badge_text ?? existing.badge_text,
        data.badge_style ?? existing.badge_style,
        data.bg_theme ?? existing.bg_theme,
        data.cta_text ?? existing.cta_text,
        data.cta_link ?? existing.cta_link,
        data.tab_title ?? existing.tab_title,
        data.tab_sub ?? existing.tab_sub,
        data.image_url ?? existing.image_url,
        data.product_id !== undefined ? (data.product_id ? Number(data.product_id) : null) : existing.product_id,
        data.custom_price !== undefined ? (data.custom_price ? Number(data.custom_price) : null) : existing.custom_price,
        data.custom_old_price !== undefined ? (data.custom_old_price ? Number(data.custom_old_price) : null) : existing.custom_old_price,
        data.specs_json ?? existing.specs_json,
        data.sort_order !== undefined ? Number(data.sort_order) : existing.sort_order,
        data.is_active !== undefined ? (data.is_active ? 1 : 0) : existing.is_active,
        data.autoplay_ms !== undefined ? Number(data.autoplay_ms) : existing.autoplay_ms,
        data.image_mode ?? existing.image_mode ?? 'background',
        data.content_position ?? existing.content_position ?? 'left',
        data.image_position ?? existing.image_position ?? 'center center',
        data.overlay_style ?? existing.overlay_style ?? 'gradient_dark',
        id,
      ],
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
