const express = require('express');
const { authenticate, authorize } = require('../middlewares/auth');
const CategoriesController = require('../controllers/categories.controller');

const router = express.Router();
router.use(authenticate);

router.get('/', authorize('product:read'), CategoriesController.getAll);
router.get('/:id', authorize('product:read'), CategoriesController.getById);
router.post('/', authorize('catalog:write'), CategoriesController.create);
router.put('/:id', authorize('catalog:write'), CategoriesController.update);
router.delete('/:id', authorize('catalog:write'), CategoriesController.remove);

module.exports = router;
