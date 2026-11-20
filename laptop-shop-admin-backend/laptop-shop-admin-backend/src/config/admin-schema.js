// Additive schema for installations created from older SQL dumps.
async function ensureAdminSchema(pool) {
  await pool.query(`CREATE TABLE IF NOT EXISTS admin_schema_migrations (
    name VARCHAR(100) PRIMARY KEY
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await pool.query(`CREATE TABLE IF NOT EXISTS admin_order_assignments (
    order_id INT UNSIGNED PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await pool.query(`CREATE TABLE IF NOT EXISTS admin_order_serials (
    serial VARCHAR(100) PRIMARY KEY,
    order_id INT UNSIGNED NOT NULL,
    KEY admin_order_serial_order_idx (order_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await pool.query(`CREATE TABLE IF NOT EXISTS admin_warranty_cases (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id INT UNSIGNED NOT NULL,
    serial VARCHAR(100) NOT NULL,
    issue VARCHAR(1000) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'received',
    history JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY admin_warranty_order_serial_idx (order_id, serial)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await pool.query(`CREATE TABLE IF NOT EXISTS admin_notification_reads (
    user_id INT UNSIGNED NOT NULL,
    event_id VARCHAR(150) NOT NULL,
    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, event_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await pool.query(`CREATE TABLE IF NOT EXISTS admin_rma_refunds (
    rma_id INT UNSIGNED PRIMARY KEY,
    order_id INT UNSIGNED NOT NULL,
    amount DECIMAL(15,0) NOT NULL,
    reference VARCHAR(100) NOT NULL UNIQUE,
    confirmed_by INT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY admin_rma_refunds_order_idx (order_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await pool.query(`CREATE TABLE IF NOT EXISTS admin_inventory_receipts (
    movement_id INT UNSIGNED PRIMARY KEY,
    supplier VARCHAR(150) NOT NULL,
    warehouse VARCHAR(150) NOT NULL,
    request_key CHAR(36) NOT NULL,
    batch_line SMALLINT UNSIGNED NOT NULL,
    UNIQUE KEY admin_receipt_batch_row (request_key, batch_line)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await pool.query(`CREATE TABLE IF NOT EXISTS admin_inventory_serials (
    serial VARCHAR(100) PRIMARY KEY,
    movement_id INT UNSIGNED NOT NULL,
    KEY admin_inventory_serial_movement_idx (movement_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [migration] = await conn.query('INSERT IGNORE INTO admin_schema_migrations (name) VALUES (?)', ['admin-role-grants-v1']);
    if (migration.affectedRows) {
      const { normalizePermissionList } = require('./permissions');
      const additions = {
        sales_manager: ['order:assign'],
        accountant: ['finance:refund', 'report:export', 'report:send'],
        product_manager: ['inventory:write'],
        warehouse_manager: ['inventory:alert:config'],
      };
      for (const [name, grants] of Object.entries(additions)) {
        const [[role]] = await conn.query('SELECT permissions FROM roles WHERE name = ? FOR UPDATE', [name]);
        if (!role || role.permissions == null) continue;
        const permissions = normalizePermissionList(role.permissions);
        const prerequisites = { sales_manager: 'order:write', accountant: 'finance:reconcile',
          product_manager: 'import:batch', warehouse_manager: 'inventory:write' };
        if (!permissions.includes(prerequisites[name])) continue;
        await conn.query('UPDATE roles SET permissions = ? WHERE name = ?',
          [JSON.stringify([...new Set([...permissions, ...grants])]), name]);
      }
    }
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
module.exports = { ensureAdminSchema };
