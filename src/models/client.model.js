const { pool, withTransaction } = require('../config/db');
const { ApiError, generateUniqueCode, addCalendarMonths } = require('../utils/helpers');
const OrderModel = require('./order.model');
const OrderService = require('../services/order.service');

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
        where.push('(b.slug = ? OR b.name = ?)');
        params.push(q.brand, q.brand);
      }
    }

    const searchKeyword = q.q || q.search || q.keyword;
    if (searchKeyword && String(searchKeyword).trim()) {
      where.push('(p.name LIKE ? OR p.sku LIKE ? OR p.model_name LIKE ? OR b.name LIKE ?)');
      const kw = `%${String(searchKeyword).trim()}%`;
      params.push(kw, kw, kw, kw);
    }

    if (q.price) {
      const pKey = String(q.price).toLowerCase();
      if (pKey === 'u15' || pKey === 'under15') {
        where.push('COALESCE(p.sale_price, p.price) < 15000000');
      } else if (pKey === 'm1' || pKey === '15to25') {
        where.push('COALESCE(p.sale_price, p.price) BETWEEN 15000000 AND 25000000');
      } else if (pKey === 'm2' || pKey === '25to40' || pKey === '25to35') {
        where.push('COALESCE(p.sale_price, p.price) BETWEEN 25000000 AND 40000000');
      } else if (pKey === 'o40' || pKey === 'over40' || pKey === 'over35' || pKey === 'm4') {
        where.push('COALESCE(p.sale_price, p.price) > 40000000');
      } else if (pKey === 'm3') {
        where.push('COALESCE(p.sale_price, p.price) BETWEEN 25000000 AND 40000000');
      }
    }

    if (q.cpu) {
      where.push('(s.cpu_model LIKE ? OR s.cpu_brand LIKE ?)');
      params.push(`%${q.cpu}%`, `%${q.cpu}%`);
    }

    if (q.ram) {
      const ramNum = Number(String(q.ram).replace(/gb/i, '').trim());
      if (ramNum) {
        where.push('s.ram_gb = ?');
        params.push(ramNum);
      }
    }

    if (q.ssd) {
      const ssdNum = Number(String(q.ssd).replace(/gb/i, '').trim());
      if (ssdNum) {
        where.push('s.storage_gb = ?');
        params.push(ssdNum);
      }
    }

    if (q.gpu) {
      where.push('s.gpu_model LIKE ?');
      params.push(`%${q.gpu}%`);
    }

    if (q.featured) where.push('p.is_featured = 1');
    if (q.bestseller) where.push('p.is_bestseller = 1');
    if (q.new) where.push('p.is_new = 1');

    let orderBy = 'p.sort_order ASC, p.id DESC';
    if (q.sort === 'price_asc' || q.sort === 'asc') orderBy = 'final_price ASC';
    else if (q.sort === 'price_desc' || q.sort === 'desc') orderBy = 'final_price DESC';
    else if (q.sort === 'newest') orderBy = 'p.id DESC';
    else if (q.sort === 'popular') orderBy = 'p.view_count DESC';
    else if (q.sort === 'bestseller') orderBy = 'p.sold_count DESC';

    const limit = Math.min(200, Math.max(1, Number(q.limit) || 40));

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
        (SELECT ROUND(AVG(pr.rating), 1) FROM product_reviews pr WHERE pr.product_id = p.id AND pr.status = 'approved') AS avg_rating,
        (SELECT COUNT(*) FROM product_reviews pr WHERE pr.product_id = p.id AND pr.status = 'approved') AS review_count
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
        s.battery_wh, s.weight_kg, s.color, s.material, s.os,
        (SELECT ROUND(AVG(pr.rating), 1) FROM product_reviews pr WHERE pr.product_id = p.id AND pr.status = 'approved') AS avg_rating,
        (SELECT COUNT(*) FROM product_reviews pr WHERE pr.product_id = p.id AND pr.status = 'approved') AS review_count
      FROM products p
      JOIN brands b ON b.id = p.brand_id
      JOIN categories c ON c.id = p.category_id
      LEFT JOIN product_specs s ON s.product_id = p.id
      WHERE ${isId ? 'p.id = ?' : 'p.slug = ?'} AND p.deleted_at IS NULL AND p.status = 'active'
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
       WHERE product_id = ? AND status = 'approved'
       ORDER BY created_at DESC`,
      [product.id],
    );

    return {
      ...product,
      images,
      reviews,
    };
  },

  async createCustomer(data) {
    const code = await generateUniqueCode(pool, 'customers', 'KH', 4);
    const [result] = await pool.query(
      `INSERT INTO customers (code, full_name, email, phone, address, password_hash, tier)
       VALUES (?, ?, ?, ?, ?, ?, 'Khách mới')`,
      [code, data.name, data.email, data.phone || null, data.address || null, data.passwordHash],
    );
    return this.findCustomerById(result.insertId);
  },

  async findCustomerById(id) {
    const [rows] = await pool.query(
      'SELECT id, code, full_name, email, phone, address, tier, total_spent, order_count, failed_logins, locked_until FROM customers WHERE id = ?',
      [id],
    );
    return rows[0] || null;
  },

  async findCustomerByEmail(email) {
    const [rows] = await pool.query(
      'SELECT id, code, full_name, email, phone, address, password_hash, tier, failed_logins, locked_until FROM customers WHERE email = ?',
      [email],
    );
    return rows[0] || null;
  },

  async findCustomerByEmailOrPhone(identifier) {
    const [rows] = await pool.query(
      'SELECT id, code, full_name, email, phone, address, password_hash, tier, failed_logins, locked_until FROM customers WHERE email = ? OR phone = ? LIMIT 1',
      [identifier, identifier],
    );
    return rows[0] || null;
  },

  async findCustomerByPhoneExcludingId(phone, customerId) {
    const [rows] = await pool.query(
      'SELECT id, email, phone FROM customers WHERE phone = ? AND id != ? LIMIT 1',
      [phone, customerId],
    );
    return rows[0] || null;
  },

  async recordFailedLogin(customerId, currentFailedLogins = 0) {
    const nextFailed = (Number(currentFailedLogins) || 0) + 1;
    let lockedUntil = null;
    if (nextFailed >= 5) {
      lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // Khoá tài khoản 15 phút chống dò mật khẩu brute-force
    }
    await pool.query(
      'UPDATE customers SET failed_logins = ?, locked_until = ? WHERE id = ?',
      [nextFailed, lockedUntil, customerId]
    );
    return { nextFailed, lockedUntil };
  },

  async resetLoginSuccess(customerId) {
    await pool.query(
      'UPDATE customers SET failed_logins = 0, locked_until = NULL WHERE id = ?',
      [customerId]
    );
  },

  async updateCustomerProfile(customerId, { name, phone, address }) {
    await pool.query(
      'UPDATE customers SET full_name = COALESCE(?, full_name), phone = COALESCE(?, phone), address = COALESCE(?, address) WHERE id = ?',
      [name || null, phone || null, address || null, customerId],
    );
    return this.findCustomerById(customerId);
  },

  async updateCustomerPassword(customerId, passwordHash) {
    await pool.query('UPDATE customers SET password_hash = ? WHERE id = ?', [passwordHash, customerId]);
    return this.findCustomerById(customerId);
  },

  /**
   * Khách bấm "Tôi đã chuyển khoản": CHỈ gửi thông báo chờ đối soát, không tự động đánh dấu paid
   */
  async confirmCustomerOrderPayment(customerId, orderCode, bankInfo = '') {
    const [[order]] = await pool.query(
      'SELECT id, code, total_amount, status, payment_status, notes FROM orders WHERE code = ? AND customer_id = ?',
      [orderCode, customerId],
    );
    if (!order) throw new ApiError(404, 'Không tìm thấy đơn hàng của bạn');

    if (order.status === 'cancelled') {
      throw new ApiError(400, 'Đơn hàng này đã bị hủy, không thể xác nhận chuyển khoản');
    }

    if (order.payment_status === 'paid') {
      throw new ApiError(400, 'Đơn hàng này đã được xác nhận thanh toán trước đó');
    }

    const updatedNote = [
      order.notes,
      bankInfo ? `[Khách gửi xác nhận CK VietQR: ${bankInfo} - Chờ kế toán đối soát]` : '[Khách báo đã quét VietQR - Chờ kế toán đối soát]'
    ].filter(Boolean).join(' | ');

    await pool.query(
      "UPDATE orders SET payment_verification_status = 'pending_verification', notes = ? WHERE id = ?",
      [updatedNote, order.id],
    );

    return {
      code: order.code,
      payment_status: order.payment_status,
      verification_status: 'pending_verification',
      message: 'Đã gửi thông tin chuyển khoản tới hệ thống. Kế toán sẽ đối soát giao dịch ngân hàng và xác nhận trong 15-30 phút.',
    };
  },

  /**
   * Tạo đơn hàng trực tuyến an toàn: Khóa tồn kho, đối soát mã giảm giá, khấu trừ phiếu thu cũ chuẩn backend
   */
  async createOrder(customer, body) {
    return withTransaction(async (conn) => {
      let subtotal = 0;
      const itemsDetailed = [];

      for (const item of body.items) {
        const [[prod]] = await conn.query(
          'SELECT id, sku, name, price, sale_price, stock_quantity, warranty_months, status, deleted_at, category_id FROM products WHERE id = ? FOR UPDATE',
          [item.pid],
        );

        if (!prod || prod.deleted_at || prod.status !== 'active') {
          throw new ApiError(400, `Sản phẩm "${prod ? prod.name : item.pid}" hiện không khả dụng để đặt hàng`);
        }
        if (prod.stock_quantity < item.qty) {
          throw new ApiError(400, `Sản phẩm "${prod.name}" chỉ còn ${prod.stock_quantity} máy trong kho (yêu cầu ${item.qty})`);
        }

        const unitPrice = prod.sale_price ? Number(prod.sale_price) : Number(prod.price);
        const lineTotal = unitPrice * item.qty;
        subtotal += lineTotal;

        itemsDetailed.push({
          pid: prod.id,
          category_id: prod.category_id,
          sku: prod.sku,
          name: prod.name,
          qty: item.qty,
          unit_price: unitPrice,
          line_total: lineTotal,
          warranty_months: prod.warranty_months,
          serials: ['CHỜ XUẤT KHO'],
        });

        const stockBefore = Number(prod.stock_quantity);
        const stockAfter = stockBefore - item.qty;
        await conn.query(
          'UPDATE products SET stock_quantity = ?, sold_count = sold_count + ? WHERE id = ?',
          [stockAfter, item.qty, prod.id],
        );

        await conn.query(`
          INSERT INTO inventory_movements (product_id, type, quantity, stock_before, stock_after, reason)
          VALUES (?, 'export', ?, ?, ?, ?)
        `, [prod.id, -item.qty, stockBefore, stockAfter, `Đơn hàng trực tuyến của khách: ${customer.full_name}`]);
      }

      // 1. Kiểm tra và áp dụng mã khuyến mãi chặt chẽ
      let discount = 0;
      let couponApplied = null;
      if (body.coupon) {
        const couponCode = String(body.coupon).trim().toUpperCase();
        const [[promo]] = await conn.query(
          'SELECT * FROM promotions WHERE code = ? FOR UPDATE',
          [couponCode],
        );

        if (!promo || promo.status !== 'active') {
          throw new ApiError(400, `Mã khuyến mãi "${couponCode}" không tồn tại hoặc đã ngừng hoạt động`);
        }

        const today = new Date().toISOString().slice(0, 10);
        if (promo.start_date && promo.start_date > today) {
          throw new ApiError(400, `Chương trình khuyến mãi chưa bắt đầu (hiệu lực từ ${promo.start_date})`);
        }
        if (promo.end_date && promo.end_date < today) {
          throw new ApiError(400, `Mã khuyến mãi "${couponCode}" đã hết hạn sử dụng`);
        }
        if (promo.max_uses > 0 && promo.used_count >= promo.max_uses) {
          throw new ApiError(400, `Mã khuyến mãi "${couponCode}" đã hết lượt sử dụng`);
        }
        if (subtotal < Number(promo.min_order_value || 0)) {
          throw new ApiError(400, `Đơn hàng chưa đạt giá trị tối thiểu ${new Intl.NumberFormat('vi-VN').format(promo.min_order_value)}đ để áp dụng mã`);
        }

        // Kiểm tra target_category nếu có
        let eligibleSubtotal = subtotal;
        if (promo.target_category) {
          const eligibleItems = itemsDetailed.filter((it) => {
            return String(it.category_id) === String(promo.target_category) ||
                   String(it.name).toLowerCase().includes(promo.target_category.toLowerCase());
          });
          if (!eligibleItems.length) {
            throw new ApiError(400, `Mã khuyến mãi này chỉ áp dụng cho danh mục: ${promo.target_category}`);
          }
          eligibleSubtotal = eligibleItems.reduce((sum, it) => sum + it.line_total, 0);
        }

        if (promo.type === 'percent') {
          const rawDisc = Math.round((eligibleSubtotal * Number(promo.discount_value)) / 100);
          discount = Math.min(rawDisc, 2000000);
        } else {
          discount = Math.min(eligibleSubtotal, Number(promo.discount_value));
        }

        couponApplied = promo.code;
        await conn.query('UPDATE promotions SET used_count = used_count + 1 WHERE id = ?', [promo.id]);
      }

      // 2. Kiểm tra và áp dụng phiếu thu cũ đổi mới (Trade-In)
      let tradeInId = null;
      let tradeInDiscount = 0;
      if (body.trade_in_id) {
        const tiId = Number(body.trade_in_id);
        const [[ti]] = await conn.query('SELECT * FROM trade_ins WHERE id = ? FOR UPDATE', [tiId]);
        if (!ti) throw new ApiError(404, 'Không tìm thấy phiếu thẩm định thu cũ');
        if (ti.customer_id !== customer.id) {
          throw new ApiError(403, 'Phiếu thu cũ không thuộc quyền sở hữu của bạn');
        }
        if (ti.used_in_order_id) {
          throw new ApiError(400, 'Phiếu thu cũ này đã được sử dụng cho một đơn hàng khác');
        }
        if (ti.status !== 'Đã định giá' && ti.status !== 'Đã chấp nhận') {
          throw new ApiError(400, `Phiếu thu cũ đang ở trạng thái "${ti.status}", chưa thể áp dụng trừ tiền`);
        }

        tradeInDiscount = Number(ti.final_price || ti.estimated_price || 0);
        tradeInId = ti.id;
      }

      // Tính tổng tiền sau mọi khoản giảm trừ
      const totalAmount = Math.max(0, subtotal - discount - tradeInDiscount);

      // 3. Sinh mã đơn hàng an toàn chống trùng (không hardcode năm 2026)
      const orderCode = await generateUniqueCode(conn, 'orders', 'DH');

      const payMap = {
        cod: 'COD (Thu hộ)',
        bank: 'Chuyển khoản VietQR',
        card: 'Thanh toán Online QR',
        installment: 'Trả góp 0%',
      };
      const paymentMethodLabel = payMap[body.payment_method] || body.payment_method;
      const firstItem = itemsDetailed[0];

      // Ghi nhận đơn hàng: Mới tạo chưa thu tiền => net_received = 0
      const [orderResult] = await conn.query(`
        INSERT INTO orders
          (code, customer_id, customer_name, customer_phone, shipping_address,
           product_id, product_name, sku, serial_number, quantity,
           unit_price, total_amount, discount_amount, coupon_code,
           trade_in_id, trade_in_discount,
           payment_method, payment_status, net_received, status, branch, notes, items_json)
        VALUES
          (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unpaid', 0, 'pending', 'Toàn hệ thống (HQ)', ?, ?)
      `, [
        orderCode, customer.id, body.name, body.phone, body.address,
        firstItem.pid,
        itemsDetailed.length > 1 ? `${firstItem.name} (+${itemsDetailed.length - 1} sp)` : firstItem.name,
        firstItem.sku,
        'CHỜ XUẤT KHO',
        body.items.reduce((s, i) => s + i.qty, 0),
        firstItem.unit_price,
        totalAmount,
        discount,
        couponApplied,
        tradeInId,
        tradeInDiscount,
        paymentMethodLabel,
        body.note || null,
        JSON.stringify(itemsDetailed),
      ]);

      const newOrderId = orderResult.insertId;

      // Đánh dấu phiếu thu cũ đã dùng
      if (tradeInId) {
        await conn.query(
          "UPDATE trade_ins SET status = 'Đã dùng', used_in_order_id = ? WHERE id = ?",
          [newOrderId, tradeInId]
        );
      }

      // Cập nhật số điện thoại & địa chỉ khách nếu chưa có
      await conn.query(
        'UPDATE customers SET phone = COALESCE(phone, ?), address = COALESCE(NULLIF(address, ""), ?) WHERE id = ?',
        [body.phone, body.address, customer.id],
      );

      return {
        orderId: newOrderId,
        orderCode,
        id: newOrderId,
        code: orderCode,
        subtotal,
        discount,
        tradeInDiscount,
        total: totalAmount,
        totalAmount,
        serial_number: 'CHỜ XUẤT KHO',
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
        'SELECT id FROM orders WHERE code = ? AND customer_id = ? FOR UPDATE',
        [orderCode, customerId],
      );
      if (!order) throw new ApiError(404, 'Không tìm thấy đơn hàng của bạn');
      return OrderService.cancelOrder(conn, {
        orderId: order.id,
        reason: 'Khách hàng tự hủy trên website',
        cancelledBy: customerId,
        isCustomer: true,
      });
    });
  },

  /**
   * Tra cứu bảo hành chính xác theo S/N: Chỉ đơn đã giao thành công (delivered) mới có hiệu lực
   */
  async findOrderBySerial(sn) {
    const cleanSn = String(sn || '').trim();
    if (!cleanSn) return null;

    const [orders] = await pool.query(`
      SELECT o.code, o.ordered_at, o.delivered_at, o.customer_name, o.serial_number, o.items_json, o.status,
             p.name AS product_name, p.sku, p.warranty_months, p.id AS product_id
      FROM orders o
      LEFT JOIN products p ON p.id = o.product_id
      WHERE (o.serial_number = ? OR JSON_CONTAINS(o.items_json, JSON_QUOTE(?), '$[*].serials'))
        AND o.status = 'delivered'
      ORDER BY o.ordered_at DESC
      LIMIT 1
    `, [cleanSn, cleanSn]);

    return orders[0] || null;
  },

  async getActivePromotions() {
    const today = new Date().toISOString().slice(0, 10);
    const [rows] = await pool.query(`
      SELECT id, code, title, type, discount_value, min_order_value, target_category, start_date, end_date, status
      FROM promotions
      WHERE status = 'active' AND start_date <= ? AND end_date >= ? AND (max_uses = 0 OR used_count < max_uses)
      ORDER BY id ASC
    `, [today, today]);
    return rows;
  },

  async findActivePromotionByCode(code) {
    const today = new Date().toISOString().slice(0, 10);
    const [[promo]] = await pool.query(
      'SELECT * FROM promotions WHERE code = ? AND status = "active" AND start_date <= ? AND end_date >= ?',
      [code, today, today],
    );
    return promo || null;
  },

  /**
   * Đánh giá sản phẩm: Xác minh verified_purchase từ đơn hàng đã delivered và lưu status 'pending'
   */
  async createProductReview(customer, { productId, rating, title, comment }) {
    const [[prod]] = await pool.query('SELECT name FROM products WHERE id = ?', [productId]);
    if (!prod) throw new ApiError(404, 'Không tìm thấy sản phẩm');

    // Xác minh khách đã thực sự mua sản phẩm này trong một đơn hàng đã giao thành công chưa
    const [[purchaseCheck]] = await pool.query(`
      SELECT COUNT(*) AS cnt 
      FROM orders 
      WHERE customer_id = ? 
        AND status = 'delivered' 
        AND (product_id = ? OR JSON_CONTAINS(items_json, JSON_OBJECT('pid', ?)))
    `, [customer.id, productId, productId]);

    const isVerifiedPurchase = Number(purchaseCheck?.cnt || 0) > 0 ? 1 : 0;

    await pool.query(`
      INSERT INTO product_reviews
        (customer_id, customer_name, product_id, product_name, rating, title, comment, verified_purchase, status, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'customer')
    `, [
      customer.id,
      customer.full_name,
      productId,
      prod.name,
      rating,
      title || 'Đánh giá từ khách hàng',
      comment,
      isVerifiedPurchase,
    ]);
  },

  async createTradeInRequest(customer, { brand, model, year, ram, condition_desc, estimated_price }) {
    const code = await generateUniqueCode(pool, 'trade_ins', 'TC');

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

  /**
   * Tạo yêu cầu RMA đổi trả: Kiểm tra quyền sở hữu đơn hàng, sản phẩm trong đơn, thời hạn và chống trùng
   */
  async createRmaRequest(customer, { order_code, product_id, type, reason }) {
    const pid = Number(String(product_id).replace(/^p/, ''));
    const [[prod]] = await pool.query('SELECT name FROM products WHERE id = ?', [pid]);
    if (!prod) throw new ApiError(404, 'Sản phẩm không tồn tại');

    // 1. Kiểm tra đơn hàng thuộc quyền sở hữu của khách hàng
    const [[order]] = await pool.query(
      'SELECT * FROM orders WHERE code = ? AND customer_id = ?',
      [order_code, customer.id]
    );
    if (!order) throw new ApiError(404, `Không tìm thấy đơn hàng "${order_code}" thuộc tài khoản của bạn`);

    // 2. Chỉ được đổi trả đơn hàng đã giao thành công (delivered)
    if (order.status !== 'delivered') {
      throw new ApiError(400, 'Chỉ có thể tạo yêu cầu đổi trả cho đơn hàng đã giao thành công');
    }

    // 3. Kiểm tra sản phẩm có trong đơn hàng
    let items = [];
    try {
      items = typeof order.items_json === 'string' ? JSON.parse(order.items_json) : (order.items_json || []);
    } catch {}
    const hasProduct = items.some((it) => (it.pid || it.product_id) === pid) || order.product_id === pid;
    if (!hasProduct) {
      throw new ApiError(400, `Sản phẩm "${prod.name}" không nằm trong đơn hàng "${order_code}"`);
    }

    // 4. Kiểm tra thời hạn áp dụng (30 ngày kể từ ngày giao hàng)
    const orderDate = new Date(order.delivered_at || order.ordered_at);
    const daysSinceDelivered = (Date.now() - orderDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceDelivered > 30) {
      throw new ApiError(400, 'Đơn hàng đã vượt quá thời hạn đổi trả chính sách (tối đa 30 ngày)');
    }

    // 5. Chống tạo yêu cầu trùng đang xử lý
    const [existingRma] = await pool.query(
      "SELECT id FROM rmas WHERE order_code = ? AND product_id = ? AND status NOT IN ('Từ chối', 'Đã hủy') LIMIT 1",
      [order_code, pid]
    );
    if (existingRma.length > 0) {
      throw new ApiError(400, 'Sản phẩm trong đơn hàng này đã có yêu cầu đổi trả đang chờ xử lý');
    }

    const code = await generateUniqueCode(pool, 'rmas', 'RMA');

    await pool.query(`
      INSERT INTO rmas
        (code, order_code, product_id, product_name, customer_id, type, reason, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Chờ duyệt')
    `, [
      code,
      order_code,
      pid,
      prod.name,
      customer.id,
      type === 'Trả' ? 'Trả' : 'Đổi',
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
