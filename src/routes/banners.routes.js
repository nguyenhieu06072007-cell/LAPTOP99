const express = require('express');
const { authenticate } = require('../middlewares/auth');
const { bannerImage } = require('../middlewares/upload');
const BannersController = require('../controllers/banners.controller');

const router = express.Router();

router.use(authenticate);

router.get('/', BannersController.listAdminBanners);
router.post('/upload', bannerImage, BannersController.uploadBannerImage);
router.get('/:id', BannersController.getBannerDetail);
router.post('/', BannersController.createBanner);
router.put('/:id', BannersController.updateBanner);
router.patch('/:id/status', BannersController.toggleBannerStatus);
router.delete('/:id', BannersController.deleteBanner);

module.exports = router;

