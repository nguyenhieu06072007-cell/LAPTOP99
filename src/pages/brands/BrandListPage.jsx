import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import Pagination from '../../components/ui/Pagination';
import StatusBadge from '../../components/ui/StatusBadge';
import SearchInput from '../../components/ui/SearchInput';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { HiPencil, HiTrash, HiPlus, HiXMark } from 'react-icons/hi2';

export default function BrandListPage() {
  const { can } = useAuth();
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  
  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [formData, setFormData] = useState({
    name: '', slug: '', country: '', logo_url: '', description: '', sort_order: 0, status: 'active'
  });

  // Confirm
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchBrands();
  }, [search, status, page]);

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const res = await api.get('/brands', {
        params: { search, status, page, limit }
      });
      setBrands(res.data.data);
      setTotal(res.data.meta.total);
    } catch (err) {
      toast.error('Lỗi tải danh sách thương hiệu');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (brand = null) => {
    if (brand) {
      setEditingBrand(brand);
      setFormData(brand);
    } else {
      setEditingBrand(null);
      setFormData({ name: '', slug: '', country: '', logo_url: '', description: '', sort_order: 0, status: 'active' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBrand(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingBrand) {
        await api.put(`/brands/${editingBrand.id}`, formData);
        toast.success('Cập nhật thành công');
      } else {
        await api.post('/brands', formData);
        toast.success('Thêm mới thành công');
      }
      handleCloseModal();
      fetchBrands();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleDeleteClick = (id) => {
    setDeletingId(id);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/brands/${deletingId}`);
      toast.success('Xóa thương hiệu thành công');
      setPage(1);
      fetchBrands();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể xóa thương hiệu này vì có sản phẩm liên kết');
    } finally {
      setConfirmOpen(false);
    }
  };

  const toggleStatus = async (brand) => {
    try {
      const newStatus = brand.status === 'active' ? 'inactive' : 'active';
      await api.put(`/brands/${brand.id}`, { ...brand, status: newStatus });
      toast.success('Cập nhật trạng thái thành công');
      fetchBrands();
    } catch (err) {
      toast.error('Lỗi cập nhật trạng thái');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý thương hiệu</h1>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <HiPlus className="w-5 h-5" />
          Thêm thương hiệu
        </button>
      </div>

      <div className="flex gap-4 items-center bg-white p-4 rounded-lg shadow-sm">
        <div className="w-64">
          <SearchInput value={search} onChange={setSearch} placeholder="Tìm kiếm tên..." />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="active">Hoạt động</option>
          <option value="inactive">Khóa</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center"><LoadingSpinner /></div>
        ) : (
          <>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="p-4 font-medium text-gray-600">Logo</th>
                  <th className="p-4 font-medium text-gray-600">Tên</th>
                  <th className="p-4 font-medium text-gray-600">Slug</th>
                  <th className="p-4 font-medium text-gray-600">Quốc gia</th>
                  <th className="p-4 font-medium text-gray-600">Sản phẩm</th>
                  <th className="p-4 font-medium text-gray-600">Trạng thái</th>
                  <th className="p-4 font-medium text-gray-600">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {brands.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-gray-500">
                      Không tìm thấy thương hiệu nào.
                    </td>
                  </tr>
                ) : (
                  brands.map((brand) => (
                    <tr key={brand.id} className="hover:bg-gray-50 transition">
                      <td className="p-4">
                        <div className="h-10 w-24 bg-white border border-gray-200 rounded-md p-1 flex items-center justify-center shadow-xs">
                          {brand.logo_url ? (
                            <img
                              src={brand.logo_url}
                              alt={brand.name}
                              className="h-full w-full object-contain"
                              onError={(e) => { e.currentTarget.src = '/brand-placeholder.svg'; }}
                            />
                          ) : (
                            <span className="text-xs font-bold text-gray-500">
                              {brand.name.substring(0, 3).toUpperCase()}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 font-medium">{brand.name}</td>
                      <td className="p-4 text-gray-500">{brand.slug}</td>
                      <td className="p-4 text-gray-500">{brand.country}</td>
                      <td className="p-4">{brand.product_count || 0}</td>
                      <td className="p-4">
                        <button onClick={() => toggleStatus(brand)}>
                          <StatusBadge status={brand.status} />
                        </button>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenModal(brand)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <HiPencil className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(brand.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                          >
                            <HiTrash className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="p-4 border-t">
              <Pagination currentPage={page} totalPages={Math.ceil(total / limit)} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold">
                {editingBrand ? 'Sửa thương hiệu' : 'Thêm thương hiệu mới'}
              </h2>
              <button onClick={handleCloseModal} className="text-gray-500 hover:bg-gray-100 p-2 rounded-full">
                <HiXMark className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="brandForm" onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên thương hiệu *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quốc gia</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL Logo</label>
                  <input
                    type="text"
                    value={formData.logo_url}
                    onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 h-24"
                  />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Thứ tự hiển thị</label>
                    <input
                      type="number"
                      value={formData.sort_order}
                      onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                    >
                      <option value="active">Hoạt động</option>
                      <option value="inactive">Khóa</option>
                    </select>
                  </div>
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Hủy
              </button>
              <button
                type="submit"
                form="brandForm"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Xác nhận xóa"
        message="Bạn có chắc chắn muốn xóa thương hiệu này không? Thao tác này không thể hoàn tác và sẽ thất bại nếu có sản phẩm đang liên kết."
      />
    </div>
  );
}
