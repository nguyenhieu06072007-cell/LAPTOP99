/**
 * Migration script: Create new tables (customers, orders, promotions, product_reviews)
 * and seed sample data matching the frontend mock data.
 *
 * Usage: node src/scripts/create-new-tables.js
 */

const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: '127.0.0.1',
  user: 'root',
  password: '',
  database: 'laptop_shop',
  charset: 'utf8mb4',
  decimalNumbers: true,
  multipleStatements: false,
};

async function run() {
  const conn = await mysql.createConnection(DB_CONFIG);
  console.log('✅ Connected to MySQL');

  try {
    /* ------------------------------------------------------------------ */
    /* 1. CREATE TABLES                                                     */
    /* ------------------------------------------------------------------ */
    await conn.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        code        VARCHAR(20)  UNIQUE NOT NULL,
        full_name   VARCHAR(100) NOT NULL,
        phone       VARCHAR(20),
        email       VARCHAR(150),
        tier        ENUM('Khách mới','Thân thiết','VIP') DEFAULT 'Khách mới',
        branch      VARCHAR(100) DEFAULT 'Toàn hệ thống (HQ)',
        total_spent DECIMAL(15,0) DEFAULT 0,
        order_count INT DEFAULT 0,
        notes       TEXT,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ Table customers OK');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        code             VARCHAR(30)  UNIQUE NOT NULL,
        customer_id      INT UNSIGNED,
        customer_name    VARCHAR(100) NOT NULL,
        customer_phone   VARCHAR(20),
        product_id       INT UNSIGNED,
        product_name     VARCHAR(255) NOT NULL,
        sku              VARCHAR(50),
        serial_number    VARCHAR(100),
        quantity         INT DEFAULT 1,
        unit_price       DECIMAL(15,0) NOT NULL,
        total_amount     DECIMAL(15,0) NOT NULL,
        discount_amount  DECIMAL(15,0) DEFAULT 0,
        payment_method   VARCHAR(100)  DEFAULT 'Tiền mặt',
        payment_status   ENUM('pending','paid','collecting','refunded') DEFAULT 'pending',
        gateway_code     VARCHAR(100),
        gateway_fee      DECIMAL(15,0) DEFAULT 0,
        net_received     DECIMAL(15,0) DEFAULT 0,
        status           ENUM('pending','confirmed','shipping','delivered','cancelled') DEFAULT 'pending',
        branch           VARCHAR(100)  DEFAULT 'Toàn hệ thống (HQ)',
        assigned_to      INT UNSIGNED,
        notes            TEXT,
        ordered_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
        FOREIGN KEY (product_id)  REFERENCES products(id)  ON DELETE SET NULL,
        FOREIGN KEY (assigned_to) REFERENCES users(id)     ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ Table orders OK');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS promotions (
        id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        code             VARCHAR(50)  UNIQUE NOT NULL,
        title            VARCHAR(255) NOT NULL,
        type             ENUM('percent','cash','combo') DEFAULT 'percent',
        discount_value   DECIMAL(15,0) NOT NULL DEFAULT 0,
        min_order_value  DECIMAL(15,0) DEFAULT 0,
        target_category  VARCHAR(100)  DEFAULT 'Tất cả các dòng laptop',
        gifts            TEXT,
        max_uses         INT DEFAULT 100,
        used_count       INT DEFAULT 0,
        start_date       DATE NOT NULL,
        end_date         DATE NOT NULL,
        status           ENUM('active','scheduled','ended') DEFAULT 'active',
        created_by       INT UNSIGNED,
        created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ Table promotions OK');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS product_reviews (
        id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        customer_id       INT UNSIGNED,
        customer_name     VARCHAR(100) NOT NULL,
        product_id        INT UNSIGNED,
        product_name      VARCHAR(255) NOT NULL,
        rating            TINYINT NOT NULL CHECK(rating BETWEEN 1 AND 5),
        title             VARCHAR(255),
        comment           TEXT,
        sentiment         ENUM('positive','neutral','negative') DEFAULT 'neutral',
        verified_purchase TINYINT(1) DEFAULT 0,
        admin_reply       TEXT,
        replied_by        INT UNSIGNED,
        replied_at        TIMESTAMP NULL,
        status            ENUM('pending','replied','hidden') DEFAULT 'pending',
        source            ENUM('customer','staff') DEFAULT 'customer',
        created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
        FOREIGN KEY (product_id)  REFERENCES products(id)  ON DELETE SET NULL,
        FOREIGN KEY (replied_by)  REFERENCES users(id)     ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ Table product_reviews OK');

    /* ------------------------------------------------------------------ */
    /* 2. SEED – check if rows already exist before inserting              */
    /* ------------------------------------------------------------------ */

    /* --- customers --- */
    const [[{ cust_count }]] = await conn.query('SELECT COUNT(*) AS cust_count FROM customers');
    if (Number(cust_count) === 0) {
      await conn.query(`
        INSERT INTO customers
          (code, full_name, phone, email, tier, branch, total_spent, order_count, notes)
        VALUES
          ('CUST-1001','Nguyễn Văn An','0901234567','an.nguyen@email.com','VIP','Toàn hệ thống (HQ)',285000000,6,'Khách hàng VIP, ưu tiên chăm sóc'),
          ('CUST-1002','Trần Thị Bình','0912345678','binh.tran@email.com','Thân thiết','Chi nhánh Q1',156000000,4,'Khách hàng thân thiết, hay mua laptop gaming'),
          ('CUST-1003','Lê Hoàng Cường','0923456789','cuong.le@email.com','Thân thiết','Chi nhánh Q7',98000000,3,NULL),
          ('CUST-1004','Phạm Thị Dung','0934567890','dung.pham@email.com','Khách mới','Toàn hệ thống (HQ)',32000000,1,'Khách mới, mua laptop học tập'),
          ('CUST-1005','Hoàng Minh Em','0945678901','em.hoang@email.com','Khách mới','Chi nhánh Q1',0,0,NULL)
      `);
      console.log('✅ Seeded 5 customers');
    } else {
      console.log(`⏭  customers already has ${cust_count} rows – skip seed`);
    }

    /* resolve first product id for orders seed */
    const [[firstProduct]] = await conn.query('SELECT id, name, sku FROM products LIMIT 1');
    const productId  = firstProduct ? firstProduct.id   : null;
    const productName = firstProduct ? firstProduct.name : 'Laptop Demo';
    const productSku  = firstProduct ? firstProduct.sku  : 'DEMO-001';

    /* resolve first user id */
    const [[firstUser]] = await conn.query('SELECT id FROM users LIMIT 1');
    const userId = firstUser ? firstUser.id : null;

    /* resolve customer ids for FK */
    const [custRows] = await conn.query('SELECT id FROM customers ORDER BY id LIMIT 5');
    const c = custRows.map((r) => r.id);

    /* --- orders --- */
    const [[{ ord_count }]] = await conn.query('SELECT COUNT(*) AS ord_count FROM orders');
    if (Number(ord_count) === 0) {
      await conn.query(`
        INSERT INTO orders
          (code, customer_id, customer_name, customer_phone,
           product_id, product_name, sku, serial_number,
           quantity, unit_price, total_amount, discount_amount,
           payment_method, payment_status, gateway_code, gateway_fee, net_received,
           status, branch, assigned_to, notes)
        VALUES
          ('DH-2026-001',?,?,?,(SELECT id FROM products LIMIT 1),?,?,?,
           1,28000000,28000000,0,
           'Tiền mặt','paid',NULL,0,28000000,
           'delivered','Toàn hệ thống (HQ)',?,'Giao thành công'),
          ('DH-2026-002',?,?,?,?,?,?,?,
           1,35000000,35000000,500000,
           'Chuyển khoản','paid','CK-20260405',0,34500000,
           'shipping','Chi nhánh Q1',?,NULL),
          ('DH-2026-003',?,?,?,?,?,?,?,
           1,45000000,45000000,0,
           'VNPAY','paid','VNPAY-20260406',450000,44550000,
           'confirmed','Chi nhánh Q7',?,NULL),
          ('DH-2026-004',?,?,?,?,?,?,?,
           1,22000000,22000000,1000000,
           'Tiền mặt','pending',NULL,0,0,
           'pending','Toàn hệ thống (HQ)',?,'Chờ khách xác nhận'),
          ('DH-2026-005',?,?,?,?,?,?,?,
           1,32000000,32000000,0,
           'MoMo','refunded','MOMO-20260407',320000,0,
           'cancelled','Chi nhánh Q1',?,'Khách huỷ đơn')
      `, [
        // order 1
        c[0] ?? null, 'Nguyễn Văn An', '0901234567',
        productName, productSku, 'SN-LT-001001',
        userId,
        // order 2
        c[1] ?? null, 'Trần Thị Bình', '0912345678',
        productId, productName, productSku, 'SN-LT-002001',
        userId,
        // order 3
        c[2] ?? null, 'Lê Hoàng Cường', '0923456789',
        productId, productName, productSku, 'SN-LT-003001',
        userId,
        // order 4
        c[3] ?? null, 'Phạm Thị Dung', '0934567890',
        productId, productName, productSku, 'SN-LT-004001',
        userId,
        // order 5
        c[1] ?? null, 'Trần Thị Bình', '0912345678',
        productId, productName, productSku, 'SN-LT-005001',
        userId,
      ]);
      console.log('✅ Seeded 5 orders');
    } else {
      console.log(`⏭  orders already has ${ord_count} rows – skip seed`);
    }

    /* --- promotions --- */
    const [[{ promo_count }]] = await conn.query('SELECT COUNT(*) AS promo_count FROM promotions');
    if (Number(promo_count) === 0) {
      await conn.query(`
        INSERT INTO promotions
          (code, title, type, discount_value, min_order_value,
           target_category, gifts, max_uses, used_count,
           start_date, end_date, status, created_by)
        VALUES
          ('SUMMER2026','Khuyến mãi Hè 2026','percent',10,20000000,
           'Tất cả các dòng laptop','["Balo laptop","Chuột không dây"]',200,87,
           '2026-06-01','2026-08-31','active',?),
          ('BACK2SCHOOL','Mùa tựu trường','percent',8,15000000,
           'Laptop học sinh / sinh viên','["Tai nghe","Bộ vệ sinh laptop"]',500,312,
           '2026-08-01','2026-09-30','active',?),
          ('GAMING500K','Giảm 500K Laptop Gaming','cash',500000,30000000,
           'Laptop Gaming','[]',100,23,
           '2026-09-15','2026-10-15','active',?),
          ('COMBO_OFFICE','Combo Văn phòng','combo',0,25000000,
           'Laptop văn phòng','["Office 365 (1 năm)","Túi chống sốc"]',150,0,
           '2026-11-01','2026-11-30','scheduled',?)
      `, [userId, userId, userId, userId]);
      console.log('✅ Seeded 4 promotions');
    } else {
      console.log(`⏭  promotions already has ${promo_count} rows – skip seed`);
    }

    /* --- product_reviews --- */
    const [[{ rev_count }]] = await conn.query('SELECT COUNT(*) AS rev_count FROM product_reviews');
    if (Number(rev_count) === 0) {
      await conn.query(`
        INSERT INTO product_reviews
          (customer_id, customer_name, product_id, product_name,
           rating, title, comment, sentiment, verified_purchase,
           admin_reply, replied_by, replied_at, status, source)
        VALUES
          (?,?,?,?,'5','Rất hài lòng','Laptop mạnh, pin bền, giao hàng nhanh. Sẽ mua lại lần sau!','positive',1,NULL,NULL,NULL,'pending','customer'),
          (?,?,?,?,'4','Hàng tốt','Máy chạy mượt, cấu hình ổn với giá tiền. Màn hình đẹp.','positive',1,
           'Cảm ơn bạn đã tin tưởng cửa hàng! Chúc bạn dùng máy vui vẻ.',?,NOW(),'replied','customer'),
          (?,?,?,?,'3','Tạm được','Pin không được như quảng cáo, chỉ dùng được 4-5 tiếng.','neutral',1,NULL,NULL,NULL,'pending','customer'),
          (?,?,?,?,'2','Không hài lòng','Máy nóng khi chơi game, tiếng ồn quạt to.','negative',1,
           'Bạn vui lòng mang máy đến cửa hàng để kỹ thuật kiểm tra và vệ sinh tản nhiệt.',?,NOW(),'replied','customer'),
          (?,?,?,?,'5','Tuyệt vời','Cấu hình cao, màn hình sắc nét. Đáng đồng tiền bát gạo!','positive',1,NULL,NULL,NULL,'pending','customer'),
          (?,?,?,?,'5','Đánh giá từ nhân viên tư vấn','Sản phẩm phù hợp cho đồ hoạ, màu sắc chuẩn, build chắc chắn.','positive',0,NULL,NULL,NULL,'pending','staff'),
          (?,?,?,?,'4','Nhân viên kỹ thuật đánh giá','Tản nhiệt tốt, không thấy throttle khi test benchmark.','positive',0,NULL,NULL,NULL,'pending','staff'),
          (?,?,?,?,'5','Review từ Sale Team','Khách phản hồi tích cực sau 1 tuần sử dụng. Không phát sinh lỗi.','positive',0,NULL,NULL,NULL,'pending','staff')
      `, [
        // review 1
        c[0] ?? null, 'Nguyễn Văn An', productId, productName,
        // review 2
        c[1] ?? null, 'Trần Thị Bình', productId, productName, userId,
        // review 3
        c[2] ?? null, 'Lê Hoàng Cường', productId, productName,
        // review 4
        c[3] ?? null, 'Phạm Thị Dung', productId, productName, userId,
        // review 5
        c[0] ?? null, 'Nguyễn Văn An', productId, productName,
        // review 6 (staff)
        null, 'Nhân viên tư vấn', productId, productName,
        // review 7 (staff)
        null, 'Kỹ thuật viên', productId, productName,
        // review 8 (staff)
        null, 'Sale Executive', productId, productName,
      ]);
      console.log('✅ Seeded 8 product_reviews (5 customer + 3 staff)');
    } else {
      console.log(`⏭  product_reviews already has ${rev_count} rows – skip seed`);
    }

    console.log('\n🎉 Migration completed successfully.');
  } finally {
    await conn.end();
  }
}

run().catch((err) => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
