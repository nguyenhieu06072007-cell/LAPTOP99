import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import {
  HiOutlineShoppingCart,
  HiOutlineTruck,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlinePrinter,
  HiOutlineArrowPath,
  HiOutlineCreditCard,
  HiOutlineMagnifyingGlass,
  HiOutlinePlus,
  HiOutlineXMark,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const formatVND = (v) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v || 0);

const COLUMNS = [
  { id: 'pending', title: '1. Chờ duyệt', color: 'border-amber-400', badge: 'bg-amber-100 text-amber-800' },
  { id: 'confirmed', title: '2. Đã xác nhận (Gán S/N)', color: 'border-blue-500', badge: 'bg-blue-100 text-blue-800' },
  { id: 'shipping', title: '3. Đang giao hàng', color: 'border-purple-500', badge: 'bg-purple-100 text-purple-800' },
  { id: 'delivered', title: '4. Đã giao thành công', color: 'border-emerald-500', badge: 'bg-emerald-100 text-emerald-800' },
];

const NEXT_STATUS = { pending: 'confirmed', confirmed: 'shipping', shipping: 'delivered' };

export default function OrderKanbanPage() {
  const [activeMainTab, setActiveMainTab] = useState('kanban');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [paymentFilter, setPaymentFilter] = useState('');
  const [searchVal, setSearchVal] = useState('');

  // Create order modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    customer_name: '', customer_phone: '', product_name: '', sku: '',
    serial_number: '', unit_price: '', total_amount: '',
    payment_method: 'Tiền mặt', payment_status: 'pending',
    branch: 'Toàn hệ thống (HQ)'
  });

  // Finance summary
  const [finSummary, setFinSummary] = useState(null);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/orders', { params: { limit: 100, search: searchVal || undefined } });
      setOrders(res.data.data || []);
    } catch (err) {
      toast.error('Lỗi tải đơn hàng');
    } finally {
      setLoading(false);
    }
  }, [searchVal]);

  const fetchFinanceSummary = async () => {
    try {
      const res = await api.get('/orders/finance/summary');
      setFinSummary(res.data.data);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (activeMainTab === 'payments') fetchFinanceSummary();
  }, [activeMainTab]);

  const moveOrder = async (orderId, newStatus) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status: newStatus });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      toast.success(`Đã cập nhật trạng thái đơn`);
    } catch (err) {
      toast.error(err.message || 'Lỗi cập nhật trạng thái');
    }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!createForm.customer_name || !createForm.product_name || !createForm.total_amount) {
      return toast.error('Vui lòng điền đủ thông tin bắt buộc');
    }
    try {
      const res = await api.post('/orders', {
        ...createForm,
        unit_price: Number(createForm.unit_price) || Number(createForm.total_amount),
        total_amount: Number(createForm.total_amount),
      });
      setOrders(prev => [res.data.data, ...prev]);
      toast.success('Đã tạo đơn hàng mới!');
      setIsCreateOpen(false);
      setCreateForm({
        customer_name: '', customer_phone: '', product_name: '', sku: '',
        serial_number: '', unit_price: '', total_amount: '',
        payment_method: 'Tiền mặt', payment_status: 'pending',
        branch: 'Toàn hệ thống (HQ)'
      });
    } catch (err) {
      toast.error(err.message || 'Lỗi tạo đơn hàng');
    }
  };

  const filteredForPayment = orders.filter(o => {
    if (!paymentFilter) return true;
    return (o.payment_method || '').toLowerCase().includes(paymentFilter.toLowerCase());
  });

  if (loading) return <LoadingSpinner fullPage text="Đang tải đơn hàng..." />;

  return (
    <div className="space-y-4 text-xs font-sans">
      {/* Header Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2 text-[11px] text-gray-500 font-medium">
            <span>Vận hành</span>
            <span>›</span>
            <span className="text-blue-600 font-semibold">Đơn hàng & Thanh toán</span>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mt-0.5">
            Quản Lý Đơn Hàng, Vận Chuyển & Thanh Toán
          </h2>
          <p className="text-[11px] text-gray-500">
            Kanban đơn hàng, gán Serial vật lý, đối soát cổng thanh toán (VNPAY, COD, Thẻ).
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs transition flex items-center gap-1.5"
          >
            <HiOutlinePlus className="w-4 h-4" />
            <span>Tạo đơn mới</span>
          </button>
          <button
            onClick={() => { fetchOrders(); fetchFinanceSummary(); toast.success('Đang đồng bộ đơn hàng...'); }}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs transition flex items-center gap-1.5"
          >
            <HiOutlineArrowPath className="w-4 h-4" />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white rounded-xl shadow-2xs overflow-hidden px-2">
        <button
          onClick={() => setActiveMainTab('kanban')}
          className={`flex items-center gap-2 py-3 px-5 border-b-2 font-bold text-xs transition ${
            activeMainTab === 'kanban' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <HiOutlineTruck className="w-4 h-4 text-blue-600" />
          <span>1. Kanban Đơn hàng ({orders.filter(o => o.status !== 'cancelled').length})</span>
        </button>

        <button
          onClick={() => setActiveMainTab('payments')}
          className={`flex items-center gap-2 py-3 px-5 border-b-2 font-bold text-xs transition ${
            activeMainTab === 'payments' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <HiOutlineCreditCard className="w-4 h-4 text-purple-600" />
          <span>2. Thanh toán & Đối soát Dòng tiền</span>
        </button>
      </div>

      {/* TAB 1: KANBAN */}
      {activeMainTab === 'kanban' && (
        <>
          {/* Search */}
          <div className="bg-white p-2.5 rounded-xl border border-gray-200 shadow-2xs">
            <div className="relative">
              <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm đơn hàng: mã đơn, tên khách, số serial..."
                value={searchVal}
                onChange={e => setSearchVal(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {COLUMNS.map((col) => {
              const colOrders = orders.filter(o => o.status === col.id);
              return (
                <div key={col.id} className="bg-gray-100/70 p-3 rounded-xl flex flex-col h-[650px] border border-gray-200">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-200">
                    <span className="font-bold text-gray-800 text-xs">{col.title}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${col.badge}`}>
                      {colOrders.length}
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                    {colOrders.length === 0 ? (
                      <div className="text-center text-gray-400 text-[11px] py-6">Không có đơn</div>
                    ) : colOrders.map((order) => (
                      <div
                        key={order.id}
                        className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs hover:shadow-md transition space-y-2"
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-mono font-bold text-blue-600 text-xs">{order.code}</span>
                          <span className="text-[10px] text-gray-400">
                            {order.ordered_at ? new Date(order.ordered_at).toLocaleDateString('vi-VN') : ''}
                          </span>
                        </div>

                        <div>
                          <p className="font-semibold text-gray-900 line-clamp-1">{order.product_name}</p>
                          <p className="text-[11px] text-gray-600">Khách: {order.customer_name} {order.customer_phone ? `- ${order.customer_phone}` : ''}</p>
                          {order.serial_number && (
                            <p className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded inline-block mt-1 font-mono">
                              S/N: {order.serial_number}
                            </p>
                          )}
                        </div>

                        <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                          <span className="font-bold text-rose-600">{formatVND(order.total_amount)}</span>
                          <span className="text-[10px] text-gray-500 font-medium">{order.payment_method}</span>
                        </div>

                        <div className="pt-1 flex items-center justify-between">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded transition flex items-center gap-1 text-[11px]"
                          >
                            <HiOutlinePrinter className="w-4 h-4" />
                            <span>In phiếu</span>
                          </button>

                          {NEXT_STATUS[col.id] && (
                            <button
                              onClick={() => moveOrder(order.id, NEXT_STATUS[col.id])}
                              className={`px-2.5 py-1 rounded text-[10px] font-semibold transition text-white ${
                                col.id === 'pending' ? 'bg-blue-600 hover:bg-blue-700'
                                : col.id === 'confirmed' ? 'bg-purple-600 hover:bg-purple-700'
                                : 'bg-emerald-600 hover:bg-emerald-700'
                              }`}
                            >
                              {col.id === 'pending' ? 'Xác nhận ➔' : col.id === 'confirmed' ? 'Giao hàng ➔' : 'Hoàn tất ✔'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* TAB 2: PAYMENTS */}
      {activeMainTab === 'payments' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
              <div className="text-gray-500 font-medium">Doanh thu thực nhận</div>
              <div className="text-lg font-black text-emerald-600 mt-1">
                {finSummary ? formatVND(finSummary.total_net_received) : '—'}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">Tổng tiền về tài khoản</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
              <div className="text-gray-500 font-medium">Đang thu hộ (COD)</div>
              <div className="text-lg font-black text-blue-600 mt-1">
                {finSummary ? formatVND(finSummary.total_cod_pending) : '—'}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">Đơn vị vận chuyển đang giữ</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
              <div className="text-gray-500 font-medium">Phí cổng thanh toán</div>
              <div className="text-lg font-black text-rose-600 mt-1">
                {finSummary ? formatVND(finSummary.total_gateway_fees) : '—'}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">VNPAY, MPOS, Chuyển khoản</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
              <div className="text-gray-500 font-medium">Tổng đơn hàng</div>
              <div className="text-lg font-black text-purple-700 mt-1">
                {finSummary ? `${finSummary.total_orders} đơn` : '—'}
              </div>
              <div className="text-[10px] text-emerald-600 font-bold mt-0.5">
                {finSummary ? `${finSummary.delivered_orders} đơn hoàn thành` : ''}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
            <div className="p-3.5 border-b border-gray-200 bg-gray-50/70 flex flex-wrap items-center justify-between gap-3">
              <span className="font-bold text-gray-800">Bảng kê đối soát thanh toán chi tiết ({filteredForPayment.length})</span>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="border border-gray-300 rounded px-2.5 py-1 text-xs bg-white outline-none"
              >
                <option value="">-- Tất cả phương thức --</option>
                <option value="VNPAY">VNPAY QR</option>
                <option value="COD">COD Thu hộ</option>
                <option value="Trả góp">Trả góp 0%</option>
                <option value="Chuyển khoản">Chuyển khoản</option>
                <option value="Tiền mặt">Tiền mặt</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-200 text-gray-600 font-bold uppercase text-[10px]">
                    <th className="p-3">Mã đơn</th>
                    <th className="p-3">Khách hàng</th>
                    <th className="p-3">Phương thức</th>
                    <th className="p-3">Mã GD</th>
                    <th className="p-3">Tổng tiền</th>
                    <th className="p-3">Phí cổng</th>
                    <th className="p-3">Thực nhận</th>
                    <th className="p-3">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredForPayment.map((o) => (
                    <tr key={o.id} className="hover:bg-blue-50/30">
                      <td className="p-3 font-mono font-bold text-blue-600">{o.code}</td>
                      <td className="p-3">
                        <div className="font-bold text-gray-900">{o.customer_name}</div>
                        <div className="text-[10px] text-gray-500">{o.customer_phone}</div>
                      </td>
                      <td className="p-3 font-semibold text-gray-800">{o.payment_method}</td>
                      <td className="p-3 font-mono text-gray-600 text-[11px]">{o.gateway_code || '—'}</td>
                      <td className="p-3 font-bold text-gray-900">{formatVND(o.total_amount)}</td>
                      <td className="p-3 text-rose-600 font-medium">-{formatVND(o.gateway_fee)}</td>
                      <td className="p-3 font-black text-emerald-700">{formatVND(o.net_received)}</td>
                      <td className="p-3">
                        {o.payment_status === 'paid' ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">● Đã thanh toán</span>
                        ) : o.payment_status === 'collecting' ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">● Đang thu COD</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-bold text-[10px]">● Chờ thanh toán</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal In phiếu */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-5 border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Chi tiết Đơn hàng: {selectedOrder.code}</h3>
                {selectedOrder.serial_number && (
                  <p className="text-[11px] text-gray-500">S/N: {selectedOrder.serial_number}</p>
                )}
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg space-y-2 border border-gray-200 font-mono text-xs">
              {[
                ['Khách hàng:', selectedOrder.customer_name],
                ['SĐT liên hệ:', selectedOrder.customer_phone],
                ['Sản phẩm:', selectedOrder.product_name],
                ['Mã Serial / IMEI:', selectedOrder.serial_number || 'Chưa gán'],
                ['Hình thức:', selectedOrder.payment_method],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span>{k}</span>
                  <span className="font-bold">{v}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-gray-200 flex justify-between text-sm font-black text-rose-600">
                <span>TỔNG TIỀN (VAT):</span>
                <span>{formatVND(selectedOrder.total_amount)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button onClick={() => setSelectedOrder(null)} className="px-4 py-2 border rounded-lg hover:bg-gray-100 font-medium text-xs">
                Đóng
              </button>
              <button
                onClick={() => { window.print(); toast.success('Đang kết xuất hoá đơn VAT...'); }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold flex items-center gap-1.5 text-xs"
              >
                <HiOutlinePrinter className="w-4 h-4" />
                In Hóa đơn VAT & Phiếu xuất kho
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tạo đơn hàng */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-200">
            <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">Tạo đơn hàng mới</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-gray-400 hover:text-gray-600">
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateOrder} className="p-5 space-y-3 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1 text-xs">Tên khách hàng *</label>
                  <input required value={createForm.customer_name}
                    onChange={e => setCreateForm({...createForm, customer_name: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-600"
                    placeholder="Nguyễn Văn A" />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1 text-xs">Số điện thoại</label>
                  <input value={createForm.customer_phone}
                    onChange={e => setCreateForm({...createForm, customer_phone: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-600"
                    placeholder="0912345678" />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1 text-xs">Tên sản phẩm *</label>
                <input required value={createForm.product_name}
                  onChange={e => setCreateForm({...createForm, product_name: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-600"
                  placeholder="Dell XPS 14 9440 (Ultra 7/16GB/1TB)" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1 text-xs">Mã SKU</label>
                  <input value={createForm.sku}
                    onChange={e => setCreateForm({...createForm, sku: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-600"
                    placeholder="DELL-XPS-14-9440" />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1 text-xs">Số Serial (S/N)</label>
                  <input value={createForm.serial_number}
                    onChange={e => setCreateForm({...createForm, serial_number: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-600"
                    placeholder="SN-DELL-9440-88219" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1 text-xs">Tổng tiền (VNĐ) *</label>
                  <input required type="number" min={0} value={createForm.total_amount}
                    onChange={e => setCreateForm({...createForm, total_amount: e.target.value, unit_price: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-600"
                    placeholder="62990000" />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1 text-xs">Phương thức TT</label>
                  <select value={createForm.payment_method}
                    onChange={e => setCreateForm({...createForm, payment_method: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs bg-white outline-none focus:ring-1 focus:ring-blue-600">
                    <option>Tiền mặt</option>
                    <option>VNPAY QR</option>
                    <option>Chuyển khoản ngân hàng</option>
                    <option>COD (Thu hộ khi nhận hàng)</option>
                    <option>Trả góp 0% (Thẻ tín dụng)</option>
                    <option>Cà thẻ POS tại showroom</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1 text-xs">Chi nhánh</label>
                <select value={createForm.branch}
                  onChange={e => setCreateForm({...createForm, branch: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs bg-white outline-none focus:ring-1 focus:ring-blue-600">
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
                  Tạo đơn hàng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
