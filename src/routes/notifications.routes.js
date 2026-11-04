const express = require('express');
const { authenticate } = require('../middlewares/auth');
const NotificationsController = require('../controllers/notifications.controller');

const router = express.Router();
router.use(authenticate);

router.get('/', NotificationsController.getNotifications);

module.exports = router;
