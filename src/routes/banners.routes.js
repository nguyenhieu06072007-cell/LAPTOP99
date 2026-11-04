const express = require('express');
const { authenticate, authorizeAny } = require('../middlewares/auth');
const { bannerImage } = require('../middlewares/upload');
const BannersController = require('../controllers/banners.controller');

const router = express.Router();

router.use(authenticate);

router.get('/', BannersController.listAdminBanners);
router.post('/upload', authorizeAny('catalog:write', 'promotion:write'), bannerImage, BannersController.uploadBannerImage);
router.get('/:id', BannersController.getBannerDetail);
router.post('/', authorizeAny('catalog:write', 'promotion:write'), BannersController.createBanner);
router.put('/:id', authorizeAny('catalog:write', 'promotion:write'), BannersController.updateBanner);
router.patch('/:id/status', authorizeAny('catalog:write', 'promotion:write'), BannersController.toggleBannerStatus);
router.delete('/:id', authorizeAny('catalog:write', 'promotion:write'), BannersController.deleteBanner);

module.exports = router;

