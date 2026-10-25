const { pool } = require('../config/db');

const DashboardModel = {
  async getDashboardData({ range = '30d', withCost = false }) {
    // 1. Tóm tắt sản phẩm & tồn kho
    const [[summary]] = await pool.query(
      `SELECT COUNT(*) AS total_products,
              COALESCE(SUM(status = 'active'), 0) AS active,
              COALESCE(SUM(status = 'draft'), 0) AS draft,
              COALESCE(SUM(status = 'hidden'), 0) AS hidden,
              COALESCE(SUM(status = 'discontinued'), 0) AS discontinued,
              COALESCE(SUM(stock_quantity = 0), 0) AS out_of_stock,
              COALESCE(SUM(stock_quantity > 0 AND stock_quantity <= low_stock_threshold), 0) AS low_stock,
              COALESCE(SUM(stock_quantity), 0) AS units_in_stock,
              COALESCE(SUM(stock_quantity * price), 0) AS stock_retail_value,
              COALESCE(SUM(stock_quantity * cost_price), 0) AS stock_cost_value,
              COALESCE(SUM(sold_count), 0) AS total_sold
         FROM products WHERE deleted_at IS NULL`);
    if (!withCost) delete summary.stock_cost_value;

    const [byBrand] = await pool.query(
      `SELECT b.id, b.name, COUNT(p.id) AS product_count, COALESCE(SUM(p.stock_quantity), 0) AS units_in_stock
         FROM brands b LEFT JOIN products p ON p.brand_id = b.id AND p.deleted_at IS NULL
        GROUP BY b.id, b.name ORDER BY product_count DESC, b.name`);

    const [byCategory] = await pool.query(
      `SELECT c.id, c.name, COUNT(p.id) AS product_count, COALESCE(SUM(p.stock_quantity), 0) AS units_in_stock
         FROM categories c LEFT JOIN products p ON p.category_id = c.id AND p.deleted_at IS NULL
        GROUP BY c.id, c.name ORDER BY product_count DESC, c.name`);

    const [topSold] = await pool.query(
      `SELECT id, sku, name, sold_count, COALESCE(sale_price, price) AS price FROM products
        WHERE deleted_at IS NULL AND sold_count > 0 ORDER BY sold_count DESC LIMIT 5`);

    const [topViewed] = await pool.query(
      `SELECT id, sku, name, view_count, price FROM products
        WHERE deleted_at IS NULL ORDER BY view_count DESC LIMIT 5`);

    const [recentMovements] = await pool.query(
      `SELECT m.id, p.sku, p.name AS product_name, m.type, m.quantity, m.created_at
         FROM inventory_movements m JOIN products p ON p.id = m.product_id
        ORDER BY m.id DESC LIMIT 10`);

    // 2. Thống kê số lượng & doanh thu từ bảng orders THẬT
    let orderStats = { total_revenue: 0, total_orders: 0, new_orders: 0, total_customers: 0 };
    let recentOrders = [];
    let revenueTimeline = [];
    let orderStatusDist = [];

    try {
      let dateFilter = '1=1';
      if (range === 'today') {
        dateFilter = 'DATE(ordered_at) = CURDATE()';
      } else if (range === '7d') {
        dateFilter = 'ordered_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
      } else if (range === 'quarter') {
        dateFilter = 'ordered_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)';
      } else if (range === 'year') {
        dateFilter = 'ordered_at >= DATE_SUB(NOW(), INTERVAL 365 DAY)';
      } else {
        dateFilter = 'ordered_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
      }

      const [[os]] = await pool.query(`
        SELECT
          COALESCE(SUM(CASE WHEN status != 'cancelled' AND payment_status = 'paid' THEN total_amount ELSE 0 END), 0) AS total_revenue,
          COALESCE(SUM(CASE WHEN status = 'delivered' AND payment_status = 'paid' THEN total_amount ELSE 0 END), 0) AS delivered_revenue,
          COALESCE(SUM(CASE WHEN status != 'cancelled' THEN 1 ELSE 0 END), 0) AS total_orders,
          COALESCE(SUM(status = 'pending'), 0) AS new_orders
        FROM orders
        WHERE ${dateFilter}
      `);

      const [[{ total_customers }]] = await pool.query('SELECT COUNT(*) AS total_customers FROM customers');
      orderStats = { ...os, total_customers };

      // Danh sách 10 đơn gần đây
      const [ro] = await pool.query(`
        SELECT o.id, o.code, o.customer_name, o.customer_phone, o.product_name,
               o.total_amount, o.status, o.payment_status, o.ordered_at, o.serial_number,
               c.tier AS customer_tier
          FROM orders o
          LEFT JOIN customers c ON c.id = o.customer_id
         ORDER BY o.ordered_at DESC, o.id DESC LIMIT 10
      `);
      recentOrders = ro;

      // 3. Biểu đồ doanh thu
      if (range === 'today') {
        const [hourly] = await pool.query(`
          SELECT 
            HOUR(ordered_at) as hour_num,
            COALESCE(SUM(total_amount), 0) as doanhThu,
            COUNT(*) as donHang
          FROM orders
          WHERE DATE(ordered_at) = CURDATE() AND status != 'cancelled' AND payment_status = 'paid'
          GROUP BY HOUR(ordered_at)
          ORDER BY hour_num
        `);
        const hoursMap = {};
        hourly.forEach((h) => { hoursMap[h.hour_num] = h; });

        revenueTimeline = [8, 10, 12, 14, 16, 18, 20, 22].map((h) => ({
          name: `${h}:00`,
          doanhThu: Number(hoursMap[h]?.doanhThu || 0),
          donHang: Number(hoursMap[h]?.donHang || 0),
        }));
      } else if (range === '7d') {
        const [daily] = await pool.query(`
          SELECT 
            DATE_FORMAT(ordered_at, '%d/%m') as day_label,
            DATE(ordered_at) as order_date,
            COALESCE(SUM(total_amount), 0) as doanhThu,
            COUNT(*) as donHang
          FROM orders
          WHERE ordered_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) AND status != 'cancelled' AND payment_status = 'paid'
          GROUP BY DATE(ordered_at), day_label
          ORDER BY order_date ASC
        `);

        const days = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dayStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
          const found = daily.find((x) => x.day_label === dayStr);
          days.push({
            name: dayStr,
            doanhThu: found ? Number(found.doanhThu) : 0,
            donHang: found ? Number(found.donHang) : 0,
          });
        }
        revenueTimeline = days;
      } else {
        const [weekly] = await pool.query(`
          SELECT 
            CASE 
              WHEN ordered_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 'Tuần 4 (Mới nhất)'
              WHEN ordered_at >= DATE_SUB(NOW(), INTERVAL 14 DAY) THEN 'Tuần 3'
              WHEN ordered_at >= DATE_SUB(NOW(), INTERVAL 21 DAY) THEN 'Tuần 2'
              ELSE 'Tuần 1'
            END as week_label,
            COALESCE(SUM(total_amount), 0) as doanhThu,
            COUNT(*) as donHang
          FROM orders
          WHERE ${dateFilter} AND status != 'cancelled' AND payment_status = 'paid'
          GROUP BY week_label
        `);

        const weekMap = {};
        weekly.forEach((w) => { weekMap[w.week_label] = w; });
        revenueTimeline = [
          { name: 'Tuần 1', doanhThu: Number(weekMap['Tuần 1']?.doanhThu || 0), donHang: Number(weekMap['Tuần 1']?.donHang || 0) },
          { name: 'Tuần 2', doanhThu: Number(weekMap['Tuần 2']?.doanhThu || 0), donHang: Number(weekMap['Tuần 2']?.donHang || 0) },
          { name: 'Tuần 3', doanhThu: Number(weekMap['Tuần 3']?.doanhThu || 0), donHang: Number(weekMap['Tuần 3']?.donHang || 0) },
          { name: 'Tuần 4', doanhThu: Number(weekMap['Tuần 4 (Mới nhất)']?.doanhThu || 0), donHang: Number(weekMap['Tuần 4 (Mới nhất)']?.donHang || 0) },
        ];
      }

      // 4. Biểu đồ tròn trạng thái đơn
      const [statusRows] = await pool.query(`
        SELECT status, COUNT(*) as cnt
        FROM orders
        WHERE ${dateFilter}
        GROUP BY status
      `);

      const statusConfig = {
        delivered: { name: 'Hoàn thành', color: '#10b981' },
        shipping:  { name: 'Đang giao',  color: '#3b82f6' },
        confirmed: { name: 'Đã xác nhận',color: '#8b5cf6' },
        pending:   { name: 'Chờ duyệt',  color: '#f59e0b' },
        cancelled: { name: 'Đã huỷ',    color: '#ef4444' },
      };

      orderStatusDist = Object.keys(statusConfig).map((stKey) => {
        const match = statusRows.find((r) => r.status === stKey);
        return {
          key: stKey,
          name: statusConfig[stKey].name,
          value: match ? Number(match.cnt) : 0,
          color: statusConfig[stKey].color,
        };
      }).filter((item) => item.value > 0);

      if (orderStatusDist.length === 0) {
        orderStatusDist = [
          { name: 'Chưa có đơn', value: 1, color: '#94a3b8' }
        ];
      }
    } catch (err) {
      console.error('Error fetching real orders data in dashboard:', err);
    }

    // 5. Tỷ trọng danh mục laptop thực tế
    const colors = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
    const categoryDistribution = byCategory.map((c, i) => ({
      name: c.name,
      value: Number(c.product_count),
      units: Number(c.units_in_stock),
      color: colors[i % colors.length],
    }));

    return {
      summary,
      total_revenue:   orderStats.total_revenue,
      total_orders:    orderStats.total_orders,
      new_orders:      orderStats.new_orders,
      total_customers: orderStats.total_customers,
      recent_orders:   recentOrders,
      by_brand: byBrand,
      by_category: byCategory,
      top_sold: topSold,
      top_viewed: topViewed,
      recent_movements: recentMovements,
      revenue_timeline: revenueTimeline,
      order_status: orderStatusDist,
      category_distribution: categoryDistribution,
    };
  },
};

module.exports = DashboardModel;

