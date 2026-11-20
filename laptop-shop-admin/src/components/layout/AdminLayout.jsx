import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Navigate, useLocation, useNavigate, Link } from 'react-router-dom';
import Sidebar from './Sidebar';
import { HiBars3, HiMagnifyingGlass, HiBell, HiChevronDown, HiXMark, HiOutlineComputerDesktop, HiOutlineShoppingBag, HiOutlineShieldCheck, HiOutlineUsers, HiSun, HiMoon } from 'react-icons/hi2';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../ui/LoadingSpinner';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function AdminLayout() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);
  const { isAuthenticated, loading, user, logout, can } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Theme state (Dark / Light Mode)
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('laptop99_admin_theme') || localStorage.getItem('laptop99_theme');
      if (saved) return saved;
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    } catch (e) {}
    return 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
    try {
      localStorage.setItem('laptop99_admin_theme', theme);
      localStorage.setItem('laptop99_theme', theme);
    } catch (e) {}
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Global Search State
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef(null);
  const searchSequence = useRef(0);
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
    const currentSearch = ++searchSequence.current;
    setGlobalSearch(val);
    if (!val || val.trim().length < 2) {
      setSearchResults(null);
      setShowSearchDropdown(false);
      return;
    }

    setIsSearching(true);
    setShowSearchDropdown(true);

    try {
      const params = { search: val.trim(), limit: 4 };
      const [productResult, orderResult] = await Promise.allSettled([
        can('product:read') ? api.get('/products', { params }) : null,
        can(['order:read:all', 'order:read:own']) ? api.get('/orders', { params }) : null,
      ]);
      const products = productResult.value?.data?.data || [];
      const orders = (orderResult.value?.data?.data || []).map((order) => ({
        id: order.code, customer: order.customer_name, total: order.total_amount,
        phone: order.customer_phone || '—', product: order.product_name || '—',
      }));
      if (currentSearch === searchSequence.current) setSearchResults({ products, orders });
    } catch (err) {
      console.error('Search error', err);
    } finally {
      if (currentSearch === searchSequence.current) setIsSearching(false);
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && globalSearch.trim()) {
      setShowSearchDropdown(false);
      navigate(`/products?search=${encodeURIComponent(globalSearch.trim())}`);
    }
  };

  const clearSearch = () => {
    searchSequence.current++;
    setIsSearching(false);
    setGlobalSearch('');
    setSearchResults(null);
    setShowSearchDropdown(false);
  };

  const [notificationOpen, setNotificationOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('open_notif') === '1';
    }
    return false;
  });
  const [notificationTab, setNotificationTab] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [notifError, setNotifError] = useState(false);
  const seen = useRef(new Set());
  const ready = useRef(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const refreshNotifications = useRef(null);
  const [markingRead, setMarkingRead] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    let disposed = false;
    let loadingNotifications = false;
    let refreshQueued = false;
    let timer;
    const controller = new AbortController();
    ready.current = false;
    seen.current = new Set();
    setNotifications([]);
    setUnreadCount(0);
    async function refresh() {
      if (disposed) return;
      if (loadingNotifications) {
        refreshQueued = true;
        return;
      }
      loadingNotifications = true;
      try {
        const { data } = await api.get('/notifications', {
          params: { limit: 50 }, timeout: 15000, signal: controller.signal,
        });
        if (disposed) return;
        const events = data.data || [];
        if (ready.current) {
          const incoming = events.filter((event) => !seen.current.has(event.id) && !event.read);
          if (incoming.length) {
            toast(incoming.length === 1 ? incoming[0].title : `Có ${incoming.length} thông báo mới`, { icon: '🔔' });
          }
        }
        for (const event of events) seen.current.add(event.id);
        if (seen.current.size > 1000) seen.current = new Set([...seen.current].slice(-500));
        ready.current = true;
        setNotifications(events.map((event) => ({
          ...event, time: new Date(event.timestamp).toLocaleString('vi-VN'),
        })));
        setUnreadCount(Number(data.unread_count || 0));
        setNotifError(false);
      } catch {
        if (!disposed) setNotifError(true);
      } finally {
        loadingNotifications = false;
        if (!disposed) {
          clearTimeout(timer);
          if (refreshQueued) {
            refreshQueued = false;
            refresh();
          } else {
            timer = setTimeout(refresh, 10000);
          }
        }
      }
    }
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    refreshNotifications.current = refresh;
    refresh();
    return () => {
      refreshNotifications.current = null;
      disposed = true;
      controller.abort();
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [isAuthenticated, user?.id]);

  const markRead = async (selection) => {
    setMarkingRead(true);
    try {
      await api.post('/notifications/read', selection);
      refreshNotifications.current?.();
    } catch {
      toast.error('Không lưu được trạng thái đã đọc. Vui lòng thử lại.');
    } finally {
      setMarkingRead(false);
    }
  };
  const handleNotificationClick = (event) => {
    if (!event.read) markRead({ ids: [event.id] });
    setNotificationOpen(false);
    if (event.link) navigate(event.link);
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
    if (notificationTab === 'review') return n.type === 'review';
    if (notificationTab === 'stock') return n.type === 'stock';
    if (notificationTab === 'order') return n.type === 'order' || n.type === 'rma' || n.type === 'tradein';
    return true;
  });

  if (loading) {
    return <LoadingSpinner fullPage text="Đang tải dữ liệu..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="flex h-screen bg-[#f3f4f6] overflow-hidden font-sans">
      <Sidebar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} theme={theme} toggleTheme={toggleTheme} />

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
                                  navigate(`/orders?search=${encodeURIComponent(o.id)}`);
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
          <div className="flex items-center space-x-2.5">
            {/* Dark / Light Mode Toggle Button */}
            <button
              type="button"
              id="admin-theme-toggle-btn"
              onClick={toggleTheme}
              className="py-1.5 px-3 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md transition flex items-center text-xs font-semibold border border-gray-300 dark:border-slate-600 shadow-xs cursor-pointer select-none"
              title={theme === 'dark' ? 'Chuyển sang Chế độ Sáng' : 'Chuyển sang Chế độ Tối'}
              aria-label="Đổi chế độ Sáng / Tối"
            >
              {theme === 'dark' ? (
                <>
                  <HiSun className="w-4 h-4 text-amber-400 mr-1.5" />
                  <span className="font-bold text-amber-300">Chế độ Sáng</span>
                </>
              ) : (
                <>
                  <HiMoon className="w-4 h-4 text-indigo-600 mr-1.5" />
                  <span className="font-bold text-gray-700">Chế độ Tối</span>
                </>
              )}
            </button>
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
                        onClick={() => markRead({ all: true })}
                        disabled={markingRead}
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
                      { id: 'review', label: 'Đánh giá' },
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

                  {notifError && notifications.length > 0 && (
                    <p className="px-3 py-2 text-xs text-amber-700">Chưa lấy được thông báo mới. Sẽ tự thử lại.</p>
                  )}

                  {/* Notification List */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-gray-400 italic">{notifError ? 'Chưa kết nối được hệ thống thông báo' : 'Chưa có thông báo'}</div>
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
                        } else if (n.type === 'review') {
                          badgeColor = 'bg-violet-100 text-violet-700 border-violet-200';
                          badgeText = 'ĐÁNH GIÁ';
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
                                    <button
                    type="button"
                    onClick={() => {
                      toggleTheme();
                      setUserDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center justify-between font-medium"
                  >
                    <span>Giao diện:</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                      {theme === 'dark' ? '🌙 Chế độ Tối' : '☀️ Chế độ Sáng'}
                    </span>
                  </button>
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
