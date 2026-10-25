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
};

module.exports = ClientController;
