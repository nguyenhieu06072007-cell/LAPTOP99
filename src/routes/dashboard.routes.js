const express = require('express');
const { authenticate, authorize } = require('../middlewares/auth');
const DashboardController = require('../controllers/dashboard.controller');

const router = express.Router();
router.use(authenticate, authorize('report:read'));

router.get('/', DashboardController.getDashboard);

module.exports = router;
