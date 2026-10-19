const { pool } = require('../config/db');
const { escapeLike, pageMeta } = require('../utils/helpers');

const USER_COLS = `u.id, u.role_id, r.name AS role, r.display_name AS role_display_name,
  r.badge_color, r.permissions AS role_permissions,
  u.full_name, u.email, u.phone, u.status, u.branch, u.data_visibility, u.custom_permissions,
  u.locked_until, u.last_login_at, u.created_at, u.updated_at`;

const PERMISSIONS_CATALOG = [
  {
    module: 'product',
    module_name: 'Sản phẩm & Biến thể',
    description: 'Quản lý catalog laptop, thông số CPU/RAM/GPU, biến thể cấu hình',
    permissions: [
      { id: 'product:read', name: 'Xem danh sách sản phẩm', desc: 'Xem thông tin cơ bản của các dòng máy' },
      { id: 'product:write', name: 'Thêm & Sửa sản phẩm', desc: 'Tạo sản phẩm mới, cập nhật giá bán, thông số cấu hình' },
      { id: 'product:delete', name: 'Xoá sản phẩm', desc: 'Xoá hoặc lưu trữ sản phẩm không còn kinh doanh' },
      { id: 'cost:read', name: 'Xem giá vốn / Giá nhập', desc: 'Bảo mật: Chỉ Kế toán, Super Admin mới được thấy giá nhập và biên lợi nhuận' },
      { id: 'catalog:write', name: 'Quản lý Hãng & Danh mục', desc: 'Thêm/sửa danh mục laptop, thương hiệu, banner & bộ lọc' },
    ],
  },
  {
    module: 'media_import',
    module_name: 'Hình ảnh & Batch Import',
    description: 'Xử lý media WebP, watermark logo, nạp file ZIP/Excel hàng loạt',
    permissions: [
      { id: 'media:upload', name: 'Upload & Đóng dấu ảnh', desc: 'Upload ảnh thật, tự động nén WebP và chèn logo bản quyền' },
      { id: 'import:batch', name: 'Nhập liệu hàng loạt (ZIP/Excel)', desc: 'Upload file Excel thông số và file ZIP tự map hàng nghìn ảnh' },
    ],
  },
  {
    module: 'inventory',
    module_name: 'Kho hàng & Serial / IMEI',
    description: 'Quản lý xuất nhập tồn, tra cứu mã định danh từng máy vật lý',
    permissions: [
      { id: 'inventory:read', name: 'Xem tồn kho', desc: 'Xem số lượng khả dụng, tồn kho thực tế theo từng SKU' },
      { id: 'inventory:write', name: 'Tạo phiếu Nhập / Xuất kho', desc: 'Tạo và duyệt phiếu nhập từ hãng, phiếu xuất giao khách' },
      { id: 'inventory:serial:manage', name: 'Quản lý Serial (S/N) & IMEI', desc: 'Gắn mã S/N duy nhất cho từng máy vật lý' },
      { id: 'inventory:alert:config', name: 'Cấu hình cảnh báo kho đỏ', desc: 'Cài đặt ngưỡng tồn kho tối thiểu' },
    ],
  },
  {
    module: 'order',
    module_name: 'Đơn hàng & Kanban',
    description: 'Xử lý đơn đặt hàng, Kanban board, điều phối giao hàng',
    permissions: [
      { id: 'order:read:all', name: 'Xem tất cả đơn hàng', desc: 'Xem đơn hàng của toàn bộ công ty / tất cả nhân viên' },
      { id: 'order:read:own', name: 'Chỉ xem đơn của chính mình', desc: 'Bảo mật Data Visibility: Sale chỉ thấy đơn do mình phụ trách' },
      { id: 'order:write', name: 'Tạo & Chuyển trạng thái đơn', desc: 'Cập nhật từ Chờ duyệt -> Đã xác nhận -> Đang giao' },
      { id: 'order:discount:approve', name: 'Duyệt chiết khấu / Giảm giá', desc: 'Phê duyệt giá bán ưu đãi ngoài chương trình' },
      { id: 'order:cancel', name: 'Huỷ đơn & Hoàn hàng', desc: 'Huỷ đơn và hoàn trả sản phẩm vào kho' },
      { id: 'order:print', name: 'In hoá đơn VAT & Vận đơn', desc: 'Kết xuất PDF hoá đơn VAT, phiếu xuất kho' },
    ],
  },
  {
    module: 'aftersales',
    module_name: 'Bảo hành, Đổi trả & Thu cũ',
    description: 'Dịch vụ hậu mãi chuyên nghiệp chuẩn chuỗi bán lẻ laptop',
    permissions: [
      { id: 'warranty:read', name: 'Tra cứu Bảo hành điện tử', desc: 'Tra cứu thời hạn bảo hành hãng theo S/N / IMEI' },
      { id: 'warranty:write', name: 'Tiếp nhận & Sửa chữa', desc: 'Tạo phiếu tiếp nhận bảo hành, đổi linh kiện' },
      { id: 'rma:manage', name: 'Quản lý Đổi trả 1-1 (RMA)', desc: 'Thẩm định lỗi kỹ thuật phần cứng trong 30 ngày, duyệt đổi máy' },
      { id: 'tradein:estimate', name: 'Thẩm định Thu cũ đổi mới', desc: 'Định giá máy cũ theo ngoại hình/chức năng, áp dụng trợ giá hãng' },
    ],
  },
  {
    module: 'finance',
    module_name: 'Tài chính, Báo cáo & Doanh thu',
    description: 'Dòng tiền, đối soát thanh toán trực tuyến, báo cáo P&L',
    permissions: [
      { id: 'report:read', name: 'Xem Dashboard & Báo cáo tổng', desc: 'Biểu đồ doanh thu thực, tỷ trọng sản phẩm bán chạy' },
      { id: 'finance:read', name: 'Xem dòng tiền & Lợi nhuận gộp', desc: 'Xem doanh thu ròng, chi phí vốn và lợi nhuận từng đơn' },
      { id: 'finance:reconcile', name: 'Đối soát cổng thanh toán', desc: 'Đối soát VNPAY, MoMo, Chuyển khoản ngân hàng' },
      { id: 'report:export', name: 'Xuất file Báo cáo Excel/PDF', desc: 'Tải về báo cáo kiểm toán doanh thu, tồn kho' },
    ],
  },
  {
    module: 'system',
    module_name: 'Phân quyền & Hệ thống (RBAC)',
    description: 'Bảo mật phân quyền, quản trị nhân sự và kiểm toán hệ thống',
    permissions: [
      { id: 'user:manage', name: 'Quản lý Tài khoản & Phân quyền', desc: 'Tạo tài khoản nhân viên, thiết lập vai trò, cấp quyền trực tiếp' },
      { id: 'role:manage', name: 'Tạo & Chỉnh sửa Vai trò (Roles)', desc: 'Tạo nhóm vai trò mới, cấu hình ma trận quyền hạn' },
      { id: 'audit:read', name: 'Xem Nhật ký hệ thống (Audit Trail)', desc: 'Kiểm tra vết thao tác của nhân viên chống gian lận' },
      { id: 'security:policy', name: 'Cấu hình Chính sách Bảo mật', desc: 'Bật 2FA bắt buộc, ẩn số điện thoại khách hàng, timeout' },
    ],
  },
];

function parsePerms(raw) {
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : (raw || []);
  } catch {
    return [];
  }
}

const UserModel = {
  USER_COLS,
  PERMISSIONS_CATALOG,

  async findForLogin(email) {
    const [rows] = await pool.query(
      `SELECT u.*, r.name AS role FROM users u JOIN roles r ON r.id = u.role_id WHERE u.email = ?`,
      [email]
    );
    return rows[0] || null;
  },

  async updateLoginFailed(id, failed) {
    await pool.query('UPDATE users SET failed_logins = ? WHERE id = ?', [failed, id]);
  },

  async lockUser(id, until) {
    await pool.query('UPDATE users SET failed_logins = 0, locked_until = ? WHERE id = ?', [until, id]);
  },

  async resetLoginSuccess(id) {
    await pool.query(
      'UPDATE users SET failed_logins = 0, locked_until = NULL, last_login_at = ? WHERE id = ?',
      [new Date(), id]
    );
  },

  async getPasswordHash(id) {
    const [[u]] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [id]);
    return u ? u.password_hash : null;
  },

  async updatePassword(id, hash) {
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, id]);
  },

  async getRoles() {
    const [rows] = await pool.query(
      'SELECT id, name, display_name, description, badge_color, permissions FROM roles ORDER BY id'
    );
    return rows.map((r) => ({
      ...r,
      permissions: parsePerms(r.permissions),
    }));
  },

  async findRoleByName(name) {
    const [existing] = await pool.query('SELECT id FROM roles WHERE name = ?', [name]);
    return existing[0] || null;
  },

  async findRoleById(id) {
    const [[role]] = await pool.query('SELECT * FROM roles WHERE id = ?', [id]);
    if (!role) return null;
    return { ...role, permissions: parsePerms(role.permissions) };
  },

  async createRole(data) {
    const [result] = await pool.query(
      'INSERT INTO roles (name, display_name, description, badge_color, permissions) VALUES (?, ?, ?, ?, ?)',
      [data.name, data.display_name, data.description || null, data.badge_color, JSON.stringify(data.permissions || [])]
    );
    return this.findRoleById(result.insertId);
  },

  async updateRole(id, updates) {
    const payload = { ...updates };
    if (payload.permissions !== undefined) {
      payload.permissions = JSON.stringify(payload.permissions || []);
    }
    await pool.query('UPDATE roles SET ? WHERE id = ?', [payload, id]);
    return this.findRoleById(id);
  },

  async getUsers({ page, limit, offset, search, role_id, branch, status }) {
    const where = [];
    const params = [];
    if (search) {
      const s = `%${escapeLike(search)}%`;
      where.push('(u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)');
      params.push(s, s, s);
    }
    if (role_id) { where.push('u.role_id = ?'); params.push(role_id); }
    if (branch) { where.push('u.branch = ?'); params.push(branch); }
    if (status) { where.push('u.status = ?'); params.push(status); }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM users u ${w}`, params);
    const [rows] = await pool.query(
      `SELECT ${USER_COLS} FROM users u JOIN roles r ON r.id = u.role_id ${w}
       ORDER BY u.id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    const formatted = rows.map((u) => {
      const customPerms = parsePerms(u.custom_permissions);
      const rolePerms = parsePerms(u.role_permissions);
      return {
        ...u,
        custom_permissions: customPerms,
        role_permissions: rolePerms,
        all_permissions: [...new Set([...rolePerms, ...customPerms])],
      };
    });

    return { rows: formatted, meta: pageMeta(page, limit, total) };
  },

  async findUserById(id) {
    const [[user]] = await pool.query(
      `SELECT ${USER_COLS} FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ?`,
      [id]
    );
    if (!user) return null;
    const customPerms = parsePerms(user.custom_permissions);
    const rolePerms = parsePerms(user.role_permissions);
    return {
      ...user,
      custom_permissions: customPerms,
      role_permissions: rolePerms,
      all_permissions: [...new Set([...rolePerms, ...customPerms])],
    };
  },

  async findUserRawById(id) {
    const [[user]] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    return user || null;
  },

  async findUserByEmail(email) {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    return existing[0] || null;
  },

  async createUser(data) {
    const [result] = await pool.query(
      `INSERT INTO users (role_id, full_name, email, password_hash, phone, branch, data_visibility, custom_permissions)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.role_id,
        data.full_name,
        data.email,
        data.password_hash,
        data.phone ?? null,
        data.branch || 'Toàn hệ thống (HQ)',
        data.data_visibility || 'all',
        data.custom_permissions ? JSON.stringify(data.custom_permissions) : null,
      ]
    );
    return this.findUserById(result.insertId);
  },

  async updateUser(id, updateData) {
    const payload = { ...updateData };
    if (payload.custom_permissions !== undefined) {
      payload.custom_permissions = payload.custom_permissions ? JSON.stringify(payload.custom_permissions) : null;
    }
    await pool.query('UPDATE users SET ? WHERE id = ?', [payload, id]);
    return this.findUserById(id);
  },

  async updateStatus(id, status) {
    const [result] = await pool.query(
      'UPDATE users SET status = ?, failed_logins = 0, locked_until = NULL WHERE id = ?',
      [status, id]
    );
    return result.affectedRows > 0;
  },

  async resetPassword(id, hash) {
    const [result] = await pool.query(
      'UPDATE users SET password_hash = ?, failed_logins = 0, locked_until = NULL WHERE id = ?',
      [hash, id]
    );
    return result.affectedRows > 0;
  },
};

module.exports = UserModel;

