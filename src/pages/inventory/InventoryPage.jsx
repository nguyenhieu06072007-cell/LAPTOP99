import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import Pagination from '../../components/ui/Pagination';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { HiPlus, HiXMark } from 'react-icons/hi2';

const formatCurrency = (amount) => {
  if (!amount) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

export default function InventoryPage() {
  const { can } = useAuth();
  const [activeTab, setActiveTab] = useState('movements'); // 'movements' | 'low-stock'
  
  // Movements State
  const [movements, setMovements] = useState([]);
  const [moveLoading, setMoveLoading] = useState(false);
  const [moveTotal, setMoveTotal] = useState(0);
  const [movePage, setMovePage] = useState(1);
  const [filters, setFilters] = useState({ type: '', from: '', to: '' });
  
  // Low Stock State
  const [lowStock, setLowStock] = useState([]);
  const [lowLoading, setLowLoading] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [formData, setFormData] = useState({
    product_id: '', type: 'import', quantity: 1, unit_cost: 0, reason: ''
  });

  useEffect(() => {
    if (activeTab === 'movements') {
      fetchMovements();
    } else {
      fetchLowStock();
    }
  }, [activeTab, movePage, filters]);

  const fetchMovements = async () => {
    try {
      setMoveLoading(true);
      const res = await api.get('/inventory/movements', {
        params: { ...filters, page: movePage, limit: 10 }
      });
      setMovements(res.data.data);
      setMoveTotal(res.data.meta.total);
    } catch (err) {
      toast.error('Lỗi tải lịch sử kho');
    } finally {
      setMoveLoading(false);
    }
  };

  const fetchLowStock = async () => {
    try {
      setLowLoading(true);
      const res = await api.get('/inventory/low-stock');
      setLowStock(res.data.data);
    } catch (err) {
      toast.error('Lỗi tải sản phẩm sắp hết hàng');
    } finally {
      setLowLoading(false);
    }
  };

  // Product Search for Modal
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (productSearch.length > 1 && isModalOpen) {
        try {
          const res = await api.get('/products', { params: { search: productSearch, limit: 5 } });
          setProducts(res.data.data);
        } catch (error) {
          console.error(error);
        }
      }
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [productSearch, isModalOpen]);

  const handleSaveMovement = async (e) => {
    e.preventDefault();
    if (!formData.product_id) return toast.error('Vui lòng chọn sản phẩm');
    if (formData.type === 'adjust' && !formData.reason) return toast.error('Vui lòng nhập lý do điều chỉnh');

    try {
      await api.post('/inventory/movements', formData);
      toast.success('Tạo phiếu kho thành công');
      setIsModalOpen(false);
      if (activeTab === 'movements') {
        fetchMovements();
      } else {
        fetchLowStock();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const getMovementTypeBadge = (type) => {
    const types = {
      import: { color: 'bg-green-100 text-green-800', label: 'Nhập kho' },
      export: { color: 'bg-blue-100 text-blue-800', label: 'Xuất kho' },
      adjust: { color: 'bg-purple-100 text-purple-800', label: 'Điều chỉnh' },
      return: { color: 'bg-orange-100 text-orange-800', label: 'Trả hàng' }
    };
    const t = types[type] || { color: 'bg-gray-100 text-gray-800', label: type };
    return <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${t.color}`}>{t.label}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý kho hàng</h1>
        <button
          onClick={() => {
            setFormData({ product_id: '', type: 'import', quantity: 1, unit_cost: 0, reason: '' });
            setProductSearch('');
            setProducts([]);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <HiPlus className="w-5 h-5" />
          Tạo phiếu kho
        </button>
      </div>

      <div className="flex border-b border-gray-200">
        <button
          className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${activeTab === 'movements' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('movements')}
        >
          Lịch sử xuất nhập kho
        </button>
        <button
          className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${activeTab === 'low-stock' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('low-stock')}
        >
          Sản phẩm sắp hết hàng
        </button>
      </div>

      {activeTab === 'movements' && (
        <div className="space-y-4">
          <div className="flex gap-4 items-center bg-white p-4 rounded-lg shadow-sm">
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
            >
              <option value="">Tất cả loại phiếu</option>
              <option value="import">Nhập kho</option>
              <option value="export">Xuất kho</option>
              <option value="adjust">Điều chỉnh</option>
              <option value="return">Trả hàng</option>
            </select>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
            />
            <span className="text-gray-500">-</span>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
            />
          </div>

          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {moveLoading ? (
              <div className="p-8 flex justify-center"><LoadingSpinner /></div>
            ) : (
              <>
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="p-4 font-medium text-gray-600">ID</th>
                      <th className="p-4 font-medium text-gray-600">Sản phẩm</th>
                      <th className="p-4 font-medium text-gray-600">Loại</th>
                      <th className="p-4 font-medium text-gray-600">Số lượng</th>
                      <th className="p-4 font-medium text-gray-600">Tồn kho</th>
                      {can('cost:read') && <th className="p-4 font-medium text-gray-600">Đơn giá</th>}
                      <th className="p-4 font-medium text-gray-600">Lý do</th>
                      <th className="p-4 font-medium text-gray-600">Ngày tạo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {movements.length === 0 ? (
                      <tr><td colSpan="8" className="p-8 text-center text-gray-500">Không có dữ liệu.</td></tr>
                    ) : (
                      movements.map(m => (
                        <tr key={m.id} className="hover:bg-gray-50">
                          <td className="p-4 text-gray-500">#{m.id}</td>
                          <td className="p-4">
                            <div className="font-medium text-gray-900">{m.product?.name}</div>
                            <div className="text-xs text-gray-500">SKU: {m.product?.sku}</div>
                          </td>
                          <td className="p-4">{getMovementTypeBadge(m.type)}</td>
                          <td className="p-4">
                            <span className={`font-medium ${m.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                            </span>
                          </td>
                          <td className="p-4 text-gray-600 text-sm">
                            {m.stock_before} &rarr; {m.stock_after}
                          </td>
                          {can('cost:read') && <td className="p-4 text-gray-600">{m.unit_cost ? formatCurrency(m.unit_cost) : '-'}</td>}
                          <td className="p-4 text-gray-500 truncate max-w-[150px]" title={m.reason}>{m.reason || '-'}</td>
                          <td className="p-4 text-gray-500 text-sm">
                            {new Date(m.created_at).toLocaleString('vi-VN')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                <div className="p-4 border-t">
                  <Pagination currentPage={movePage} totalPages={Math.ceil(moveTotal / 10)} onPageChange={setMovePage} />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'low-stock' && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {lowLoading ? (
            <div className="p-8 flex justify-center"><LoadingSpinner /></div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="p-4 font-medium text-gray-600">SKU</th>
                  <th className="p-4 font-medium text-gray-600">Sản phẩm</th>
                  <th className="p-4 font-medium text-gray-600">Thương hiệu</th>
                  <th className="p-4 font-medium text-gray-600">Tồn kho</th>
                  <th className="p-4 font-medium text-gray-600">Cảnh báo</th>
                  <th className="p-4 font-medium text-gray-600">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lowStock.length === 0 ? (
                  <tr><td colSpan="6" className="p-8 text-center text-gray-500">Không có sản phẩm nào sắp hết hàng.</td></tr>
                ) : (
                  lowStock.map(item => (
                    <tr key={item.id} className={`hover:bg-gray-50 ${item.stock_quantity === 0 ? 'bg-red-50/50' : ''}`}>
                      <td className="p-4 text-gray-500">{item.sku}</td>
                      <td className="p-4 font-medium">{item.name}</td>
                      <td className="p-4 text-gray-500">{item.brand?.name}</td>
                      <td className="p-4">
                        <span className={`font-bold ${item.stock_quantity === 0 ? 'text-red-600' : 'text-orange-500'}`}>
                          {item.stock_quantity}
                        </span>
                      </td>
                      <td className="p-4 text-gray-500">&le; {item.low_stock_threshold || 10}</td>
                      <td className="p-4">
                        <StatusBadge status={item.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold">Tạo phiếu kho</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:bg-gray-100 p-2 rounded-full">
                <HiXMark className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="inventoryForm" onSubmit={handleSaveMovement} className="space-y-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tìm kiếm sản phẩm *</label>
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Nhập tên hoặc SKU..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                  />
                  {products.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {products.map(p => (
                        <div
                          key={p.id}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                          onClick={() => {
                            setFormData({ ...formData, product_id: p.id });
                            setProductSearch(`${p.sku} - ${p.name}`);
                            setProducts([]);
                          }}
                        >
                          <div className="font-medium">{p.name}</div>
                          <div className="text-gray-500 text-xs">SKU: {p.sku} | Tồn: {p.stock_quantity}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Loại phiếu *</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                    >
                      <option value="import">Nhập kho</option>
                      <option value="export">Xuất kho</option>
                      <option value="adjust">Điều chỉnh</option>
                      <option value="return">Trả hàng</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng *</label>
                    <input
                      type="number"
                      required
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {formData.type === 'import' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Đơn giá (VND)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.unit_cost}
                      onChange={(e) => setFormData({ ...formData, unit_cost: parseInt(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lý do/Ghi chú {formData.type === 'adjust' && '*'}</label>
                  <textarea
                    required={formData.type === 'adjust'}
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 h-20"
                  />
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg">
                Hủy
              </button>
              <button type="submit" form="inventoryForm" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Lưu phiếu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
