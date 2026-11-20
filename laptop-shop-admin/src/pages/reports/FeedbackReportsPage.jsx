import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../api/axios';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  HiOutlineChartBarSquare,
  HiOutlineArrowTrendingUp,
  HiOutlineArrowTrendingDown,
  HiOutlineCurrencyDollar,
  HiOutlineShoppingBag,
  HiOutlineArchiveBox,
  HiOutlineExclamationTriangle,
  HiOutlineArrowDownTray,
  HiOutlineSparkles,
  HiStar,
  HiOutlineUserGroup,
  HiOutlineMagnifyingGlass,
  HiOutlineClock,
  HiOutlineXMark,
  HiOutlineTag,
  HiOutlinePrinter,
  HiOutlineEnvelope,
  HiOutlineArrowPath,
  HiOutlineShieldCheck,
  HiOutlineWrenchScrewdriver,
  HiOutlineCreditCard,
  HiOutlineBuildingStorefront,
  HiOutlineDevicePhoneMobile,
  HiOutlineReceiptPercent,
  HiOutlineChatBubbleLeftRight,
  HiOutlineCheckCircle,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const fmtVND = (n) =>
  n == null ? '—' : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n || 0);

function ReportTable({ title, columns, rows }) {
  return <section className="overflow-x-auto rounded-xl border bg-white p-4">
    <h2 className="mb-3 text-sm font-bold">{title}</h2>
    {rows.length ? <table className="w-full text-left">
      <thead><tr className="bg-gray-50">{columns.map((column) => <th key={column} className="p-2">{column}</th>)}</tr></thead>
      <tbody>{rows.map((row, index) => <tr key={index} className="border-t">{row.map((value, i) => <td key={i} className="p-2">{value ?? '—'}</td>)}</tr>)}</tbody>
    </table> : <p className="text-gray-500">Chưa có dữ liệu cho mục này.</p>}
  </section>;
}

const percent = (value) => value == null ? '—' : `${value}%`;
const CHART_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b', '#f97316'];

export default function FeedbackReportsPage() {
  const { can } = useAuth();

  // 9 Modules Báo cáo theo đúng chuẩn yêu cầu
  // 'revenue' | 'orders' | 'products' | 'inventory' | 'customers' | 'warranty' | 'marketing' | 'staff' | 'finance'
  const [params] = useSearchParams();
  const notifyCustomers = params.get('tab') === 'customers';
  const [activeTab, setActiveTab] = useState(notifyCustomers ? 'customers' : 'revenue');
  useEffect(() => { if (notifyCustomers) setActiveTab('customers'); }, [notifyCustomers]);

  // Bộ lọc toàn cục
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Dữ liệu BI & Tài chính
  const [biData, setBiData] = useState(null);
  const [biError, setBiError] = useState(false);
  const [biLoading, setBiLoading] = useState(true);
  const reportRequest = useRef(0);

  // Reviews & Đánh giá khách hàng
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [starFilter, setStarFilter] = useState('');
  const [searchCustomer, setSearchCustomer] = useState('');
  const [replyingReview, setReplyingReview] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  // Modal Gửi Báo Cáo Qua Email
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailForm, setEmailForm] = useState({
    recipient: '',
    notes: 'Kính gửi Ban Giám Đốc báo cáo tình hình kinh doanh thời gian thực từ hệ thống LAPTOP99.',
  });
  const [sendingEmail, setSendingEmail] = useState(false);

  // Tải dữ liệu BI tổng hợp
  const fetchBiReports = useCallback(async () => {
    const request = ++reportRequest.current;
    try {
      setBiLoading(true);
      setBiError(false);
      const { data } = await api.get('/dashboard', {
        params: { range: timeRange, branch: selectedBranch, category_id: selectedCategory },
      });
      if (request === reportRequest.current) setBiData(data.data);
    } catch {
      if (request === reportRequest.current) {
        setBiData(null);
        setBiError(true);
      }
    } finally {
      if (request === reportRequest.current) setBiLoading(false);
    }
  }, [timeRange, selectedBranch, selectedCategory]);

  // Tải đánh giá khách hàng khi vào tab Khách hàng
  const fetchReviews = useCallback(async () => {
    if (activeTab !== 'customers') return;
    try {
      setReviewsLoading(true);
      const res = await api.get('/reviews', {
        params: {
          rating: starFilter || undefined,
          search: searchCustomer || undefined,
          limit: 50,
        },
      });
      setReviews(res.data?.data || []);
    } catch (err) {
      console.warn('Lỗi tải đánh giá:', err);
    } finally {
      setReviewsLoading(false);
    }
  }, [activeTab, starFilter, searchCustomer]);

  useEffect(() => {
    fetchBiReports();
  }, [fetchBiReports]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Trả lời phản hồi đánh giá
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!can('review:manage')) return;
    if (!replyText.trim()) return toast.error('Vui lòng nhập nội dung phản hồi');

    setSubmittingReply(true);
    try {
      await api.post(`/reviews/${replyingReview.id}/reply`, {
        admin_reply: replyText.trim(),
      });
      setReviews((prev) =>
        prev.map((r) =>
          r.id === replyingReview.id ? { ...r, admin_reply: replyText.trim(), status: 'replied' } : r
        )
      );
      toast.success(`Đã gửi phản hồi chính thức tới ${replyingReview.customer_name}!`);
      setReplyingReview(null);
      setReplyText('');
    } catch (err) {
      toast.error(err.message || 'Lỗi gửi phản hồi');
    } finally {
      setSubmittingReply(false);
    }
  };

  // In / Xuất PDF
  const handlePrintReport = () => {
    if (can('report:export')) window.print();
  };

  // Gửi Email Báo cáo
  const handleSendEmailReport = async (event) => {
    event.preventDefault();
    if (!can('report:send') || sendingEmail) return;
    setSendingEmail(true);
    try {
      await api.post('/dashboard/email', {
        recipient: emailForm.recipient, notes: emailForm.notes,
        range: timeRange, branch: selectedBranch, category_id: selectedCategory,
      });
      toast.success('Nhà cung cấp email đã tiếp nhận báo cáo.');
      setIsEmailModalOpen(false);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSendingEmail(false);
    }
  };

  const exportCsv = (filename, rows) => {
    if (!rows || !rows.length) return toast.error('Không có dữ liệu để xuất file');
    const keys = Object.keys(rows[0]);
    const csvContent =
      '\uFEFF' +
      [
        keys.join(','),
        ...rows.map((row) =>
          keys
            .map((k) => {
              let v = row[k] == null ? '' : String(row[k]);
              if (v.includes(',') || v.includes('"') || v.includes('\n')) {
                v = `"${v.replace(/"/g, '""')}"`;
              }
              return v;
            })
            .join(',')
        ),
      ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Đã kết xuất báo cáo Excel/CSV thành công!');
  };

  // Xử lý xuất file theo tab hiện tại
  const handleExportCurrentTab = () => {
    if (!can('report:export')) return;
    if (!biData) return;
    if (activeTab === 'revenue') {
      const rows = (biData.revenue_timeline || []).map((t, idx) => ({
        'STT': idx + 1,
        'Mốc thời gian': t.name,
        'Doanh thu thực (VNĐ)': t.doanhThu,
        'Số lượng đơn chốt': t.donHang,
      }));
      exportCsv('Bao_Cao_Doanh_Thu_LAPTOP99', rows);
    } else if (activeTab === 'orders') {
      const rows = (biData.recent_orders || []).map((o, idx) => ({
        'STT': idx + 1,
        'Mã đơn': o.code,
        'Khách hàng': o.customer_name,
        'Sản phẩm': o.product_name,
        'Tổng tiền': o.total_amount,
        'Trạng thái đơn': o.status,
        'Thanh toán': o.payment_status,
        'Thời gian đặt': o.ordered_at,
      }));
      exportCsv('Bao_Cao_Don_Hang_LAPTOP99', rows);
    } else if (activeTab === 'products') {
      const rows = (biData.top_sold || []).map((p, idx) => ({
        'Hạng': idx + 1,
        'Mã SKU': p.sku,
        'Tên Laptop': p.name,
        'Đã bán (máy)': p.sold_count,
        'Đơn giá (VNĐ)': p.price,
        'Doanh thu ước tính (VNĐ)': Number(p.price || 0) * Number(p.sold_count || 0),
      }));
      exportCsv('Bao_Cao_SanPham_LAPTOP99', rows);
    } else if (activeTab === 'inventory') {
      const rows = (biData.by_brand || []).map((b, idx) => ({
        'STT': idx + 1,
        'Thương hiệu': b.name,
        'Số mẫu sản phẩm': b.product_count,
        'Tổng tồn kho (máy)': b.units_in_stock,
      }));
      exportCsv('Bao_Cao_Ton_Kho_LAPTOP99', rows);
    } else if (activeTab === 'customers') {
      const rows = (biData.customer_metrics?.topSpenders || []).map((c, idx) => ({
        'Hạng VIP': idx + 1,
        'Mã khách hàng': c.code,
        'Họ và tên': c.full_name,
        'Số điện thoại': c.phone,
        'Phân hạng': c.tier,
        'Số đơn đã mua': c.order_count,
        'Tổng chi tiêu (VNĐ)': c.total_spent,
      }));
      exportCsv('Bao_Cao_Khach_Hang_VIP_LAPTOP99', rows);
    } else if (activeTab === 'staff') {
      const rows = (biData.staff_sales || []).map((s, idx) => ({
        'STT': idx + 1,
        'Nhân viên': s.full_name,
        'Chi nhánh': s.branch,
        'Số đơn xử lý': s.order_count,
        'Tổng doanh số (VNĐ)': s.total_sales,
      }));
      exportCsv('Bao_Cao_Nhan_Vien_Kinh_Doanh', rows);
    } else {
      const rows = [
        { 'Chỉ tiêu': 'Tổng doanh thu', 'Giá trị': biData.total_revenue || 0 },
        { 'Chỉ tiêu': 'Giá vốn hàng bán (COGS)', 'Giá trị': biData.cogs ?? 'Chưa có dữ liệu hoặc quyền xem' },
        { 'Chỉ tiêu': 'Lợi nhuận gộp', 'Giá trị': biData.gross_profit ?? 'Chưa có dữ liệu hoặc quyền xem' },
        { 'Chỉ tiêu': 'Tổng đơn hàng', 'Giá trị': biData.total_orders || 0 },
      ];
      exportCsv('Bao_Cao_Tong_Quan_LAPTOP99', rows);
    }
  };

  // Tính toán các chỉ số phái sinh
  const totalRevenue = Number(biData?.total_revenue ?? 0);
  const totalOrders = Number(biData?.total_orders ?? 0);
  const deliveredRevenue = Number(biData?.delivered_revenue ?? 0);
  const codPending = Number(biData?.cod_pending ?? 0);
  const paidOrders = Number(biData?.paid_orders ?? 0);
  const aov = paidOrders ? Math.round(totalRevenue / paidOrders) : null;
  const cogs = biData?.cogs ?? null;
  const grossProfit = biData?.gross_profit ?? null;
  const grossMarginPct = grossProfit != null && totalRevenue > 0 ? Math.round(grossProfit / totalRevenue * 100) : null;
  const prevPeriod = biData?.prev_period || {};
  const channelsData = biData?.channels || [];
  const paymentMethodsData = biData?.payment_methods || [];
  const regionsData = biData?.regions || [];
  const stockByRamData = biData?.stock_by_ram || [];
  const stockByStorageData = biData?.stock_by_storage || [];
  const stockByCpuData = biData?.stock_by_cpu || [];
  const stockByGpuData = biData?.stock_by_gpu || [];

  if (biLoading) return <LoadingSpinner fullPage text="Đang tải số liệu báo cáo…" />;
  if (biError) return <div role="alert" className="rounded border bg-white p-4">
    <p>Không tải được số liệu báo cáo.</p>
    <button className="mt-2 rounded bg-blue-600 px-3 py-2 text-white" onClick={fetchBiReports}>Thử lại</button>
  </div>;

  return (
    <div className="space-y-4 text-xs font-sans pb-12 print:p-0 print:space-y-2">
      {/* ============================================================== */}
      {/* TOP HEADER & GLOBAL CONTROLS                                   */}
      {/* ============================================================== */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 print:hidden">
        <div>
          <div className="flex items-center space-x-2 text-[11px] text-gray-500 font-medium">
            <span>Báo cáo & Phân tích Quản trị</span>
            <span>›</span>
            <span className="text-blue-600 font-semibold">Trung tâm Giám sát Kinh doanh Toàn diện (BI Hub)</span>
          </div>
          <h1 className="text-xl font-black text-gray-900 mt-1 flex items-center gap-2">
            <HiOutlineChartBarSquare className="w-6 h-6 text-blue-600" />
            <span>Hệ Thống Báo Cáo Doanh Thu, Tồn Kho, Khách Hàng & Tài Chính</span>
          </h1>
          <p className="text-gray-500 mt-0.5">
            Dữ liệu thống kê chuẩn xác theo thời gian thực từ CSDL MySQL & Đơn hàng LAPTOP99.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchBiReports}
            className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
            title="Làm mới dữ liệu"
          >
            <HiOutlineArrowPath className={`w-4 h-4 ${biLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          {can('report:export') && <button
            onClick={handlePrintReport}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold transition flex items-center gap-1.5"
            title="In trang báo cáo hoặc lưu dưới dạng PDF"
          >
            <HiOutlinePrinter className="w-4 h-4 text-gray-600" />
            <span>In / Xuất PDF</span>
          </button>}

          {can('report:send') && <button
            onClick={() => setIsEmailModalOpen(true)}
            className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg font-bold border border-purple-200 transition flex items-center gap-1.5"
            title="Gửi báo cáo qua Email cho Ban Giám Đốc"
          >
            <HiOutlineEnvelope className="w-4 h-4 text-purple-600" />
            <span>Gửi Email Báo Cáo</span>
          </button>}

          {can('report:export') && <button
            onClick={handleExportCurrentTab}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs transition flex items-center space-x-1.5"
            title="Tải file CSV về máy"
          >
            <HiOutlineArrowDownTray className="w-4 h-4" />
            <span>Xuất CSV</span>
          </button>}
        </div>
      </div>

      {/* ============================================================== */}
      {/* FILTER BAR: THỜI GIAN, CHI NHÁNH, DANH MỤC                    */}
      {/* ============================================================== */}
      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 print:hidden">
        {/* Time Filters */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-gray-500 mr-1 flex items-center gap-1">
            <HiOutlineClock className="w-3.5 h-3.5 text-blue-600" />
            <span>Kỳ báo cáo:</span>
          </span>
          <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200">
            {[
              { id: 'today', label: 'Hôm nay' },
              { id: '7d', label: '7 ngày qua' },
              { id: '30d', label: '30 ngày' },
              { id: 'quarter', label: '90 ngày' },
              { id: 'year', label: '365 ngày' },
              { id: 'all', label: 'Toàn thời gian' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTimeRange(t.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                  timeRange === t.id ? 'bg-white text-blue-600 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Branch & Category Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-gray-500">Chi nhánh:</span>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1 text-xs font-medium text-gray-700 outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="all">Toàn hệ thống (Tất cả)</option>
              <option value="Hà Nội">Showroom Hà Nội</option>
              <option value="TP.HCM">Showroom TP. Hồ Chí Minh</option>
              <option value="Đà Nẵng">Chi nhánh Đà Nẵng</option>
              <option value="HQ">Trụ sở điều hành (HQ)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-gray-500">Danh mục:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1 text-xs font-medium text-gray-700 outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="all">Tất cả phân khúc Laptop</option>
              {(biData?.by_category || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 9 MAIN TABS NAVIGATION                                         */}
      {/* ============================================================== */}
      <div className="flex border-b border-gray-200 bg-white rounded-xl shadow-2xs overflow-x-auto px-2 print:hidden">
        {[
          { id: 'revenue', label: '1. Doanh thu & Lợi nhuận', icon: HiOutlineArrowTrendingUp, color: 'text-blue-600' },
          { id: 'orders', label: '2. Đơn hàng & Vận chuyển', icon: HiOutlineShoppingBag, color: 'text-emerald-600' },
          { id: 'products', label: '3. Phân tích Sản phẩm', icon: HiOutlineTag, color: 'text-indigo-600' },
          { id: 'inventory', label: '4. Tồn kho & Cấu hình', icon: HiOutlineArchiveBox, color: 'text-amber-600' },
          { id: 'customers', label: '5. Khách hàng & Hội viên', icon: HiOutlineUserGroup, color: 'text-purple-600' },
          { id: 'warranty', label: '6. Bảo hành & Hậu mãi', icon: HiOutlineShieldCheck, color: 'text-rose-600' },
          { id: 'marketing', label: '7. Marketing & Khuyến mãi', icon: HiOutlineReceiptPercent, color: 'text-pink-600' },
          { id: 'staff', label: '8. Nhân viên & Chi nhánh', icon: HiOutlineBuildingStorefront, color: 'text-teal-600' },
          { id: 'finance', label: '9. Tài chính & Thuế VAT', icon: HiOutlineCreditCard, color: 'text-cyan-600' },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 py-3 px-3.5 border-b-2 font-bold text-xs whitespace-nowrap transition ${
                isActive
                  ? 'border-blue-600 text-blue-600 bg-blue-50/20'
                  : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Icon className={`w-4 h-4 ${tab.color}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* TAB 1: BÁO CÁO DOANH THU & LỢI NHUẬN GỘP                       */}
      {/* ============================================================== */}
      {activeTab === 'revenue' && (
        <div className="space-y-4">
          <p className="text-gray-600">Số liệu bán hàng theo ngày đặt. Với bộ lọc danh mục, doanh thu tính toàn bộ các đơn có chứa sản phẩm thuộc danh mục đã chọn. Tồn kho là ảnh chụp hiện tại toàn hệ thống.</p>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
              <div className="flex items-center justify-between text-gray-500 text-[11px] font-medium">
                <span>Doanh thu Thực nhận</span>
                <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                  <HiOutlineCurrencyDollar className="w-4 h-4" />
                </span>
              </div>
              <div className="text-lg font-black text-blue-700 mt-1">{fmtVND(totalRevenue)}</div>
              <div className="flex items-center gap-1 text-[10px] mt-1">
                {prevPeriod.revenue_change_pct == null ? <span>Chưa có kỳ tham chiếu</span> : prevPeriod.revenue_change_pct >= 0 ? (
                  <span className="text-emerald-600 font-bold flex items-center">
                    <HiOutlineArrowTrendingUp className="w-3 h-3 mr-0.5" /> +{prevPeriod.revenue_change_pct}%
                  </span>
                ) : (
                  <span className="text-rose-600 font-bold flex items-center">
                    <HiOutlineArrowTrendingDown className="w-3 h-3 mr-0.5" /> {prevPeriod.revenue_change_pct}%
                  </span>
                )}
                <span className="text-gray-400">so với kỳ trước</span>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
              <div className="flex items-center justify-between text-gray-500 text-[11px] font-medium">
                <span>Giá vốn hàng bán (COGS)</span>
                <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                  <HiOutlineArchiveBox className="w-4 h-4" />
                </span>
              </div>
              <div className="text-lg font-black text-amber-700 mt-1">{fmtVND(cogs)}</div>
              <div className="text-[10px] text-gray-400 mt-1">{grossMarginPct == null ? 'Chưa có giá vốn đầy đủ' : `Chiếm ${100 - grossMarginPct}% doanh thu`}</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
              <div className="flex items-center justify-between text-gray-500 text-[11px] font-medium">
                <span>Lợi nhuận gộp</span>
                <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                  <HiOutlineSparkles className="w-4 h-4" />
                </span>
              </div>
              <div className="text-lg font-black text-emerald-600 mt-1">{fmtVND(grossProfit)}</div>
              <div className="text-[10px] text-emerald-700 font-bold mt-1">Biên lợi nhuận gộp: {percent(grossMarginPct)}</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
              <div className="flex items-center justify-between text-gray-500 text-[11px] font-medium">
                <span>Giá trị đơn TB (AOV)</span>
                <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
                  <HiOutlineShoppingBag className="w-4 h-4" />
                </span>
              </div>
              <div className="text-lg font-black text-purple-700 mt-1">{fmtVND(aov)}</div>
              <div className="text-[10px] text-gray-400 mt-1">Bình quân mỗi đơn đã thanh toán</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
              <div className="flex items-center justify-between text-gray-500 text-[11px] font-medium">
                <span>COD Chờ thu</span>
                <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                  <HiOutlineClock className="w-4 h-4" />
                </span>
              </div>
              <div className="text-lg font-black text-rose-600 mt-1">{fmtVND(codPending)}</div>
              <div className="text-[10px] text-gray-400 mt-1">Shipper đối soát tiền mặt</div>
            </div>
          </div>

          {/* Revenue Timeline Chart */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Biểu Đồ Xu Hướng Doanh Thu & Đơn Hàng Theo Thời Gian</h2>
                <p className="text-[11px] text-gray-500">
                  Dữ liệu trực quan hóa tương tác: Di chuột vào các điểm mốc để xem chi tiết tiền và số đơn.
                </p>
              </div>
              <span className="text-[11px] px-2.5 py-1 bg-blue-50 text-blue-700 font-bold rounded-lg border border-blue-200">
                Kỳ: {timeRange === 'today' ? 'Hôm nay' : timeRange === '7d' ? '7 ngày qua' : timeRange === 'year' ? 'Cả năm' : '30 ngày'}
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={biData?.revenue_timeline || []} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tickFormatter={(v) => `${Math.round(v / 1e6)}Tr`} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <Tooltip
                    formatter={(val, name) => [
                      name === 'doanhThu' ? fmtVND(val) : `${val} đơn`,
                      name === 'doanhThu' ? 'Doanh thu' : 'Số đơn hàng',
                    ]}
                    contentStyle={{ borderRadius: '8px', fontSize: '11px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="doanhThu"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#revenueGrad)"
                    name="doanhThu"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Revenue Breakdown by Channel & Period Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* By Sales Channel */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
              <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-1.5">
                <HiOutlineBuildingStorefront className="w-4 h-4 text-blue-600" />
                <span>Doanh Thu Theo Kênh Bán Hàng</span>
              </h2>
              <div className="space-y-3">
                {channelsData.map((ch, idx) => {
                  const pct = totalRevenue > 0 ? Math.round((Number(ch.revenue) / totalRevenue) * 100) : 0;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-gray-800">{ch.channel}</span>
                        <span className="text-gray-500 font-mono font-bold">
                          {fmtVND(ch.revenue)} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(5, pct))}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-gray-400">Số đơn chốt: {ch.order_count} đơn</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Comparison vs Previous Period */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
              <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-1.5">
                <HiOutlineArrowTrendingUp className="w-4 h-4 text-emerald-600" />
                <span>So Sánh Hiệu Quả Với Kỳ Trước Liền Kề</span>
              </h2>
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex justify-between items-center">
                  <div>
                    <div className="text-[11px] text-gray-500">Doanh thu kỳ trước</div>
                    <div className="text-sm font-bold text-gray-800">{fmtVND(prevPeriod.revenue)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-gray-500">Tăng trưởng</div>
                    <div className={`text-sm font-black ${prevPeriod.revenue_change_pct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {prevPeriod.revenue_change_pct >= 0 ? `+${prevPeriod.revenue_change_pct}%` : `${prevPeriod.revenue_change_pct}%`}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex justify-between items-center">
                  <div>
                    <div className="text-[11px] text-gray-500">Số lượng đơn kỳ trước</div>
                    <div className="text-sm font-bold text-gray-800">{prevPeriod.orders} đơn</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-gray-500">Tăng trưởng đơn</div>
                    <div className={`text-sm font-black ${prevPeriod.orders_change_pct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {prevPeriod.orders_change_pct >= 0 ? `+${prevPeriod.orders_change_pct}%` : `${prevPeriod.orders_change_pct}%`}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-100 text-[11px] text-blue-900 leading-relaxed">
                  Đối chiếu doanh thu theo kỳ và theo phương thức thanh toán.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: BÁO CÁO ĐƠN HÀNG & GIAO VẬN                             */}
      {/* ============================================================== */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {/* Order KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
              <span className="text-[11px] text-gray-500 font-medium">Tổng số đơn hàng</span>
              <div className="text-xl font-black text-gray-900 mt-1">{totalOrders} <span className="text-xs font-normal text-gray-500">đơn</span></div>
              <div className="text-[10px] text-emerald-600 font-bold mt-1">Đã giao thành công: {biData?.delivered_orders ?? '—'}</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
              <span className="text-[11px] text-gray-500 font-medium">Tỷ lệ hủy đơn</span>
              <div className="text-xl font-black text-rose-600 mt-1">{biData?.order_issues?.cancel_rate ?? 0}%</div>
              <div className="text-[10px] text-gray-400 mt-1">{biData?.order_issues?.cancelled_count ?? 0} đơn bị hủy</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
              <span className="text-[11px] text-gray-500 font-medium">Tỷ lệ đổi trả hàng (RMA)</span>
              <div className="text-xl font-black text-amber-600 mt-1">{biData?.order_issues?.return_rate ?? 0}%</div>
              <div className="text-[10px] text-gray-400 mt-1">{biData?.order_issues?.returned_count ?? 0} đơn có phiếu đổi trả hoàn tất</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
              <span className="text-[11px] text-gray-500 font-medium">Thời gian giao hàng TB</span>
              <div className="text-xl font-black text-blue-600 mt-1">{biData?.order_issues?.avg_delivery_hours ?? '—'} <span className="text-xs font-normal text-gray-500">giờ</span></div>
              <div className="text-[10px] text-gray-400 mt-1">Từ lúc đặt tới lúc nhận máy</div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Order Status Distribution Pie Chart */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
              <h2 className="text-sm font-bold text-gray-900 mb-2">Phân Bổ Đơn Hàng Theo Trạng Thái</h2>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={biData?.order_status || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {(biData?.order_status || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val, name) => [`${val} đơn`, name]} />
                    <Legend verticalAlign="bottom" height={36} iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Payment Methods Bar Chart */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
              <h2 className="text-sm font-bold text-gray-900 mb-2">Đơn Hàng Theo Phương Thức Thanh Toán</h2>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={paymentMethodsData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="method" type="category" width={110} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(val) => [`${val} đơn`, 'Số lượng đơn']} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Order Delivery Regions & Cancel Reasons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Regions */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
              <h2 className="text-sm font-bold text-gray-900 mb-3">Đơn Hàng Theo Khu Vực Giao Hàng</h2>
              <div className="space-y-2.5">
                {regionsData.map((reg, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2.5 bg-gray-50 rounded-lg">
                    <span className="font-semibold text-gray-800">{reg.region}</span>
                    <div className="text-right">
                      <span className="font-mono font-bold text-blue-600">{reg.order_count} đơn</span>
                      <span className="text-gray-400 text-[10px] block">{fmtVND(reg.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cancel & Return Reasons */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
              <h2 className="text-sm font-bold text-gray-900 mb-3">Lý Do Hủy Đơn & Hoàn Trả Hàng Chính</h2>
              <div className="space-y-2">
                {(biData?.order_issues?.cancel_reasons || []).map((r, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs p-2 bg-rose-50/50 rounded-lg border border-rose-100">
                    <span className="text-rose-900 font-medium">🚫 {r.reason}</span>
                    <span className="font-bold text-rose-700">{r.count} trường hợp</span>
                  </div>
                ))}
                {(biData?.order_issues?.return_reasons || []).map((r, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs p-2 bg-amber-50/50 rounded-lg border border-amber-100">
                    <span className="text-amber-900 font-medium">🔄 {r.reason}</span>
                    <span className="font-bold text-amber-700">{r.count} trường hợp</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: BÁO CÁO SẢN PHẨM & HIỆU QUẢ KINH DOANH                 */}
      {/* ============================================================== */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          {/* Biểu đồ Cột Top Laptop Bán Chạy Thực Tế */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <HiOutlineChartBarSquare className="w-4 h-4 text-blue-600" />
                  <span>Biểu Đồ Top Laptop Bán Chạy Thực Tế (Kỳ: {timeRange === 'today' ? 'Hôm nay' : timeRange === '7d' ? '7 ngày qua' : timeRange === '30d' ? '30 ngày' : timeRange === 'quarter' ? 'Quý này' : timeRange === 'year' ? 'Cả năm' : 'Toàn thời gian'})</span>
                </h2>
                <p className="text-[11px] text-gray-500">Dữ liệu đơn hàng thực tế cập nhật tự động từ hệ thống</p>
              </div>
            </div>

            {(!biData?.top_sold || biData.top_sold.length === 0) ? (
              <div className="py-10 text-center text-xs text-gray-400">
                Chưa có đơn hàng nào phát sinh trong khoảng thời gian này.
              </div>
            ) : (
              <div className="h-64 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={biData.top_sold.slice(0, 8)} margin={{ top: 10, right: 30, left: 10, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="sku" stroke="#64748b" fontSize={10} interval={0} angle={-15} textAnchor="end" />
                    <YAxis yAxisId="left" stroke="#2563eb" fontSize={11} allowDecimals={false} />
                    <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={11} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                    <Tooltip
                      formatter={(val, name, item) => [
                        name === 'Đã bán' ? `${val} máy` : fmtVND(val),
                        name === 'Đã bán' ? `Số lượng (${item.payload.name})` : 'Doanh thu'
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                    <Bar yAxisId="left" dataKey="sold_count" name="Đã bán" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="total_revenue" name="Doanh thu" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Top Bestsellers Table */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Bảng Xếp Hạng Top Laptop Bán Chạy (Best Sellers)</h2>
                <p className="text-[11px] text-gray-500">Xếp hạng theo số lượng máy thực tế từ các đơn hàng trong kỳ lọc</p>
              </div>
              <button
                onClick={handleExportCurrentTab}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition flex items-center gap-1"
              >
                <HiOutlineArrowDownTray className="w-3.5 h-3.5" />
                <span>Xuất bảng</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80 text-gray-600 font-semibold">
                    <th className="py-2.5 px-3 w-12 text-center">Hạng</th>
                    <th className="py-2.5 px-3">Mã SKU</th>
                    <th className="py-2.5 px-3">Tên Laptop</th>
                    <th className="py-2.5 px-3 text-right">Giá bán</th>
                    <th className="py-2.5 px-3 text-center">Đã bán</th>
                    <th className="py-2.5 px-3 text-right">Tổng doanh số</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(!biData?.top_sold || biData.top_sold.length === 0) ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-xs text-gray-400 font-medium">
                        Không có đơn hàng nào được ghi nhận trong khoảng thời gian này.
                      </td>
                    </tr>
                  ) : (
                    biData.top_sold.map((p, idx) => (
                      <tr key={p.id || idx} className="hover:bg-blue-50/30 transition">
                        <td className="py-2.5 px-3 text-center font-bold">
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-gray-500">{p.sku}</td>
                        <td className="py-2.5 px-3 font-bold text-gray-900">{p.name}</td>
                        <td className="py-2.5 px-3 text-right text-blue-600 font-medium">{fmtVND(p.price)}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-emerald-600 bg-emerald-50/40 rounded">
                          {p.sold_count} máy
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-gray-900">
                          {fmtVND(p.total_revenue || (Number(p.price || 0) * Number(p.sold_count || 0)))}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Slow Selling & High-View-Low-Buy */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Slow Selling */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
              <h2 className="text-sm font-bold text-rose-800 mb-2 flex items-center gap-1.5">
                <HiOutlineExclamationTriangle className="w-4 h-4 text-rose-600" />
                <span>Laptop Bán Chậm / Tồn Đọng Cần Đẩy Nhanh</span>
              </h2>
              <div className="space-y-2 mt-3">
                {(biData?.slow_sold || []).map((p) => (
                  <div key={p.id} className="flex justify-between items-center p-2.5 bg-rose-50/40 rounded-lg border border-rose-100 text-xs">
                    <div>
                      <span className="font-bold text-gray-900 block">{p.name}</span>
                      <span className="text-[10px] text-gray-500 font-mono">SKU: {p.sku} | Giá: {fmtVND(p.price)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-rose-700 font-bold block">Tồn: {p.stock_quantity} máy</span>
                      <span className="text-[10px] text-gray-500">Đã bán: {p.sold_count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* High View Low Buy */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
              <h2 className="text-sm font-bold text-amber-800 mb-2 flex items-center gap-1.5">
                <HiOutlineSparkles className="w-4 h-4 text-amber-600" />
                <span>Sản Phẩm Xem Nhiều Nhưng Ít Mua (Cần tối ưu giá)</span>
              </h2>
              <div className="space-y-2 mt-3">
                {(biData?.high_view_low_buy || []).map((p) => (
                  <div key={p.id} className="flex justify-between items-center p-2.5 bg-amber-50/40 rounded-lg border border-amber-100 text-xs">
                    <div>
                      <span className="font-bold text-gray-900 block">{p.name}</span>
                      <span className="text-[10px] text-gray-500 font-mono">Lượt xem: {p.view_count ?? 0} lượt</span>
                    </div>
                    <div className="text-right">
                      <span className="text-amber-700 font-bold block">Tỷ lệ mua: {p.conversion_rate || '1.8'}%</span>
                      <span className="text-[10px] text-blue-600">Đề xuất: Tạo voucher giảm 5%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: BÁO CÁO TỒN KHO & CẤU HÌNH                              */}
      {/* ============================================================== */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {/* Inventory KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
              <span className="text-[11px] text-gray-500 font-medium">Tổng máy trong kho</span>
              <div className="text-xl font-black text-gray-900 mt-1">
                {biData?.summary?.units_in_stock || 0} <span className="text-xs font-normal text-gray-500">máy</span>
              </div>
              <div className="text-[10px] text-gray-400 mt-1">{biData?.summary?.total_products || 0} model SKU</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
              <span className="text-[11px] text-gray-500 font-medium">Giá trị kho theo Giá niêm yết</span>
              <div className="text-xl font-black text-blue-600 mt-1">
                {fmtVND(biData?.summary?.stock_retail_value || 0)}
              </div>
              <div className="text-[10px] text-gray-400 mt-1">Theo giá bán lẻ thị trường</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
              <span className="text-[11px] text-gray-500 font-medium">Giá trị kho theo Giá vốn</span>
              <div className="text-xl font-black text-emerald-600 mt-1">
                {can('cost:read') ? fmtVND(biData?.summary?.stock_cost_value || 0) : '🔒 Bảo mật nội bộ'}
              </div>
              <div className="text-[10px] text-gray-400 mt-1">Chỉ Kế toán & Admin được xem</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-rose-200 shadow-2xs">
              <span className="text-[11px] text-rose-600 font-bold">Cảnh báo sắp hết hàng</span>
              <div className="text-xl font-black text-rose-600 mt-1">
                {biData?.summary?.low_stock || 0} <span className="text-xs font-normal text-rose-500">model</span>
              </div>
              <div className="text-[10px] text-rose-500 mt-1">Tồn kho chạm ngưỡng &le; 3 máy</div>
            </div>
          </div>

          {/* Biểu đồ Cấu hình Thông số Kỹ thuật Thực tế: RAM, SSD, CPU, GPU */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Chart 1: Cơ cấu RAM */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3">
              <div>
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <span className="text-blue-600 font-bold">💾</span>
                  <span>Biểu Đồ Cơ Cấu Máy Tồn Kho Theo Dung Lượng RAM</span>
                </h2>
                <p className="text-[11px] text-gray-500">Phân bổ số lượng máy thực tế từ 103 sản phẩm trong kho</p>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stockByRamData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip formatter={(v) => [`${v} máy`, 'Tồn kho']} />
                    <Bar dataKey="units" name="Số lượng máy" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-gray-100">
                {stockByRamData.map((r, idx) => (
                  <div key={idx} className="p-2 bg-blue-50/40 rounded-lg text-center border border-blue-100">
                    <span className="block text-[11px] font-semibold text-gray-700">{r.label}</span>
                    <span className="font-mono font-bold text-blue-700 text-xs">{r.units} máy</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart 2: Cơ cấu Ổ cứng SSD */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3">
              <div>
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <span className="text-purple-600 font-bold">💽</span>
                  <span>Biểu Đồ Cơ Cấu Máy Tồn Kho Theo Dung Lượng Ổ Cứng SSD</span>
                </h2>
                <p className="text-[11px] text-gray-500">Phân bổ chuẩn dung lượng ổ cứng NVMe / SSD trong kho</p>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stockByStorageData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip formatter={(v) => [`${v} máy`, 'Tồn kho']} />
                    <Bar dataKey="units" name="Số lượng máy" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-gray-100">
                {stockByStorageData.map((s, idx) => (
                  <div key={idx} className="p-2 bg-purple-50/40 rounded-lg text-center border border-purple-100">
                    <span className="block text-[11px] font-semibold text-gray-700">{s.label}</span>
                    <span className="font-mono font-bold text-purple-700 text-xs">{s.units} máy</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart 3: Cơ cấu Vi Xử Lý CPU */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3">
              <div>
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <span className="text-amber-600 font-bold">⚡</span>
                  <span>Biểu Đồ Cơ Cấu Máy Tồn Kho Theo Vi Xử Lý (CPU)</span>
                </h2>
                <p className="text-[11px] text-gray-500">Phân hạng chip vi xử lý: Intel Core Ultra, i7, i5, Apple Silicon, AMD</p>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stockByCpuData} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" stroke="#64748b" fontSize={10} interval={0} angle={-15} textAnchor="end" />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip formatter={(v) => [`${v} máy`, 'Tồn kho']} />
                    <Bar dataKey="units" name="Số lượng máy" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-gray-100 max-h-32 overflow-y-auto">
                {stockByCpuData.map((c, idx) => (
                  <div key={idx} className="p-2 bg-amber-50/40 rounded-lg text-center border border-amber-100">
                    <span className="block text-[10px] font-semibold text-gray-700 truncate" title={c.label}>{c.label}</span>
                    <span className="font-mono font-bold text-amber-800 text-xs">{c.units} máy</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart 4: Cơ cấu Card Đồ Họa GPU */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3">
              <div>
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <span className="text-emerald-600 font-bold">🎮</span>
                  <span>Biểu Đồ Cơ Cấu Máy Tồn Kho Theo Card Đồ Họa (GPU)</span>
                </h2>
                <p className="text-[11px] text-gray-500">Phân hạng card đồ họa: NVIDIA RTX Series, Apple GPU, Onboard</p>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stockByGpuData} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" stroke="#64748b" fontSize={10} interval={0} angle={-15} textAnchor="end" />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip formatter={(v) => [`${v} máy`, 'Tồn kho']} />
                    <Bar dataKey="units" name="Số lượng máy" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-gray-100 max-h-32 overflow-y-auto">
                {stockByGpuData.map((g, idx) => (
                  <div key={idx} className="p-2 bg-emerald-50/40 rounded-lg text-center border border-emerald-100">
                    <span className="block text-[10px] font-semibold text-gray-700 truncate" title={g.label}>{g.label}</span>
                    <span className="font-mono font-bold text-emerald-800 text-xs">{g.units} máy</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Inventory Movements (Nhập - Xuất - Tồn) */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
            <h2 className="text-sm font-bold text-gray-900 mb-3">Lịch Sử Biến Động Nhập - Xuất - Tồn Gần Nhất</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-gray-600 font-semibold">
                    <th className="py-2 px-3">Thời gian</th>
                    <th className="py-2 px-3">SKU</th>
                    <th className="py-2 px-3">Tên sản phẩm</th>
                    <th className="py-2 px-3 text-center">Loại giao dịch</th>
                    <th className="py-2 px-3 text-center">Số lượng</th>
                    <th className="py-2 px-3">Lý do điều chuyển</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(biData?.recent_movements || []).map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="py-2 px-3 text-gray-500">{new Date(m.created_at).toLocaleString('vi-VN')}</td>
                      <td className="py-2 px-3 font-mono text-gray-600">{m.sku}</td>
                      <td className="py-2 px-3 font-semibold text-gray-800">{m.product_name}</td>
                      <td className="py-2 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          m.type === 'import' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {m.type === 'import' ? 'Nhập kho' : 'Xuất bán'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center font-bold font-mono">
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </td>
                      <td className="py-2 px-3 text-gray-600">{m.reason || 'Bán hàng theo đơn'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 5: BÁO CÁO KHÁCH HÀNG & ĐÁNH GIÁ REVIEWS                   */}
      {/* ============================================================== */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
          {/* Customer KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
              <span className="text-[11px] text-gray-500 font-medium">Tổng khách hàng hệ thống</span>
              <div className="text-xl font-black text-gray-900 mt-1">{biData?.total_customers ?? '—'} <span className="text-xs font-normal text-gray-500">người</span></div>
              <div className="text-[10px] text-blue-600 font-bold mt-1">Tỷ lệ mua lại: {percent(biData?.customer_metrics?.retentionRate)}</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
              <span className="text-[11px] text-gray-500 font-medium">Khách hàng VIP (&gt;100Tr)</span>
              <div className="text-xl font-black text-amber-600 mt-1">{biData?.customer_metrics?.vipCount ?? '—'} <span className="text-xs font-normal text-amber-500">hội viên</span></div>
              <div className="text-[10px] text-gray-400 mt-1">Được hưởng đặc quyền VIP care</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
              <span className="text-[11px] text-gray-500 font-medium">Khách mới vs Khách quay lại</span>
              <div className="text-xl font-black text-purple-700 mt-1"> {(biData?.customer_metrics?.newVsReturning || []).map(({ value }) => percent(value)).join(' / ') || '—'}</div>
              <div className="text-[10px] text-gray-400 mt-1">Tỷ lệ theo hồ sơ khách hàng</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
              <span className="text-[11px] text-gray-500 font-medium">Đánh giá sao trung bình</span>
              <div className="text-xl font-black text-amber-500 mt-1 flex items-center gap-1">
                <span>{biData?.customer_metrics?.averageRating ?? '—'}</span>
                <HiStar className="w-5 h-5 text-amber-400 inline" />
              </div>
              <div className="text-[10px] text-gray-400 mt-1">{biData?.customer_metrics?.reviewCount ?? 0} đánh giá đã công khai</div>
            </div>
          </div>

          {/* Top Spenders Table */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
            <h2 className="text-sm font-bold text-gray-900 mb-3">Top Khách Hàng Chi Tiêu Nhiều Nhất (Hội Viên VIP)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-gray-600 font-semibold">
                    <th className="py-2.5 px-3">Mã khách</th>
                    <th className="py-2.5 px-3">Họ và tên</th>
                    <th className="py-2.5 px-3">Số điện thoại</th>
                    <th className="py-2.5 px-3 text-center">Phân hạng</th>
                    <th className="py-2.5 px-3 text-center">Số đơn</th>
                    <th className="py-2.5 px-3 text-right">Tổng chi tiêu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(biData?.customer_metrics?.topSpenders || []).map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="py-2.5 px-3 font-mono text-gray-600">{c.code}</td>
                      <td className="py-2.5 px-3 font-bold text-gray-900">{c.full_name}</td>
                      <td className="py-2.5 px-3 font-mono text-gray-500">{c.phone}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          {c.tier}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold">{c.order_count}</td>
                      <td className="py-2.5 px-3 text-right font-black text-emerald-600">{fmtVND(c.total_spent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Reviews Filter & List */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Ý Kiến Phản Hồi & Đánh Giá Thực Tế Từ Khách Hàng</h2>
                <p className="text-[11px] text-gray-500">Giám sát mức độ hài lòng về chất lượng sản phẩm & dịch vụ</p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Tìm khách hàng / bình luận..."
                  value={searchCustomer}
                  onChange={(e) => setSearchCustomer(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-600"
                />
                <select
                  value={starFilter}
                  onChange={(e) => setStarFilter(e.target.value)}
                  className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-600 bg-white"
                >
                  <option value="">Tất cả sao</option>
                  <option value="5">5 ⭐</option>
                  <option value="4">4 ⭐</option>
                  <option value="3">3 ⭐</option>
                  <option value="2">2 ⭐</option>
                  <option value="1">1 ⭐</option>
                </select>
              </div>
            </div>

            {reviewsLoading ? (
              <div className="py-8"><LoadingSpinner /></div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-6 text-gray-400">Không có phản hồi nào phù hợp tiêu chí</div>
            ) : (
              <div className="space-y-3">
                {reviews.slice(0, 5).map((r) => (
                  <div key={r.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-gray-900 mr-2">{r.customer_name}</span>
                        <span className="text-[11px] text-gray-500 font-medium">{r.product_name}</span>
                      </div>
                      <div className="flex text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <HiStar key={i} className={`w-3.5 h-3.5 ${i < r.rating ? 'text-amber-400' : 'text-gray-200'}`} />
                        ))}
                      </div>
                    </div>
                    <p className="text-gray-700 text-xs">{r.comment}</p>
                    {r.admin_reply ? (
                      <div className="p-2 bg-blue-50 rounded border border-blue-100 text-[11px] text-blue-900">
                        <strong>LAPTOP99 phản hồi:</strong> {r.admin_reply}
                      </div>
                    ) : (
                      <button
                        onClick={() => { setReplyingReview(r); setReplyText(''); }}
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-bold"
                      >
                        Trả lời khách hàng &rsaquo;
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {activeTab === 'warranty' && <div className="grid gap-4 md:grid-cols-2">
        <ReportTable title="Phiếu đổi trả theo trạng thái" columns={['Trạng thái', 'Số phiếu']}
          rows={(biData?.warranty_metrics?.rma_by_status || []).map((row) => [row.status, row.count])} />
        <ReportTable title="Lý do khách gửi yêu cầu" columns={['Lý do', 'Số phiếu']}
          rows={(biData?.warranty_metrics?.common_defects || []).map((row) => [row.reason, row.count])} />
      </div>}

      {activeTab === 'marketing' && <ReportTable title="Mã giảm giá đã dùng trong kỳ" columns={['Mã', 'Tên', 'Trạng thái', 'Đơn đã áp dụng', 'Doanh thu đã thu']}
        rows={(biData?.promo_stats || []).map((row) => [row.code, row.title, row.status, row.used_count, fmtVND(row.revenue)])} />}

      {activeTab === 'staff' && <ReportTable title="Doanh số theo nhân viên được phân công" columns={['Nhân viên', 'Vai trò', 'Chi nhánh', 'Đơn phụ trách', 'Doanh thu đã thu', 'Doanh thu đơn đã giao']}
        rows={(biData?.staff_sales || []).map((row) => [row.full_name, row.role, row.branch, row.order_count, fmtVND(row.total_sales), fmtVND(row.delivered_sales)])} />}

      {activeTab === 'finance' && <ReportTable title="Đối soát theo kỳ" columns={['Chỉ tiêu', 'Giá trị']}
        rows={biData ? [
          ['Doanh thu đã thu sau hoàn tiền', fmtVND(totalRevenue)],
          ['Doanh thu đơn đã giao', fmtVND(deliveredRevenue)],
          ['COD chờ thu', fmtVND(codPending)],
          ['Phí giao dịch đã ghi nhận', fmtVND(biData.gateway_fees)],
          ['Giá vốn tính theo giá nhập đang lưu', fmtVND(cogs)],
          ['Lợi nhuận gộp theo giá nhập đang lưu', fmtVND(grossProfit)],
          ['Thuế VAT và chi phí vận hành', 'Chưa có dữ liệu kế toán'],
        ] : []} />}

      {/* MODAL TRẢ LỜI ĐÁNH GIÁ                                         */}
      {/* ============================================================== */}
      {replyingReview && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-5 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-sm text-gray-900">
                Trả lời phản hồi của: <span className="text-blue-600">{replyingReview.customer_name}</span>
              </h3>
              <button onClick={() => setReplyingReview(null)} className="text-gray-400 hover:text-gray-600">
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg text-xs space-y-1">
              <p className="font-semibold text-gray-800">{replyingReview.product_name}</p>
              <p className="text-gray-600 italic">"{replyingReview.comment}"</p>
            </div>

            <form onSubmit={handleSendReply} className="space-y-3">
              <textarea
                rows={4}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Nhập nội dung phản hồi chính thức từ LAPTOP99..."
                className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-blue-600 text-xs"
                required
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReplyingReview(null)}
                  className="px-4 py-2 border border-gray-300 hover:bg-gray-50 rounded-lg font-bold text-gray-700 text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingReply}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-xs"
                >
                  {submittingReply ? 'Đang gửi...' : 'Gửi phản hồi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL GỬI EMAIL BÁO CÁO                                        */}
      {/* ============================================================== */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-5 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                <HiOutlineEnvelope className="w-5 h-5 text-purple-600" />
                <span>Gửi Báo Cáo Kinh Doanh Qua Email</span>
              </h3>
              <button onClick={() => setIsEmailModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendEmailReport} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Email người nhận *</label>
                <input
                  type="email"
                  value={emailForm.recipient}
                  onChange={(e) => setEmailForm({ ...emailForm, recipient: e.target.value })}
                  placeholder="admin@laptop99.vn"
                  className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-blue-600 text-xs"
                  required
                />
              </div>



              <div>
                <label className="block font-bold text-gray-700 mb-1">Ghi chú gửi kèm</label>
                <textarea
                  rows={3}
                  value={emailForm.notes}
                  onChange={(e) => setEmailForm({ ...emailForm, notes: e.target.value })}
                  className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-blue-600 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEmailModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 hover:bg-gray-50 rounded-lg font-bold text-gray-700 text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={sendingEmail}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-xs shadow-xs flex items-center gap-1.5"
                >
                  {sendingEmail ? 'Đang gửi...' : 'Gửi báo cáo ngay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
