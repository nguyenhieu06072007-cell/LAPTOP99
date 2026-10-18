const { pool } = require('../config/db');

async function updateBanners() {
  await pool.query(`
    UPDATE banners SET
      title = 'MacBook Chính Hãng VN/A',
      highlight_text = 'Hiệu Năng Vượt Trội & Pin 18 Giờ',
      subtitle = 'Trợ giá thu cũ đổi mới tới 2.500.000₫. Trả góp 0% duyệt 5 phút. Tặng túi chống sốc cao cấp & Chuột không dây.',
      badge_text = 'CHÍNH HÃNG APPLE VN/A · BẢO HÀNH 12T',
      badge_style = 'blue',
      bg_theme = 'blue',
      tab_title = 'MacBook VN/A',
      tab_sub = 'Ưu đãi sinh viên',
      image_url = '/uploads/products/real-macbook-pro.jpg',
      specs_json = 'Apple M3 Chip,RAM 16GB Unified,SSD 512GB Siêu Tốc,Màn hình Liquid Retina',
      custom_price = 27990000,
      custom_old_price = 31990000,
      image_mode = 'background',
      content_position = 'left',
      image_position = 'right center',
      overlay_style = 'gradient_dark'
    WHERE sort_order = 1
  `);

  await pool.query(`
    UPDATE banners SET
      title = 'Laptop Gaming RTX 40-Series',
      highlight_text = 'Chiến Mọi Game AAA & Tần Số Quét 165Hz',
      subtitle = 'Card đồ họa NVIDIA GeForce RTX thế hệ mới, tản nhiệt buồng hơi siêu mát, tặng kèm bộ Gear Gaming chuyên nghiệp.',
      badge_text = 'GEFORCE RTX 40-SERIES · 165Hz+',
      badge_style = 'red',
      bg_theme = 'indigo',
      tab_title = 'Gaming RTX 40-Series',
      tab_sub = 'Tặng bộ Gear Gaming',
      image_url = '/uploads/products/real-asus-rog.jpg',
      specs_json = 'Core i7-14650HX,GeForce RTX 4060,RAM 16GB DDR5,SSD 1TB Gen4',
      custom_price = 26990000,
      custom_old_price = 30990000,
      image_mode = 'background',
      content_position = 'left',
      image_position = 'center center',
      overlay_style = 'gradient_dark'
    WHERE sort_order = 2
  `);

  await pool.query(`
    UPDATE banners SET
      title = 'Laptop Doanh Nhân & Văn Phòng',
      highlight_text = 'Mỏng Nhẹ Tinh Tế & Chuẩn Quân Đội',
      subtitle = 'Khung nhôm nguyên khối siêu bền, pin cả ngày dài và bảo mật vân tay. Dịch vụ bảo hành tận nơi On-site 24/7.',
      badge_text = 'CHUẨN DOANH NHÂN · BẢO HÀNH TẬN NƠI',
      badge_style = 'blue',
      bg_theme = 'emerald',
      tab_title = 'Laptop Văn Phòng',
      tab_sub = 'Bền bỉ, pin trâu',
      image_url = '/uploads/products/real-dell-xps.jpg',
      specs_json = 'Intel Core Ultra 7,OLED 3K Chuẩn Màu,RAM 32GB,SSD 1TB NVMe',
      custom_price = 34990000,
      custom_old_price = 38990000,
      image_mode = 'background',
      content_position = 'left',
      image_position = 'right center',
      overlay_style = 'gradient_dark'
    WHERE sort_order = 3
  `);

  await pool.query(`
    UPDATE banners SET
      title = 'Đại Tiệc Laptop AI Copilot',
      highlight_text = 'Giảm Sâu Đến 35% Giờ Vàng',
      subtitle = 'Trải nghiệm NPU AI thông minh hỗ trợ lập trình và đồ họa sáng tạo. Nhập mã LAPTOP99 giảm thêm 5% khi thanh toán.',
      badge_text = 'NEXT-GEN AI PC · DEAL GIỜ VÀNG',
      badge_style = 'red',
      bg_theme = 'rose',
      tab_title = 'Laptop AI Copilot',
      tab_sub = 'Giảm đến 35%',
      image_url = '/uploads/products/real-asus-zenbook.jpg',
      specs_json = 'NPU AI Boost,Màn OLED 2.8K,RAM 32GB,Trọng lượng 1.2kg',
      custom_price = 24990000,
      custom_old_price = 28990000,
      image_mode = 'background',
      content_position = 'left',
      image_position = 'center center',
      overlay_style = 'gradient_dark'
    WHERE sort_order = 4
  `);

  console.log('UPDATED BANNERS IN DB SUCCESSFULLY');
  process.exit(0);
}

updateBanners().catch(e => { console.error(e); process.exit(1); });

