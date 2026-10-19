import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axios';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import toast from 'react-hot-toast';
import {
  HiPlus,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineArrowDownTray,
  HiOutlineArrowUpTray,
  HiOutlineTicket,
  HiOutlineEllipsisHorizontal
} from 'react-icons/hi2';

const formatVND = (v) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v || 0);

export default function ProductListPage() {
  const { can } = useAuth();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, total_pages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [brandId, setBrandId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('');
  const [limit, setLimit] = useState(20);
  const [page, setPage] = useState(1);

  // Batch selection
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, id: null, name: '' });

  const fetchFilters = async () => {
    try {
      const [brandRes, catRes] = await Promise.all([
        api.get('/brands'),
        api.get('/categories')
      ]);
      setBrands(brandRes.data.data || []);
      setCategories(catRes.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/products', {
        params: {
          page,
          limit,
          search: search || undefined,
          brand_id: brandId || undefined,
          category_id: categoryId || undefined,
          status: status || undefined,
        },
      });
      setProducts(res.data.data || []);
      setMeta(res.data.meta || { page: 1, limit, total: 0, total_pages: 1 });
    } catch (err) {
      toast.error('Lỗi khi tải danh sách sản phẩm');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, brandId, categoryId, status]);

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(products.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/products/${deleteDialog.id}`);
      toast.success('Đã chuyển sản phẩm vào thùng rác');
      setDeleteDialog({ isOpen: false, id: null, name: '' });
      fetchProducts();
    } catch (err) {
      toast.error(err.message || 'Lỗi khi xóa sản phẩm');
    }
  };

  const handleToggleStatus = async (product) => {
    const newStatus = product.status === 'active' ? 'hidden' : 'active';
    try {
      await api.patch(`/products/${product.id}/status`, { status: newStatus });
      toast.success(`Đã chuyển trạng thái sang: ${newStatus}`);
      fetchProducts();
    } catch (err) {
      toast.error('Lỗi khi đổi trạng thái');
    }
  };

  return (
    <div className="space-y-3 text-xs">
      {/* Filter Row matching wireframe Image 2 */}
      <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 max-w-4xl">
          {/* Tìm tên / SKU input */}
          <input
            type="text"
            placeholder="Tìm tên / SKU..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-56 px-3 py-1.5 border border-gray-300 rounded-md bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
          />

          {/* Danh mục dropdown */}
          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 border border-gray-300 rounded-md bg-gray-50 text-gray-700 focus:outline-none"
          >
            <option value="">Danh mục ▾</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Hãng dropdown */}
          <select
            value={brandId}
            onChange={(e) => {
              setBrandId(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 border border-gray-300 rounded-md bg-gray-50 text-gray-700 focus:outline-none"
          >
            <option value="">Hãng ▾</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          {/* Trạng thái dropdown */}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 border border-gray-300 rounded-md bg-gray-50 text-gray-700 focus:outline-none"
          >
            <option value="">Trạng thái ▾</option>
            <option value="active">Đang bán (Active)</option>
            <option value="draft">Bản nháp (Draft)</option>
            <option value="hidden">Đang ẩn (Hidden)</option>
            <option value="discontinued">Ngừng kinh doanh</option>
          </select>
        </div>

        {/* Primary Action Button: + Thêm sản phẩm */}
        <Link
          to="/products/new"
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md shadow-2xs flex items-center space-x-1.5 transition whitespace-nowrap"
        >
          <HiPlus className="w-4 h-4" />
          <span>+ Thêm sản phẩm</span>
        </Link>
      </div>

      {/* Batch Operations Bar matching wireframe Image 2 */}
      <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-2xs flex flex-wrap items-center justify-between text-gray-700 text-[11px] gap-2">
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-1.5 cursor-pointer font-medium">
            <input
              type="checkbox"
              checked={products.length > 0 && selectedIds.length === products.length}
              onChange={toggleSelectAll}
              className="rounded text-blue-600"
            />
            <span>Chọn tất cả ({selectedIds.length})</span>
          </label>
          <span className="text-gray-300">|</span>
          <button
            disabled={selectedIds.length === 0}
            onClick={() => toast.success(`Đã cập nhật trạng thái cho ${selectedIds.length} sản phẩm`)}
            className="hover:text-blue-600 disabled:opacity-40"
          >
            Ẩn / Hiện
          </button>
          <span className="text-gray-300">·</span>
          <button
            disabled={selectedIds.length === 0}
            onClick={() => toast.error(`Xóa hàng loạt ${selectedIds.length} sản phẩm`)}
            className="hover:text-red-600 disabled:opacity-40"
          >
            Xóa
          </button>
          <span className="text-gray-300">·</span>
          <button
            disabled={selectedIds.length === 0}
            onClick={() => toast.success('Mở modal gán khuyến mãi / quà tặng')}
            className="hover:text-blue-600 disabled:opacity-40"
          >
            Gán khuyến mãi
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            to="/batch-import"
            className="px-2.5 py-1 border border-gray-300 rounded hover:bg-gray-50 text-gray-700 font-medium flex items-center space-x-1"
          >
            <HiOutlineArrowDownTray className="w-3.5 h-3.5 text-gray-500" />
            <span>Nhập Excel & ZIP</span>
          </Link>
          <button
            onClick={() => toast.success('Đang tải file Excel danh sách sản phẩm...')}
            className="px-2.5 py-1 border border-gray-300 rounded hover:bg-gray-50 text-gray-700 font-medium flex items-center space-x-1"
          >
            <HiOutlineArrowUpTray className="w-3.5 h-3.5 text-gray-500" />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* Main Table matching wireframe Image 2 */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-100/80 border-b border-gray-200 text-gray-600 font-semibold text-xs">
                <th className="py-2.5 px-3 w-8 text-center">
                  <input
                    type="checkbox"
                    checked={products.length > 0 && selectedIds.length === products.length}
                    onChange={toggleSelectAll}
                    className="rounded text-blue-600"
                  />
                </th>
                <th className="py-2.5 px-3">Ảnh · Tên · SKU</th>
                <th className="py-2.5 px-3">Giá</th>
                <th className="py-2.5 px-3 text-center">Tồn</th>
                <th className="py-2.5 px-3">Danh mục</th>
                <th className="py-2.5 px-3 text-center">Trạng thái</th>
                <th className="py-2.5 px-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <LoadingSpinner />
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    Không tìm thấy sản phẩm nào phù hợp bộ lọc.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const isChecked = selectedIds.includes(p.id);
                  return (
                    <tr key={p.id} className={`hover:bg-blue-50/30 transition ${isChecked ? 'bg-blue-50/20' : ''}`}>
                      {/* Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectOne(p.id)}
                          className="rounded text-blue-600"
                        />
                      </td>

                      {/* Ảnh · Tên · SKU */}
                      <td className="py-3 px-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded bg-slate-50 border border-gray-200 p-0.5 flex-shrink-0 flex items-center justify-center overflow-hidden">
                            <img
                              src={p.thumbnail || '/laptop-placeholder.svg'}
                              alt={p.name}
                              className="w-full h-full object-contain"
                              onError={(e) => { e.currentTarget.src = '/laptop-placeholder.svg'; }}
                            />
                          </div>
                          <div className="min-w-0 max-w-sm">
                            <Link
                              to={`/products/${p.id}`}
                              className="font-semibold text-gray-900 hover:text-blue-600 line-clamp-1 block transition"
                              title={p.name}
                            >
                              {p.name}
                            </Link>
                            <div className="flex items-center space-x-2 text-[11px] text-gray-400 mt-0.5">
                              <span className="font-mono bg-gray-100 px-1 py-0.2 rounded text-gray-600">SKU: {p.sku}</span>
                              <span>·</span>
                              <span>{p.brand || 'Dell'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Giá */}
                      <td className="py-3 px-3">
                        {p.sale_price ? (
                          <div>
                            <span className="font-bold text-rose-600">{formatVND(p.sale_price)}</span>
                            <span className="block text-[10px] text-gray-400 line-through">{formatVND(p.price)}</span>
                          </div>
                        ) : (
                          <span className="font-bold text-gray-900">{formatVND(p.price)}</span>
                        )}
                      </td>

                      {/* Tồn */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            p.stock_quantity === 0
                              ? 'bg-red-100 text-red-700'
                              : p.stock_quantity <= p.low_stock_threshold
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {p.stock_quantity}
                        </span>
                      </td>

                      {/* Danh mục */}
                      <td className="py-3 px-3 text-gray-600 font-medium">
                        {p.category || 'Laptop Gaming'}
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => handleToggleStatus(p)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition ${
                            p.status === 'active'
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : p.status === 'draft'
                              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                          }`}
                        >
                          {p.status === 'active' ? 'Đang bán' : p.status === 'draft' ? 'Bản nháp' : 'Đang ẩn'}
                        </button>
                      </td>

                      {/* Thao tác */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1">
                          <Link
                            to={`/products/${p.id}/edit`}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded transition"
                            title="Sửa"
                          >
                            <HiOutlinePencilSquare className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => setDeleteDialog({ isOpen: true, id: p.id, name: p.name })}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded transition"
                            title="Xóa"
                          >
                            <HiOutlineTrash className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Pagination Row matching wireframe Image 2 */}
        <div className="p-3 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Left: Hiển thị 20 / 50 / 100 dòng */}
          <div className="flex items-center space-x-2 text-gray-600">
            <span>Hiển thị</span>
            {[20, 50, 100].map((num) => (
              <button
                key={num}
                onClick={() => {
                  setLimit(num);
                  setPage(1);
                }}
                className={`px-2 py-0.5 rounded font-semibold border ${
                  limit === num ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'
                }`}
              >
                {num}
              </button>
            ))}
            <span>dòng trên tổng {meta.total} sản phẩm</span>
          </div>

          {/* Right: < 1 2 3 ... > */}
          <div className="flex items-center space-x-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-2 py-1 border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-40"
            >
              ‹
            </button>
            {Array.from({ length: Math.min(5, meta.total_pages || 1) }, (_, i) => i + 1).map((pNum) => (
              <button
                key={pNum}
                onClick={() => setPage(pNum)}
                className={`px-2.5 py-1 border rounded font-semibold ${
                  page === pNum
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {pNum}
              </button>
            ))}
            {meta.total_pages > 5 && <span className="px-1 text-gray-400">...</span>}
            <button
              disabled={page >= meta.total_pages}
              onClick={() => setPage(page + 1)}
              className="px-2 py-1 border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-40"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Xác nhận xóa sản phẩm"
        message={`Bạn có chắc chắn muốn chuyển sản phẩm "${deleteDialog.name}" vào thùng rác?`}
        confirmText="Xóa sản phẩm"
        cancelText="Hủy"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ isOpen: false, id: null, name: '' })}
        variant="danger"
      />
    </div>
  );
}
