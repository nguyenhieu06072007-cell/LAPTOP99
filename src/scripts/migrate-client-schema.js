const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const DB_CONFIG = {
  host: '127.0.0.1',
  user: 'root',
  password: '',
  database: 'laptop_shop',
  charset: 'utf8mb4',
  decimalNumbers: true,
  multipleStatements: false,
};

async function migrate() {
  const conn = await mysql.createConnection(DB_CONFIG);
  console.log('✅ Connected to MySQL for client schema migration');

  try {
    // 1. Alter customers table: add password_hash and address if not exists
    const [custCols] = await conn.query('DESCRIBE customers');
    const custColNames = custCols.map((c) => c.Field);

    if (!custColNames.includes('password_hash')) {
      await conn.query('ALTER TABLE customers ADD COLUMN password_hash VARCHAR(255) NULL AFTER email');
      console.log('✅ Added password_hash to customers');
    }
    if (!custColNames.includes('address')) {
      await conn.query('ALTER TABLE customers ADD COLUMN address VARCHAR(255) NULL AFTER phone');
      console.log('✅ Added address to customers');
    }

    // Set default password '123456' for existing customers if password_hash is NULL
    const defaultHash = await bcrypt.hash('123456', 10);
    await conn.query('UPDATE customers SET password_hash = ? WHERE password_hash IS NULL', [defaultHash]);
    await conn.query("UPDATE customers SET address = '12 Trần Duy Hưng, Cầu Giấy, Hà Nội' WHERE email = 'an.nguyen@email.com' AND (address IS NULL OR address = '')");
    await conn.query("UPDATE customers SET address = '45 Lê Lợi, Quận 1, TP.HCM' WHERE email = 'binh.tran@email.com' AND (address IS NULL OR address = '')");

    // Also ensure demo account khach@demo.vn exists
    const [khach] = await conn.query("SELECT id FROM customers WHERE email = 'khach@demo.vn'");
    if (khach.length === 0) {
      await conn.query(`
        INSERT INTO customers (code, full_name, phone, address, email, password_hash, tier, total_spent, order_count)
        VALUES ('CUST-1000', 'Nguyễn Văn An', '0901234567', '12 Trần Duy Hưng, Cầu Giấy, Hà Nội', 'khach@demo.vn', ?, 'VIP', 285000000, 6)
      `, [defaultHash]);
      console.log('✅ Created demo customer khach@demo.vn');
    }

    // 2. Alter orders table: add shipping_address, coupon_code, items_json
    const [orderCols] = await conn.query('DESCRIBE orders');
    const orderColNames = orderCols.map((c) => c.Field);

    if (!orderColNames.includes('shipping_address')) {
      await conn.query('ALTER TABLE orders ADD COLUMN shipping_address VARCHAR(255) NULL AFTER customer_phone');
      console.log('✅ Added shipping_address to orders');
    }
    if (!orderColNames.includes('coupon_code')) {
      await conn.query('ALTER TABLE orders ADD COLUMN coupon_code VARCHAR(50) NULL AFTER discount_amount');
      console.log('✅ Added coupon_code to orders');
    }
    if (!orderColNames.includes('items_json')) {
      await conn.query('ALTER TABLE orders ADD COLUMN items_json JSON NULL AFTER notes');
      console.log('✅ Added items_json to orders');
    }

    // 3. Create trade_ins table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS trade_ins (
        id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        code             VARCHAR(30) UNIQUE NOT NULL,
        customer_id      INT UNSIGNED,
        customer_name    VARCHAR(100),
        customer_phone   VARCHAR(20),
        brand            VARCHAR(50) NOT NULL,
        model            VARCHAR(100) NOT NULL,
        year             INT NOT NULL,
        ram              INT NOT NULL,
        condition_desc   VARCHAR(50) NOT NULL,
        estimated_price  DECIMAL(15,0) NOT NULL,
        final_price      DECIMAL(15,0) NULL,
        status           ENUM('Chờ định giá','Đã định giá','Đã chấp nhận','Đã dùng') DEFAULT 'Chờ định giá',
        created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ Table trade_ins OK');

    // 4. Create rmas table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS rmas (
        id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        code             VARCHAR(30) UNIQUE NOT NULL,
        order_id         INT UNSIGNED,
        order_code       VARCHAR(30) NOT NULL,
        product_id       INT UNSIGNED,
        product_name     VARCHAR(255),
        customer_id      INT UNSIGNED,
        type             ENUM('Đổi','Trả') DEFAULT 'Đổi',
        reason           TEXT NOT NULL,
        status           ENUM('Chờ duyệt','Đã duyệt','Từ chối','Hoàn tất') DEFAULT 'Chờ duyệt',
        created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
        FOREIGN KEY (product_id)  REFERENCES products(id)  ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ Table rmas OK');

    // 5. Create news table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS news (
        id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        title            VARCHAR(255) NOT NULL,
        tag              VARCHAR(50) NOT NULL,
        body             TEXT NOT NULL,
        is_published     TINYINT(1) DEFAULT 1,
        created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ Table news OK');

    // Seed news if empty
    const [[{ news_count }]] = await conn.query('SELECT COUNT(*) AS news_count FROM news');
    if (Number(news_count) === 0) {
      await conn.query(`
        INSERT INTO news (title, tag, body, is_published, created_at)
        VALUES
        ('Chọn laptop theo nhu cầu: 5 câu hỏi cần trả lời trước khi mua', 'Hướng dẫn',
         'Trước khi so sánh cấu hình, hãy xác định bạn dùng máy để làm gì, mang đi bao nhiêu lần mỗi tuần và ngân sách tối đa là bao nhiêu.\\n\\nVới học tập và văn phòng, RAM 8GB và SSD 512GB là đủ. Nếu dựng video hoặc chơi game, hãy ưu tiên GPU rời và màn hình có độ phủ màu tốt.\\n\\nCuối cùng, đừng quên kiểm tra chính sách bảo hành: máy có được tra cứu theo số S/N không, đổi trả trong bao nhiêu ngày.',
         1, DATE_SUB(NOW(), INTERVAL 6 DAY)),
        ('Thu cũ đổi mới: cách định giá máy cũ minh bạch', 'Dịch vụ',
         'Giá thu mua dựa vào hãng, năm sản xuất, dung lượng RAM và tình trạng thực tế của máy.\\n\\nBạn có thể ước tính ngay trên website, sau đó mang máy đến cửa hàng để kỹ thuật viên kiểm tra và chốt giá. Số tiền này được trừ trực tiếp vào đơn hàng mới.',
         1, DATE_SUB(NOW(), INTERVAL 12 DAY)),
        ('Chip Apple M3 và Intel Core Ultra: khác nhau ở đâu?', 'Công nghệ',
         'Apple M3 mạnh ở hiệu quả năng lượng và hiệu năng đa nhiệm trên cùng một khối chip. Intel Core Ultra bổ sung NPU cho tác vụ AI và cải thiện đồ họa tích hợp Arc.\\n\\nVới người dùng văn phòng, cả hai đều quá đủ. Điểm khác biệt nằm ở hệ điều hành và phần mềm bạn đang dùng.',
         1, DATE_SUB(NOW(), INTERVAL 20 DAY)),
        ('Bản nháp: kế hoạch khuyến mãi mùa tựu trường', 'Nội bộ',
         'Đang chờ duyệt.',
         0, DATE_SUB(NOW(), INTERVAL 1 DAY))
      `);
    }

    // Ensure active promotions through end of 2026
    await conn.query("UPDATE promotions SET end_date = '2026-12-31', status = 'active' WHERE code IN ('SUMMER2026', 'GAMING500K')");
    const [existLaptop99] = await conn.query("SELECT id FROM promotions WHERE code = 'LAPTOP99'");
    if (existLaptop99.length === 0) {
      await conn.query(`
        INSERT INTO promotions (code, title, type, discount_value, min_order_value, start_date, end_date, status, max_uses, used_count)
        VALUES ('LAPTOP99', 'Giảm 5% cho đơn từ 10 triệu', 'percent', 5, 10000000, '2026-01-01', '2026-12-31', 'active', 500, 12)
      `);
      console.log('✅ Created LAPTOP99 promo code');
    }


    console.log('🎉 Client schema migration completed successfully!');
  } finally {
    await conn.end();
  }
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
