const express = require('express');
const { authenticate, authorize } = require('../middlewares/auth');
const PromotionsController = require('../controllers/promotions.controller');

const router = express.Router();
router.use(authenticate);

router.get('/', authorize('promotion:read'), PromotionsController.listPromotions);
router.post('/', authorize('promotion:write'), PromotionsController.createPromotion);
router.put('/:id', authorize('promotion:write'), PromotionsController.updatePromotion);
router.patch('/:id/status', authorize('promotion:write'), PromotionsController.toggleStatus);
router.delete('/:id', authorize('promotion:write'), PromotionsController.deletePromotion);

module.exports = router;
