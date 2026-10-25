const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const env = require('../config/env');
const { pool } = require('../config/db');
const { ROLE_PERMISSIONS } = require('../config/permissions');
const { ApiError, asyncHandler } = require('../utils/helpers');
const { writeAudit } = require('../services/audit');
const UserModel = require('../models/user.model');

// Hash giả để thời gian phản hồi không lộ việc email có tồn tại hay không
const DUMMY_HASH = bcrypt.hashSync('dummy-password', 10);

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
});

const pwSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự').max(72),
});

const AuthController = {
  login: asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);

    const user = await UserModel.findForLogin(email);
    const BAD = new ApiError(401, 'Email hoặc mật khẩu không đúng');

    if (!user) {
      await bcrypt.compare(password, DUMMY_HASH);
      throw BAD;
    }
    if (user.status !== 'active') throw new ApiError(403, 'Tài khoản đã bị khoá, vui lòng liên hệ quản trị viên');
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      throw new ApiError(423, 'Tài khoản tạm thời bị khoá do đăng nhập sai nhiều lần, vui lòng thử lại sau');
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      const failed = user.failed_logins + 1;
      if (failed >= env.MAX_FAILED_LOGINS) {
        const until = new Date(Date.now() + env.LOCK_MINUTES * 60 * 1000);
        await UserModel.lockUser(user.id, until);
        await writeAudit(pool, req, { userId: user.id, action: 'lockout', entity: 'user', entityId: user.id });
      } else {
        await UserModel.updateLoginFailed(user.id, failed);
      }
      throw BAD;
    }

    await UserModel.resetLoginSuccess(user.id);
    await writeAudit(pool, req, { userId: user.id, action: 'login', entity: 'user', entityId: user.id });

    const rolePerms = ROLE_PERMISSIONS[user.role] || [];
    let customPerms = [];
    try {
      customPerms = typeof user.custom_permissions === 'string' ? JSON.parse(user.custom_permissions) : (user.custom_permissions || []);
    } catch {
      customPerms = [];
    }
    const combinedPerms = [...new Set([...rolePerms, ...customPerms])];

    const token = jwt.sign(
      { sub: user.id, role: user.role, type: 'staff' },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );
    res.json({
      data: {
        token,
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          branch: user.branch,
          data_visibility: user.data_visibility,
          permissions: combinedPerms
        },
      },
    });
  }),

  getMe: asyncHandler(async (req, res) => {
    const rolePerms = ROLE_PERMISSIONS[req.user.role] || [];
    const customPerms = req.user.custom_permissions || [];
    const combinedPerms = [...new Set([...rolePerms, ...customPerms])];
    res.json({ data: { ...req.user, permissions: combinedPerms } });
  }),

  changePassword: asyncHandler(async (req, res) => {
    const { current_password, new_password } = pwSchema.parse(req.body);
    const currentHash = await UserModel.getPasswordHash(req.user.id);
    if (!currentHash || !(await bcrypt.compare(current_password, currentHash))) {
      throw new ApiError(400, 'Mật khẩu hiện tại không đúng');
    }
    const hash = await bcrypt.hash(new_password, 10);
    await UserModel.updatePassword(req.user.id, hash);
    await writeAudit(pool, req, { action: 'change_password', entity: 'user', entityId: req.user.id });
    res.json({ data: { message: 'Đã đổi mật khẩu' } });
  }),
};

module.exports = AuthController;

