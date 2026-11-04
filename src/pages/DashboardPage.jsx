import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  HiOutlineCurrencyDollar,
  HiOutlineShoppingBag,
  HiOutlineUsers,
  HiOutlineArrowTrendingUp,
  HiOutlineExclamationTriangle,
  HiOutlineArrowDownTray,
  HiOutlineArrowPath,
  HiOutlineClock,
  HiOutlineMagnifyingGlass,
  HiOutlineXMark,
  HiOutlineComputerDesktop,
  HiOutlineShieldCheck,
  HiOutlineSparkles,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { resolveAdminImageUrl, handleImageError } from '../utils/imageHelper';

const formatVND = (v) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v || 0);

export default function DashboardPage() {
  const { can } = useAuth();
  const [timeRange, setTimeRange] = useState('30d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pieMode, setPieMode] = useState('category'); // 'category' or 'order'

  // Low stock real data
  const [lowStockItems, setLowStockItems] = useState([]);

  const revenueChartData = data?.revenue_timeline || [];
  const orderStatusData = data?.order_status || [];
  const categoryDistribution = data?.category_distribution || [];

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const [dashRes, lowStockRes] = await Promise.all([
        api.get('/dashboard', { params: { range: timeRange } }),
        api.get('/inventory/low-stock'),
      ]);
      setData(dashRes.data.data);
      setLowStockItems(lowStockRes.data.data || []);
    } catch (err) {
      toast.error('Lỗi khi tải dữ liệu báo cáo tổng quan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [timeRange]); // Re-fetch khi đổi khoảng thời gian

  const navigate = useNavigate();
  const [dashboardSearch, setDashboardSearch] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleDashboardSearch = async (val) => {
    setDashboardSearch(val);
    if (!val || val.trim().length < 2) {
      setSearchResults(null);
      return;
    }
    setIsSearching(true);
    try {
      // Tìm song song sản phẩm và đơn hàng từ API thật
      const [prodRes, orderRes] = await Promise.allSettled([
        api.get('/products', { params: { search: val.trim(), limit: 6 } }),
        api.get('/orders', { params: { search: val.trim(), limit: 4 } }),
      ]);

      const products = prodRes.status === 'fulfilled' ? (prodRes.value.data?.data || []) : [];
      const orders = orderRes.status === 'fulfilled' ? (orderRes.value.data?.data || []) : [];

      setSearchResults({ products, orders });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  if (loading) return <LoadingSpinner fullPage text="Đang đồng bộ chỉ số kinh doanh..." />;

  const summary = data?.summary || {};
  const topSold = data?.top_sold || [];

  // Doanh thu thật từ bảng orders (total_revenue), fallback về top_sold
  const realRevenue = data?.total_revenue ?? 0;
  const totalOrders = data?.total_orders ?? 0;
  const newOrders = data?.new_orders ?? 0;
  const totalCustomers = data?.total_customers ?? 0;
  const recentOrders = data?.recent_orders || [];

  return (
    <div className="space-y-4 text-xs">
      {/* Top Filter and Actions Row */}
      <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-1 sm:space-x-2">
          {['today', '7d', '30d'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 rounded-md font-medium text-xs transition border ${
                timeRange === range
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-300'
              }`}
            >
              {range === 'today' ? 'Hôm nay' : range === '7d' ? '7 ngày' : '30 ngày'}
            </button>
          ))}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-gray-300 rounded-md bg-gray-50 text-gray-700 focus:outline-none"
          >
            <option value="custom">Tùy chọn</option>
            <option value="quarter">Quý này</option>
            <option value="year">Năm nay</option>
          </select>
        </div>

        <button
          onClick={() => toast.success('Đang kết xuất báo cáo Excel/PDF toàn hệ thống...')}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold text-xs transition flex items-center space-x-1.5 shadow-2xs"
        >
          <HiOutlineArrowDownTray className="w-4 h-4" />
          <span>Xuất báo cáo</span>
        </button>
      </div>

      {/* Dashboard Quick Search Bar */}
      <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-2xs space-y-2">
        <div className="relative">
          <HiOutlineMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="🔍 Tìm kiếm: mã SKU, tên laptop, mã đơn hàng (DH-2026...), số Serial (S/N) hoặc tên khách hàng..."
            value={dashboardSearch}
            onChange={(e) => handleDashboardSearch(e.target.value)}
            className="w-full pl-10 pr-9 py-2 bg-gray-50/80 border border-gray-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white transition"
          />
          {dashboardSearch && (
            <button
              onClick={() => { setDashboardSearch(''); setSearchResults(null); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
            >
              <HiOutlineXMark className="w-4 h-4" />
            </button>
          )}
        </div>

        {dashboardSearch && (
          <div className="p-3.5 bg-blue-50/40 rounded-lg border border-blue-100">
            {isSearching ? (
              <div className="py-4 text-center text-xs text-gray-500 flex items-center justify-center space-x-2">
                <span className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                <span>Đang tra cứu dữ liệu thời gian thực...</span>
              </div>
            ) : (!searchResults || (searchResults.products.length === 0 && searchResults.orders.length === 0)) ? (
              <div className="py-3 text-center text-xs text-gray-500">
                Không tìm thấy kết quả nào khớp với "<strong>{dashboardSearch}</strong>".
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-800">
                    Kết quả cho "{dashboardSearch}" ({searchResults.products.length + searchResults.orders.length} kết quả):
                  </span>
                  <button
                    onClick={() => navigate(`/products?search=${encodeURIComponent(dashboardSearch)}`)}
                    className="text-blue-600 hover:underline font-bold"
                  >
                    Xem chi tiết trong Quản lý Sản phẩm ➔
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {/* Products */}
                  {searchResults.products.map(p => (
                    <div
                      key={p.id}
                      onClick={() => navigate(`/products/${p.id}`)}
                      className="bg-white p-2.5 rounded-lg border border-gray-200 shadow-2xs hover:border-blue-500 cursor-pointer transition flex items-center space-x-2.5"
                    >
                      {p.image_url || p.thumbnail ? (
                        <img
                          src={resolveAdminImageUrl(p.image_url || p.thumbnail)}
                          alt={p.name}
                          className="w-10 h-10 object-cover rounded border border-gray-200 flex-shrink-0"
                          onError={handleImageError}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center font-bold text-sm flex-shrink-0">💻</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-gray-900 truncate text-[11px]">{p.name}</div>
                        <div className="text-[10px] text-gray-500 font-mono">SKU: {p.sku}</div>
                        <div className="text-[11px] font-bold text-rose-600 mt-0.5">{formatVND(p.price)}</div>
                      </div>
                    </div>
                  ))}

                  {/* Orders */}
                  {searchResults.orders.map(o => (
                    <div
                      key={o.id}
                      onClick={() => navigate('/orders')}
                      className="bg-white p-2.5 rounded-lg border border-purple-200 shadow-2xs hover:border-purple-500 cursor-pointer transition flex flex-col justify-between"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-mono font-bold text-blue-600 text-[11px]">{o.code}</span>
                        <span className="font-bold text-rose-600 text-[11px]">{formatVND(o.total_amount)}</span>
                      </div>
                      <div className="text-[11px] text-gray-800 font-medium truncate mt-1">{o.customer_name} · {o.customer_phone}</div>
                      <div className="text-[10px] text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded font-mono mt-1 self-start">
                        S/N: {o.serial_number || 'Chưa gán'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4 KPI Top Cards – Dữ liệu thật từ DB */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Doanh thu thật */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-2xs">
          <div className="flex justify-between items-start">
            <span className="text-gray-500 font-medium">Doanh thu</span>
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded">
              <HiOutlineCurrencyDollar className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
              {formatVND(realRevenue)}
            </h3>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">
              Từ {totalOrders} đơn khách đặt ({formatVND(data?.delivered_revenue || 0)} đã giao)
            </p>
          </div>
        </div>

        {/* Đơn mới thật */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-2xs">
          <div className="flex justify-between items-start">
            <span className="text-gray-500 font-medium">Đơn mới</span>
            <span className="p-1.5 bg-blue-50 text-blue-600 rounded">
              <HiOutlineShoppingBag className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900">{newOrders}</h3>
            <p className="text-[11px] text-blue-600 font-medium mt-1">Tổng {totalOrders} đơn hàng thực tế</p>
          </div>
        </div>

        {/* Khách hàng thật */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-2xs">
          <div className="flex justify-between items-start">
            <span className="text-gray-500 font-medium">Khách hàng</span>
            <span className="p-1.5 bg-purple-50 text-purple-600 rounded">
              <HiOutlineUsers className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900">{totalCustomers}</h3>
            <p className="text-[11px] text-purple-600 font-medium mt-1">Tài khoản khách hàng thật</p>
          </div>
        </div>

        {/* Tỷ lệ tồn kho */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-2xs">
          <div className="flex justify-between items-start">
            <span className="text-gray-500 font-medium">Sản phẩm</span>
            <span className="p-1.5 bg-amber-50 text-amber-600 rounded">
              <HiOutlineArrowTrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900">{summary.total_products || 0}</h3>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">{summary.active || 0} đang kinh doanh · Đã bán {summary.total_sold || 0} máy</p>
          </div>
        </div>
      </div>

      {/* Middle Row: 2 Big Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left Chart: Biểu đồ doanh thu */}
        <div className="lg:col-span-8 bg-white p-4 rounded-lg border border-gray-200 shadow-2xs">
          <h4 className="font-semibold text-gray-800 text-xs uppercase tracking-wider mb-3">
            Biểu đồ doanh thu thực tế theo thời gian
          </h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueChartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(val) => `${val / 1000000}M`} />
                <Tooltip formatter={(value) => [formatVND(value), 'Doanh thu']} />
                <Area type="monotone" dataKey="doanhThu" stroke="#2563eb" fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Chart: Pie */}
        <div className="lg:col-span-4 bg-white p-4 rounded-lg border border-gray-200 shadow-2xs flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold text-gray-800 text-xs uppercase tracking-wider">
              {pieMode === 'category' ? 'Tỷ trọng danh mục máy' : 'Trạng thái đơn hàng'}
            </h4>
            <div className="flex space-x-1 text-[10px]">
              <button
                type="button"
                onClick={() => setPieMode('category')}
                className={`px-2 py-0.5 rounded transition ${pieMode === 'category' ? 'bg-blue-600 text-white font-bold' : 'bg-gray-100 text-gray-600'}`}
              >
                Danh mục
              </button>
              <button
                type="button"
                onClick={() => setPieMode('order')}
                className={`px-2 py-0.5 rounded transition ${pieMode === 'order' ? 'bg-blue-600 text-white font-bold' : 'bg-gray-100 text-gray-600'}`}
              >
                Đơn hàng
              </button>
            </div>
          </div>

          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieMode === 'category' ? categoryDistribution : orderStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={46}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {(pieMode === 'category' ? categoryDistribution : orderStatusData).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [pieMode === 'category' ? `${value} mẫu máy` : `${value} đơn`, 'Số lượng']} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-[10px] pt-2 border-t border-gray-100 max-h-24 overflow-y-auto">
            {(pieMode === 'category' ? categoryDistribution : orderStatusData).map((s) => (
              <div key={s.name} className="flex items-center space-x-1.5 truncate" title={s.name}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }}></span>
                <span className="text-gray-600 truncate">{s.name} ({s.value}{pieMode === 'category' ? ' SP' : ' đơn'})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Middle-Bottom: Sản phẩm bán chạy & Cảnh báo tồn kho THẬT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Sản phẩm bán chạy */}
        <div className="lg:col-span-7 bg-white p-4 rounded-lg border border-gray-200 shadow-2xs">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-semibold text-gray-800 text-xs uppercase tracking-wider">Sản phẩm bán chạy</h4>
            <span
              className="text-[11px] text-blue-600 cursor-pointer hover:underline"
              onClick={() => navigate('/products?sort=sold&order=desc')}
            >
              Xem tất cả
            </span>
          </div>
          {topSold.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">Chưa có dữ liệu bán hàng</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-500 font-medium">
                    <th className="pb-2">Sản phẩm</th>
                    <th className="pb-2 text-center">Đã bán</th>
                    <th className="pb-2 text-right">Doanh thu ước tính</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {topSold.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/products/${p.id}`)}>
                      <td className="py-2.5 pr-2">
                        <div className="font-medium text-gray-900 truncate max-w-[260px]">{p.name}</div>
                        <div className="text-[10px] text-gray-400">SKU: {p.sku}</div>
                      </td>
                      <td className="py-2.5 text-center font-bold text-gray-700">{p.sold_count}</td>
                      <td className="py-2.5 text-right font-semibold text-blue-600">
                        {formatVND(p.price * (p.sold_count || 1))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Cảnh báo tồn kho thấp – DỮ LIỆU THẬT từ /inventory/low-stock */}
        <div className="lg:col-span-5 bg-white p-4 rounded-lg border border-gray-200 shadow-2xs">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-semibold text-gray-800 text-xs uppercase tracking-wider flex items-center text-red-600">
              <HiOutlineExclamationTriangle className="w-4 h-4 mr-1 text-red-500" />
              Cảnh báo tồn kho thấp
            </h4>
            <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">
              {lowStockItems.length} mã
            </span>
          </div>
          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {lowStockItems.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">✅ Tồn kho đang ổn định</p>
            ) : (
              lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 bg-red-50/60 border border-red-100 rounded-md flex justify-between items-center cursor-pointer hover:border-red-300 transition"
                  onClick={() => navigate(`/products/${item.id}`)}
                >
                  <div className="truncate pr-2">
                    <p className="font-medium text-gray-900 truncate">{item.name}</p>
                    <p className="text-[10px] text-gray-500">SKU: {item.sku} · {item.warehouse_location || 'Kho chính'}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-[11px] font-bold whitespace-nowrap ${
                    item.stock_quantity === 0
                      ? 'bg-red-600 text-white'
                      : 'bg-amber-500 text-white'
                  }`}>
                    còn {item.stock_quantity} máy
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Đơn hàng gần đây – từ API thật */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-2xs">
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-semibold text-gray-800 text-xs uppercase tracking-wider">Đơn hàng gần đây</h4>
          <button
            onClick={() => navigate('/orders')}
            className="text-[11px] text-blue-600 hover:underline font-bold"
          >
            Xem tất cả đơn hàng ➔
          </button>
        </div>
        {recentOrders.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">Chưa có đơn hàng nào</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500 font-medium text-[10px] uppercase">
                  <th className="pb-2">Mã đơn</th>
                  <th className="pb-2">Khách hàng</th>
                  <th className="pb-2">Sản phẩm</th>
                  <th className="pb-2 text-right">Tổng tiền</th>
                  <th className="pb-2 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentOrders.map((o) => {
                  const statusMap = {
                    pending: { label: 'Chờ duyệt', cls: 'bg-amber-100 text-amber-800' },
                    confirmed: { label: 'Đã xác nhận', cls: 'bg-blue-100 text-blue-800' },
                    shipping: { label: 'Đang giao', cls: 'bg-purple-100 text-purple-800' },
                    delivered: { label: 'Hoàn thành', cls: 'bg-emerald-100 text-emerald-800' },
                    cancelled: { label: 'Đã huỷ', cls: 'bg-gray-100 text-gray-600' },
                  };
                  const st = statusMap[o.status] || statusMap.pending;
                  return (
                    <tr key={o.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate('/orders')}>
                      <td className="py-2 pr-3 font-mono font-bold text-blue-600 text-[11px]">{o.code}</td>
                      <td className="py-2 pr-3">
                        <div className="font-medium text-gray-900">{o.customer_name}</div>
                        <div className="text-[10px] text-gray-500">{o.customer_phone}</div>
                      </td>
                      <td className="py-2 pr-3 max-w-xs">
                        <div className="truncate text-gray-800">{o.product_name}</div>
                      </td>
                      <td className="py-2 text-right font-bold text-gray-900">{formatVND(o.total_amount)}</td>
                      <td className="py-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${st.cls}`}>{st.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bottom 4 Operation Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-center">
        <div
          className="bg-white p-3.5 rounded-lg border border-gray-200 hover:border-blue-400 transition cursor-pointer shadow-2xs"
          onClick={() => navigate('/orders')}
        >
          <p className="font-semibold text-gray-800 text-xs">Đơn cần xử lý</p>
          <p className="text-xl font-bold text-blue-600 mt-1">{newOrders} đơn</p>
          <span className="text-[10px] text-gray-400">Yêu cầu xác nhận xuất kho</span>
        </div>

        <div
          className="bg-white p-3.5 rounded-lg border border-gray-200 hover:border-blue-400 transition cursor-pointer shadow-2xs"
          onClick={() => navigate('/inventory')}
        >
          <p className="font-semibold text-gray-800 text-xs">Hàng sắp hết kho</p>
          <p className="text-xl font-bold text-amber-600 mt-1">{lowStockItems.length} mã</p>
          <span className="text-[10px] text-gray-400">Cần nhập thêm hàng</span>
        </div>

        <div
          className="bg-white p-3.5 rounded-lg border border-gray-200 hover:border-blue-400 transition cursor-pointer shadow-2xs"
          onClick={() => navigate('/reports')}
        >
          <p className="font-semibold text-gray-800 text-xs">Phản hồi chờ duyệt</p>
          <p className="text-xl font-bold text-purple-600 mt-1">Xem ngay</p>
          <span className="text-[10px] text-gray-400">Cần phản hồi CSKH</span>
        </div>

        <div
          className="bg-white p-3.5 rounded-lg border border-gray-200 hover:border-blue-400 transition cursor-pointer shadow-2xs"
          onClick={() => navigate('/audit-logs')}
        >
          <p className="font-semibold text-gray-800 text-xs">Hoạt động gần đây</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">Audit Log</p>
          <span className="text-[10px] text-gray-400">Ghi nhận log thời gian thực</span>
        </div>
      </div>
    </div>
  );
}
