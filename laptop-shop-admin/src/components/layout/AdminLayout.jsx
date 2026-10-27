import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Navigate, useLocation, useNavigate, Link } from 'react-router-dom';
import Sidebar from './Sidebar';
import { HiBars3, HiMagnifyingGlass, HiBell, HiChevronDown, HiXMark, HiOutlineComputerDesktop, HiOutlineShoppingBag, HiOutlineShieldCheck, HiOutlineUsers } from 'react-icons/hi2';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../ui/LoadingSpinner';
import api from '../../api/axios';

export default function AdminLayout() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);
  const { isAuthenticated, loading, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Global Search State
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef(null);
  const notificationRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchDropdown(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = async (e) => {
    const val = e.target.value;
    setGlobalSearch(val);
    if (!val || val.trim().length < 2) {
      setSearchResults(null);
      setShowSearchDropdown(false);
      return;
    }

    setIsSearching(true);
    setShowSearchDropdown(true);

    try {
      // 1. Tìm sản phẩm qua API backend
      const res = await api.get('/products', { params: { search: val.trim(), limit: 4 } });
      const products = res.data?.data || [];

      // 2. Tìm đơn hàng & khách hàng
      const sampleOrders = [
        { id: 'DH-2026-001', customer: 'Nguyễn Văn An', phone: '0912345678', total: 62990000, product: 'Dell XPS 14 9440', serial: 'SN-DELL-9440-88219' },
        { id: 'DH-2026-002', customer: 'Trần Thị Bích Ngọc', phone: '0987654321', total: 49990000, product: 'MacBook Pro 14 M3 Pro', serial: 'SN-APL-MBP14-3312' },
        { id: 'DH-2026-003', customer: 'Lê Hoàng Long', phone: '0903334444', total: 49990000, product: 'Asus ROG Strix G16', serial: 'SN-ASUS-G16-9901' },
        { id: 'DH-2026-004', customer: 'Phạm Minh Tuấn', phone: '0934567890', total: 52990000, product: 'Lenovo ThinkPad X1 Carbon Gen 11', serial: 'SN-LNV-X1C-1102' },
      ];
      const matchingOrders = sampleOrders.filter(o => 
        o.id.toLowerCase().includes(val.toLowerCase()) || 
        o.customer.toLowerCase().includes(val.toLowerCase()) || 
        o.phone.includes(val) ||
        o.serial.toLowerCase().includes(val.toLowerCase())
      );

      setSearchResults({
        products,
        orders: matchingOrders,
      });
    } catch (err) {
      console.error('Search error', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && globalSearch.trim()) {
      setShowSearchDropdown(false);
      navigate(`/products?search=${encodeURIComponent(globalSearch.trim())}`);
    }
  };

  const clearSearch = () => {
    setGlobalSearch('');
    setSearchResults(null);
    setShowSearchDropdown(false);
  };

  if (loading) {
    return <LoadingSpinner fullPage text="Đang tải dữ liệu..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const [notificationOpen, setNotificationOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('open_notif') === '1';
    }
    return false;
  });
  const [notificationTab, setNotificationTab] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);

  // Helper format relative time
  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return 'Vừa xong';
    const now = new Date();
    const past = new Date(dateStr);
    const diffMs = now - past;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return 'Vừa xong';
    if (diffMin < 60) return `${diffMin} phút trước`;
    if (diffHr < 24) return `${diffHr} giờ trước`;
    if (diffDay === 1) return 'Hôm qua';
    if (diffDay < 7) return `${diffDay} ngày trước`;
    return past.toLocaleDateString('vi-VN');
  };

  const getReadNotifIds = () => {
    try {
      const stored = localStorage.getItem('laptop99_admin_read_notifs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const saveReadNotifId = (id) => {
    try {
      const list = getReadNotifIds();
      if (!list.includes(id)) {
        list.push(id);
        localStorage.setItem('laptop99_admin_read_notifs', JSON.stringify(list));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRealNotifications = async () => {
    try {
      const readIds = getReadNotifIds();

      // 1. Thử gọi API notifications chính thức từ backend
      try {
        const res = await api.get('/notifications?limit=30');
        if (res.data?.data && Array.isArray(res.data.data)) {
          const merged = res.data.data.map((item) => ({
            ...item,
            read: item.read || readIds.includes(item.id),
          }));
          setNotifications(merged);
          return;
        }
      } catch (apiErr) {
        // Fallback tự động tổng hợp từ orders, inventory và rma
      }

      // 2. Fallback resilient: Tổng hợp trực tiếp từ orders, inventory và rma
      const [ordersRes, stockRes, rmasRes] = await Promise.allSettled([
        api.get('/orders?limit=15'),
        api.get('/inventory/low-stock'),
        api.get('/orders/rmas/list?limit=6'),
      ]);

      const list = [];

      // Đơn hàng thực tế phát sinh từ storefront khách hàng
      if (ordersRes.status === 'fulfilled' && ordersRes.value.data) {
        const rawOrders = Array.isArray(ordersRes.value.data)
          ? ordersRes.value.data
          : (ordersRes.value.data.data || []);
        rawOrders.slice(0, 15).forEach((o) => {
          const isPendingVerif = o.payment_verification_status === 'pending_verification';
          const orderDate = o.ordered_at || o.created_at;
          const totalStr = Number(o.total_amount || 0).toLocaleString('vi-VN') + ' ₫';
          if (isPendingVerif) {
            list.push({
              id: `pay-${o.id}`,
              type: 'order',
              subType: 'payment_verify',
              title: `Xác nhận chuyển khoản: #${o.code}`,
              message: `Khách hàng ${o.customer_name || 'Khách'} đã gửi xác nhận chuyển khoản (${totalStr}) - Chờ đối soát kế toán.`,
              time: formatTimeAgo(orderDate),
              timestamp: new Date(orderDate || Date.now()).toISOString(),
              read: readIds.includes(`pay-${o.id}`),
              link: '/orders',
            });
          } else {
            let statusText = 'Mới đặt hàng';
            let isRead = readIds.includes(`ord-${o.id}`);
            if (o.status === 'confirmed') statusText = 'Đã duyệt';
            else if (o.status === 'shipping') statusText = 'Đang giao hàng';
            else if (o.status === 'delivered') { statusText = 'Giao thành công'; isRead = true; }
            else if (o.status === 'cancelled') { statusText = 'Đã hủy đơn'; isRead = true; }

            list.push({
              id: `ord-${o.id}`,
              type: 'order',
              subType: o.status,
              title: o.status === 'pending' ? `Đơn hàng mới: #${o.code}` : `Đơn #${o.code} (${statusText})`,
              message: `Khách ${o.customer_name || 'Khách'} đặt ${o.product_name || 'sản phẩm'} (${totalStr}).`,
              time: formatTimeAgo(orderDate),
              timestamp: new Date(orderDate || Date.now()).toISOString(),
              read: isRead,
              link: '/orders',
            });
          }
        });
      }

      // Cảnh báo tồn kho thực tế
      if (stockRes.status === 'fulfilled' && stockRes.value.data) {
        const rawStock = Array.isArray(stockRes.value.data)
          ? stockRes.value.data
          : (stockRes.value.data.data || []);
        rawStock.slice(0, 8).forEach((p) => {
          const isOut = (p.stock_quantity ?? p.stock) === 0;
          list.push({
            id: `stock-${p.id}`,
            type: 'stock',
            subType: isOut ? 'out_of_stock' : 'low_stock',
            title: isOut ? 'Hết hàng trong kho (Out of Stock)' : 'Cảnh báo tồn kho tối thiểu',
            message: `"${p.name}" (SKU: ${p.sku}) ${isOut ? 'đã hết sạch máy trong kho.' : `chỉ còn ${p.stock_quantity ?? p.stock} máy (ngưỡng: ${p.low_stock_threshold || 3}).`}`,
            time: formatTimeAgo(p.updated_at),
            timestamp: new Date(p.updated_at || Date.now()).toISOString(),
            read: readIds.includes(`stock-${p.id}`),
            link: '/inventory',
          });
        });
      }

      // Yêu cầu đổi trả RMA từ storefront
      if (rmasRes.status === 'fulfilled' && rmasRes.value.data) {
        const rawRmas = Array.isArray(rmasRes.value.data)
          ? rmasRes.value.data
          : (rmasRes.value.data.data || []);
        rawRmas.slice(0, 6).forEach((r) => {
          list.push({
            id: `rma-${r.id}`,
            type: 'rma',
            subType: r.status,
            title: `Yêu cầu đổi trả ${r.code} (${r.status || 'Chờ duyệt'})`,
            message: `Đơn #${r.order_code} (${r.product_name || 'Sản phẩm'}): ${r.reason || 'Yêu cầu kiểm định'}`,
            time: formatTimeAgo(r.created_at),
            timestamp: new Date(r.created_at || Date.now()).toISOString(),
            read: readIds.includes(`rma-${r.id}`) || r.status === 'Hoàn tất' || r.status === 'Từ chối',
            link: '/returns',
          });
        });
      }

      // Sắp xếp thời gian thực mới nhất lên đầu
      list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setNotifications(list);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchRealNotifications();
      const interval = setInterval(fetchRealNotifications, 25000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    const allIds = notifications.map((n) => n.id);
    try {
      localStorage.setItem('laptop99_admin_read_notifs', JSON.stringify(allIds));
    } catch (e) {}
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleNotificationClick = (notif) => {
    saveReadNotifId(notif.id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
    );
    setNotificationOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (path === '/') return 'Quản trị › Tổng quan';
    if (path.startsWith('/products/new')) return 'Quản trị › Thêm / sửa sản phẩm';
    if (path.includes('/edit')) return 'Quản trị › Chỉnh sửa sản phẩm';
    if (path.startsWith('/products')) return 'Quản trị › Danh sách sản phẩm';
    if (path.startsWith('/categories')) return 'Quản trị › Danh mục & thương hiệu';
    if (path.startsWith('/inventory')) return 'Quản trị › Kho hàng & tồn kho';
    if (path.startsWith('/orders')) return 'Quản trị › Quản lý đơn hàng (Kanban)';
    if (path.startsWith('/batch-import')) return 'Quản trị › Nhập liệu hàng loạt (ZIP/Excel)';
    if (path.startsWith('/warranty')) return 'Quản trị › Bảo hành chính hãng & S/N';
    if (path.startsWith('/returns')) return 'Quản trị › Đổi trả & Hoàn tiền (RMA)';
    if (path.startsWith('/trade-in')) return 'Quản trị › Thu cũ đổi mới & Trợ giá';
    if (path.startsWith('/profile')) return 'Quản trị › Hồ sơ cá nhân & Bảo mật';
    if (path.startsWith('/users')) return 'Quản trị › Phân quyền & Tài khoản';
    if (path.startsWith('/audit-logs')) return 'Quản trị › Audit trail (Nhật ký)';
    return 'Quản trị hệ thống';
  };

  const filteredNotifs = notifications.filter((n) => {
    if (notificationTab === 'stock') return n.type === 'stock';
    if (notificationTab === 'order') return n.type === 'order' || n.type === 'rma' || n.type === 'tradein';
    return true;
  });

  return (
    <div className="flex h-screen bg-[#f3f4f6] overflow-hidden font-sans">
      <Sidebar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden lg:pl-60">
        {/* Top Header Bar matching wireframe */}
        <header className="flex-shrink-0 bg-white border-b border-gray-200 h-14 flex items-center justify-between px-4 sm:px-6 z-20 shadow-2xs">
          <div className="flex items-center space-x-3 flex-1 max-w-2xl">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="lg:hidden p-1.5 -ml-1 text-gray-600 rounded-md hover:bg-gray-100"
            >
              <HiBars3 className="w-5 h-5" />
            </button>

            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center">
              <img src="/favicon.svg" alt="Laptop Shop" className="w-7 h-7" />
            </div>

            {/* Breadcrumb */}
            <div className="hidden sm:block text-xs font-semibold text-gray-500 whitespace-nowrap">
              {getBreadcrumbs()}
            </div>

            {/* Global Search Input matching wireframe */}
            <div className="relative flex-1 max-w-md ml-4" ref={searchRef}>
              <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={globalSearch}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => globalSearch.trim().length >= 2 && setShowSearchDropdown(true)}
                placeholder="Tìm kiếm toàn hệ thống (SKU, Laptop, Đơn hàng, S/N...)"
                className="w-full pl-9 pr-8 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition"
              />
              {globalSearch && (
                <button
                  onClick={clearSearch}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                >
                  <HiXMark className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Live Search Results Dropdown */}
              {showSearchDropdown && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden max-h-96 overflow-y-auto">
                  {isSearching ? (
                    <div className="p-4 text-center text-xs text-gray-500 flex items-center justify-center space-x-2">
                      <span className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                      <span>Đang tìm kiếm dữ liệu...</span>
                    </div>
                  ) : (!searchResults || (searchResults.products.length === 0 && searchResults.orders.length === 0)) ? (
                    <div className="p-4 text-center text-xs text-gray-500">
                      Không tìm thấy kết quả nào khớp với "<strong>{globalSearch}</strong>".
                    </div>
                  ) : (
                    <div className="p-2 space-y-2 text-xs">
                      {/* Products Section */}
                      {searchResults.products && searchResults.products.length > 0 && (
                        <div>
                          <div className="text-[10px] font-bold text-gray-400 uppercase px-2 py-1 flex items-center gap-1">
                            <HiOutlineComputerDesktop className="w-3.5 h-3.5 text-blue-600" />
                            <span>Sản phẩm Laptop ({searchResults.products.length})</span>
                          </div>
                          <div className="space-y-1">
                            {searchResults.products.map((p) => (
                              <div
                                key={p.id}
                                onClick={() => {
                                  clearSearch();
                                  navigate(`/products/${p.id}`);
                                }}
                                className="flex items-center space-x-2.5 p-2 hover:bg-blue-50/60 rounded-lg cursor-pointer transition"
                              >
                                {p.image_url ? (
                                  <img
                                    src={p.image_url}
                                    alt={p.name}
                                    className="w-8 h-8 object-cover rounded border border-gray-200"
                                    onError={(e) => { e.target.src = '/laptop-placeholder.svg'; }}
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                                    💻
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-gray-900 truncate">{p.name}</div>
                                  <div className="text-[10px] text-gray-500 font-mono">
                                    SKU: {p.sku} · {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p.price)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Orders Section */}
                      {searchResults.orders && searchResults.orders.length > 0 && (
                        <div className="pt-1.5 border-t border-gray-100">
                          <div className="text-[10px] font-bold text-gray-400 uppercase px-2 py-1 flex items-center gap-1">
                            <HiOutlineShoppingBag className="w-3.5 h-3.5 text-purple-600" />
                            <span>Đơn hàng & Giao dịch ({searchResults.orders.length})</span>
                          </div>
                          <div className="space-y-1">
                            {searchResults.orders.map((o) => (
                              <div
                                key={o.id}
                                onClick={() => {
                                  clearSearch();
                                  navigate('/orders');
                                }}
                                className="flex items-center justify-between p-2 hover:bg-purple-50/60 rounded-lg cursor-pointer transition"
                              >
                                <div>
                                  <div className="font-bold text-blue-600 font-mono text-[11px]">{o.id}</div>
                                  <div className="text-gray-700 font-medium">{o.customer} · {o.phone}</div>
                                  <div className="text-[10px] text-gray-400">{o.product}</div>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold text-rose-600 text-[11px]">
                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(o.total)}
                                  </div>
                                  <div className="text-[10px] text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded font-mono">
                                    {o.serial}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="pt-1.5 border-t border-gray-100 text-center">
                        <button
                          onClick={() => {
                            clearSearch();
                            navigate(`/products?search=${encodeURIComponent(globalSearch.trim())}`);
                          }}
                          className="text-[11px] text-blue-600 hover:underline font-bold py-1 w-full"
                        >
                          Xem tất cả kết quả cho "{globalSearch}" ➔
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right utilities: Notifications & User Profile dropdown */}
          <div className="flex items-center space-x-3">
            {/* Notification Center Dropdown */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setNotificationOpen(!notificationOpen)}
                className="relative p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition flex items-center text-xs font-medium border border-gray-200"
                title="Thông báo"
              >
                <HiBell className="w-4 h-4 mr-1 text-gray-500" />
                <span>Thông báo</span>
                {unreadCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 bg-red-600 text-white rounded-full text-[10px] font-bold animate-pulse">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {notificationOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-gray-200 rounded-xl shadow-xl z-50 text-xs overflow-hidden">
                  <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                      <h4 className="font-bold text-gray-900">Trung tâm thông báo</h4>
                      <p className="text-[10px] text-gray-400">Sự kiện thực tế từ storefront và kho hàng</p>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-[11px] text-blue-600 hover:underline font-semibold"
                      >
                        Đã đọc tất cả
                      </button>
                    )}
                  </div>

                  {/* Tabs */}
                  <div className="flex border-b border-gray-100 bg-gray-50/50 px-2 pt-1 text-[11px]">
                    {[
                      { id: 'all', label: `Tất cả (${notifications.length})` },
                      { id: 'stock', label: `Cảnh báo kho (${notifications.filter((n) => n.type === 'stock').length})` },
                      { id: 'order', label: `Đơn & Đổi trả (${notifications.filter((n) => n.type === 'order' || n.type === 'rma' || n.type === 'tradein').length})` },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setNotificationTab(t.id)}
                        className={`px-3 py-1.5 font-medium border-b-2 transition ${
                          notificationTab === t.id
                            ? 'border-blue-600 text-blue-600 font-bold'
                            : 'border-transparent text-gray-500 hover:text-gray-800'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Notification List */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-gray-400 italic">Đang tải hoặc chưa có thông báo</div>
                    ) : filteredNotifs.length === 0 ? (
                      <div className="p-6 text-center text-gray-400 italic">Không có thông báo trong mục này</div>
                    ) : (
                      filteredNotifs.map((n) => {
                        let badgeColor = 'bg-blue-100 text-blue-700 border-blue-200';
                        let badgeText = 'ĐƠN HÀNG';
                        if (n.type === 'stock') {
                          badgeColor = n.subType === 'out_of_stock' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-amber-100 text-amber-700 border-amber-200';
                          badgeText = n.subType === 'out_of_stock' ? 'HẾT HÀNG' : 'KHO HÀNG';
                        } else if (n.subType === 'payment_verify') {
                          badgeColor = 'bg-orange-100 text-orange-700 border-orange-200';
                          badgeText = 'XÁC NHẬN CK';
                        } else if (n.type === 'rma') {
                          badgeColor = 'bg-purple-100 text-purple-700 border-purple-200';
                          badgeText = 'ĐỔI TRẢ';
                        } else if (n.type === 'tradein') {
                          badgeColor = 'bg-emerald-100 text-emerald-700 border-emerald-200';
                          badgeText = 'THU CŨ';
                        }

                        return (
                          <div
                            key={n.id}
                            onClick={() => handleNotificationClick(n)}
                            className={`block p-3 hover:bg-blue-50/50 transition cursor-pointer ${!n.read ? 'bg-blue-50/25' : ''}`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0"></span>}
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${badgeColor} uppercase tracking-wider flex-shrink-0`}>
                                  {badgeText}
                                </span>
                                <span className={`text-xs truncate ${!n.read ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                                  {n.title}
                                </span>
                              </div>
                              <span className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0">{n.time}</span>
                            </div>
                            <p className="text-gray-600 text-[11px] line-clamp-2 pl-3">{n.message}</p>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="p-2 border-t border-gray-100 bg-gray-50 text-center flex items-center justify-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                    <span className="text-[11px] text-gray-400">Tự động cập nhật thời gian thực mỗi 25s</span>
                  </div>
                </div>
              )}
            </div>

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserDropdown(!userDropdown)}
                className="flex items-center space-x-2 py-1 px-2.5 rounded-md hover:bg-gray-100 text-xs font-medium text-gray-700 transition border border-gray-200"
              >
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                  {user?.full_name?.charAt(0) || 'Q'}
                </div>
                <span className="hidden md:inline">{user?.full_name || 'Quản trị viên'}</span>
                <HiChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>

              {userDropdown && (
                <div className="absolute right-0 mt-1.5 w-48 bg-white border border-gray-200 rounded-md shadow-lg py-1 z-50 text-xs">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="font-semibold text-gray-900">{user?.full_name}</p>
                    <p className="text-gray-500 text-[11px] truncate">{user?.email}</p>
                    <span className="inline-block mt-1 px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-medium uppercase">
                      {user?.role || 'Admin'}
                    </span>
                  </div>
                  <Link
                    to="/profile"
                    onClick={() => setUserDropdown(false)}
                    className="block px-4 py-2 text-gray-700 hover:bg-gray-50"
                  >
                    Hồ sơ cá nhân & Bảo mật
                  </Link>
                  <button
                    onClick={() => {
                      setUserDropdown(false);
                      logout();
                    }}
                    className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 font-medium"
                  >
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto bg-[#f3f4f6] p-4 sm:p-5">
          <div className="max-w-[1440px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
