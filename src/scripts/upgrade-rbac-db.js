const { pool } = require('../config/db');

async function upgrade() {
  console.log('--- Starting RBAC database upgrade ---');

  // 1. Check & Alter users table
  const [colsUsers] = await pool.query('SHOW COLUMNS FROM users');
  const userFields = colsUsers.map(c => c.Field);

  if (!userFields.includes('branch')) {
    await pool.query("ALTER TABLE users ADD COLUMN branch VARCHAR(100) DEFAULT 'Toàn hệ thống (HQ)'");
    console.log('✓ Added branch to users');
  }
  if (!userFields.includes('data_visibility')) {
    await pool.query("ALTER TABLE users ADD COLUMN data_visibility VARCHAR(50) DEFAULT 'all'");
    console.log('✓ Added data_visibility to users');
  }
  if (!userFields.includes('custom_permissions')) {
    await pool.query("ALTER TABLE users ADD COLUMN custom_permissions TEXT NULL");
    console.log('✓ Added custom_permissions to users');
  }

  // 2. Check & Alter roles table
  const [colsRoles] = await pool.query('SHOW COLUMNS FROM roles');
  const roleFields = colsRoles.map(c => c.Field);
  if (!roleFields.includes('permissions')) {
    await pool.query("ALTER TABLE roles ADD COLUMN permissions TEXT NULL");
    console.log('✓ Added permissions to roles');
  }
  if (!roleFields.includes('badge_color')) {
    await pool.query("ALTER TABLE roles ADD COLUMN badge_color VARCHAR(50) DEFAULT 'blue'");
    console.log('✓ Added badge_color to roles');
  }
  if (!roleFields.includes('display_name')) {
    await pool.query("ALTER TABLE roles ADD COLUMN display_name VARCHAR(100) NULL");
    console.log('✓ Added display_name to roles');
  }

  // 3. Seed / Update standard enterprise roles
  const standardRoles = [
    {
      name: 'super_admin',
      display_name: 'Super Admin (Quản trị tối cao)',
      description: 'Toàn quyền điều hành hệ thống, quản lý tài khoản, cấu hình bảo mật và xem toàn bộ dữ liệu tài chính.',
      badge_color: 'purple',
      permissions: JSON.stringify(['*'])
    },
    {
      name: 'sales_manager',
      display_name: 'Trưởng phòng Kinh doanh',
      description: 'Quản lý toàn bộ đơn hàng, duyệt chiết khấu/khuyến mãi, phân công nhân viên sale và xem báo cáo bán hàng.',
      badge_color: 'indigo',
      permissions: JSON.stringify([
        'order:read:all', 'order:write', 'order:discount:approve', 'order:cancel',
        'product:read', 'customer:read', 'customer:write',
        'promotion:read', 'promotion:write', 'report:sales'
      ])
    },
    {
      name: 'sales_executive',
      display_name: 'Nhân viên Bán hàng (Sale)',
      description: 'Tạo và xử lý đơn hàng cá nhân, tư vấn khách hàng, tra cứu thông số máy. Ẩn giá vốn và doanh số tổng.',
      badge_color: 'blue',
      permissions: JSON.stringify([
        'order:read:own', 'order:write',
        'product:read', 'customer:read', 'customer:write',
        'promotion:read'
      ])
    },
    {
      name: 'warehouse_manager',
      display_name: 'Thủ kho (Kho vận & S/N)',
      description: 'Quản lý xuất nhập tồn, quét mã Serial/IMEI vật lý, kiểm định nhập hàng. ẨN GIÁ VỐN & DOANH THU.',
      badge_color: 'amber',
      permissions: JSON.stringify([
        'inventory:read', 'inventory:write', 'inventory:serial:manage',
        'import:batch', 'product:read'
      ])
    },
    {
      name: 'accountant',
      display_name: 'Kế toán & Tài chính',
      description: 'Kiểm soát giá vốn, biên lợi nhuận, đối soát cổng thanh toán trực tuyến, xuất hoá đơn VAT.',
      badge_color: 'emerald',
      permissions: JSON.stringify([
        'cost:read', 'report:read', 'finance:read', 'finance:reconcile',
        'order:read:all', 'inventory:read', 'product:read'
      ])
    },
    {
      name: 'technical_warranty',
      display_name: 'Kỹ thuật viên & Bảo hành (RMA)',
      description: 'Tra cứu Serial bảo hành hãng, kiểm định kỹ thuật 1 đổi 1 trong 30 ngày, thẩm định thu cũ đổi mới.',
      badge_color: 'cyan',
      permissions: JSON.stringify([
        'warranty:read', 'warranty:write', 'rma:manage', 'tradein:estimate',
        'product:read', 'inventory:serial:read'
      ])
    },
    {
      name: 'content_seo',
      display_name: 'Biên tập & Danh mục (Catalog)',
      description: 'Thêm sửa cấu hình laptop, upload ảnh WebP đóng dấu bản quyền, quản lý banner & bộ lọc thông minh.',
      badge_color: 'teal',
      permissions: JSON.stringify([
        'product:read', 'product:write', 'catalog:write', 'media:upload'
      ])
    }
  ];

  for (const r of standardRoles) {
    const [existing] = await pool.query('SELECT id FROM roles WHERE name = ?', [r.name]);
    if (existing.length > 0) {
      await pool.query(
        'UPDATE roles SET display_name = ?, description = ?, badge_color = ?, permissions = ? WHERE id = ?',
        [r.display_name, r.description, r.badge_color, r.permissions, existing[0].id]
      );
      console.log(`✓ Updated role: ${r.name}`);
    } else {
      await pool.query(
        'INSERT INTO roles (name, display_name, description, badge_color, permissions) VALUES (?, ?, ?, ?, ?)',
        [r.name, r.display_name, r.description, r.badge_color, r.permissions]
      );
      console.log(`✓ Inserted new role: ${r.name}`);
    }
  }

  // Update existing users with default values
  await pool.query("UPDATE users SET branch = 'Toàn hệ thống (HQ)', data_visibility = 'all' WHERE branch IS NULL OR branch = ''");

  // Add a sample sales user, warehouse user, and accountant if only 1 user exists
  const [userCount] = await pool.query('SELECT COUNT(*) as cnt FROM users');
  if (userCount[0].cnt < 4) {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('Admin@123456', 10);

    const [salesRole] = await pool.query("SELECT id FROM roles WHERE name = 'sales_executive'");
    const [whRole] = await pool.query("SELECT id FROM roles WHERE name = 'warehouse_manager'");
    const [accRole] = await pool.query("SELECT id FROM roles WHERE name = 'accountant'");

    if (salesRole.length) {
      await pool.query(
        "INSERT INTO users (role_id, full_name, email, password_hash, phone, branch, data_visibility, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [salesRole[0].id, 'Nguyễn Văn Hùng (Sale HN)', 'hung.sale@laptopshop.vn', hash, '0981122334', 'Chi nhánh Hà Nội', 'own', 'active']
      );
    }
    if (whRole.length) {
      await pool.query(
        "INSERT INTO users (role_id, full_name, email, password_hash, phone, branch, data_visibility, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [whRole[0].id, 'Trần Minh Đức (Thủ kho HCM)', 'duc.kho@laptopshop.vn', hash, '0972233445', 'Chi nhánh TP.HCM', 'branch', 'active']
      );
    }
    if (accRole.length) {
      await pool.query(
        "INSERT INTO users (role_id, full_name, email, password_hash, phone, branch, data_visibility, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [accRole[0].id, 'Phạm Thuỳ Linh (Kế toán)', 'linh.ketoan@laptopshop.vn', hash, '0913344556', 'Toàn hệ thống (HQ)', 'all', 'active']
      );
    }
    console.log('✓ Added sample role users for live demo');
  }

  console.log('--- RBAC Database Upgrade Successful! ---');
  process.exit(0);
}

upgrade().catch(err => {
  console.error('Upgrade failed:', err);
  process.exit(1);
});
