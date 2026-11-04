require('dotenv').config();
const mysql = require('mysql2/promise');

const config = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'laptop_shop',
  ssl: process.env.DB_SSL === 'true' ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined
};

async function runMigration() {
  const conn = await mysql.createConnection(config);
  console.log('Connected to MySQL Database for migration...');

  // 1. Create password_resets table
  console.log('1. Ensuring password_resets table exists...');
  await conn.query(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      customer_id INT UNSIGNED NOT NULL,
      identifier VARCHAR(150) NOT NULL,
      otp_hash VARCHAR(255) NOT NULL,
      attempts TINYINT UNSIGNED DEFAULT 0,
      expires_at DATETIME NOT NULL,
      used_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_identifier (identifier),
      INDEX idx_customer (customer_id)
    )
  `);
  console.log('  -> password_resets ready.');

  // 2. Check and add columns to orders
  console.log('2. Updating orders table schema...');
  const [orderCols] = await conn.query('SHOW COLUMNS FROM orders');
  const orderFields = orderCols.map(c => c.Field);

  if (!orderFields.includes('payment_verification_status')) {
    await conn.query(`
      ALTER TABLE orders ADD COLUMN payment_verification_status ENUM('none', 'pending_verification', 'verified', 'rejected') DEFAULT 'none'
    `);
    console.log('  -> Added payment_verification_status to orders');
  }

  if (!orderFields.includes('trade_in_id')) {
    await conn.query(`
      ALTER TABLE orders ADD COLUMN trade_in_id INT UNSIGNED NULL
    `);
    console.log('  -> Added trade_in_id to orders');
  }

  if (!orderFields.includes('trade_in_discount')) {
    await conn.query(`
      ALTER TABLE orders ADD COLUMN trade_in_discount DECIMAL(15,0) DEFAULT 0
    `);
    console.log('  -> Added trade_in_discount to orders');
  }

  if (!orderFields.includes('idempotency_key')) {
    await conn.query(`
      ALTER TABLE orders ADD COLUMN idempotency_key VARCHAR(100) NULL
    `);
    console.log('  -> Added idempotency_key to orders');
  }

  if (!orderFields.includes('delivered_at')) {
    await conn.query(`
      ALTER TABLE orders ADD COLUMN delivered_at DATETIME NULL
    `);
    console.log('  -> Added delivered_at to orders');
  }

  // 3. Check and add columns to trade_ins
  console.log('3. Updating trade_ins table schema...');
  const [tiCols] = await conn.query('SHOW COLUMNS FROM trade_ins');
  const tiFields = tiCols.map(c => c.Field);

  if (!tiFields.includes('used_in_order_id')) {
    await conn.query(`
      ALTER TABLE trade_ins ADD COLUMN used_in_order_id INT UNSIGNED NULL
    `);
    console.log('  -> Added used_in_order_id to trade_ins');
  }

  // 4. Sanitize orders.net_received (Fix Requirement 8: unpaid orders should not have net_received)
  console.log('4. Sanitizing historical net_received for unpaid orders...');
  const [fixNetResult] = await conn.query(`
    UPDATE orders 
    SET net_received = 0 
    WHERE payment_status = 'unpaid' AND net_received > 0
  `);
  console.log(`  -> Sanitized ${fixNetResult.affectedRows} unpaid orders with net_received > 0.`);

  // 5. Sanitize customer total_spent and tier (Fix Requirement 16)
  console.log('5. Re-syncing customer total_spent and tier based on delivered & paid orders only...');
  const [customers] = await conn.query('SELECT id FROM customers');
  for (const c of customers) {
    const [[stats]] = await conn.query(`
      SELECT COUNT(*) AS cnt, COALESCE(SUM(total_amount), 0) AS spent
      FROM orders
      WHERE customer_id = ? AND status = 'delivered' AND payment_status = 'paid'
    `, [c.id]);
    const spent = Number(stats.spent || 0);
    const tier = spent >= 100000000 ? 'VIP' : spent >= 30000000 ? 'Thân thiết' : 'Khách mới';
    await conn.query(`
      UPDATE customers 
      SET order_count = ?, total_spent = ?, tier = ?
      WHERE id = ?
    `, [Number(stats.cnt || 0), spent, tier, c.id]);
  }
  console.log(`  -> Synchronized stats for ${customers.length} customers.`);

  await conn.end();
  console.log('MIGRATION COMPLETED SUCCESSFULLY!');
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
