const express = require('express');

const router = express.Router();
router.use('/auth', require('./auth.routes'));
router.use('/users', require('./users.routes'));
router.use('/brands', require('./brands.routes'));
router.use('/categories', require('./categories.routes'));
router.use('/products', require('./products.routes'));
router.use('/inventory', require('./inventory.routes'));
router.use('/dashboard', require('./dashboard.routes'));
router.use('/audit-logs', require('./audit.routes'));
router.use('/orders', require('./orders.routes'));
router.use('/customers', require('./customers.routes'));
router.use('/promotions', require('./promotions.routes'));
router.use('/reviews', require('./reviews.routes'));
router.use('/banners', require('./banners.routes'));
router.use('/notifications', require('./notifications.routes'));

module.exports = router;
