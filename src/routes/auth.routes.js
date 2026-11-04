const express = require('express');
const { authenticate } = require('../middlewares/auth');
const AuthController = require('../controllers/auth.controller');

const router = express.Router();

router.post('/login', AuthController.login);
router.get('/me', authenticate, AuthController.getMe);
router.put('/me/password', authenticate, AuthController.changePassword);

module.exports = router;
