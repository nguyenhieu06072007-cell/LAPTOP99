const express = require('express');
const { authenticate, authorize } = require('../middlewares/auth');
const UsersController = require('../controllers/users.controller');

const router = express.Router();
router.use(authenticate, authorize('user:manage')); // chỉ super_admin

router.get('/permissions-catalog', UsersController.getPermissionsCatalog);
router.get('/roles', UsersController.getRoles);
router.post('/roles', UsersController.createRole);
router.put('/roles/:id', UsersController.updateRole);

router.get('/', UsersController.getUsers);
router.post('/', UsersController.createUser);
router.put('/:id', UsersController.updateUser);
router.patch('/:id/status', UsersController.updateStatus);
router.post('/:id/reset-password', UsersController.resetPassword);

module.exports = router;
