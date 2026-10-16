import React, { useState, useEffect, useRef } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { toast } from 'react-hot-toast';
import {
  HiPlus,
  HiOutlineFolder,
  HiOutlineFolderOpen,
  HiOutlineChevronRight,
  HiOutlineChevronDown,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlinePhoto,
  HiOutlineAdjustmentsHorizontal,
  HiOutlineSparkles,
  HiOutlineEye,
  HiXMark,
  HiCheck
} from 'react-icons/hi2';

export default function CategoryListPage() {
  const { can } = useAuth();
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [displayFilter, setDisplayFilter] = useState('all');

  // Banner upload state
  const bannerInputRef = useRef(null);
  const [activeBannerSlot, setActiveBannerSlot] = useState('banner_main');

  // Smart Filters state (Bộ lọc thông minh)
  const [smartFilters, setSmartFilters] = useState([
    { id: 1, name: 'Mức giá', desc: 'Dưới 15 triệu, 15 - 20 triệu, Trên 25 triệu', values: ['Dưới 15 triệu', '15 - 20 triệu', '20 - 30 triệu', 'Trên 30 triệu'], active: true },
    { id: 2, name: 'Nhu cầu', desc: 'Gaming, Đồ họa kỹ thuật, Mỏng nhẹ, Sinh viên', values: ['Gaming eSports', 'Đồ họa - Render 3D', 'Văn phòng mỏng nhẹ', 'Sinh viên', 'Doanh nhân VIP'], active: true },
    { id: 3, name: 'Bộ xử lý (CPU)', desc: 'Intel Core Ultra, Core i5/i7/i9, AMD Ryzen, Apple M-Series', values: ['Intel Core Ultra (AI)', 'Intel Core i7 / i9', 'AMD Ryzen 7 / 9', 'Apple M3 / M4'], active: true },
    { id: 4, name: 'Bộ nhớ RAM', desc: '8 GB, 16 GB, 32 GB, 64 GB', values: ['16 GB Chuẩn', '32 GB Đồ họa', '64 GB Workstation'], active: true },
    { id: 5, name: 'Card đồ họa (GPU)', desc: 'NVIDIA RTX 4050, RTX 4060, RTX 4070, Card Onboard', values: ['NVIDIA RTX 4050', 'NVIDIA RTX 4060', 'NVIDIA RTX 4070', 'Card Onboard tiết kiệm điện'], active: true },
    { id: 6, name: 'Tần số quét màn hình', desc: '120Hz, 144Hz, 240Hz, Chuẩn màu OLED', values: ['120Hz Mượt mà', '144Hz - 165Hz Gaming', '240Hz Chuyên nghiệp', '100% DCI-P3 OLED'], active: true },
    { id: 7, name: 'Trọng lượng máy', desc: 'Dưới 1.2 kg, 1.2 - 1.5 kg, Trên 2.0 kg', values: ['Siêu nhẹ < 1.0 kg (LG Gram)', '1.1 - 1.4 kg Mỏng nhẹ', 'Trên 2.0 kg (Tản nhiệt khủng)'], active: true },
  ]);

  const [filterPreviewModal, setFilterPreviewModal] = useState(false);
  const [newFilterModal, setNewFilterModal] = useState(false);
  const [newFilterData, setNewFilterData] = useState({ name: '', values: '' });

  // Form state for selected or new category
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    parent_id: '',
    status: 1,
    image_url: '',
    meta_title: '',
    meta_description: '',
    banner_main: '',
    banner_sub1: '',
    banner_sub2: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [catRes, brandRes] = await Promise.all([
        api.get('/categories?tree=1'),
        api.get('/brands')
      ]);
      const cats = catRes.data.data || [];
      setCategories(cats);
      setBrands(brandRes.data.data || []);
      if (cats.length > 0 && !selectedCategory) {
        selectCategory(cats[0]);
      }
    } catch (err) {
      toast.error('Lỗi khi tải danh mục và thương hiệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const selectCategory = (cat) => {
    setSelectedCategory(cat);
    setFormData({
      name: cat.name || '',
      slug: cat.slug || '',
      parent_id: cat.parent_id || '',
      status: cat.status ?? 1,
      image_url: cat.image_url || '',
      meta_title: cat.name ? `${cat.name} Chính Hãng - Giá Rẻ` : '',
      meta_description: cat.description || `Mua ${cat.name} trả góp 0%, bảo hành chính hãng.`,
      banner_main: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=600&q=80',
      banner_sub1: '',
      banner_sub2: '',
    });
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Vui lòng nhập tên danh mục');
      return;
    }

    try {
      if (selectedCategory?.id) {
        await api.put(`/categories/${selectedCategory.id}`, {
          name: formData.name,
          slug: formData.slug || undefined,
          parent_id: formData.parent_id ? Number(formData.parent_id) : null,
          status: formData.status ? 1 : 0,
          description: formData.meta_description,
        });
        toast.success('Đã cập nhật danh mục thành công!');
      } else {
        await api.post('/categories', {
          name: formData.name,
          slug: formData.slug || undefined,
          parent_id: formData.parent_id ? Number(formData.parent_id) : null,
          status: formData.status ? 1 : 0,
          description: formData.meta_description,
        });
        toast.success('Đã thêm danh mục mới!');
      }
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Lỗi khi lưu danh mục');
    }
  };

  const handleCreateNew = () => {
    setSelectedCategory(null);
    setFormData({
      name: '',
      slug: '',
      parent_id: '',
      status: 1,
      image_url: '',
      meta_title: '',
      meta_description: '',
      banner_main: '',
      banner_sub1: '',
      banner_sub2: '',
    });
  };

  const handleSlotClick = (slot) => {
    setActiveBannerSlot(slot);
    if (bannerInputRef.current) bannerInputRef.current.click();
  };

  const handleBannerFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file hình ảnh (JPG, PNG, WEBP)');
      return;
    }
    const url = URL.createObjectURL(file);
    setFormData((prev) => ({
      ...prev,
      [activeBannerSlot]: url,
    }));
    toast.success('Đã tải lên ảnh banner thành công!');
  };

  const toggleFilterActive = (filterId) => {
    setSmartFilters(
      smartFilters.map((f) => (f.id === filterId ? { ...f, active: !f.active } : f))
    );
    toast.success('Đã thay đổi trạng thái kích hoạt bộ lọc');
  };

  const handleAddCustomFilter = (e) => {
    e.preventDefault();
    if (!newFilterData.name.trim()) {
      toast.error('Vui lòng nhập tên tiêu chí lọc');
      return;
    }
    const vals = newFilterData.values
      ? newFilterData.values.split(',').map((v) => v.trim()).filter(Boolean)
      : ['Lựa chọn 1', 'Lựa chọn 2'];
    const newFilter = {
      id: Date.now(),
      name: newFilterData.name.trim(),
      desc: vals.slice(0, 3).join(', '),
      values: vals,
      active: true,
    };
    setSmartFilters([...smartFilters, newFilter]);
    setNewFilterData({ name: '', values: '' });
    setNewFilterModal(false);
    toast.success(`Đã thêm tiêu chí lọc "${newFilter.name}" thành công!`);
  };

  const handleDeleteFilter = (filterId) => {
    setSmartFilters(smartFilters.filter((f) => f.id !== filterId));
    toast.success('Đã xóa tiêu chí lọc');
  };

  if (loading) return <LoadingSpinner fullPage text="Đang đồng bộ cây danh mục & thương hiệu..." />;

  return (
    <div className="space-y-4 text-xs">
      {/* Top Search & Action Bar matching wireframe Image 4 */}
      <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2 flex-1 max-w-md">
          <input
            type="text"
            placeholder="Tìm danh mục..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-md bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
          <select
            value={displayFilter}
            onChange={(e) => setDisplayFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-gray-300 rounded-md bg-gray-50 text-gray-700"
          >
            <option value="all">Hiển thị: Tất cả</option>
            <option value="active">Chỉ đang hiện</option>
            <option value="hidden">Đang ẩn</option>
          </select>
        </div>

        <button
          onClick={handleCreateNew}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md shadow-2xs flex items-center space-x-1.5 transition"
        >
          <HiPlus className="w-4 h-4" />
          <span>+ Thêm danh mục</span>
        </button>
      </div>

      {/* TOP SECTION: 2 COLUMNS (Category Tree vs Category Details & Banners) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        
        {/* Left Col: Cây danh mục (Tree view) */}
        <div className="lg:col-span-4 bg-white p-4 rounded-lg border border-gray-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 mb-3">
              <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wider">Cây danh mục</h3>
              <span className="text-[10px] text-gray-400">Kéo thả để sắp xếp</span>
            </div>

            <div className="space-y-1 max-h-[380px] overflow-y-auto pr-1">
              {categories.map((cat) => {
                const isSelected = selectedCategory?.id === cat.id;
                return (
                  <div key={cat.id} className="space-y-1">
                    <div
                      onClick={() => selectCategory(cat)}
                      className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition ${
                        isSelected
                          ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <span className="text-gray-400">▾</span>
                        <HiOutlineFolder className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-amber-500'}`} />
                        <span className="truncate">{cat.name}</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                        {cat.product_count || 0} SP
                      </span>
                    </div>

                    {/* Children nodes if any */}
                    {cat.children && cat.children.length > 0 && (
                      <div className="pl-6 space-y-1 border-l border-gray-200 ml-3">
                        {cat.children.map((child) => (
                          <div
                            key={child.id}
                            onClick={() => selectCategory(child)}
                            className={`flex items-center justify-between p-1.5 rounded-md cursor-pointer text-[11px] ${
                              selectedCategory?.id === child.id
                                ? 'bg-blue-50 text-blue-700 font-semibold'
                                : 'hover:bg-gray-50 text-gray-600'
                            }`}
                          >
                            <span>• {child.name}</span>
                            <span className="text-[9px] text-gray-400">{child.product_count || 0} SP</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 text-[11px] text-gray-400 text-center">
            Hỗ trợ phân cấp không giới hạn (Parent - Children)
          </div>
        </div>

        {/* Right Col: Chi tiết danh mục, Banner & SEO */}
        <div className="lg:col-span-8 space-y-3">
          <form onSubmit={handleSaveCategory} className="space-y-3">
            
            {/* Card 1: Chi tiết danh mục */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-2xs space-y-3">
              <h4 className="font-bold text-gray-800 text-xs uppercase pb-2 border-b border-gray-100">
                {selectedCategory ? `Chi tiết: ${selectedCategory.name}` : 'Thêm danh mục mới'}
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 font-medium mb-1">Tên danh mục *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="VD: Laptop Gaming, Laptop Văn phòng..."
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-600 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-600 font-medium mb-1">Đường dẫn (Slug)</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="auto-tao-tu-ten"
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-600 font-medium mb-1">Danh mục cha</label>
                  <select
                    value={formData.parent_id}
                    onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md bg-white focus:outline-none"
                  >
                    <option value="">(Không có - Danh mục gốc)</option>
                    {categories
                      .filter((c) => c.id !== selectedCategory?.id)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="flex items-center space-x-4 pt-5">
                  <label className="flex items-center cursor-pointer space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.status === 1}
                      onChange={(e) => setFormData({ ...formData, status: e.target.checked ? 1 : 0 })}
                      className="rounded text-blue-600"
                    />
                    <span className="font-medium text-gray-700">Hiển thị trên website</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Hidden banner input */}
            <input
              type="file"
              ref={bannerInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleBannerFileSelected}
            />

            {/* Card 2: Banner danh mục matching wireframe Image 4 */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-2xs space-y-2">
              <h4 className="font-bold text-gray-800 text-xs uppercase pb-2 border-b border-gray-100 flex justify-between items-center">
                <span>Banner danh mục: 1 chính + 2 phụ</span>
                <span className="text-[10px] text-blue-600 font-medium">Bấm vào khung để tải ảnh từ máy tính</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {[
                  { slot: 'banner_main', label: 'Banner chính', size: '1200 x 400 px' },
                  { slot: 'banner_sub1', label: 'Banner phụ 1', size: '400 x 200 px' },
                  { slot: 'banner_sub2', label: 'Banner phụ 2', size: '400 x 200 px' },
                ].map((item) => (
                  <div
                    key={item.slot}
                    onClick={() => handleSlotClick(item.slot)}
                    className="relative p-2 border-2 border-dashed border-gray-300 rounded-md text-center hover:border-blue-500 hover:bg-blue-50/20 cursor-pointer transition min-h-[90px] flex flex-col items-center justify-center overflow-hidden group bg-gray-50/50"
                  >
                    {formData[item.slot] ? (
                      <div className="relative w-full h-20 rounded overflow-hidden">
                        <img
                          src={formData[item.slot]}
                          alt={item.label}
                          className="w-full h-full object-cover rounded"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center space-x-1.5 text-white text-[10px]">
                          <span>Đổi ảnh</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFormData({ ...formData, [item.slot]: '' });
                              toast.success('Đã xóa ảnh banner');
                            }}
                            className="bg-red-600 p-1 rounded-full hover:bg-red-700"
                            title="Xóa banner"
                          >
                            <HiXMark className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className="absolute top-1 left-1 bg-black/60 text-white text-[9px] px-1 rounded font-medium">
                          {item.label}
                        </span>
                      </div>
                    ) : (
                      <>
                        <HiOutlinePhoto className="w-6 h-6 text-gray-400 group-hover:text-blue-500 mb-1 transition" />
                        <p className="font-semibold text-gray-700 group-hover:text-blue-600">{item.label}</p>
                        <p className="text-[10px] text-gray-400">{item.size}</p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Card 3: SEO tiêu đề & mô tả */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-2xs space-y-2">
              <h4 className="font-bold text-gray-800 text-xs uppercase pb-1 border-b border-gray-100">
                Cấu hình SEO
              </h4>
              <div className="space-y-2">
                <div>
                  <label className="block text-gray-600 font-medium mb-1">SEO Tiêu đề</label>
                  <input
                    type="text"
                    value={formData.meta_title}
                    onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-medium mb-1">SEO Mô tả</label>
                  <textarea
                    rows={2}
                    value={formData.meta_description}
                    onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Action buttons: Hủy & Lưu */}
            <div className="flex justify-end space-x-2 pt-1">
              <button
                type="button"
                onClick={handleCreateNew}
                className="px-5 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 text-gray-700 font-medium"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold shadow-2xs transition"
              >
                Lưu danh mục
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* BOTTOM SECTION: 2 COLUMNS (Thương hiệu table vs Bộ lọc nhanh cho danh mục) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 pt-2">
        
        {/* Bottom Left: Thương hiệu matching wireframe Image 4 */}
        <div className="lg:col-span-6 bg-white p-4 rounded-lg border border-gray-200 shadow-2xs">
          <div className="flex justify-between items-center pb-2 border-b border-gray-100 mb-3">
            <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wider">Thương hiệu</h3>
            <span className="text-[11px] text-blue-600 font-medium cursor-pointer">+ Thêm hãng</span>
          </div>

          <div className="overflow-x-auto max-h-[260px] overflow-y-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500 font-medium">
                  <th className="pb-2">Logo</th>
                  <th className="pb-2">Hãng</th>
                  <th className="pb-2 text-center">Số SP</th>
                  <th className="pb-2 text-right">Hiển thị</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {brands.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="py-2">
                      <div className="h-7 w-16 bg-white border border-gray-200 rounded p-0.5 flex items-center justify-center">
                        <img
                          src={b.logo_url}
                          alt={b.name}
                          className="h-full w-full object-contain"
                          onError={(e) => { e.currentTarget.src = '/brand-placeholder.svg'; }}
                        />
                      </div>
                    </td>
                    <td className="py-2 font-semibold text-gray-900">{b.name}</td>
                    <td className="py-2 text-center text-gray-600">{b.product_count || 12}</td>
                    <td className="py-2 text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">
                        Bật
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Right: Bộ lọc thông minh cho danh mục matching wireframe Image 4 & Spec EAV */}
        <div className="lg:col-span-6 bg-white p-4 rounded-lg border border-gray-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 mb-3">
              <div className="flex items-center space-x-1.5">
                <HiOutlineSparkles className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wider">
                  Bộ lọc thông minh (Smart Dynamic Filters)
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setFilterPreviewModal(true)}
                  className="text-[11px] text-gray-600 hover:text-blue-600 font-medium flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded"
                >
                  <HiOutlineEye className="w-3.5 h-3.5" />
                  <span>Xem trước Web</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNewFilterModal(true)}
                  className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold"
                >
                  + Thêm tiêu chí lọc
                </button>
              </div>
            </div>

            <p className="text-[11px] text-gray-500 mb-3">
              Bộ lọc EAV linh hoạt tự động trích xuất từ thông số CPU, RAM, GPU, Màn hình của SKU:
            </p>

            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {smartFilters.map((filter, idx) => (
                <div
                  key={filter.id}
                  className={`flex items-center justify-between p-2.5 rounded-md border transition ${
                    filter.active ? 'bg-gray-50/80 border-gray-200' : 'bg-gray-100/50 border-gray-200 opacity-60'
                  }`}
                >
                  <div className="min-w-0 flex-1 mr-2">
                    <span className="font-bold text-gray-800 block text-xs">{filter.name}</span>
                    <span className="text-gray-500 text-[10px] truncate block mt-0.5">
                      {filter.desc}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0 text-[10px]">
                    <button
                      type="button"
                      onClick={() => toggleFilterActive(filter.id)}
                      className={`px-2 py-0.5 rounded font-semibold transition ${
                        filter.active
                          ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                    >
                      {filter.active ? 'Đang bật' : 'Đã tắt'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteFilter(filter.id)}
                      className="p-1 text-gray-400 hover:text-red-600 rounded transition"
                      title="Xóa tiêu chí này"
                    >
                      <HiOutlineTrash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex justify-between items-center text-[11px] text-gray-400">
            <span>Cấu hình bộ lọc tự động đồng bộ theo thông số SKU</span>
            <button
              type="button"
              onClick={() => toast.success('Đã lưu cấu hình bộ lọc thông minh cho danh mục!')}
              className="text-blue-600 font-semibold hover:underline"
            >
              Lưu bộ lọc
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Thêm tiêu chí lọc mới */}
      {newFilterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex justify-between items-center px-4 py-3 border-b bg-gray-50">
              <h3 className="font-bold text-gray-800 text-xs uppercase flex items-center gap-1.5">
                <HiOutlineSparkles className="w-4 h-4 text-blue-600" />
                <span>Thêm tiêu chí lọc thông minh mới</span>
              </h3>
              <button
                type="button"
                onClick={() => setNewFilterModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <HiXMark className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomFilter} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Tên tiêu chí lọc *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Chuẩn tản nhiệt, Tần số quét, Cổng kết nối..."
                  value={newFilterData.name}
                  onChange={(e) => setNewFilterData({ ...newFilterData, name: e.target.value })}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Các lựa chọn lọc (Phân cách bằng dấu phẩy) *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="VD: Tản nhiệt Vapor Chamber, 2 Quạt đối lưu, Chất lỏng kim loại..."
                  value={newFilterData.values}
                  onChange={(e) => setNewFilterData({ ...newFilterData, values: e.target.value })}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Hệ thống tự động tách từng nhãn thành chip lựa chọn ở trang bán hàng
                </span>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setNewFilterModal(false)}
                  className="px-4 py-1.5 border border-gray-300 rounded-md bg-white hover:bg-gray-50 text-gray-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md shadow-2xs"
                >
                  Thêm tiêu chí
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Xem trước bộ lọc trên Web khách hàng */}
      {filterPreviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center px-4 py-3 border-b bg-gray-50">
              <div>
                <h3 className="font-bold text-gray-800 text-xs uppercase flex items-center gap-1.5">
                  <HiOutlineEye className="w-4 h-4 text-blue-600" />
                  <span>Mô phỏng Giao diện Bộ lọc thông minh trên Storefront</span>
                </h3>
                <p className="text-[10px] text-gray-400">Cách khách hàng nhìn thấy và lọc laptop khi duyệt danh mục</p>
              </div>
              <button
                type="button"
                onClick={() => setFilterPreviewModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <HiXMark className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200">
                <span className="text-[11px] font-bold text-blue-900 block mb-1">
                  Đang lọc danh mục: {selectedCategory?.name || 'Laptop Gaming & Đồ họa'}
                </span>
                <span className="text-[10px] text-blue-700">
                  Tìm thấy 100 sản phẩm phù hợp. Bấm vào các chip bên dưới để thử nghiệm bộ lọc:
                </span>
              </div>

              {smartFilters.filter(f => f.active).map((filter) => (
                <div key={filter.id} className="space-y-1.5">
                  <span className="font-bold text-gray-800 text-xs block">{filter.name}:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {filter.values.map((v, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => toast.success(`Đã chọn bộ lọc: ${v}`)}
                        className="px-2.5 py-1 bg-white hover:bg-blue-50 hover:border-blue-500 border border-gray-300 rounded-full text-[11px] text-gray-700 transition"
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-4 py-2.5 border-t bg-gray-50 flex justify-end">
              <button
                type="button"
                onClick={() => setFilterPreviewModal(false)}
                className="px-4 py-1.5 bg-blue-600 text-white font-bold rounded-md text-xs"
              >
                Đóng xem trước
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
