const express = require('express');
const { authenticate, authorize } = require('../middlewares/auth');
const BrandsController = require('../controllers/brands.controller');

const router = express.Router();
router.use(authenticate);

router.get('/', authorize('product:read'), BrandsController.listBrands);
router.get('/:id', authorize('product:read'), BrandsController.getBrand);
router.post('/', authorize('catalog:write'), BrandsController.createBrand);
router.put('/:id', authorize('catalog:write'), BrandsController.updateBrand);
router.delete('/:id', authorize('catalog:write'), BrandsController.deleteBrand);

module.exports = router;
