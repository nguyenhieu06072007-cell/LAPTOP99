const express = require('express');
const { authenticate, authorize } = require('../middlewares/auth');
const ReviewsController = require('../controllers/reviews.controller');

const router = express.Router();
router.use(authenticate);

router.get('/', authorize('report:read'), ReviewsController.listReviews);
router.post('/:id/reply', authorize('report:read'), ReviewsController.replyReview);
router.patch('/:id/status', authorize('report:read'), ReviewsController.updateStatus);

module.exports = router;
