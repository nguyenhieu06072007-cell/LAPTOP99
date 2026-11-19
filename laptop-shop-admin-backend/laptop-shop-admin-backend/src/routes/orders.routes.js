const express = require('express');
const { authenticate, authorize, authorizeAny } = require('../middlewares/auth');
const OrdersController = require('../controllers/orders.controller');

const Fulfillment = require('../controllers/order-fulfillment.controller');

const router = express.Router();
router.use(authenticate);

// 1. Analytics & Auxiliary Lists
router.get('/finance/summary', authorizeAny('finance:read', 'report:sales', 'report:read', 'finance:refund', 'finance:reconcile'), OrdersController.getFinanceSummary);
router.get('/serials/list', authorizeAny('inventory:serial:read', 'inventory:serial:manage', 'warranty:read', 'warranty:write'), OrdersController.getSerialsList);
router.get('/rmas/list', authorizeAny('rma:manage', 'warranty:read', 'finance:refund'), OrdersController.getRmasList);
router.patch('/rmas/:id/refund', authorize('finance:refund'), OrdersController.confirmRmaRefund);
router.patch('/rmas/:id/status', authorizeAny('rma:manage', 'warranty:write'), OrdersController.updateRmaStatus);
router.get('/tradeins/list', authorizeAny('tradein:estimate', 'order:read:all'), OrdersController.getTradeInsList);
router.patch('/tradeins/:id/status', authorize('tradein:estimate'), OrdersController.updateTradeInStatus);

router.get('/assignment-queue', authorize('order:assign'), Fulfillment.assignmentQueue);
router.patch('/:id/assignee', authorize('order:assign'), Fulfillment.assign);
router.get('/serial-queue', authorize('inventory:serial:manage'), Fulfillment.serialQueue);
router.patch('/:id/serials', authorize('inventory:serial:manage'), Fulfillment.assignSerials);
router.get('/warranty/cases', authorizeAny('warranty:read', 'warranty:write'), Fulfillment.warrantyCases);
router.post('/warranty/cases', authorize('warranty:write'), Fulfillment.createWarrantyCase);
router.patch('/warranty/cases/:id', authorize('warranty:write'), Fulfillment.updateWarrantyCase);

// 2. Order Management CRUD
router.get('/', authorizeAny('order:read:all', 'order:read:own'), OrdersController.listOrders);
router.get('/:id', authorizeAny('order:read:all', 'order:read:own'), OrdersController.getOrder);
router.post('/', authorize('order:write'), OrdersController.createOrder);
router.patch('/:id/status', authorize('order:write'), OrdersController.updateOrderStatus);
router.patch('/:id/reconcile-payment', authorize('finance:reconcile'), OrdersController.reconcilePayment);
router.patch('/:id/refund', authorize('finance:refund'), OrdersController.confirmRefund);

module.exports = router;
