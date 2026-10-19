const { pool, withTransaction } = require('../config/db');
const { ApiError, toInt, escapeLike } = require('../utils/helpers');

/**
 * ClientModel — Tầng Model (MVC) quản lý truy vấn dữ liệu CSDL MySQL cho Storefront Laptop99
 */
const ClientModel = {
  async getActiveCategories() {
    const [rows] = await pool.query(`
      SELECT c.id, c.name, c.slug, c.description, c.image_url,
        (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.deleted_at IS NULL AND p.status = 'active') AS product_count
      FROM categories c
      WHERE c.status = 1
      ORDER BY c.sort_order ASC, c.id ASC
    `);
    return rows;
  },

  async getActiveBrands() {
    const [rows] = await pool.query(`
      SELECT id, name, slug, logo_url
      FROM brands
      WHERE status = 1
      ORDER BY sort_order ASC, id ASC
    `);
    return rows;
  },

  async getProducts(q = {}) {
    const where = ["p.deleted_at IS NULL AND p.status = 'active'"];
    const params = [];

    if (q.cat) {
      if (/^\d+$/.test(q.cat)) {
        where.push('p.category_id = ?');
        params.push(Number(q.cat));
      } else {
        where.push('(c.slug = ? OR c.name = ?)');
        params.push(q.cat, q.cat);
      }
    }

    if (q.brand) {
      if (/^\d+$/.test(q.brand)) {
        where.push('p.brand_id = ?');
        params.push(Number(q.brand));
      } else {
        where.push('(b.name = ? OR b.slug = ?)');
        params.push(q.brand, q.brand);
      }
    }

    if (q.price === 'u15') {
      where.push('COALESCE(p.sale_price, p.price) < 15000000');
    } else if (q.price === 'm1') {
      where.push('COALESCE(p.sale_price, p.price) >= 15000000 AND COALESCE(p.sale_price, p.price) < 25000000');
    } else if (q.price === 'm2') {
      where.push('COALESCE(p.sale_price, p.price) >= 25000000 AND COALESCE(p.sale_price, p.price) < 40000000');
    } else if (q.price === 'o40') {
      where.push('COALESCE(p.sale_price, p.price) >= 40000000');
    }

    if (q.ram) {
      if (q.ram === '32') {
        where.push('s.ram_gb >= 32');
      } else if (toInt(q.ram)) {
        where.push('s.ram_gb = ?');
        params.push(toInt(q.ram));
      }
    }

    if (q.q) {
      const s = `%${escapeLike(String(q.q).trim())}%`;
      where.push('(p.name LIKE ? OR b.name LIKE ? OR c.name LIKE ? OR p.sku LIKE ? OR p.model_name LIKE ? OR s.cpu_model LIKE ? OR s.gpu_model LIKE ?)');
      params.push(s, s, s, s, s, s, s);
    }

    let orderBy = 'p.sold_count DESC, p.id DESC';
    if (q.sort === 'new') {
      orderBy = 'p.id DESC';
    } else if (q.sort === 'asc') {
      orderBy = 'COALESCE(p.sale_price, p.price) ASC';
    } else if (q.sort === 'desc') {
      orderBy = 'COALESCE(p.sale_price, p.price) DESC';
    } else if (q.sort === 'pop') {
      orderBy = 'p.sold_count DESC, p.id DESC';
    }

    const limit = Math.min(100, Math.max(1, toInt(q.limit) || 100));

    const sql = `
      SELECT
        p.id, p.sku, p.name, p.slug, p.model_name,
        b.id AS brand_id, b.name AS brand,
        c.id AS category_id, c.name AS category, c.slug AS category_slug,
        p.price, p.sale_price, COALESCE(p.sale_price, p.price) AS final_price,
        p.stock_quantity, p.warranty_months, p.short_description, p.description,
        p.sold_count, p.view_count, p.is_bestseller, p.is_new,
        s.cpu_model, s.cpu_brand, s.ram_gb, s.ram_type, s.storage_gb, s.storage_type,
        s.gpu_model, s.gpu_type, s.screen_size_inch, s.screen_resolution, s.refresh_rate_hz,
        s.weight_kg,
        (SELECT i.url FROM product_images i WHERE i.product_id = p.id ORDER BY i.is_thumbnail DESC, i.sort_order ASC LIMIT 1) AS thumbnail,
        (SELECT COALESCE(AVG(pr.rating), 5.0) FROM product_reviews pr WHERE pr.product_id = p.id AND pr.status != 'hidden') AS avg_rating,
        (SELECT COUNT(*) FROM product_reviews pr WHERE pr.product_id = p.id AND pr.status != 'hidden') AS review_count
      FROM products p
      JOIN brands b ON b.id = p.brand_id
      JOIN categories c ON c.id = p.category_id
      LEFT JOIN product_specs s ON s.product_id = p.id
      WHERE ${where.join(' AND ')}
      ORDER BY ${orderBy}
      LIMIT ?
    `;
    params.push(limit);

    const [rows] = await pool.query(sql, params);
    return rows;
  },

  async getProductDetail(idOrSlug) {
    const isId = /^\d+$/.test(idOrSlug);
    const [prods] = await pool.query(
      `
      SELECT
        p.id, p.sku, p.name, p.slug, p.model_name,
        b.id AS brand_id, b.name AS brand,
        c.id AS category_id, c.name AS category, c.slug AS category_slug,
        p.price, p.sale_price, COALESCE(p.sale_price, p.price) AS final_price,
        p.stock_quantity, p.warranty_months, p.short_description, p.description,
        p.sold_count, p.view_count,
        s.cpu_model, s.cpu_brand, s.cpu_cores, s.cpu_threads,
        s.ram_gb, s.ram_type, s.ram_max_gb,
        s.storage_gb, s.storage_type,
        s.gpu_model, s.gpu_type, s.vram_gb,
        s.screen_size_inch, s.screen_resolution, s.screen_panel, s.refresh_rate_hz, s.touchscreen,
        s.battery_wh, s.charger_w, s.wifi, s.bluetooth, s.ports, s.os, s.keyboard, s.webcam,
        s.fingerprint, s.weight_kg, s.dimensions, s.color, s.material
      FROM products p
      JOIN brands b ON b.id = p.brand_id
      JOIN categories c ON c.id = p.category_id
      LEFT JOIN product_specs s ON s.product_id = p.id
      WHERE ${isId ? 'p.id = ?' : 'p.slug = ?'} AND p.deleted_at IS NULL
    `,
      [isId ? Number(idOrSlug) : idOrSlug],
    );

    const product = prods[0];
    if (!product) return null;

    pool.query('UPDATE products SET view_count = view_count + 1 WHERE id = ?', [product.id]).catch(() => {});

    const [images] = await pool.query(
      'SELECT id, url, alt_text, is_thumbnail FROM product_images WHERE product_id = ? ORDER BY is_thumbnail DESC, sort_order ASC',
      [product.id],
    );

    const [reviews] = await pool.query(
      `SELECT id, customer_name, rating, title, comment, verified_purchase, admin_reply, replied_at, created_at
       FROM product_reviews
       WHERE product_id = ? AND status != 'hidden'
       ORDER BY created_at DESC`,
      [product.id],
    );

    return {
      ...product,
      images,
      reviews,
    };
  },

  async findCustomerById(id) {
    const [rows] = await pool.query(
      'SELECT id, code, full_name, email, phone, address, tier FROM customers WHERE id = ?',
      [id],
    );
    return rows[0] || null;
  },

  async findCustomerByEmail(email) {
    const [rows] = await pool.query(
      'SELECT id, code, full_name, email, phone, address, password_hash, tier FROM customers WHERE email = ?',
      [email],
    );
    return rows[0] || null;
  },

  async findCustomerByEmailOrPhone(identifier) {
    const clean = String(identifier || '').trim();
    if (!clean) return null;
    const [rows] = await pool.query(
      'SELECT id, code, full_name, email, phone, address, password_hash, tier FROM customers WHERE LOWER(email) = ? OR phone = ? LIMIT 1',
      [clean.toLowerCase(), clean],
    );
    return rows[0] || null;
  },

  async createCustomer({ name, email, phone, address, passwordHash }) {
    const [[maxRow]] = await pool.query('SELECT COALESCE(MAX(id), 0) AS max_id FROM customers');
    const code = `CUST-${1001 + Number(maxRow.max_id)}`;

    const [result] = await pool.query(`
      INSERT INTO customers (code, full_name, phone, address, email, password_hash, tier)
      VALUES (?, ?, ?, ?, ?, ?, 'Khách mới')
    `, [code, name, phone, address || '', email, passwordHash]);

    return {
      id: result.insertId,
      code,
      name,
      email,
      phone,
      address: address || '',
      tier: 'Khách mới',
    };
  },

  async updateCustomerProfile(customerId, { name, phone, address }) {
    const updates = [];
    const params = [];

    if (name && typeof name === 'string' && name.trim().length >= 2) {
      updates.push('full_name = ?');
      params.push(name.trim());
    }
    if (phone && /^0\d{9}$/.test(phone)) {
      updates.push('phone = ?');
      params.push(phone.trim());
    }
    if (typeof address === 'string') {
      updates.push('address = ?');
      params.push(address.trim());
    }

    if (updates.length > 0) {
      params.push(customerId);
      await pool.query(`UPDATE customers SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    return this.findCustomerById(customerId);
  },

  async updateCustomerPassword(customerId, passwordHash) {
    await pool.query('UPDATE customers SET password_hash = ? WHERE id = ?', [passwordHash, customerId]);
    return this.findCustomerById(customerId);
  },

  async confirmCustomerOrderPayment(customerId, orderCode, bankInfo = '') {
    const [[order]] = await pool.query(
      'SELECT id, code, total_amount, status, payment_status, notes FROM orders WHERE code = ? AND customer_id = ?',
      [orderCode, customerId],
    );
    if (!order) throw new ApiError(404, 'Không tìm thấy đơn hàng');
    const updatedNote = [order.notes, bankInfo ? `[Đã xác nhận CK VietQR: ${bankInfo}]` : '[Đã thanh toán VietQR]']
      .filter(Boolean)
      .join(' | ');
    await pool.query(
      'UPDATE orders SET payment_status = "paid", net_received = total_amount, notes = ? WHERE id = ?',
      [updatedNote, order.id],
    );
    return { code: order.code, payment_status: 'paid' };
  },

  async createOrder(customer, body) {
    return withTransaction(async (conn) => {
      let subtotal = 0;
      const itemsDetailed = [];

      for (const item of body.items) {
        const [[prod]] = await conn.query(
          'SELECT id, sku, name, price, sale_price, stock_quantity, warranty_months FROM products WHERE id = ? AND deleted_at IS NULL FOR UPDATE',
          [item.pid],
        );

        if (!prod) {
          throw new ApiError(400, `Sản phẩm mã #${item.pid} không tồn tại`);
        }
        if (prod.stock_quantity < item.qty) {
          throw new ApiError(400, `Sản phẩm "${prod.name}" chỉ còn ${prod.stock_quantity} máy trong kho`);
        }

        const unitPrice = prod.sale_price ? Number(prod.sale_price) : Number(prod.price);
        const lineTotal = unitPrice * item.qty;
        subtotal += lineTotal;

        const serials = [];
        for (let k = 0; k < item.qty; k++) {
          serials.push(`${prod.sku}-${Math.floor(100000 + Math.random() * 900000)}`);
        }

        itemsDetailed.push({
          pid: prod.id,
          sku: prod.sku,
          name: prod.name,
          qty: item.qty,
          unit_price: unitPrice,
          line_total: lineTotal,
          warranty_months: prod.warranty_months,
          serials,
        });

        const stockBefore = prod.stock_quantity;
        const stockAfter = stockBefore - item.qty;
        await conn.query(
          'UPDATE products SET stock_quantity = ?, sold_count = sold_count + ? WHERE id = ?',
          [stockAfter, item.qty, prod.id],
        );

        await conn.query(`
          INSERT INTO inventory_movements (product_id, type, quantity, stock_before, stock_after, reason)
          VALUES (?, 'export', ?, ?, ?, ?)
        `, [prod.id, -item.qty, stockBefore, stockAfter, `Đơn hàng trực tuyến của ${customer.full_name}`]);
      }

      let discount = 0;
      let couponApplied = null;
      if (body.coupon) {
        const [[promo]] = await conn.query(
          'SELECT * FROM promotions WHERE code = ? AND status = "active" AND start_date <= CURDATE() AND end_date >= CURDATE()',
          [body.coupon.toUpperCase()],
        );

        if (promo && subtotal >= Number(promo.min_order_value)) {
          if (promo.type === 'percent') {
            const rawDisc = Math.round((subtotal * Number(promo.discount_value)) / 100);
            discount = Math.min(rawDisc, 2000000);
          } else {
            discount = Number(promo.discount_value);
          }
          couponApplied = promo.code;
          await conn.query('UPDATE promotions SET used_count = used_count + 1 WHERE id = ?', [promo.id]);
        }
      }

      const totalAmount = Math.max(0, subtotal - discount);

      const [[maxOrder]] = await conn.query('SELECT COALESCE(MAX(id), 0) AS max_id FROM orders');
      const orderNumber = Number(maxOrder.max_id) + 1;
      const orderCode = `DH-2026-${String(orderNumber).padStart(4, '0')}`;

      const payMap = {
        cod: 'COD (Thu hộ)',
        bank: 'Chuyển khoản VietQR',
        card: 'Thanh toán Online QR',
        installment: 'Trả góp 0%',
      };
      const paymentMethodLabel = payMap[body.payment_method] || body.payment_method;

      const firstItem = itemsDetailed[0];
      const allSerials = itemsDetailed.flatMap((i) => i.serials).join(', ');

      const [orderResult] = await conn.query(`
        INSERT INTO orders
          (code, customer_id, customer_name, customer_phone, shipping_address,
           product_id, product_name, sku, serial_number, quantity,
           unit_price, total_amount, discount_amount, coupon_code,
           payment_method, payment_status, net_received, status, branch, notes, items_json)
        VALUES
          (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, 'pending', 'Toàn hệ thống (HQ)', ?, ?)
      `, [
        orderCode, customer.id, body.name, body.phone, body.address,
        firstItem.pid,
        itemsDetailed.length > 1 ? `${firstItem.name} (+${itemsDetailed.length - 1} sp)` : firstItem.name,
        firstItem.sku,
        allSerials,
        body.items.reduce((s, i) => s + i.qty, 0),
        firstItem.unit_price,
        totalAmount,
        discount,
        couponApplied,
        paymentMethodLabel,
        totalAmount,
        body.note || null,
        JSON.stringify(itemsDetailed),
      ]);

      // Đồng bộ thực tế order_count, total_spent và tier cho khách hàng
      const [[custStats]] = await conn.query(`
        SELECT COUNT(*) AS cnt, COALESCE(SUM(total_amount), 0) AS spent
        FROM orders
        WHERE customer_id = ? AND status != 'cancelled'
      `, [customer.id]);
      const spent = Number(custStats.spent || 0);
      const tier = spent >= 100000000 ? 'VIP' : spent >= 50000000 ? 'Thân thiết' : 'Khách mới';

      await conn.query(
        'UPDATE customers SET phone = COALESCE(phone, ?), address = COALESCE(NULLIF(address, ""), ?), order_count = ?, total_spent = ?, tier = ? WHERE id = ?',
        [body.phone, body.address, Number(custStats.cnt || 0), spent, tier, customer.id],
      );

      return {
        orderId: orderResult.insertId,
        orderCode,
        subtotal,
        discount,
        totalAmount,
        serial_number: allSerials,
        items: itemsDetailed,
        pay: body.payment_method,
      };
    });
  },

  async getOrdersByCustomer(customerId) {
    const [rows] = await pool.query(
      'SELECT * FROM orders WHERE customer_id = ? ORDER BY ordered_at DESC',
      [customerId],
    );
    return rows;
  },

  async cancelCustomerOrder(customerId, orderCode) {
    return withTransaction(async (conn) => {
      const [[order]] = await conn.query(
        'SELECT * FROM orders WHERE code = ? AND customer_id = ? FOR UPDATE',
        [orderCode, customerId],
      );

      if (!order) throw new ApiError(404, 'Không tìm thấy đơn hàng');
      if (order.status !== 'pending') {
        throw new ApiError(400, 'Chỉ có thể hủy đơn hàng đang ở trạng thái Chờ xác nhận');
      }

      await conn.query('UPDATE orders SET status = "cancelled" WHERE id = ?', [order.id]);

      let items = [];
      try {
        items = typeof order.items_json === 'string' ? JSON.parse(order.items_json) : (order.items_json || []);
      } catch {}

      if (items.length > 0) {
        for (const it of items) {
          await conn.query(
            'UPDATE products SET stock_quantity = stock_quantity + ?, sold_count = GREATEST(0, sold_count - ?) WHERE id = ?',
            [it.qty, it.qty, it.pid],
          );
          await conn.query(`
            INSERT INTO inventory_movements (product_id, type, quantity, stock_before, stock_after, reason)
            VALUES (?, 'return', ?, 0, 0, ?)
          `, [it.pid, it.qty, `Khách hủy đơn hàng ${orderCode}`]);
        }
      } else if (order.product_id) {
        await conn.query(
          'UPDATE products SET stock_quantity = stock_quantity + ?, sold_count = GREATEST(0, sold_count - ?) WHERE id = ?',
          [order.quantity, order.quantity, order.product_id],
        );
      }

      const [[custStats]] = await conn.query(`
        SELECT COUNT(*) AS cnt, COALESCE(SUM(total_amount), 0) AS spent
        FROM orders
        WHERE customer_id = ? AND status != 'cancelled'
      `, [customerId]);
      const spent = Number(custStats.spent || 0);
      const tier = spent >= 100000000 ? 'VIP' : spent >= 50000000 ? 'Thân thiết' : 'Khách mới';
      await conn.query(
        'UPDATE customers SET order_count = ?, total_spent = ?, tier = ? WHERE id = ?',
        [Number(custStats.cnt || 0), spent, tier, customerId],
      );
    });
  },

  async findOrderBySerial(sn) {
    const [orders] = await pool.query(`
      SELECT o.code, o.ordered_at, o.customer_name, o.serial_number, o.items_json,
             p.name AS product_name, p.sku, p.warranty_months, p.id AS product_id
      FROM orders o
      LEFT JOIN products p ON p.id = o.product_id
      WHERE (o.serial_number LIKE ? OR o.items_json LIKE ?)
        AND o.status != 'cancelled'
      ORDER BY o.ordered_at DESC
      LIMIT 1
    `, [`%${sn}%`, `%${sn}%`]);
    return orders[0] || null;
  },

  async getActivePromotions() {
    const [rows] = await pool.query(`
      SELECT id, code, title, type, discount_value, min_order_value, target_category, start_date, end_date, status
      FROM promotions
      WHERE status = 'active' AND end_date >= CURDATE()
      ORDER BY id ASC
    `);
    return rows;
  },

  async findActivePromotionByCode(code) {
    const [[promo]] = await pool.query(
      'SELECT * FROM promotions WHERE code = ? AND status = "active" AND start_date <= CURDATE() AND end_date >= CURDATE()',
      [code],
    );
    return promo || null;
  },

  async createProductReview(customer, { productId, rating, title, comment }) {
    const [[prod]] = await pool.query('SELECT name FROM products WHERE id = ?', [productId]);
    if (!prod) throw new ApiError(404, 'Không tìm thấy sản phẩm');

    await pool.query(`
      INSERT INTO product_reviews
        (customer_id, customer_name, product_id, product_name, rating, title, comment, status, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 'customer')
    `, [
      customer.id,
      customer.full_name,
      productId,
      prod.name,
      rating,
      title || 'Đánh giá từ khách hàng',
      comment,
    ]);
  },

  async createTradeInRequest(customer, { brand, model, year, ram, condition_desc, estimated_price }) {
    const [[maxRow]] = await pool.query('SELECT COALESCE(MAX(id), 0) AS max_id FROM trade_ins');
    const code = `TC-${String(Number(maxRow.max_id) + 1).padStart(3, '0')}`;

    await pool.query(`
      INSERT INTO trade_ins
        (code, customer_id, customer_name, customer_phone, brand, model, year, ram, condition_desc, estimated_price, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Chờ định giá')
    `, [
      code,
      customer.id,
      customer.full_name,
      customer.phone,
      brand || 'Khác',
      model.trim(),
      Number(year) || 2021,
      Number(ram) || 8,
      condition_desc || 'Tốt',
      Number(estimated_price) || 0,
    ]);
    return code;
  },

  async getTradeInsByCustomer(customerId) {
    const [rows] = await pool.query(
      'SELECT * FROM trade_ins WHERE customer_id = ? ORDER BY created_at DESC',
      [customerId],
    );
    return rows;
  },

  async createRmaRequest(customer, { order_code, product_id, type, reason }) {
    const pid = Number(String(product_id).replace(/^p/, ''));
    const [[prod]] = await pool.query('SELECT name FROM products WHERE id = ?', [pid]);

    const [[maxRow]] = await pool.query('SELECT COALESCE(MAX(id), 0) AS max_id FROM rmas');
    const code = `RMA-${String(Number(maxRow.max_id) + 1).padStart(3, '0')}`;

    await pool.query(`
      INSERT INTO rmas
        (code, order_code, product_id, product_name, customer_id, type, reason, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Chờ duyệt')
    `, [
      code,
      order_code,
      pid,
      prod ? prod.name : 'Sản phẩm',
      customer.id,
      type || 'Đổi',
      reason.trim(),
    ]);
    return code;
  },

  async getRmasByCustomer(customerId) {
    const [rows] = await pool.query(
      'SELECT * FROM rmas WHERE customer_id = ? ORDER BY created_at DESC',
      [customerId],
    );
    return rows;
  },

  async getPublishedNews() {
    const [rows] = await pool.query(`
      SELECT id, title, tag, source_name, external_url, image_url, body, is_published, created_at
      FROM news
      WHERE is_published = 1
      ORDER BY created_at DESC
    `);
    return rows;
  },
};

module.exports = ClientModel;

