// Additive schema for installations created from older SQL dumps.
async function ensureAdminSchema(pool) {
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
    row_number SMALLINT UNSIGNED NOT NULL,
    UNIQUE KEY admin_receipt_batch_row (request_key, row_number)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await pool.query(`CREATE TABLE IF NOT EXISTS admin_inventory_serials (
    serial VARCHAR(100) PRIMARY KEY,
    movement_id INT UNSIGNED NOT NULL,
    KEY admin_inventory_serial_movement_idx (movement_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}
module.exports = { ensureAdminSchema };
