import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import {
  HiOutlineArrowPathRoundedSquare,
  HiOutlineMagnifyingGlass,
  HiOutlineArrowPath,
} from 'react-icons/hi2';

const formatVND = (v) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v || 0);

export default function ReturnsManagementPage() {
  const [returnsList, setReturnsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedReturn, setSelectedReturn] = useState(null);

  const fetchRmas = async () => {
    try {
      setLoading(true);
      const res = await api.get('/orders/rmas/list');
      const rows = (res.data?.data || []).map((r) => ({
        id: r.id,
        code: r.code,
        customer_name: r.customer_name || 'Khách hàng',
        customer_phone: r.customer_phone || '—',
        order_id: r.order_code,
        product_name: r.product_name || 'Sản phẩm trong đơn',
        serial_number: r.serial_number || 'Theo đơn ' + r.order_code,
        request_date: r.created_at ? new Date(r.created_at).toLocaleDateString('vi-VN') : '',
        type: r.type || 'Đổi',
        reason_detail: r.reason || '',
        status: r.status || 'Chờ duyệt',
        total_amount: Number(r.total_amount || 0),
      }));
      setReturnsList(rows);
      if (rows.length > 0 && !selectedReturn) {
        setSelectedReturn(rows[0]);
      }
    } catch (err) {
      toast.error('Không thể tải danh sách yêu cầu đổi trả (RMA)');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRmas();
  }, []);

  const handleUpdateStatus = async (rma, newStatus) => {
    try {
      await api.patch(`/orders/rmas/${rma.id}/status`, { status: newStatus });
      setReturnsList((prev) => prev.map((r) => (r.id === rma.id ? { ...r, status: newStatus } : r)));
      if (selectedReturn?.id === rma.id) {
        setSelectedReturn({ ...selectedReturn, status: newStatus });
      }
      toast.success(`Đã cập nhật phiếu ${rma.code} sang "${newStatus}"`);
    } catch (err) {
      toast.error('Lỗi cập nhật trạng thái RMA');
    }
  };

  const filteredReturns = returnsList.filter((r) => {
    if (activeTab !== 'all' && r.status !== activeTab) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        r.code.toLowerCase().includes(q) ||
        r.customer_name.toLowerCase().includes(q) ||
        (r.order_id || '').toLowerCase().includes(q) ||
        r.product_name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (loading) return <LoadingSpinner fullPage text="Đang tải yêu cầu đổi trả (RMA) thực tế..." />;

  return (
    <div className="space-y-4 text-xs pb-12">
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-2xs flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <HiOutlineArrowPathRoundedSquare className="w-5 h-5 text-blue-600" />
            <span>Quản lý Đổi trả Laptop & Hoàn tiền (RMA Thực Tế — {returnsList.length} phiếu)</span>
          </h1>
          <p className="text-[11px] text-gray-500">
            Đồng bộ trực tiếp với các yêu cầu đổi trả (RMA) do khách hàng gửi từ trang Tài khoản khách hàng.
          </p>
        </div>

        <button
          onClick={() => {
            fetchRmas();
            toast.success('Đã làm mới danh sách RMA!');
          }}
          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md flex items-center space-x-1.5 shadow-2xs"
        >
          <HiOutlineArrowPath className="w-4 h-4" />
          <span>Làm mới</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-2xs">
          <span className="text-gray-500 text-[11px]">Tổng yêu cầu RMA</span>
          <p className="text-xl font-bold text-gray-900 mt-1">{returnsList.length}</p>
          <span className="text-[10px] text-gray-400">Phiếu từ khách hàng</span>
        </div>
        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-2xs">
          <span className="text-gray-500 text-[11px]">Chờ duyệt</span>
          <p className="text-xl font-bold text-amber-600 mt-1">
            {returnsList.filter((r) => r.status === 'Chờ duyệt').length}
          </p>
          <span className="text-[10px] text-gray-400">Cần kiểm tra kỹ thuật</span>
        </div>
        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-2xs">
          <span className="text-gray-500 text-[11px]">Đã duyệt đổi / hoàn tiền</span>
          <p className="text-xl font-bold text-emerald-600 mt-1">
            {returnsList.filter((r) => r.status === 'Đã duyệt').length}
          </p>
          <span className="text-[10px] text-emerald-600">Đủ điều kiện bảo hành</span>
        </div>
        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-2xs">
          <span className="text-gray-500 text-[11px]">Từ chối</span>
          <p className="text-xl font-bold text-red-600 mt-1">
            {returnsList.filter((r) => r.status === 'Từ chối').length}
          </p>
          <span className="text-[10px] text-red-400">Không đủ điều kiện</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 bg-white rounded-lg border border-gray-200 shadow-2xs overflow-hidden flex flex-col">
          <div className="p-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex space-x-1">
              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'Chờ duyệt', label: 'Chờ duyệt' },
                { id: 'Đã duyệt', label: 'Đã duyệt' },
                { id: 'Từ chối', label: 'Từ chối' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                    activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-64">
              <HiOutlineMagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm mã RMA, mã đơn, khách hàng..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1 border border-gray-300 rounded text-xs focus:outline-none"
              />
            </div>
          </div>

          {filteredReturns.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              Hiện chưa có yêu cầu đổi trả (RMA) nào từ khách hàng.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                    <th className="p-2.5">Mã RMA & Khách hàng</th>
                    <th className="p-2.5">Đơn hàng & Thiết bị</th>
                    <th className="p-2.5">Hình thức & Lý do</th>
                    <th className="p-2.5 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredReturns.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedReturn(item)}
                      className={`hover:bg-blue-50/40 cursor-pointer transition ${
                        selectedReturn?.id === item.id ? 'bg-blue-50/60' : ''
                      }`}
                    >
                      <td className="p-2.5">
                        <span className="font-bold text-blue-600 block font-mono">{item.code}</span>
                        <span className="font-semibold text-gray-800">{item.customer_name}</span>
                        <span className="text-gray-400 text-[10px] block">{item.customer_phone}</span>
                      </td>
                      <td className="p-2.5">
                        <span className="font-semibold text-gray-900 line-clamp-1">{item.product_name}</span>
                        <span className="font-mono bg-gray-100 px-1 py-0.5 rounded text-[10px] text-gray-600 mt-0.5 inline-block">
                          Đơn: {item.order_id}
                        </span>
                      </td>
                      <td className="p-2.5 max-w-xs">
                        <span className="font-bold text-gray-800">{item.type}</span>
                        <p className="text-[11px] text-gray-600 line-clamp-2">{item.reason_detail}</p>
                      </td>
                      <td className="p-2.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === 'Đã duyệt'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'Từ chối'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Detail Panel */}
        <div className="lg:col-span-4 bg-white rounded-lg border border-gray-200 shadow-2xs p-4">
          {selectedReturn ? (
            <div className="space-y-3">
              <div className="border-b pb-2">
                <span className="text-[10px] text-gray-400 uppercase font-bold">Chi tiết phiếu RMA</span>
                <h3 className="text-sm font-bold text-blue-600 font-mono">{selectedReturn.code}</h3>
              </div>
              <div className="space-y-1.5 text-xs">
                <p><b>Khách hàng:</b> {selectedReturn.customer_name} ({selectedReturn.customer_phone})</p>
                <p><b>Thuộc đơn hàng:</b> <span className="font-mono">{selectedReturn.order_id}</span></p>
                <p><b>Sản phẩm:</b> {selectedReturn.product_name}</p>
                <p><b>Serial (S/N):</b> <span className="font-mono">{selectedReturn.serial_number}</span></p>
                <p><b>Hình thức yêu cầu:</b> {selectedReturn.type}</p>
                <p><b>Lý do khách báo:</b> {selectedReturn.reason_detail}</p>
                <p><b>Giá trị đơn:</b> <span className="font-bold text-rose-600">{formatVND(selectedReturn.total_amount)}</span></p>
              </div>
              <div className="pt-3 border-t flex gap-2">
                <button
                  onClick={() => handleUpdateStatus(selectedReturn, 'Đã duyệt')}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded"
                >
                  ✓ Duyệt yêu cầu
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedReturn, 'Từ chối')}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded"
                >
                  ✕ Từ chối
                </button>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-gray-400">
              Chọn một phiếu RMA bên trái để xem chi tiết và phê duyệt.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
