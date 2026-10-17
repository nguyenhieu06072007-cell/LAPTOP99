import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import {
  HiOutlineShoppingBag,
  HiOutlineCurrencyDollar,
  HiOutlineClock,
  HiOutlineMagnifyingGlass,
  HiOutlinePhone,
  HiOutlineEnvelope,
  HiOutlineBuildingStorefront,
  HiOutlineSparkles,
  HiOutlinePlus,
  HiOutlineXMark,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Pagination from '../../components/ui/Pagination';

const formatVND = (v) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v || 0);

const TIER_COLORS = {
  'VIP': 'bg-purple-100 text-purple-800 border-purple-200',
  'Thân thiết': 'bg-blue-100 text-blue-800 border-blue-200',
  'Khách mới': 'bg-gray-100 text-gray-700 border-gray-200',
};

const ORDER_STATUS_MAP = {
  pending: { label: 'Chờ duyệt', cls: 'bg-amber-100 text-amber-800' },
  confirmed: { label: 'Đã xác nhận', cls: 'bg-blue-100 text-blue-800' },
  shipping: { label: 'Đang giao hàng', cls: 'bg-purple-100 text-purple-800' },
  delivered: { label: 'Đã giao thành công', cls: 'bg-emerald-100 text-emerald-800' },
  cancelled: { label: 'Đã huỷ', cls: 'bg-gray-100 text-gray-600' },
};

export default function CustomerPurchaseHistoryPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 10;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedTier, setSelectedTier] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');

  const [activeCustomer, setActiveCustomer] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Modal tạo mới khách hàng
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    full_name: '', phone: '', email: '', branch: 'Toàn hệ thống (HQ)'
  });

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounce(searchTerm), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/customers', {
        params: {
          search: searchDebounce || undefined,
          branch: selectedBranch || undefined,
          tier: selectedTier || undefined,
          page,
          limit,
        },
      });
      setCustomers(res.data.data || []);
      setTotal(res.data.meta?.total || 0);
    } catch (err) {
      toast.error('Lỗi tải danh sách khách hàng');
    } finally {
      setLoading(false);
    }
  }, [searchDebounce, selectedBranch, selectedTier, page]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleViewDetail = async (customer) => {
    setActiveCustomer(customer);
    setLoadingOrders(true);
    try {
      const res = await api.get(`/customers/${customer.id}`);
      setCustomerOrders(res.data.data?.orders || []);
    } catch {
      setCustomerOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!createForm.full_name) return toast.error('Vui lòng nhập tên khách hàng');
    try {
      await api.post('/customers', createForm);
      toast.success('Đã thêm khách hàng mới!');
      setIsCreateOpen(false);
      setCreateForm({ full_name: '', phone: '', email: '', branch: 'Toàn hệ thống (HQ)' });
      fetchCustomers();
    } catch (err) {
      toast.error(err.message || 'Lỗi tạo khách hàng');
    }
  };

  // Stats từ data thật
  const vipCount = customers.filter(c => c.tier === 'VIP').length;
  const avgSpent = customers.length > 0
    ? customers.reduce((acc, c) => acc + Number(c.total_spent || 0), 0) / customers.length
    : 0;

  return (
    <div className="space-y-4 text-xs font-sans">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2 text-[11px] text-gray-500 font-medium">
            <span>Khách hàng</span>
            <span>›</span>
            <span className="text-blue-600 font-semibold">Lượt mua hàng gần đây & Lịch sử giao dịch</span>
          </div>
          <h1 className="text-xl font-black text-gray-900 mt-1 flex items-center gap-2">
            <HiOutlineShoppingBag className="w-6 h-6 text-blue-600" />
            <span>Lượt Mua Hàng Gần Đây Của Khách Hàng</span>
          </h1>
          <p className="text-gray-500 mt-0.5">
            Theo dõi dòng giao dịch thực tế, phân hạng khách hàng VIP / Thân thiết và lịch sử mua từng chi nhánh.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs transition flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <HiOutlinePlus className="w-4 h-4" />
          <span>Thêm khách hàng</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">👥</div>
          <div>
            <div className="text-[11px] font-medium text-gray-500">Tổng khách hàng</div>
            <div className="text-lg font-black text-gray-900">{total} khách</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">💰</div>
          <div>
            <div className="text-[11px] font-medium text-gray-500">Chi tiêu TB (AOV)</div>
            <div className="text-lg font-black text-emerald-600">{formatVND(avgSpent)}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-lg">👑</div>
          <div>
            <div className="text-[11px] font-medium text-gray-500">Khách VIP (trang này)</div>
            <div className="text-lg font-black text-purple-700">{vipCount} khách</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg">⚡</div>
          <div>
            <div className="text-[11px] font-medium text-gray-500">Đang hiển thị</div>
            <div className="text-lg font-black text-amber-600">{customers.length} / {total}</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tên khách, SĐT, Email, Mã đơn..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-blue-600 text-xs"
          />
        </div>

        <select
          value={selectedBranch}
          onChange={(e) => { setSelectedBranch(e.target.value); setPage(1); }}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-600 text-xs bg-white"
        >
          <option value="">-- Tất cả Chi nhánh --</option>
          <option value="Hà Nội">Chi nhánh Hà Nội</option>
          <option value="TP.HCM">Chi nhánh TP.HCM</option>
          <option value="Đà Nẵng">Chi nhánh Đà Nẵng</option>
          <option value="Toàn hệ thống">Toàn hệ thống (HQ)</option>
        </select>

        <select
          value={selectedTier}
          onChange={(e) => { setSelectedTier(e.target.value); setPage(1); }}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-600 text-xs bg-white"
        >
          <option value="">-- Hạng Khách hàng --</option>
          <option value="VIP">Khách hàng VIP</option>
          <option value="Thân thiết">Khách hàng Thân thiết</option>
          <option value="Khách mới">Khách mua lần đầu</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="p-3.5 border-b border-gray-200 bg-gray-50/70 flex items-center justify-between font-bold text-gray-800">
          <span>Danh sách Khách hàng ({total})</span>
          <span className="text-[11px] font-normal text-gray-500">Dữ liệu thật từ hệ thống</span>
        </div>

        {loading ? (
          <div className="py-16"><LoadingSpinner /></div>
        ) : customers.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <div className="text-4xl mb-3">👥</div>
            <p className="font-medium">Chưa có khách hàng nào</p>
            <p className="text-[11px] mt-1">Thêm khách hàng đầu tiên bằng nút bên trên</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-200 text-gray-600 font-bold uppercase text-[10px] tracking-wider">
                  <th className="p-3">Khách hàng</th>
                  <th className="p-3">Hạng & Tổng chi tiêu</th>
                  <th className="p-3">Đơn gần nhất</th>
                  <th className="p-3">Chi nhánh</th>
                  <th className="p-3 text-center">Số đơn</th>
                  <th className="p-3 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-blue-50/30 transition">
                    <td className="p-3">
                      <div className="font-bold text-gray-900">{c.full_name}</div>
                      <div className="text-gray-500 flex items-center gap-1 mt-0.5">
                        <HiOutlinePhone className="w-3 h-3" />
                        <span>{c.phone || '—'}</span>
                      </div>
                      <div className="text-gray-400 text-[10px]">{c.email || '—'}</div>
                    </td>

                    <td className="p-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border mb-1 ${TIER_COLORS[c.tier] || TIER_COLORS['Khách mới']}`}>
                        {c.tier}
                      </span>
                      <div className="font-bold text-gray-800">{formatVND(c.total_spent)}</div>
                    </td>

                    <td className="p-3">
                      {c.latest_order ? (
                        <>
                          <div className="font-bold text-blue-600 font-mono text-[10px]">{c.latest_order.code}</div>
                          <div className="text-gray-700 truncate max-w-[160px]">{c.latest_order.product_name}</div>
                          <div className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold mt-0.5 ${ORDER_STATUS_MAP[c.latest_order.status]?.cls || 'bg-gray-100'}`}>
                            {ORDER_STATUS_MAP[c.latest_order.status]?.label || c.latest_order.status}
                          </div>
                        </>
                      ) : (
                        <span className="text-gray-400">Chưa có đơn</span>
                      )}
                    </td>

                    <td className="p-3">
                      <div className="flex items-center gap-1 text-gray-600">
                        <HiOutlineBuildingStorefront className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate max-w-[120px]">{c.branch}</span>
                      </div>
                    </td>

                    <td className="p-3 text-center font-bold text-gray-700">{c.order_count} đơn</td>

                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleViewDetail(c)}
                        className="px-2.5 py-1.5 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 rounded text-gray-700 font-semibold transition"
                      >
                        Xem lịch sử
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {total > limit && (
          <div className="p-3 border-t border-gray-100">
            <Pagination
              page={page}
              totalPages={Math.ceil(total / limit)}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* Modal: Lịch sử mua hàng chi tiết */}
      {activeCustomer && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-200">
            <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span>Hồ sơ: {activeCustomer.full_name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${TIER_COLORS[activeCustomer.tier] || ''}`}>
                    {activeCustomer.tier}
                  </span>
                </h3>
                <p className="text-xs text-gray-500">{activeCustomer.phone} · {activeCustomer.email}</p>
              </div>
              <button onClick={() => setActiveCustomer(null)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full">
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-3 gap-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-center">
                <div>
                  <div className="text-[10px] text-gray-500 uppercase font-bold">Tổng chi tiêu (LTV)</div>
                  <div className="text-base font-black text-blue-700">{formatVND(activeCustomer.total_spent)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 uppercase font-bold">Số đơn thành công</div>
                  <div className="text-base font-black text-gray-900">{activeCustomer.order_count} đơn</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 uppercase font-bold">Chi nhánh</div>
                  <div className="text-xs font-bold text-gray-800 mt-1">{activeCustomer.branch}</div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-gray-800 text-xs mb-2">Lịch sử đơn hàng:</h4>
                {loadingOrders ? (
                  <LoadingSpinner />
                ) : customerOrders.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">Chưa có đơn hàng nào</p>
                ) : (
                  <div className="space-y-2">
                    {customerOrders.map(o => (
                      <div key={o.id} className="p-3 rounded-xl border border-gray-200 space-y-1.5 bg-gray-50/50">
                        <div className="flex justify-between items-start">
                          <span className="font-mono font-bold text-blue-600">{o.code}</span>
                          <span className="text-xs font-black text-gray-900">{formatVND(o.total_amount)}</span>
                        </div>
                        <div className="font-medium text-gray-900 text-xs">{o.product_name}</div>
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ORDER_STATUS_MAP[o.status]?.cls || 'bg-gray-100'}`}>
                            {ORDER_STATUS_MAP[o.status]?.label || o.status}
                          </span>
                          <span className="text-[10px] text-gray-500">{o.payment_method}</span>
                        </div>
                        {o.serial_number && (
                          <div className="text-[10px] text-emerald-700 font-mono">S/N: {o.serial_number}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => setActiveCustomer(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-xs font-semibold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Tạo mới khách hàng */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-200">
            <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">Thêm khách hàng mới</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-gray-400 hover:text-gray-600">
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateCustomer} className="p-5 space-y-3">
              <div>
                <label className="block text-gray-700 font-semibold mb-1 text-xs">Họ tên *</label>
                <input
                  required
                  value={createForm.full_name}
                  onChange={e => setCreateForm({...createForm, full_name: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-600"
                  placeholder="Nguyễn Văn A"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1 text-xs">Số điện thoại</label>
                  <input
                    value={createForm.phone}
                    onChange={e => setCreateForm({...createForm, phone: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-600"
                    placeholder="0912345678"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1 text-xs">Email</label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={e => setCreateForm({...createForm, email: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-600"
                    placeholder="email@gmail.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1 text-xs">Chi nhánh</label>
                <select
                  value={createForm.branch}
                  onChange={e => setCreateForm({...createForm, branch: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs bg-white outline-none focus:ring-1 focus:ring-blue-600"
                >
                  <option>Toàn hệ thống (HQ)</option>
                  <option>Chi nhánh Hà Nội (123 Thái Hà)</option>
                  <option>Chi nhánh TP.HCM (456 Lê Hồng Phong)</option>
                  <option>Chi nhánh Đà Nẵng (789 Nguyễn Văn Linh)</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-xs font-semibold hover:bg-gray-50">
                  Hủy
                </button>
                <button type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold">
                  Thêm khách hàng
                </button>
              </div>
            </form>
          
          </div>
        </div>
      )}
    </div>
  );
}


