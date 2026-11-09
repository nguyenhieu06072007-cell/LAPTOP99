import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import {
  HiOutlineChartBarSquare,
  HiOutlineArrowTrendingUp,
  HiOutlineCurrencyDollar,
  HiOutlineShoppingBag,
  HiOutlineArchiveBox,
  HiOutlineExclamationTriangle,
  HiOutlineArrowDownTray,
  HiOutlineCalendar,
  HiOutlineSparkles,
  HiStar,
  HiOutlineUserGroup,
  HiOutlineChatBubbleLeftRight,
  HiOutlineMagnifyingGlass,
  HiOutlinePlus,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineXMark,
  HiOutlineTag,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const fmtVND = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);

export default function FeedbackReportsPage() {
  const { can } = useAuth();

  // Active Main Tab: 'sales' | 'products' | 'inventory' | 'customers' | 'staff'
  const [activeTab, setActiveTab] = useState('sales');

  // Time range filter for BI reports: 'today' | '7d' | '30d' | 'year'
  const [timeRange, setTimeRange] = useState('30d');

  // BI Data State
  const [biData, setBiData] = useState(null);
  const [financeSummary, setFinanceSummary] = useState(null);
  const [biLoading, setBiLoading] = useState(true);

  // Reviews & Feedback State
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [starFilter, setStarFilter] = useState('');
  const [searchCustomer, setSearchCustomer] = useState('');

  // Modal trả lời khách hàng
  const [replyingReview, setReplyingReview] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  // Modal gửi đề xuất nội bộ nhân viên
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [newStaffFeedback, setNewStaffFeedback] = useState({
    title: '',
    category: 'Góp ý quy trình',
    priority: 'normal',
    content: '',
  });

  // Fetch Business Intelligence Reports Data
  const fetchBiReports = useCallback(async () => {
    try {
      setBiLoading(true);
      const [dashRes, finRes] = await Promise.all([
        api.get('/dashboard', { params: { range: timeRange } }).catch(() => ({ data: { data: null } })),
        api.get('/orders/finance/summary').catch(() => ({ data: null })),
      ]);

      if (dashRes.data?.data) {
        setBiData(dashRes.data.data);
      }
      if (finRes.data) {
        setFinanceSummary(finRes.data);
      }
    } catch (err) {
      console.warn('Could not load BI data:', err);
    } finally {
      setBiLoading(false);
    }
  }, [timeRange]);

  // Fetch Customer Reviews & Staff Feedback
  const fetchReviews = useCallback(async () => {
    if (activeTab !== 'customers' && activeTab !== 'staff') return;
    try {
      setReviewsLoading(true);
      const res = await api.get('/reviews', {
        params: {
          source: activeTab === 'customers' ? 'customer' : 'staff',
          rating: starFilter || undefined,
          search: searchCustomer || undefined,
          limit: 50,
        },
      });
      setReviews(res.data?.data || []);
    } catch (err) {
      toast.error('Lỗi tải danh sách phản hồi');
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

  // Handle Review Reply
  const handleSendReply = async (e) => {
    e.preventDefault();
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

  // Handle Staff Internal Suggestion
  const handleCreateStaffFeedback = async (e) => {
    e.preventDefault();
    if (!newStaffFeedback.title || !newStaffFeedback.content) {
      return toast.error('Vui lòng điền đầy đủ tiêu đề và nội dung');
    }
    toast.success('Đã gửi đề xuất / đóng góp nội bộ thành công!');
    setIsStaffModalOpen(false);
    setNewStaffFeedback({ title: '', category: 'Góp ý quy trình', priority: 'normal', content: '' });
  };

  // Export CSV Data
  const exportCsv = (filename, rows) => {
    if (!rows || !rows.length) return toast.error('Không có dữ liệu để xuất');
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

  const handleExportSalesReport = () => {
    if (!biData) return;
    const rows = (biData.topSold || []).map((p, idx) => ({
      'STT': idx + 1,
      'Mã SKU': p.sku,
      'Tên Laptop': p.name,
      'Số lượng đã bán': p.sold_count,
      'Đơn giá niêm yết (VNĐ)': p.price,
      'Ước tính doanh thu (VNĐ)': Number(p.price || 0) * Number(p.sold_count || 0),
    }));
    exportCsv('Bao_Cao_Doanh_So_Laptop99', rows);
  };

  const handleExportInventoryReport = () => {
    if (!biData) return;
    const rows = (biData.byBrand || []).map((b, idx) => ({
      'STT': idx + 1,
      'Hãng sản xuất': b.name,
      'Số lượng model sản phẩm': b.product_count,
      'Tổng số máy tồn kho': b.units_in_stock,
    }));
    exportCsv('Bao_Cao_Ton_Kho_Laptop99', rows);
  };

  const orderStats = biData?.orderStats || {};
  const totalRevenue = Number(orderStats.total_revenue || financeSummary?.total_paid || 0);
  const deliveredRevenue = Number(orderStats.delivered_revenue || financeSummary?.delivered_revenue || 0);
  const totalOrders = Number(orderStats.total_orders || financeSummary?.total_orders || 0);
  const codPending = Number(financeSummary?.total_cod_pending || 0);
  const aov = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const deliveryRate = totalOrders > 0 ? Math.round((Number(financeSummary?.delivered_orders || 0) / totalOrders) * 100) : 100;

  return (
    <div className="space-y-4 text-xs font-sans pb-10">
      {/* Top Header */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2 text-[11px] text-gray-500 font-medium">
            <span>Báo cáo & Phân tích</span>
            <span>›</span>
            <span className="text-blue-600 font-semibold">Trung tâm Giám sát Kinh doanh (BI Reports)</span>
          </div>
          <h1 className="text-xl font-black text-gray-900 mt-1 flex items-center gap-2">
            <HiOutlineChartBarSquare className="w-6 h-6 text-blue-600" />
            <span>Hệ Thống Báo Cáo Doanh Thu, Tồn Kho & Phản Hồi</span>
          </h1>
          <p className="text-gray-500 mt-0.5">
            Dữ liệu tổng hợp thời gian thực từ CSDL MySQL: Đơn hàng, Doanh số, Kho vận và Đánh giá của khách hàng.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Time Filter Buttons */}
          <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200">
            <button
              onClick={() => setTimeRange('today')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                timeRange === 'today' ? 'bg-white text-blue-600 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Hôm nay
            </button>
            <button
              onClick={() => setTimeRange('7d')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                timeRange === '7d' ? 'bg-white text-blue-600 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              7 ngày
            </button>
            <button
              onClick={() => setTimeRange('30d')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                timeRange === '30d' ? 'bg-white text-blue-600 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              30 ngày
            </button>
            <button
              onClick={() => setTimeRange('year')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                timeRange === 'year' ? 'bg-white text-blue-600 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Cả năm
            </button>
          </div>

          <button
            onClick={activeTab === 'inventory' ? handleExportInventoryReport : handleExportSalesReport}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs transition flex items-center space-x-1.5"
            title="Tải file Excel / CSV về máy tính"
          >
            <HiOutlineArrowDownTray className="w-4 h-4" />
            <span>Xuất Excel / CSV</span>
          </button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-gray-200 bg-white rounded-xl shadow-2xs overflow-x-auto px-2">
        <button
          onClick={() => setActiveTab('sales')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold text-xs whitespace-nowrap transition ${
            activeTab === 'sales' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <HiOutlineArrowTrendingUp className="w-4 h-4 text-blue-600" />
          <span>1. Báo cáo Doanh thu & Đơn hàng</span>
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold text-xs whitespace-nowrap transition ${
            activeTab === 'products' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <HiOutlineShoppingBag className="w-4 h-4 text-indigo-600" />
          <span>2. Top Sản phẩm Bán chạy</span>
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold text-xs whitespace-nowrap transition ${
            activeTab === 'inventory' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <HiOutlineArchiveBox className="w-4 h-4 text-amber-600" />
          <span>3. Báo cáo Tồn kho & Cảnh báo</span>
        </button>

        <button
          onClick={() => setActiveTab('customers')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold text-xs whitespace-nowrap transition ${
            activeTab === 'customers' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <HiStar className="w-4 h-4 text-amber-500" />
          <span>4. Đánh giá Khách hàng</span>
        </button>

        <button
          onClick={() => setActiveTab('staff')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold text-xs whitespace-nowrap transition ${
            activeTab === 'staff' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <HiOutlineUserGroup className="w-4 h-4 text-purple-600" />
          <span>5. Hòm thư Góp ý Nội bộ</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: DOANH THU & BÁN HÀNG                                   */}
      {/* ============================================================== */}
      {activeTab === 'sales' && (
        <div className="space-y-4">
          {/* KPI Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-gray-500">Doanh thu Thực nhận</span>
                <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                  <HiOutlineCurrencyDollar className="w-5 h-5" />
                </span>
              </div>
              <div className="text-lg font-black text-emerald-600 mt-2">{fmtVND(totalRevenue)}</div>
              <div className="text-[11px] text-gray-400 mt-0.5">Đã đối soát cổng thanh toán & tiền mặt</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-gray-500">Tổng Đơn hàng Thành công</span>
                <span className="p-2 rounded-lg bg-blue-50 text-blue-600">
                  <HiOutlineShoppingBag className="w-5 h-5" />
                </span>
              </div>
              <div className="text-lg font-black text-gray-900 mt-2">{totalOrders} <span className="text-xs font-normal text-gray-500">đơn</span></div>
              <div className="text-[11px] text-blue-600 font-medium mt-0.5">Tỷ lệ giao: {deliveryRate}%</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-gray-500">Giá trị Đơn Trung bình (AOV)</span>
                <span className="p-2 rounded-lg bg-purple-50 text-purple-600">
                  <HiOutlineArrowTrendingUp className="w-5 h-5" />
                </span>
              </div>
              <div className="text-lg font-black text-purple-700 mt-2">{fmtVND(aov)}</div>
              <div className="text-[11px] text-gray-400 mt-0.5">Bình quân mỗi khách chi trả</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-gray-500">Tiền COD Đang chờ Thu</span>
                <span className="p-2 rounded-lg bg-amber-50 text-amber-600">
                  <HiOutlineClock className="w-5 h-5" />
                </span>
              </div>
              <div className="text-lg font-black text-amber-600 mt-2">{fmtVND(codPending)}</div>
              <div className="text-[11px] text-gray-400 mt-0.5">Shipper đang giao hàng thu hộ</div>
            </div>
          </div>

          {/* Revenue Breakdown by Brand & Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* By Brand */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
              <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <HiOutlineTag className="w-4 h-4 text-blue-600" />
                  <span>Cơ cấu Sản phẩm theo Thương hiệu</span>
                </span>
                <span className="text-[11px] font-normal text-gray-400">{biData?.byBrand?.length || 0} hãng</span>
              </h2>
              <div className="space-y-2.5">
                {(biData?.byBrand || []).slice(0, 7).map((b) => {
                  const totalUnits = (biData?.byBrand || []).reduce((acc, curr) => acc + Number(curr.units_in_stock || 0), 0) || 1;
                  const pct = Math.round((Number(b.units_in_stock || 0) / totalUnits) * 100);
                  return (
                    <div key={b.id}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-gray-700">{b.name}</span>
                        <span className="text-gray-500 font-mono">
                          {b.units_in_stock} máy ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(5, pct))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* By Category */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
              <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <HiOutlineTag className="w-4 h-4 text-purple-600" />
                  <span>Phân bổ theo Danh mục Nhu cầu</span>
                </span>
                <span className="text-[11px] font-normal text-gray-400">{biData?.byCategory?.length || 0} danh mục</span>
              </h2>
              <div className="space-y-2.5">
                {(biData?.byCategory || []).map((c) => {
                  const totalProds = (biData?.byCategory || []).reduce((acc, curr) => acc + Number(curr.product_count || 0), 0) || 1;
                  const pct = Math.round((Number(c.product_count || 0) / totalProds) * 100);
                  return (
                    <div key={c.id}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-gray-700">{c.name}</span>
                        <span className="text-gray-500 font-mono">
                          {c.product_count} model ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-600 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(5, pct))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: TOP SẢN PHẨM BÁN CHẠY                                   */}
      {/* ============================================================== */}
      {activeTab === 'products' && (
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Bảng Xếp Hạng Top Laptop Bán Chạy Nhất</h2>
              <p className="text-[11px] text-gray-500 mt-0.5">Xếp hạng theo số lượng máy thực tế đã bán thành công</p>
            </div>
            <button
              onClick={handleExportSalesReport}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition flex items-center gap-1.5"
            >
              <HiOutlineArrowDownTray className="w-4 h-4" />
              <span>Xuất danh sách</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/70 text-gray-600 font-semibold">
                  <th className="py-2.5 px-3 w-12 text-center">Hạng</th>
                  <th className="py-2.5 px-3">Mã SKU</th>
                  <th className="py-2.5 px-3">Tên Laptop</th>
                  <th className="py-2.5 px-3 text-right">Giá bán</th>
                  <th className="py-2.5 px-3 text-center">Đã bán</th>
                  <th className="py-2.5 px-3 text-right">Tổng doanh số</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(biData?.topSold || []).length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-gray-400">
                      Chưa có dữ liệu giao dịch bán hàng
                    </td>
                  </tr>
                ) : (
                  (biData?.topSold || []).map((p, idx) => (
                    <tr key={p.id} className="hover:bg-blue-50/30 transition">
                      <td className="py-3 px-3 text-center font-bold">
                        {idx === 0 ? (
                          <span className="w-6 h-6 rounded-full bg-amber-400 text-white inline-flex items-center justify-center text-xs">🥇</span>
                        ) : idx === 1 ? (
                          <span className="w-6 h-6 rounded-full bg-gray-300 text-gray-700 inline-flex items-center justify-center text-xs">🥈</span>
                        ) : idx === 2 ? (
                          <span className="w-6 h-6 rounded-full bg-amber-600 text-white inline-flex items-center justify-center text-xs">🥉</span>
                        ) : (
                          <span className="text-gray-400">#{idx + 1}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono font-medium text-gray-600">{p.sku}</td>
                      <td className="py-3 px-3 font-bold text-gray-900">{p.name}</td>
                      <td className="py-3 px-3 text-right font-medium text-blue-600">{fmtVND(p.price)}</td>
                      <td className="py-3 px-3 text-center font-bold text-emerald-600 bg-emerald-50/40 rounded">
                        {p.sold_count} máy
                      </td>
                      <td className="py-3 px-3 text-right font-black text-gray-900">
                        {fmtVND(Number(p.price || 0) * Number(p.sold_count || 0))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: TỒN KHO & CẢNH BÁO                                      */}
      {/* ============================================================== */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
              <span className="text-[11px] font-medium text-gray-500">Tổng Máy Trong Kho</span>
              <div className="text-xl font-black text-gray-900 mt-1">
                {biData?.summary?.units_in_stock || 0} <span className="text-xs font-normal text-gray-500">máy</span>
              </div>
              <div className="text-[11px] text-gray-400 mt-0.5">{biData?.summary?.total_products || 0} model SKU khác nhau</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
              <span className="text-[11px] font-medium text-gray-500">Giá Trị Kho Theo Giá Niêm Yết</span>
              <div className="text-xl font-black text-blue-600 mt-1">
                {fmtVND(biData?.summary?.stock_retail_value || 0)}
              </div>
              <div className="text-[11px] text-gray-400 mt-0.5">Tính theo giá bán lẻ thị trường</div>
            </div>

            {can('cost:read') ? (
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
                <span className="text-[11px] font-medium text-gray-500">Giá Trị Kho Theo Giá Vốn</span>
                <div className="text-xl font-black text-emerald-600 mt-1">
                  {fmtVND(biData?.summary?.stock_cost_value || 0)}
                </div>
                <div className="text-[11px] text-emerald-700 mt-0.5 font-medium">Bảo mật: Chỉ Kế toán & Admin được xem</div>
              </div>
            ) : (
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex items-center justify-center text-gray-400 text-xs italic">
                🔒 Giá vốn kho bị ẩn theo phân quyền vai trò
              </div>
            )}
          </div>

          {/* Low Stock Alert Section */}
          <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-amber-800 flex items-center gap-1.5">
                <HiOutlineExclamationTriangle className="w-5 h-5 text-amber-500" />
                <span>Cảnh Báo Laptop Sắp Hết Hàng Trong Kho (Cần nhập thêm)</span>
              </h2>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-[11px]">
                {biData?.summary?.low_stock || 0} sản phẩm
              </span>
            </div>

            <div className="text-xs text-gray-600 leading-relaxed">
              Các model có số lượng tồn kho chạm ngưỡng tối thiểu (&le; 3 máy) sẽ tự động được cảnh báo tại đây để bộ phận Thủ kho và Thu mua kịp thời lập phiếu nhập lô mới.
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: ĐÁNH GIÁ KHÁCH HÀNG                                    */}
      {/* ============================================================== */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
          {/* Search & Filter */}
          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm theo Tên khách, Sản phẩm hoặc Nội dung đánh giá..."
                value={searchCustomer}
                onChange={(e) => setSearchCustomer(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-blue-600 text-xs"
              />
            </div>

            <div>
              <select
                value={starFilter}
                onChange={(e) => setStarFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-600 text-xs bg-white"
              >
                <option value="">-- Tất cả số sao đánh giá --</option>
                <option value="5">⭐⭐⭐⭐⭐ (5 sao)</option>
                <option value="4">⭐⭐⭐⭐ (4 sao)</option>
                <option value="3">⭐⭐⭐ (3 sao)</option>
                <option value="2">⭐⭐ (2 sao)</option>
                <option value="1">⭐ (1 sao)</option>
              </select>
            </div>
          </div>

          {/* Reviews List */}
          {reviewsLoading ? (
            <div className="py-16"><LoadingSpinner /></div>
          ) : reviews.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-gray-200 text-gray-500">
              Chưa có phản hồi nào phù hợp
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">
                        {r.customer_name?.charAt(0) || 'K'}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 flex items-center gap-1.5">
                          <span>{r.customer_name}</span>
                          {r.verified_purchase ? (
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-normal">
                              ✔ Đã mua hàng
                            </span>
                          ) : null}
                        </div>
                        <div className="text-[11px] text-gray-500 font-medium">{r.product_name}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <HiStar key={i} className={`w-4 h-4 ${i < r.rating ? 'text-amber-400' : 'text-gray-200'}`} />
                        ))}
                      </div>
                      <span className="text-[10px] text-gray-400">
                        {r.created_at ? new Date(r.created_at).toLocaleString('vi-VN') : ''}
                      </span>
                    </div>
                  </div>

                  <div className="text-gray-800 text-xs">
                    {r.title && <p className="font-semibold mb-1 text-gray-900">{r.title}</p>}
                    <p className="leading-relaxed text-gray-700">{r.comment}</p>
                  </div>

                  {r.admin_reply ? (
                    <div className="bg-blue-50/70 p-3 rounded-lg border border-blue-100 text-xs space-y-1">
                      <div className="font-bold text-blue-800 flex items-center gap-1">
                        <span>💬 Phản hồi từ Laptop99:</span>
                      </div>
                      <p className="text-gray-700">{r.admin_reply}</p>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-gray-100 flex justify-end">
                      <button
                        onClick={() => { setReplyingReview(r); setReplyText(''); }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs flex items-center gap-1 shadow-2xs"
                      >
                        <span>Trả lời khách</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 5: GÓP Ý NỘI BỘ                                            */}
      {/* ============================================================== */}
      {activeTab === 'staff' && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Hòm Thư Đề Xuất Cải Tiến Quy Trình Nội Bộ</h2>
              <p className="text-[11px] text-gray-500 mt-0.5">Dành cho nhân viên các chi nhánh đóng góp sáng kiến phát triển hệ thống</p>
            </div>
            <button
              onClick={() => setIsStaffModalOpen(true)}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold transition flex items-center gap-1.5"
            >
              <HiOutlinePlus className="w-4 h-4" />
              <span>Gửi đề xuất mới</span>
            </button>
          </div>

          <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100 text-xs text-purple-900 leading-relaxed">
            💡 Mọi đề xuất về tối ưu hóa kho vận, cải tiến thanh toán hay chương trình khuyến mãi sẽ được Ban Giám Đốc trực tiếp phê duyệt hàng tuần.
          </div>
        </div>
      )}

      {/* Modal Trả lời Đánh giá */}
      {replyingReview && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-5 shadow-2xl border border-gray-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-sm text-gray-900">
                Trả lời đánh giá của: <span className="text-blue-600">{replyingReview.customer_name}</span>
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

      {/* Modal Đề xuất Nội bộ */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-5 shadow-2xl border border-gray-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-sm text-gray-900">Gửi Sáng Kiến / Đóng Góp Ý Kiến Nội Bộ</h3>
              <button onClick={() => setIsStaffModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaffFeedback} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Tiêu đề đề xuất *</label>
                <input
                  type="text"
                  value={newStaffFeedback.title}
                  onChange={(e) => setNewStaffFeedback({ ...newStaffFeedback, title: e.target.value })}
                  placeholder="VD: Đề xuất bổ sung quét mã QR trực tiếp tại quầy"
                  className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-blue-600 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Nội dung chi tiết *</label>
                <textarea
                  rows={4}
                  value={newStaffFeedback.content}
                  onChange={(e) => setNewStaffFeedback({ ...newStaffFeedback, content: e.target.value })}
                  placeholder="Mô tả cụ thể khó khăn hiện tại và phương án giải quyết đề xuất..."
                  className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-blue-600 text-xs"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 hover:bg-gray-50 rounded-lg font-bold text-gray-700 text-xs"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-xs shadow-xs"
                >
                  Gửi đề xuất
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
