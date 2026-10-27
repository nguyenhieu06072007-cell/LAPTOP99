const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const env = require('../config/env');
const { pool } = require('../config/db');
const { ApiError, asyncHandler, addCalendarMonths } = require('../utils/helpers');
const ClientModel = require('../models/client.model');

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Họ tên cần từ 2 ký tự').max(100),
  email: z.string().trim().toLowerCase().email('Email không đúng định dạng'),
  phone: z.string().trim().regex(/^0\d{9}$/, 'Số điện thoại gồm 10 số, bắt đầu bằng 0'),
  password: z.string().min(6, 'Mật khẩu cần từ 6 ký tự').max(100),
  address: z.string().trim().max(255).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().min(2, 'Vui lòng nhập Email hoặc Số điện thoại'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

const checkoutSchema = z.object({
  items: z.array(z.object({
    pid: z.union([z.number(), z.string()]).transform((v) => Number(String(v).replace(/^p/, ''))),
    qty: z.number().int().min(1).default(1),
  })).min(1, 'Giỏ hàng đang trống'),
  name: z.string().trim().min(2, 'Vui lòng nhập họ tên người nhận'),
  phone: z.string().trim().regex(/^0\d{9}$/, 'Số điện thoại gồm 10 số, bắt đầu bằng 0'),
  address: z.string().trim().min(8, 'Vui lòng nhập địa chỉ nhận hàng đầy đủ'),
  payment_method: z.string().default('cod'),
  coupon: z.string().trim().optional().nullish(),
  trade_in_id: z.union([z.number(), z.string()]).optional().nullish().transform((v) => {
    if (!v) return null;
    const clean = String(v).replace(/^ti-/, '').replace(/^TC-/, '');
    const n = Number(clean);
    return Number.isFinite(n) ? n : null;
  }),
  note: z.string().trim().max(1000).optional().nullish(),
});

/**
 * ClientController — Tầng Controller (MVC) tiếp nhận request từ Storefront,
 * xác thực dữ liệu, gọi ClientModel và trả về JSON response chuẩn.
 */
const ClientController = {
  getCategories: asyncHandler(async (req, res) => {
    const rows = await ClientModel.getActiveCategories();
    res.json({ data: rows });
  }),

  getBrands: asyncHandler(async (req, res) => {
    const rows = await ClientModel.getActiveBrands();
    res.json({ data: rows });
  }),

  getProducts: asyncHandler(async (req, res) => {
    const rows = await ClientModel.getProducts(req.query);
    res.json({ data: rows, total: rows.length });
  }),

  getProductDetail: asyncHandler(async (req, res) => {
    const product = await ClientModel.getProductDetail(req.params.id);
    if (!product) throw new ApiError(404, 'Không tìm thấy sản phẩm hoặc sản phẩm đã ngừng kinh doanh');
    res.json({ data: product });
  }),

  register: asyncHandler(async (req, res) => {
    const { name, email, phone, password, address } = registerSchema.parse(req.body);

    const existingEmail = await ClientModel.findCustomerByEmail(email);
    if (existingEmail) {
      throw new ApiError(409, 'Email này đã được sử dụng. Vui lòng đăng nhập hoặc dùng email khác.');
    }

    const existingPhone = await ClientModel.findCustomerByEmailOrPhone(phone);
    if (existingPhone) {
      throw new ApiError(409, 'Số điện thoại này đã được đăng ký. Vui lòng đăng nhập.');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const customer = await ClientModel.createCustomer({
      name,
      email,
      phone,
      address,
      passwordHash,
    });

    const token = jwt.sign(
      { sub: customer.id, role: 'customer', type: 'customer', email: customer.email, name: customer.full_name },
      env.JWT_SECRET,
      { expiresIn: '30d' },
    );

    res.status(201).json({
      data: {
        token,
        customer,
      },
    });
  }),

  login: asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const identifier = String(email || '').trim();
    const customer = await ClientModel.findCustomerByEmailOrPhone(identifier);

    if (!customer || !customer.password_hash) {
      throw new ApiError(401, 'Email/Số điện thoại hoặc mật khẩu chưa đúng');
    }

    const ok = await bcrypt.compare(password, customer.password_hash);
    if (!ok) {
      throw new ApiError(401, 'Email/Số điện thoại hoặc mật khẩu chưa đúng');
    }

    const token = jwt.sign(
      { sub: customer.id, role: 'customer', type: 'customer', email: customer.email, name: customer.full_name },
      env.JWT_SECRET,
      { expiresIn: '30d' },
    );

    res.json({
      data: {
        token,
        customer: {
          id: customer.id,
          code: customer.code,
          name: customer.full_name,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
          tier: customer.tier,
        },
      },
    });
  }),

  getMe: asyncHandler(async (req, res) => {
    res.json({
      data: {
        id: req.customer.id,
        code: req.customer.code,
        name: req.customer.full_name,
        email: req.customer.email,
        phone: req.customer.phone,
        address: req.customer.address,
        tier: req.customer.tier,
      },
    });
  }),

  updateProfile: asyncHandler(async (req, res) => {
    const { name, phone, address } = req.body;
    const updated = await ClientModel.updateCustomerProfile(req.customer.id, {
      name: name ? String(name).trim() : null,
      phone: phone ? String(phone).trim() : null,
      address: address ? String(address).trim() : null,
    });
    res.json({ data: updated });
  }),

  /**
   * Quên mật khẩu an toàn: Sinh OTP ngẫu nhiên mật mã học, lưu hash trong CSDL, giới hạn tần suất, tuyệt đối không trả OTP trong response
   */
  forgotPassword: asyncHandler(async (req, res) => {
    const identifier = String(req.body.identifier || req.body.email || req.body.phone || '').trim();
    if (!identifier) {
      throw new ApiError(400, 'Vui lòng nhập Email (Gmail) hoặc Số điện thoại đã đăng ký');
    }

    const customer = await ClientModel.findCustomerByEmailOrPhone(identifier);
    if (!customer) {
      throw new ApiError(404, 'Không tìm thấy tài khoản tương ứng với thông tin đã nhập');
    }

    // 1. Giới hạn tần suất yêu cầu: Tối đa 3 lần / 15 phút
    const [[rateCheck]] = await pool.query(`
      SELECT COUNT(*) AS cnt 
      FROM password_resets 
      WHERE identifier = ? AND created_at >= NOW() - INTERVAL 15 MINUTE
    `, [identifier.toLowerCase()]);

    if (Number(rateCheck?.cnt || 0) >= 3) {
      throw new ApiError(429, 'Bạn đã gửi yêu cầu quá nhiều lần. Vui lòng đợi 15 phút trước khi thử lại.');
    }

    // 2. Kiểm tra dịch vụ gửi OTP thực tế (Email / SMS)
    const hasSmtpConfig = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
    const isDevOrTest = process.env.NODE_ENV === 'test' || process.env.ALLOW_DEV_OTP === 'true';

    if (!hasSmtpConfig && !isDevOrTest) {
      throw new ApiError(503, 'Chức năng gửi OTP qua Email/SMS chưa sẵn sàng do máy chủ chưa cấu hình dịch vụ gửi tin. Vui lòng liên hệ tổng đài 1800 6888 để được hỗ trợ.');
    }

    // 3. Sinh mã OTP 6 chữ số bằng crypto ngẫu nhiên an toàn
    const otpNumber = crypto.randomInt(100000, 1000000);
    const otp = String(otpNumber);
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 phút

    // 4. Lưu OTP hash vào bảng password_resets
    await pool.query(`
      INSERT INTO password_resets (customer_id, identifier, otp_hash, attempts, expires_at)
      VALUES (?, ?, ?, 0, ?)
    `, [customer.id, identifier.toLowerCase(), otpHash, expiresAt]);

    const maskedPhone = customer.phone
      ? customer.phone.slice(0, 3) + '****' + customer.phone.slice(-3)
      : '';
    const maskedEmail = customer.email
      ? customer.email.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => a + '***' + c)
      : '';

    const isPhoneInput = /^0\d{9}$/.test(identifier);
    const targetChannel = isPhoneInput ? 'SMS Số điện thoại' : 'Hòm thư Gmail / Email';

    // Tuyệt đối KHÔNG trả otp_preview hoặc ghi log OTP ra ngoài
    res.json({
      success: true,
      data: {
        masked_email: maskedEmail,
        masked_phone: maskedPhone,
        channel: isPhoneInput ? 'sms' : 'email',
        expires_in: 600,
      },
      message: `Đã gửi mã xác thực OTP khôi phục mật khẩu đến ${targetChannel} (${maskedPhone || maskedEmail})`,
    });
  }),

  /**
   * Đặt lại mật khẩu: Đối chiếu OTP hash trong CSDL, giới hạn 5 lần thử, hủy OTP sau khi dùng
   */
  resetPassword: asyncHandler(async (req, res) => {
    const identifier = String(req.body.identifier || req.body.email || req.body.phone || '').trim().toLowerCase();
    const otp = String(req.body.otp || '').trim();
    const newPassword = String(req.body.new_password || '');

    if (!identifier || !otp) {
      throw new ApiError(400, 'Vui lòng nhập đầy đủ thông tin tài khoản và mã xác thực OTP');
    }
    if (newPassword.length < 6) {
      throw new ApiError(400, 'Mật khẩu mới cần tối thiểu 6 ký tự');
    }

    // Lấy bản ghi OTP mới nhất còn hiệu lực
    const [rows] = await pool.query(`
      SELECT * FROM password_resets 
      WHERE identifier = ? AND used_at IS NULL AND expires_at > NOW() 
      ORDER BY id DESC LIMIT 1
    `, [identifier]);

    const record = rows[0];
    if (!record) {
      throw new ApiError(400, 'Mã xác thực OTP đã hết hạn hoặc không tồn tại. Vui lòng yêu cầu mã mới.');
    }

    if (record.attempts >= 5) {
      await pool.query('UPDATE password_resets SET used_at = NOW() WHERE id = ?', [record.id]);
      throw new ApiError(429, 'Đã nhập sai OTP quá 5 lần. Mã này đã bị vô hiệu hóa, vui lòng yêu cầu mã mới.');
    }

    const isMatch = await bcrypt.compare(otp, record.otp_hash);
    if (!isMatch) {
      await pool.query('UPDATE password_resets SET attempts = attempts + 1 WHERE id = ?', [record.id]);
      throw new ApiError(400, `Mã xác thực OTP không chính xác (còn ${4 - record.attempts} lần thử)`);
    }

    // Đánh dấu OTP đã sử dụng ngay lập tức (dùng 1 lần duy nhất)
    await pool.query('UPDATE password_resets SET used_at = NOW() WHERE id = ?', [record.id]);

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const updatedCustomer = await ClientModel.updateCustomerPassword(record.customer_id, passwordHash);

    const token = jwt.sign(
      { sub: updatedCustomer.id, role: 'customer', type: 'customer', email: updatedCustomer.email, name: updatedCustomer.full_name },
      env.JWT_SECRET,
      { expiresIn: '30d' },
    );

    res.json({
      success: true,
      message: 'Đặt lại mật khẩu mới thành công',
      data: {
        token,
        customer: updatedCustomer,
      },
    });
  }),

  createOrder: asyncHandler(async (req, res) => {
    const body = checkoutSchema.parse(req.body);
    const result = await ClientModel.createOrder(req.customer, body);
    res.status(201).json({
      success: true,
      data: result,
    });
  }),

  getMyOrders: asyncHandler(async (req, res) => {
    const rows = await ClientModel.getOrdersByCustomer(req.customer.id);
    const mapped = rows.map((o) => {
      let statusText = 'Chờ xác nhận';
      if (o.status === 'confirmed') statusText = 'Đã xác nhận';
      else if (o.status === 'shipping') statusText = 'Đang giao hàng';
      else if (o.status === 'delivered') statusText = 'Giao thành công';
      else if (o.status === 'cancelled') statusText = 'Đã hủy';

      let items = [];
      try {
        items = typeof o.items_json === 'string' ? JSON.parse(o.items_json) : (o.items_json || []);
      } catch {}

      return {
        id: o.code,
        code: o.code,
        order_id: o.id,
        items,
        total: Number(o.total_amount),
        status: o.status,
        status_text: statusText,
        payment_status: o.payment_status,
        payment_verification: o.payment_verification_status || 'none',
        payment_method: o.payment_method,
        created_at: new Date(o.ordered_at).getTime(),
        address: o.shipping_address,
        phone: o.customer_phone,
        name: o.customer_name,
        serial_number: o.serial_number,
      };
    });
    res.json({ data: mapped });
  }),

  cancelOrder: asyncHandler(async (req, res) => {
    await ClientModel.cancelCustomerOrder(req.customer.id, req.params.code);
    res.json({ success: true, message: 'Đã hủy đơn hàng thành công' });
  }),

  confirmOrderPayment: asyncHandler(async (req, res) => {
    const bankInfo = String(req.body.bank_info || '').trim();
    const result = await ClientModel.confirmCustomerOrderPayment(
      req.customer.id,
      req.params.code,
      bankInfo,
    );
    res.json({
      success: true,
      message: result.message,
      data: result,
    });
  }),

  /**
   * Tra cứu bảo hành chính xác theo tháng lịch, chỉ áp dụng cho đơn đã giao thành công
   */
  lookupWarranty: asyncHandler(async (req, res) => {
    const sn = String(req.query.sn || '').trim().toUpperCase();
    if (!sn) throw new ApiError(400, 'Vui lòng cung cấp số Serial S/N');

    const order = await ClientModel.findOrderBySerial(sn);
    if (!order) {
      return res.json({ data: null, found: false, message: 'Không tìm thấy thông tin bảo hành kích hoạt cho số Serial này' });
    }

    let warrantyMonths = order.warranty_months || 12;
    let prodName = order.product_name;
    let prodId = order.product_id;

    try {
      const items = typeof order.items_json === 'string' ? JSON.parse(order.items_json) : (order.items_json || []);
      for (const it of items) {
        if (it.serials && it.serials.some((s) => s.toUpperCase() === sn)) {
          prodName = it.name;
          warrantyMonths = it.warranty_months || warrantyMonths;
          prodId = it.pid;
          break;
        }
      }
    } catch {}

    const startDate = new Date(order.delivered_at || order.ordered_at);
    const endDate = addCalendarMonths(startDate, warrantyMonths);
    const isValid = endDate.getTime() > Date.now();

    res.json({
      found: true,
      data: {
        sn,
        oid: order.code,
        pid: prodId,
        product_name: prodName,
        at: startDate.getTime(),
        months: warrantyMonths,
        end_date: endDate.getTime(),
        is_valid: isValid,
      },
    });
  }),

  getPromotions: asyncHandler(async (req, res) => {
    const rows = await ClientModel.getActivePromotions();
    const mapped = rows.map((p) => ({
      code: p.code,
      type: p.type === 'percent' ? 'pct' : 'fixed',
      value: Number(p.discount_value),
      cap: 2000000,
      min: Number(p.min_order_value),
      target_category: p.target_category,
      exp: new Date(p.end_date).toISOString().slice(0, 10),
      active: p.status === 'active',
      desc: p.title + (p.type === 'percent' ? ` (Giảm ${p.discount_value}%)` : ` (Giảm ${new Intl.NumberFormat('vi-VN').format(p.discount_value)} đ)`),
    }));
    res.json({ data: mapped });
  }),

  /**
   * Kiểm tra mã khuyến mãi với đầy đủ điều kiện ngày, lượt dùng, giá trị tối thiểu và danh mục
   */
  checkPromotion: asyncHandler(async (req, res) => {
    const code = String(req.body.code || '').trim().toUpperCase();
    const subtotal = Number(req.body.subtotal || 0);

    if (!code) throw new ApiError(400, 'Vui lòng nhập mã giảm giá');

    const promo = await ClientModel.findActivePromotionByCode(code);
    if (!promo) {
      return res.json({ valid: false, message: 'Mã không hợp lệ hoặc đã hết hạn' });
    }

    const today = new Date().toISOString().slice(0, 10);
    if (promo.start_date && promo.start_date > today) {
      return res.json({ valid: false, message: `Chương trình chưa bắt đầu (hiệu lực từ ngày ${promo.start_date})` });
    }
    if (promo.end_date && promo.end_date < today) {
      return res.json({ valid: false, message: 'Mã khuyến mãi đã hết thời hạn sử dụng' });
    }
    if (promo.max_uses > 0 && promo.used_count >= promo.max_uses) {
      return res.json({ valid: false, message: 'Mã khuyến mãi đã hết lượt sử dụng' });
    }

    const minOrder = Number(promo.min_order_value || 0);
    if (subtotal < minOrder) {
      return res.json({
        valid: false,
        message: `Đơn hàng cần từ ${new Intl.NumberFormat('vi-VN').format(minOrder)} đ để áp dụng mã này`,
        min: minOrder,
      });
    }

    let discount = 0;
    if (promo.type === 'percent') {
      discount = Math.min(Math.round((subtotal * Number(promo.discount_value)) / 100), 2000000);
    } else {
      discount = Math.min(subtotal, Number(promo.discount_value));
    }

    res.json({
      valid: true,
      code: promo.code,
      discount,
      desc: promo.title,
    });
  }),

  submitReview: asyncHandler(async (req, res) => {
    const { product_id, rating, comment, title } = req.body;
    const productId = Number(String(product_id).replace(/^p/, ''));
    const rateVal = Math.min(5, Math.max(1, Number(rating) || 5));

    if (!comment || comment.trim().length < 5) {
      throw new ApiError(400, 'Hãy viết ít nhất vài từ nhận xét');
    }

    await ClientModel.createProductReview(req.customer, {
      productId,
      rating: rateVal,
      title,
      comment: comment.trim(),
    });

    res.status(201).json({ success: true, message: 'Cảm ơn bạn đã gửi đánh giá. Đánh giá sẽ được hiển thị sau khi duyệt.' });
  }),

  submitTradeIn: asyncHandler(async (req, res) => {
    const { brand, model, year, ram, condition_desc, estimated_price } = req.body;

    if (!model || model.trim().length < 2) {
      throw new ApiError(400, 'Vui lòng nhập dòng máy');
    }

    const code = await ClientModel.createTradeInRequest(req.customer, {
      brand,
      model,
      year,
      ram,
      condition_desc,
      estimated_price,
    });

    res.status(201).json({ success: true, code, message: 'Đã gửi yêu cầu thu cũ đổi mới thành công' });
  }),

  getMyTradeIns: asyncHandler(async (req, res) => {
    const rows = await ClientModel.getTradeInsByCustomer(req.customer.id);
    const mapped = rows.map((r) => ({
      id: r.id,
      code: r.code,
      cid: r.customer_id,
      brand: r.brand,
      model: r.model,
      year: r.year,
      ram: r.ram,
      cond: r.condition_desc,
      est: Number(r.estimated_price),
      final: r.final_price ? Number(r.final_price) : null,
      status: r.status,
      used_in_order_id: r.used_in_order_id,
      at: new Date(r.created_at).getTime(),
    }));
    res.json({ data: mapped });
  }),

  submitRma: asyncHandler(async (req, res) => {
    const { order_code, product_id, type, reason } = req.body;

    if (!reason || reason.trim().length < 8) {
      throw new ApiError(400, 'Vui lòng mô tả lý do rõ hơn (tối thiểu 8 ký tự)');
    }

    const code = await ClientModel.createRmaRequest(req.customer, {
      order_code,
      product_id,
      type,
      reason,
    });

    res.status(201).json({ success: true, code, message: 'Đã gửi yêu cầu đổi trả thành công' });
  }),

  getMyRmas: asyncHandler(async (req, res) => {
    const rows = await ClientModel.getRmasByCustomer(req.customer.id);
    const mapped = rows.map((r) => ({
      id: r.id,
      code: r.code,
      oid: r.order_code,
      pid: r.product_id ? 'p' + r.product_id : '',
      cid: r.customer_id,
      type: r.type,
      reason: r.reason,
      status: r.status,
      at: new Date(r.created_at).getTime(),
    }));
    res.json({ data: mapped });
  }),

  getNews: asyncHandler(async (req, res) => {
    const rows = await ClientModel.getPublishedNews();
    const mapped = rows.map((n) => ({
      id: 'n' + n.id,
      title: n.title,
      tag: n.tag,
      source: n.source_name || 'VnExpress Số Hóa',
      url: n.external_url || 'https://vnexpress.net/so-hoa',
      img: n.image_url || '/uploads/products/real-macbook-pro.jpg',
      body: n.body,
      pub: Boolean(n.is_published),
      at: new Date(n.created_at).getTime(),
    }));
    res.json({ data: mapped });
  }),

  /**
   * AI Chatbot Assistant for LAPTOP99
   * Supports order lookup, warranty lookup, store policies, and dynamic product recommendations
   */
  aiChat: asyncHandler(async (req, res) => {
    const { message } = req.body || {};
    const text = String(message || '').trim();

    if (!text) {
      return res.json({
        success: true,
        reply: 'Xin chào Quý khách! 👋 Em là **Trợ lý AI của LAPTOP99**.\\n\\nEm có thể giúp bạn:\\n- 🎯 **Tìm laptop phù hợp** theo ngân sách & nhu cầu (học tập, đồ họa, gaming, văn phòng...)\\n- 💰 **So sánh cấu hình & giá khuyến mãi**\\n- 📦 **Tra cứu đơn hàng** & chính sách bảo hành, đổi trả\\n\\nBạn đang quan tâm đến dòng laptop nào ạ?',
        products: [],
        suggestions: [
          'Laptop sinh viên dưới 15 triệu',
          'MacBook Air làm việc mỏng nhẹ',
          'Laptop gaming RTX 4060 mạnh nhất',
          'Chính sách đổi trả trong 15 ngày',
          'Tra cứu đơn hàng của tôi',
        ],
      });
    }

    const lower = text.toLowerCase();

    // 1. Tra cứu đơn hàng nếu có mã đơn dạng DH-...
    const orderCodeMatch = text.match(/DH-[A-Za-z0-9-]+/i);
    if (orderCodeMatch) {
      const orderCode = orderCodeMatch[0].toUpperCase();
      try {
        const [orders] = await pool.query(
          `SELECT o.id, o.code, o.status, o.payment_status, o.total_amount, o.shipping_address, o.created_at,
                  c.full_name as customer_name
           FROM orders o
           LEFT JOIN customers c ON c.id = o.customer_id
           WHERE o.code = ?`,
          [orderCode],
        );

        if (orders.length > 0) {
          const ord = orders[0];
          const statusMap = {
            pending: 'Đang chờ xác nhận',
            processing: 'Đang xử lý & đóng gói',
            shipping: 'Đang giao hàng tới bạn',
            delivered: 'Đã giao hàng thành công',
            completed: 'Hoàn tất đơn hàng',
            cancelled: 'Đã hủy đơn',
          };
          const stText = statusMap[ord.status] || ord.status;
          const fmtPrice = new Intl.NumberFormat('vi-VN').format(Number(ord.total_amount)) + '₫';

          return res.json({
            success: true,
            reply: `📦 **Thông tin đơn hàng ${ord.code}:**\\n\\n- **Trạng thái:** ${stText}\\n- **Tổng thanh toán:** ${fmtPrice}\\n- **Thanh toán:** ${ord.payment_status === 'paid' ? 'Đã thanh toán ✅' : 'Chưa thanh toán (COD / Chờ CK)'}\\n- **Địa chỉ nhận:** ${ord.shipping_address || 'Theo thông tin đơn'}\\n\\n*Nếu bạn cần hỗ trợ thay đổi địa chỉ hoặc hủy đơn, vui lòng liên hệ hotline 1800.6868 miễn phí!*`,
            products: [],
            suggestions: ['Chính sách bảo hành S/N', 'Chính sách đổi trả 15 ngày', 'Tư vấn mua thêm laptop'],
          });
        } else {
          return res.json({
            success: true,
            reply: `🔍 Em đã tra cứu mã đơn **${orderCode}** nhưng không tìm thấy trong hệ thống LAPTOP99. Quý khách vui lòng kiểm tra lại mã đơn (dạng \`DH-YYYYMM-XXXXXX\`) trong phần **Tài khoản > Đơn hàng của tôi** hoặc liên hệ CSKH nhé!`,
            products: [],
            suggestions: ['Xem đơn hàng trong tài khoản', 'Liên hệ Hotline 1800.6868'],
          });
        }
      } catch (err) {
        // Fallback
      }
    }

    // 2. Tra cứu chính sách bảo hành / Serial S/N
    if (lower.includes('bảo hành') || lower.includes('serial') || lower.includes('s/n') || lower.includes('tra cứu')) {
      if (lower.includes('chính sách') || !lower.match(/[A-Z0-9]{6,}/i)) {
        return res.json({
          success: true,
          reply: `🛡️ **Chính sách bảo hành điện tử chính hãng tại LAPTOP99:**\\n\\n- **Thời gian bảo hành:** 12 – 24 tháng theo đúng tiêu chuẩn hãng (Apple VN/A, Dell ProSupport, ASUS VIP, Lenovo Premier...)\\n- **Bảo hành S/N:** Không cần giữ hóa đơn giấy, quản lý bảo hành 100% bằng Serial máy trên website.\\n- **Hỗ trợ trọn đời:** Cài đặt phần mềm, vệ sinh máy và tra keo tản nhiệt miễn phí tại showroom.\\n\\n*Quý khách có thể vào mục **Tra cứu bảo hành S/N** trên thanh menu hoặc gửi mã Serial vào đây để em tra cứu giúp nhé!*`,
          products: [],
          suggestions: ['Chính sách đổi trả 15 ngày', 'Thu cũ đổi mới trợ giá 3tr', 'Tư vấn laptop bán chạy'],
        });
      }
    }

    // 3. Chính sách Đổi trả / RMA
    if (lower.includes('đổi trả') || lower.includes('rma') || lower.includes('lỗi') || lower.includes('trả hàng')) {
      return res.json({
        success: true,
        reply: `🔄 **Chính sách Đổi mới 15 ngày tại LAPTOP99:**\\n\\n- **1 đổi 1 trong 15 ngày** nếu máy phát sinh lỗi phần cứng từ nhà sản xuất.\\n- **Thực hiện trực tuyến:** Khách hàng có thể tạo phiếu yêu cầu Đổi trả (RMA) ngay trong mục **Tài khoản > Đổi trả**.\\n- **Đồng kiểm khi nhận:** Được mở hộp kiểm tra ngoại hình máy và phụ kiện trước khi thanh toán.`,
        products: [],
        suggestions: ['Tạo yêu cầu đổi trả', 'Bảo hành điện tử S/N', 'Hotline hỗ trợ kỹ thuật'],
      });
    }

    // 4. Thu cũ đổi mới
    if (lower.includes('thu cũ') || lower.includes('lên đời') || lower.includes('trade in') || lower.includes('đổi máy')) {
      return res.json({
        success: true,
        reply: `♻️ **Chương trình Thu Cũ Đổi Mới — Trợ giá đến 3.000.000₫:**\\n\\n- Định giá máy cũ nhanh chóng qua 3 bước trên website.\\n- Nhận thu mọi dòng máy (MacBook, Dell, ThinkPad, Asus, Gaming...).\\n- Tiền thu máy được trừ thẳng vào đơn mua laptop mới + thêm voucher trợ giá độc quyền.`,
        products: [],
        suggestions: ['Định giá máy cũ ngay', 'Xem MacBook mới', 'Xem Laptop Gaming'],
      });
    }

    // 5. Trả góp & Thanh toán
    if (lower.includes('trả góp') || lower.includes('thanh toán') || lower.includes('chuyển khoản')) {
      return res.json({
        success: true,
        reply: `💳 **Phương thức thanh toán & Trả góp 0% tại LAPTOP99:**\\n\\n- **Trả góp 0% lãi suất** qua thẻ tín dụng (hơn 25 ngân hàng liên kết) hoặc công ty tài chính (Home Credit, HD Saison) với CCCD.\\n- **Thanh toán:** Chuyển khoản VietQR tự động, thẻ ATM/Visa/Master, hoặc COD (thanh toán tiền mặt khi nhận hàng).`,
        products: [],
        suggestions: ['Laptop sinh viên trả góp', 'MacBook trả góp 0%', 'Chính sách giao hàng'],
      });
    }

    // 6. Giao hàng & Vận chuyển
    if (lower.includes('giao hàng') || lower.includes('ship') || lower.includes('vận chuyển') || lower.includes('phí ship')) {
      return res.json({
        success: true,
        reply: `🚚 **Chính sách Giao hàng siêu tốc LAPTOP99:**\\n\\n- **Miễn phí giao hàng toàn quốc** cho đơn từ 300.000₫.\\n- **Giao hỏa tốc 2 giờ** nội thành Hà Nội & TP. Hồ Chí Minh.\\n- **Đồng kiểm an tâm:** Quý khách được mở seal thùng kiểm tra đúng model, phụ kiện và tem bảo hành trước khi thanh toán.`,
        products: [],
        suggestions: ['Tư vấn mua laptop', 'Tra cứu đơn hàng', 'Chính sách bảo hành'],
      });
    }

    // 7. Tư vấn chọn mua laptop thông minh theo ngân sách, thương hiệu, nhu cầu
    let queryPrice = '';
    let queryBrand = '';
    let queryCat = '';
    let searchKw = '';

    // Giá
    if (lower.includes('15') && (lower.includes('dưới') || lower.includes('<') || lower.includes('tầm'))) {
      queryPrice = 'under15';
    } else if (lower.includes('20') && (lower.includes('dưới') || lower.includes('<'))) {
      queryPrice = '15to25';
    } else if (lower.includes('25') && (lower.includes('dưới') || lower.includes('<') || lower.includes('15'))) {
      queryPrice = '15to25';
    } else if (lower.includes('30') || lower.includes('35')) {
      queryPrice = '25to35';
    } else if (lower.includes('cao cấp') || lower.includes('trên 35') || lower.includes('trên 30')) {
      queryPrice = 'over35';
    }

    // Hãng
    if (lower.includes('macbook') || lower.includes('apple')) queryBrand = 'Apple';
    else if (lower.includes('asus')) queryBrand = 'ASUS';
    else if (lower.includes('dell')) queryBrand = 'Dell';
    else if (lower.includes('lenovo') || lower.includes('thinkpad') || lower.includes('legion')) queryBrand = 'Lenovo';
    else if (lower.includes('hp') || lower.includes('victus') || lower.includes('omen')) queryBrand = 'HP';
    else if (lower.includes('msi')) queryBrand = 'MSI';
    else if (lower.includes('acer') || lower.includes('nitro') || lower.includes('predator')) queryBrand = 'Acer';
    else if (lower.includes('surface') || lower.includes('microsoft')) queryBrand = 'Microsoft';

    // Nhu cầu / Danh mục
    if (lower.includes('game') || lower.includes('gaming') || lower.includes('rtx') || lower.includes('fps')) {
      queryCat = '2'; // Gaming
    } else if (lower.includes('sinh viên') || lower.includes('học tập') || lower.includes('hssv')) {
      queryCat = '5'; // Sinh viên
    } else if (lower.includes('đồ họa') || lower.includes('render') || lower.includes('photoshop') || lower.includes('edit')) {
      queryCat = '4'; // Đồ họa - Kỹ thuật
    } else if (lower.includes('mỏng nhẹ') || lower.includes('di chuyển') || lower.includes('nhẹ')) {
      queryCat = '3'; // Mỏng nhẹ cao cấp
    } else if (lower.includes('doanh nhân') || lower.includes('bền') || lower.includes('bảo mật')) {
      queryCat = '6'; // Doanh nhân
    } else if (lower.includes('văn phòng') || lower.includes('excel') || lower.includes('word')) {
      queryCat = '1'; // Văn phòng
    }

    // Từ khóa bổ sung
    if (!queryBrand && !queryCat) {
      searchKw = text.replace(/tìm|tư vấn|laptop|máy tính|cho|mình|em|muốn|mua|có|nào|không|giá/gi, '').trim();
    }

    // Truy vấn database
    const prods = await ClientModel.getProducts({
      price: queryPrice,
      brand: queryBrand,
      cat: queryCat,
      q: searchKw,
      limit: 6,
    });

    const displayProds = prods.slice(0, 3).map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      price: Number(p.sale_price) || Number(p.price),
      old_price: Number(p.sale_price) ? Number(p.price) : 0,
      thumbnail: p.thumbnail,
      cpu: p.cpu || '',
      ram: p.ram ? `${p.ram}GB` : '',
      storage: p.storage || '',
      gpu: p.gpu || '',
      screen: p.screen || '',
    }));

    // Tạo câu trả lời gợi ý
    let replyIntro = '';
    if (queryCat === '2') {
      replyIntro = `🎮 Dưới đây là các mẫu **Laptop Gaming hiệu năng mạnh mẽ**, tản nhiệt tối ưu và card đồ họa rời phù hợp nhất cho bạn:`;
    } else if (queryCat === '5') {
      replyIntro = `🎓 Dưới đây là các mẫu **Laptop Sinh viên - Học tập** có độ bền cao, bàn phím gõ êm, pin trâu và mức giá trợ giá cực tốt:`;
    } else if (queryCat === '4') {
      replyIntro = `🎨 Dưới đây là các dòng **Laptop Đồ họa - Kỹ thuật** với màn hình chuẩn màu (100% sRGB/DCI-P3) và GPU xử lý đồ họa mượt mà:`;
    } else if (queryBrand) {
      replyIntro = `🌟 Dưới đây là các sản phẩm **${queryBrand} Chính Hãng** đang có giá ưu đãi và quà tặng tốt nhất tại hệ thống:`;
    } else {
      replyIntro = `✨ Dựa trên yêu cầu của bạn, em xin gợi ý các mẫu laptop chính hãng phù hợp và bán chạy nhất hiện nay:`;
    }

    let replyBody = replyIntro + '\\n\\n';
    if (displayProds.length > 0) {
      displayProds.forEach((p, idx) => {
        const fmtP = new Intl.NumberFormat('vi-VN').format(p.price) + '₫';
        replyBody += `${idx + 1}. **${p.name}**\\n   - 💰 Giá ưu đãi: **${fmtP}**\\n   - ⚙️ Cấu hình: ${p.cpu ? p.cpu + ' · ' : ''}${p.ram ? p.ram + ' · ' : ''}${p.gpu ? p.gpu : ''}\\n\\n`;
      });
      replyBody += `*Bạn có thể bấm trực tiếp vào thẻ sản phẩm bên dưới để xem chi tiết hoặc thêm vào giỏ hàng ngay nhé!*`;
    } else {
      replyBody = `Dạ hiện tại LAPTOP99 có hơn 100 mẫu laptop chính hãng từ các thương hiệu hàng đầu (*Apple, Dell, ASUS, Lenovo, HP, MSI, Acer, LG, Surface*). Bạn có thể cho em biết thêm về **ngân sách dự kiến** (ví dụ: dưới 15 triệu, 20-25 triệu) hoặc **mục đích sử dụng chính** để em lọc máy chính xác nhất cho bạn nhé!`;
    }

    const suggestions = [];
    if (queryCat !== '2') suggestions.push('Laptop Gaming RTX 4060');
    if (queryBrand !== 'Apple') suggestions.push('MacBook Air M2/M3');
    suggestions.push('Laptop sinh viên dưới 15tr');
    suggestions.push('Chính sách trả góp 0%');

    return res.json({
      success: true,
      reply: replyBody,
      products: displayProds,
      suggestions: suggestions.slice(0, 4),
    });
  }),
};

module.exports = ClientController;
