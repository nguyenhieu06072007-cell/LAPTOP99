const express = require('express');
const { authenticate, authorize, authorizeAny } = require('../middlewares/auth');
const UsersController = require('../controllers/users.controller');

const router = express.Router();
router.use(authenticate);

router.get('/permissions-catalog', authorizeAny('user:manage', 'role:manage'), UsersController.getPermissionsCatalog);
router.get('/roles', authorizeAny('user:manage', 'role:manage'), UsersController.getRoles);
router.post('/roles', authorize('role:manage'), UsersController.createRole);
router.put('/roles/:id', authorize('role:manage'), UsersController.updateRole);

router.get('/', authorize('user:manage'), UsersController.getUsers);
router.post('/', authorize('user:manage'), UsersController.createUser);
router.put('/:id', authorize('user:manage'), UsersController.updateUser);
router.patch('/:id/status', authorize('user:manage'), UsersController.updateStatus);
router.post('/:id/reset-password', authorize('user:manage'), UsersController.resetPassword);

module.exports = router;
