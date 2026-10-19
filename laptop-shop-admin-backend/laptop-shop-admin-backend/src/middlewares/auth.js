const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { pool } = require('../config/db');
const { can } = require('../config/permissions');
const { ApiError, asyncHandler } = require('../utils/helpers');

/** Xác thực JWT, rồi đọc lại user từ DB để việc khoá tài khoản có hiệu lực ngay. */
const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new ApiError(401, 'Chưa đăng nhập');

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch {
    throw new ApiError(401, 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn');
  }

  const [rows] = await pool.query(
    `SELECT u.id, u.email, u.full_name, u.status, u.locked_until, u.branch, u.data_visibility, u.custom_permissions, r.name AS role
       FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ?`,
    [payload.sub],
  );
  const u = rows[0];
  if (!u) throw new ApiError(401, 'Tài khoản không tồn tại');
  if (u.status !== 'active') throw new ApiError(403, 'Tài khoản đã bị khoá');
  if (u.locked_until && new Date(u.locked_until) > new Date()) {
    throw new ApiError(423, 'Tài khoản đang bị khoá tạm thời');
  }
  let customPerms = [];
  try {
    customPerms = typeof u.custom_permissions === 'string' ? JSON.parse(u.custom_permissions) : (u.custom_permissions || []);
  } catch {
    customPerms = [];
  }
  req.user = {
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    role: u.role,
    branch: u.branch,
    data_visibility: u.data_visibility,
    custom_permissions: customPerms,
  };
  next();
});

/** Yêu cầu có đủ TẤT CẢ quyền được liệt kê. */
const authorize = (...perms) => (req, res, next) => {
  if (!perms.every((p) => can(req.user, p))) {
    throw new ApiError(403, 'Bạn không có quyền thực hiện thao tác này');
  }
  next();
};

module.exports = { authenticate, authorize };
