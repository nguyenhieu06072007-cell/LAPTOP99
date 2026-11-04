const express = require('express');
const { authenticate, authorize } = require('../middlewares/auth');
const AuditController = require('../controllers/audit.controller');

const router = express.Router();
router.use(authenticate, authorize('audit:read'));

router.get('/', AuditController.getAuditLogs);

module.exports = router;
