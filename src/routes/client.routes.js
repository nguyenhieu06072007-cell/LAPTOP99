const express = require('express');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { ApiError, asyncHandler } = require('../utils/helpers');
const ClientModel = require('../models/client.model');
const ClientController = require('../controllers/client.controller');
const BannersController = require('../controllers/banners.controller');

const router = express.Router();

/* ------------------------------------------------------------------ */
/* Auth Middlewares for Client                                         */
/* ------------------------------------------------------------------ */

const authenticateCustomer = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new ApiError(401, 'Vui lòng đăng nhập để thực hiện');

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch {
    throw new ApiError(401, 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
  }

  if (payload.role !== 'customer' || payload.type === 'staff') {
    throw new ApiError(403, 'Yêu cầu tài khoản khách hàng');
  }

  const customer = await ClientModel.findCustomerById(payload.sub);
  if (!customer) throw new ApiError(401, 'Tài khoản khách hàng không tồn tại');
  req.customer = customer;
  next();
});

const optionalCustomer = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET);
      if (payload.role === 'customer' && payload.type !== 'staff') {
        const customer = await ClientModel.findCustomerById(payload.sub);
        if (customer) req.customer = customer;
      }
    } catch {
      // Bỏ qua lỗi token hết hạn khi truy cập route không bắt buộc
    }
  }
  next();
};

/* ------------------------------------------------------------------ */
/* Storefront MVC Routes (/api/client/*)                              */
/* ------------------------------------------------------------------ */

// 1. Categories, Brands & Hero Banners (Read-only for Client; Admin manages via /api/admin/banners)
router.get('/categories', ClientController.getCategories);
router.get('/brands', ClientController.getBrands);
router.get('/banners', BannersController.listClientBanners);

// 2. Products List & Detail
router.get('/products', ClientController.getProducts);
router.get('/products/:id', ClientController.getProductDetail);

// 3. Customer Auth, Forgot/Reset Password & Profile
router.post('/auth/register', ClientController.register);
router.post('/auth/login', ClientController.login);
router.post('/auth/forgot-password', ClientController.forgotPassword);
router.post('/auth/reset-password', ClientController.resetPassword);
router.get('/auth/me', authenticateCustomer, ClientController.getMe);
router.put('/auth/profile', authenticateCustomer, ClientController.updateProfile);

// 4. Secure Checkout, QR Payment Confirmation & Orders
router.post('/orders', authenticateCustomer, ClientController.createOrder);
router.get('/orders/my-orders', authenticateCustomer, ClientController.getMyOrders);
router.post('/orders/:code/cancel', authenticateCustomer, ClientController.cancelOrder);
router.post('/orders/:code/confirm-payment', authenticateCustomer, ClientController.confirmOrderPayment);

// 5. Warranty S/N Lookup
router.get('/warranty', ClientController.lookupWarranty);

// 6. Promotions & Coupon Validation
router.get('/promotions', ClientController.getPromotions);
router.post('/promotions/check', ClientController.checkPromotion);

// 7. Product Reviews
router.post('/reviews', authenticateCustomer, ClientController.submitReview);

// 8. Trade-in (Thu cũ đổi mới)
router.post('/trade-in', authenticateCustomer, ClientController.submitTradeIn);
router.get('/trade-in/my-requests', authenticateCustomer, ClientController.getMyTradeIns);

// 9. RMA (Đổi trả)
router.post('/rma', authenticateCustomer, ClientController.submitRma);
router.get('/rma/my-requests', authenticateCustomer, ClientController.getMyRmas);

// 10. Tech News
router.get('/news', ClientController.getNews);

// 11. AI Chatbot Assistant
router.post('/ai/chat', optionalCustomer, ClientController.aiChat);

module.exports = router;
