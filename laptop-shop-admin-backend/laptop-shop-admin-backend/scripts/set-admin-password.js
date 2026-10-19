/**
 * Đặt mật khẩu (bcrypt) cho 1 tài khoản đã có trong bảng users.
 *   npm run set-admin-password -- admin@laptopshop.vn "MatKhauManh@123"
 */
const bcrypt = require('bcryptjs');
const { pool } = require('../src/config/db');

(async () => {
  const [email, password] = process.argv.slice(2);
  if (!email || !password || password.length < 8) {
    console.error('Cách dùng: npm run set-admin-password -- <email> "<mật khẩu >= 8 ký tự>"');
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, 10);
  const [r] = await pool.query(
    'UPDATE users SET password_hash = ?, failed_logins = 0, locked_until = NULL, status = \'active\' WHERE email = ?',
    [hash, email.toLowerCase()]);
  console.log(r.affectedRows ? `Đã cập nhật mật khẩu cho ${email}` : `Không tìm thấy tài khoản ${email}`);
  await pool.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
