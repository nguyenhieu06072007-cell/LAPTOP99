const express = require('express');
const { authenticate, authorize, authorizeAny } = require('../middlewares/auth');
const ReviewsController = require('../controllers/reviews.controller');

const router = express.Router();
router.use(authenticate);

router.get('/', authorizeAny('report:read', 'review:manage'), ReviewsController.listReviews);
router.post('/:id/reply', authorize('review:manage'), ReviewsController.replyReview);
router.patch('/:id/status', authorize('review:manage'), ReviewsController.updateStatus);

module.exports = router;
