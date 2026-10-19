const express = require('express');
const { authenticate, authorize } = require('../middlewares/auth');
const InventoryController = require('../controllers/inventory.controller');

const router = express.Router();
router.use(authenticate);

router.get('/movements', authorize('inventory:read'), InventoryController.getMovements);
router.get('/low-stock', authorize('inventory:read'), InventoryController.getLowStock);
router.post('/movements', authorize('inventory:write'), InventoryController.createMovement);

module.exports = router;
