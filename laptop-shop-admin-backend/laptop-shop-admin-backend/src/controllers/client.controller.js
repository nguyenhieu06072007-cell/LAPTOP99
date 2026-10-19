const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const env = require('../config/env');
const { ApiError, asyncHandler } = require('../utils/helpers');
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
    if (!product) throw new ApiError(404, 'Không tìm thấy sản phẩm');
    res.json({ data: product });
  }),

  register: asyncHandler(async (req, res) => {
    const { name, email, phone, password, address } = registerSchema.parse(req.body);

    const exist = await ClientModel.findCustomerByEmail(email);
    if (exist) {
      throw new ApiError(400, 'Email này đã được đăng ký');
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
      { sub: customer.id, role: 'customer', email: customer.email, name: customer.name },
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
      { sub: customer.id, role: 'customer', email: customer.email, name: customer.full_name },
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
          address: customer.address || '',
          tier: customer.tier,
        },
      },
      message: 'Đăng nhập thành công',
    });
  }),

  forgotPassword: asyncHandler(async (req, res) => {
    const identifier = String(req.body.identifier || req.body.email || req.body.phone || '').trim();
    if (!identifier) {
      throw new ApiError(400, 'Vui lòng nhập Email (Gmail) hoặc Số điện thoại đã đăng ký');
    }

    const customer = await ClientModel.findCustomerByEmailOrPhone(identifier);
    if (!customer) {
      throw new ApiError(404, 'Không tìm thấy tài khoản tương ứng với Email hoặc Số điện thoại này');
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    if (!global._resetOtpStore) global._resetOtpStore = new Map();

    const otpData = {
      otp,
      customerId: customer.id,
      expiresAt: Date.now() + 10 * 60 * 1000,
      email: customer.email,
      phone: customer.phone,
    };

    if (customer.email) global._resetOtpStore.set(customer.email.toLowerCase(), otpData);
    if (customer.phone) global._resetOtpStore.set(customer.phone, otpData);
    global._resetOtpStore.set(identifier.toLowerCase(), otpData);

    const maskedPhone = customer.phone
      ? customer.phone.slice(0, 3) + '****' + customer.phone.slice(-3)
      : '';
    const maskedEmail = customer.email
      ? customer.email.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => a + '***' + c)
      : '';

    const isPhoneInput = /^0\d{9}$/.test(identifier);
    const targetChannel = isPhoneInput ? 'SMS Số điện thoại' : 'Hòm thư Gmail / Email';

    res.json({
      success: true,
      data: {
        email: customer.email,
        phone: customer.phone,
        masked_email: maskedEmail,
        masked_phone: maskedPhone,
        channel: isPhoneInput ? 'sms' : 'email',
        otp_preview: otp,
        expires_in: 600,
      },
      message: `Đã tạo mã xác thực OTP khôi phục mật khẩu gửi về ${targetChannel} (${maskedPhone || maskedEmail})`,
    });
  }),

  resetPassword: asyncHandler(async (req, res) => {
    const identifier = String(req.body.identifier || req.body.email || req.body.phone || '').trim().toLowerCase();
    const otp = String(req.body.otp || '').trim();
    const newPassword = String(req.body.new_password || '');

    if (!identifier || !otp) {
      throw new ApiError(400, 'Vui lòng nhập đầy đủ Email/Số điện thoại và mã xác thực OTP');
    }
    if (newPassword.length < 6) {
      throw new ApiError(400, 'Mật khẩu mới cần tối thiểu 6 ký tự');
    }

    const record = global._resetOtpStore ? global._resetOtpStore.get(identifier) : null;
    if (!record || record.otp !== otp) {
      throw new ApiError(400, 'Mã xác thực OTP không chính xác');
    }
    if (Date.now() > record.expiresAt) {
      global._resetOtpStore.delete(identifier);
      throw new ApiError(400, 'Mã xác thực OTP đã hết hạn, vui lòng yêu cầu mã mới');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const updatedCustomer = await ClientModel.updateCustomerPassword(record.customerId, passwordHash);

    if (record.email) global._resetOtpStore.delete(record.email.toLowerCase());
    if (record.phone) global._resetOtpStore.delete(record.phone);
    global._resetOtpStore.delete(identifier);

    const token = jwt.sign(
      { sub: updatedCustomer.id, role: 'customer', email: updatedCustomer.email, name: updatedCustomer.full_name },
      env.JWT_SECRET,
      { expiresIn: '30d' },
    );

    res.json({
      success: true,
      message: 'Đặt lại mật khẩu mới thành công',
      data: {
        token,
        customer: {
          id: updatedCustomer.id,
          code: updatedCustomer.code,
          name: updatedCustomer.full_name,
          email: updatedCustomer.email,
          phone: updatedCustomer.phone,
          address: updatedCustomer.address || '',
          tier: updatedCustomer.tier,
        },
      },
    });
  }),

  getMe: asyncHandler(async (req, res) => {
    res.json({ data: req.customer });
  }),

  updateProfile: asyncHandler(async (req, res) => {
    const updated = await ClientModel.updateCustomerProfile(req.customer.id, req.body);
    res.json({ data: updated });
  }),

  createOrder: asyncHandler(async (req, res) => {
    const body = checkoutSchema.parse(req.body);
    const result = await ClientModel.createOrder(req.customer, body);

    res.status(201).json({
      data: {
        id: result.orderCode,
        code: result.orderCode,
        total: result.totalAmount,
        subtotal: result.subtotal,
        discount: result.discount,
        serial_number: result.serial_number,
        items: result.items,
        pay: result.pay,
      },
    });
  }),

  getMyOrders: asyncHandler(async (req, res) => {
    const rows = await ClientModel.getOrdersByCustomer(req.customer.id);
    const mapped = rows.map((o) => {
      let items = [];
      try {
        items = typeof o.items_json === 'string' ? JSON.parse(o.items_json) : (o.items_json || []);
      } catch {
        items = [];
      }
      if (!items.length) {
        items = [{
          pid: o.product_id,
          name: o.product_name,
          sku: o.sku,
          qty: o.quantity,
          unit_price: Number(o.unit_price),
          serials: o.serial_number ? o.serial_number.split(', ') : [],
        }];
      }

      let statusText = o.status;
      if (o.status === 'pending') statusText = 'Chờ xác nhận';
      else if (o.status === 'confirmed') statusText = 'Đã xác nhận';
      else if (o.status === 'shipping') statusText = 'Đang giao';
      else if (o.status === 'delivered') statusText = 'Hoàn thành';
      else if (o.status === 'cancelled') statusText = 'Đã hủy';

      return {
        id: o.code,
        cid: o.customer_id,
        name: o.customer_name,
        phone: o.customer_phone,
        addr: o.shipping_address,
        items,
        sub: Number(o.total_amount) + Number(o.discount_amount),
        disc: Number(o.discount_amount),
        total: Number(o.total_amount),
        pay: o.payment_method,
        paid: o.payment_status === 'paid',
        status: statusText,
        raw_status: o.status,
        at: new Date(o.ordered_at).getTime(),
        coupon: o.coupon_code || '',
        note: o.notes || '',
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
    const bankInfo = req.body?.bank_info || '';
    const result = await ClientModel.confirmCustomerOrderPayment(req.customer.id, req.params.code, bankInfo);
    res.json({
      success: true,
      message: 'Đã xác nhận thanh toán chuyển khoản QR ngân hàng thành công!',
      data: result,
    });
  }),

  lookupWarranty: asyncHandler(async (req, res) => {
    const sn = String(req.query.sn || '').trim().toUpperCase();
    if (!sn) throw new ApiError(400, 'Vui lòng cung cấp số Serial S/N');

    const order = await ClientModel.findOrderBySerial(sn);
    if (!order) {
      return res.json({ data: null, found: false });
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

    const purchaseDate = new Date(order.ordered_at).getTime();
    const endDate = purchaseDate + warrantyMonths * 30.44 * 24 * 60 * 60 * 1000;
    const isValid = endDate > Date.now();

    res.json({
      found: true,
      data: {
        sn,
        oid: order.code,
        pid: prodId,
        product_name: prodName,
        at: purchaseDate,
        months: warrantyMonths,
        end_date: endDate,
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
      exp: new Date(p.end_date).toISOString().slice(0, 10),
      active: p.status === 'active',
      desc: p.title + (p.type === 'percent' ? ` (Giảm ${p.discount_value}%)` : ` (Giảm ${new Intl.NumberFormat('vi-VN').format(p.discount_value)} đ)`),
    }));
    res.json({ data: mapped });
  }),

  checkPromotion: asyncHandler(async (req, res) => {
    const code = String(req.body.code || '').trim().toUpperCase();
    const subtotal = Number(req.body.subtotal || 0);

    if (!code) throw new ApiError(400, 'Vui lòng nhập mã giảm giá');

    const promo = await ClientModel.findActivePromotionByCode(code);
    if (!promo) {
      return res.json({ valid: false, message: 'Mã không hợp lệ hoặc đã hết hạn' });
    }

    const minOrder = Number(promo.min_order_value);
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
      discount = Number(promo.discount_value);
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

    res.status(201).json({ success: true, message: 'Cảm ơn bạn đã gửi đánh giá' });
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
      id: r.code,
      cid: r.customer_id,
      brand: r.brand,
      model: r.model,
      year: r.year,
      ram: r.ram,
      cond: r.condition_desc,
      est: Number(r.estimated_price),
      final: r.final_price ? Number(r.final_price) : null,
      status: r.status,
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
      id: r.code,
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

