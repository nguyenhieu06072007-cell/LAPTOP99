const express = require('express');
const { authenticate, authorize, authorizeAny } = require('../middlewares/auth');
const OrdersController = require('../controllers/orders.controller');

const router = express.Router();
router.use(authenticate);

// 1. Analytics & Auxiliary Lists
router.get('/finance/summary', authorizeAny('finance:read', 'report:sales', 'report:read'), OrdersController.getFinanceSummary);
router.get('/serials/list', authorizeAny('inventory:serial:read', 'inventory:serial:manage', 'warranty:read'), OrdersController.getSerialsList);
router.get('/rmas/list', authorizeAny('rma:manage', 'warranty:read'), OrdersController.getRmasList);
router.patch('/rmas/:id/status', authorizeAny('rma:manage', 'warranty:write'), OrdersController.updateRmaStatus);
router.get('/tradeins/list', authorizeAny('tradein:estimate', 'order:read:all'), OrdersController.getTradeInsList);
router.patch('/tradeins/:id/status', authorize('tradein:estimate'), OrdersController.updateTradeInStatus);

// 2. Order Management CRUD
router.get('/', authorizeAny('order:read:all', 'order:read:own'), OrdersController.listOrders);
router.get('/:id', authorizeAny('order:read:all', 'order:read:own'), OrdersController.getOrder);
router.post('/', authorize('order:write'), OrdersController.createOrder);
router.patch('/:id/status', authorize('order:write'), OrdersController.updateOrderStatus);
router.patch('/:id/reconcile-payment', authorizeAny('finance:reconcile', 'finance:read'), OrdersController.reconcilePayment);

module.exports = router;
