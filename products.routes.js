const express = require('express');
const { authenticate, authorize } = require('../middlewares/auth');
const { productImages } = require('../middlewares/upload');
const ProductsController = require('../controllers/products.controller');

const router = express.Router();
router.use(authenticate);

// 1. Product Queries & Detail
router.get('/', authorize('product:read'), ProductsController.listProducts);
router.get('/:id', authorize('product:read'), ProductsController.getProduct);
router.get('/:id/price-history', authorize('product:read'), ProductsController.getPriceHistory);

// 2. Product Mutation & Status
router.post('/', authorize('product:write'), ProductsController.createProduct);
router.put('/:id', authorize('product:write'), ProductsController.updateProduct);
router.patch('/:id/status', authorize('product:write'), ProductsController.updateStatus);

// 3. Product Soft Delete & Restore
router.delete('/:id', authorize('product:delete'), ProductsController.deleteProduct);
router.post('/:id/restore', authorize('product:delete'), ProductsController.restoreProduct);

// 4. Product Images
router.post('/:id/images', authorize('product:write'), productImages, ProductsController.uploadImages);
router.put('/:id/images/:imageId', authorize('product:write'), productImages, ProductsController.replaceImage);
router.patch('/:id/images/:imageId', authorize('product:write'), ProductsController.setThumbnail);
router.delete('/:id/images/:imageId', authorize('product:write'), ProductsController.deleteImage);
router.put('/:id/images/reorder', authorize('product:write'), ProductsController.reorderImages);

module.exports = router;
