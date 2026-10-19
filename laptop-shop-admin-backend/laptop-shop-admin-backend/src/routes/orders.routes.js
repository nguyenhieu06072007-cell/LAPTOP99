const express = require('express');
const { authenticate, authorize } = require('../middlewares/auth');
const OrdersController = require('../controllers/orders.controller');

const router = express.Router();
router.use(authenticate);

// 1. Analytics & Auxiliary Lists
router.get('/finance/summary', OrdersController.getFinanceSummary);
router.get('/serials/list', OrdersController.getSerialsList);
router.get('/rmas/list', OrdersController.getRmasList);
router.patch('/rmas/:id/status', OrdersController.updateRmaStatus);
router.get('/tradeins/list', OrdersController.getTradeInsList);
router.patch('/tradeins/:id/status', OrdersController.updateTradeInStatus);

// 2. Order Management CRUD
router.get('/', OrdersController.listOrders);
router.get('/:id', OrdersController.getOrder);
router.post('/', authorize('order:write'), OrdersController.createOrder);
router.patch('/:id/status', authorize('order:write'), OrdersController.updateOrderStatus);

module.exports = router;
