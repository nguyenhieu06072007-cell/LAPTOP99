const express = require('express');
const { authenticate, authorize } = require('../middlewares/auth');
const CustomersController = require('../controllers/customers.controller');

const router = express.Router();
router.use(authenticate);

router.get('/', authorize('customer:read'), CustomersController.listCustomers);
router.get('/:id', authorize('customer:read'), CustomersController.getCustomer);
router.post('/', authorize('customer:write'), CustomersController.createCustomer);
router.put('/:id', authorize('customer:write'), CustomersController.updateCustomer);

module.exports = router;
