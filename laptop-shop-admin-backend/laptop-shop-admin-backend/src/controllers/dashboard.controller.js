const { z } = require('zod');
const DashboardModel = require('../models/dashboard.model');
const { can, orderScope } = require('../config/permissions');
const { ApiError, asyncHandler } = require('../utils/helpers');

const filters = z.object({
  range: z.enum(['today', '7d', '30d', 'quarter', 'year', 'all']).default('30d'),
  branch: z.string().trim().max(150).default(''),
  category_id: z.union([z.literal('all'), z.literal(''), z.string().regex(/^\d+$/)]).default(''),
});
const getData = (user, options) => DashboardModel.getDashboardData({
  ...options, scope: orderScope(user), withCost: can(user, 'cost:read'),
});

const DashboardController = {
  getDashboard: asyncHandler(async (req, res) => {
    const data = await getData(req.user, filters.parse(req.query));
    res.json({ data });
  }),

  emailReport: asyncHandler(async (req, res) => {
    const key = process.env.RESEND_API_KEY;
    const sender = process.env.ADMIN_REPORT_FROM_EMAIL;
    if (!key || !sender) throw new ApiError(503, 'Chưa cấu hình dịch vụ gửi email báo cáo');
    const { recipient, notes, ...options } = filters.extend({
      recipient: z.string().email().max(150), notes: z.string().trim().max(1000).default(''),
    }).parse(req.body);
    const data = await getData(req.user, options);
    const money = (value) => value == null ? 'Chưa có số liệu' : Number(value).toLocaleString('vi-VN') + ' ₫';
    const lines = [
      notes, `Kỳ báo cáo: ${options.range}`,
      `Chi nhánh: ${options.branch || 'Tất cả trong phạm vi được cấp'}`,
      `Danh mục: ${options.category_id || 'Tất cả'}`,
      `Đơn đã thanh toán: ${data.paid_orders ?? 'Chưa có số liệu'}`,
      `Doanh thu đã thu: ${money(data.total_revenue)}`,
      `COD chờ thu: ${money(data.cod_pending)}`,
    ];
    if (can(req.user, 'cost:read')) {
      lines.push(`Giá vốn: ${money(data.cogs)}`, `Lợi nhuận gộp: ${money(data.gross_profit)}`);
    }
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: sender, to: [recipient], subject: 'Báo cáo LAPTOP99', text: lines.join('\n') }),
      signal: AbortSignal.timeout(10000),
    }).catch(() => null);
    if (!response?.ok) throw new ApiError(502, 'Dịch vụ email chưa nhận báo cáo. Kiểm tra cấu hình hoặc thử lại sau.');
    const { id } = await response.json();
    res.status(202).json({ data: { id } });
  }),
};

module.exports = DashboardController;
