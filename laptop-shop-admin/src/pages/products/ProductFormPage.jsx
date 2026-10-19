import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axios';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  HiPlus,
  HiOutlinePhoto,
  HiOutlineTrash,
  HiOutlineSparkles,
  HiOutlineCheckBadge,
  HiOutlineArrowUpTray,
  HiOutlinePencilSquare,
  HiStar,
  HiOutlineStar,
} from 'react-icons/hi2';

export default function ProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const isEdit = !!id;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);

  // Form Main Fields
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    brand_id: '',
    category_id: '',
    model_name: '',
    short_description: '',
    description: '',
    price: '',
    cost_price: '',
    sale_price: '',
    stock_quantity: 10,
    low_stock_threshold: 3,
    status: 'active',
    is_featured: false,
    is_new: true,
    is_bestseller: false,
    version: 1,
    trade_in_enabled: true,
    installment_0: true,
    publish_schedule: '',
    meta_title: '',
    meta_description: '',
    slug: '',
  });

  // Images state
  const [images, setImages] = useState([]);
  const [newImageFiles, setNewImageFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const replaceFileInputRef = useRef(null);
  const [targetReplaceImgId, setTargetReplaceImgId] = useState(null);
  const [replacing, setReplacing] = useState(false);

  const handleFilesAdded = (files) => {
    if (!files || files.length === 0) return;
    const valid = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (valid.length === 0) {
      toast.error('Vui lòng chọn file hình ảnh (JPG, PNG, WEBP)');
      return;
    }
    const added = valid.map((f) => ({
      id: Math.random().toString(36).substring(7),
      file: f,
      url: URL.createObjectURL(f),
      name: f.name,
    }));
    setNewImageFiles((prev) => [...prev, ...added]);
    toast.success(`Đã thêm ${added.length} ảnh xem trước. Bấm "Lưu" để cập nhật lên hệ thống!`);
  };

  const handleSetThumbnail = async (imgId) => {
    if (!isEdit) {
      setImages((prev) => prev.map((img) => ({
        ...img,
        is_thumbnail: img.id === imgId ? 1 : 0,
      })));
      return;
    }
    try {
      await api.patch(`/products/${id}/images/${imgId}`);
      setImages((prev) => prev.map((img) => ({
        ...img,
        is_thumbnail: img.id === imgId ? 1 : 0,
      })));
      toast.success('Đã chọn làm ảnh đại diện');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Lỗi khi đặt ảnh đại diện');
    }
  };

  const handleReplaceFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !targetReplaceImgId) return;
    try {
      setReplacing(true);
      const formData = new FormData();
      formData.append('image', file);
      const res = await api.put(`/products/${id}/images/${targetReplaceImgId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const newUrl = res.data?.data?.url || URL.createObjectURL(file);
      setImages((prev) => prev.map((img) => (img.id === targetReplaceImgId ? { ...img, url: newUrl } : img)));
      toast.success('Đã thay ảnh thành công!');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Lỗi khi thay ảnh');
    } finally {
      setReplacing(false);
      setTargetReplaceImgId(null);
      if (replaceFileInputRef.current) replaceFileInputRef.current.value = '';
    }
  };

  const handleDeleteServerImage = async (imgId) => {
    if (!window.confirm('Bạn có chắc muốn xoá ảnh này?')) return;
    try {
      await api.delete(`/products/${id}/images/${imgId}`);
      setImages((prev) => {
        const nextImgs = prev.filter((img) => img.id !== imgId);
        const wasThumb = prev.find((img) => img.id === imgId)?.is_thumbnail;
        if (wasThumb && nextImgs.length > 0) {
          nextImgs[0] = { ...nextImgs[0], is_thumbnail: 1 };
        }
        return nextImgs;
      });
      toast.success('Đã xoá ảnh thành công');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Lỗi khi xoá ảnh');
    }
  };

  // Variant Matrix: Bảng tổ hợp (dung lượng x màu) matching wireframe Image 5
  const [variants, setVariants] = useState([
    { ram: '16GB', storage: '512GB', color: 'Xám không gian (Space Gray)', sku: '', price: 28990000, cost: 24000000, stock: 15 },
    { ram: '16GB', storage: '1TB', color: 'Bạc (Silver)', sku: '', price: 32990000, cost: 27500000, stock: 8 },
    { ram: '32GB', storage: '1TB', color: 'Đen nhám (Matte Black)', sku: '', price: 37990000, cost: 32000000, stock: 5 },
  ]);

  // Dynamic EAV Specs matching wireframe Image 5: nhóm · tên · giá trị · [+ dòng]
  const [specGroups, setSpecGroups] = useState([
    { group: 'Bộ xử lý (CPU)', name: 'Model CPU', value: 'Intel Core Ultra 7 155H (16 nhân, 22 luồng)' },
    { group: 'Bộ xử lý (CPU)', name: 'Xung nhịp tối đa', value: 'Lên tới 4.8 GHz Turbo Boost' },
    { group: 'Bộ nhớ (RAM)', name: 'Dung lượng & Chuẩn', value: '16GB LPDDR5x 7467 MHz' },
    { group: 'Card đồ họa (GPU)', name: 'Card màn hình', value: 'NVIDIA GeForce RTX 4050 6GB GDDR6' },
    { group: 'Màn hình', name: 'Kích thước & Độ phân giải', value: '14.5 inch 3.2K (3200x2000) OLED 120Hz' },
    { group: 'Pin & Sạc', name: 'Dung lượng pin', value: '75 Wh, sạc nhanh Type-C 100W' },
  ]);

  useEffect(() => {
    const fetchInit = async () => {
      try {
        const [brandRes, catRes] = await Promise.all([
          api.get('/brands'),
          api.get('/categories')
        ]);
        setBrands(brandRes.data.data || []);
        setCategories(catRes.data.data || []);

        if (isEdit) {
          const prodRes = await api.get(`/products/${id}`);
          const p = prodRes.data.data;
          setFormData({
            name: p.name || '',
            sku: p.sku || '',
            brand_id: p.brand_id || '',
            category_id: p.category_id || '',
            model_name: p.model_name || '',
            short_description: p.short_description || '',
            description: p.description || '',
            price: p.price || '',
            cost_price: p.cost_price || '',
            sale_price: p.sale_price || '',
            stock_quantity: p.stock_quantity || 0,
            low_stock_threshold: p.low_stock_threshold || 5,
            status: p.status || 'active',
            is_featured: !!p.is_featured,
            is_new: !!p.is_new,
            is_bestseller: !!p.is_bestseller,
            version: p.version || 1,
            trade_in_enabled: true,
            installment_0: true,
            publish_schedule: '',
            meta_title: p.meta_title || '',
            meta_description: p.meta_description || '',
            slug: p.slug || '',
          });
          setImages(p.images || []);
        }
      } catch (err) {
        toast.error('Lỗi khi tải thông tin');
      } finally {
        setLoading(false);
      }
    };
    fetchInit();
  }, [id, isEdit]);

  const generateSkuFromName = (name) => {
    if (!name?.trim()) return `SKU-${Date.now().toString().slice(-6)}`;
    const clean = name.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const parts = clean.split('-').filter((p) => p !== 'LAPTOP' && p !== 'GAMING');
    const prefix = parts.slice(0, 4).join('-');
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix || 'LAPTOP'}-${rand}`;
  };

  const handleNameChange = (e) => {
    const val = e.target.value;
    setFormData((prev) => ({
      ...prev,
      name: val,
      sku: prev.sku || generateSkuFromName(val),
      slug: prev.slug || val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      meta_title: prev.meta_title || `${val} Chính Hãng - Giá Rẻ`,
    }));
  };

  const addVariantRow = () => {
    setVariants([
      ...variants,
      { ram: '16GB', storage: '512GB', color: 'Màu mới', sku: '', price: formData.price || 20000000, cost: formData.cost_price || 17000000, stock: 10 }
    ]);
  };

  const removeVariantRow = (idx) => {
    setVariants(variants.filter((_, i) => i !== idx));
  };

  const addSpecRow = () => {
    setSpecGroups([
      ...specGroups,
      { group: 'Khác', name: 'Thuộc tính mới', value: '' }
    ]);
  };

  const removeSpecRow = (idx) => {
    setSpecGroups(specGroups.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (publishStatus = 'active') => {
    const cleanName = formData.name?.trim();
    let cleanSku = formData.sku?.trim();
    if (!cleanSku && cleanName) {
      cleanSku = generateSkuFromName(cleanName);
      setFormData((prev) => ({ ...prev, sku: cleanSku }));
    }

    if (!cleanName) {
      toast.error('Vui lòng nhập Tên sản phẩm');
      return;
    }
    if (!cleanSku) {
      toast.error('Vui lòng nhập mã SKU (hoặc bấm "Tự tạo mã SKU")');
      return;
    }
    if (!formData.brand_id) {
      toast.error('Vui lòng chọn Thương hiệu (Hãng sản xuất)');
      return;
    }
    if (!formData.category_id) {
      toast.error('Vui lòng chọn Danh mục sản phẩm');
      return;
    }

    const priceNum = Number(String(formData.price).replace(/[^0-9]/g, ''));
    if (!priceNum || priceNum <= 0) {
      toast.error('Vui lòng nhập Giá bán lẻ hợp lệ (lớn hơn 0 VND)');
      return;
    }

    const costNum = formData.cost_price ? Number(String(formData.cost_price).replace(/[^0-9]/g, '')) : undefined;
    const saleNum = formData.sale_price ? Number(String(formData.sale_price).replace(/[^0-9]/g, '')) : null;

    if (saleNum && saleNum >= priceNum) {
      toast.error('Giá khuyến mãi phải nhỏ hơn giá bán gốc');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: cleanName,
        sku: cleanSku,
        brand_id: Number(formData.brand_id),
        category_id: Number(formData.category_id),
        model_name: formData.model_name?.trim() || null,
        short_description: formData.short_description?.trim() || null,
        description: formData.description?.trim() || null,
        price: priceNum,
        cost_price: costNum,
        sale_price: saleNum,
        low_stock_threshold: Number(formData.low_stock_threshold) || 3,
        status: publishStatus,
        is_featured: formData.is_featured ? 1 : 0,
        is_new: formData.is_new ? 1 : 0,
        is_bestseller: formData.is_bestseller ? 1 : 0,
        meta_title: formData.meta_title?.trim() || null,
        meta_description: formData.meta_description?.trim() || null,
        slug: formData.slug?.trim() || undefined,
      };

      if (!isEdit) {
        payload.stock_quantity = Number(formData.stock_quantity) || 0;
      } else {
        payload.version = Number(formData.version) || 1;
      }

      let targetId = id;
      if (isEdit) {
        await api.put(`/products/${id}`, payload);
        toast.success('Cập nhật sản phẩm thành công!');
      } else {
        const createRes = await api.post('/products', payload);
        targetId = createRes.data?.data?.id;
        toast.success('Tạo sản phẩm mới thành công!');
      }

      // Tải lên các file ảnh thật nếu có
      if (newImageFiles.length > 0 && targetId) {
        try {
          const imgFormData = new FormData();
          newImageFiles.forEach((item) => {
            imgFormData.append('images', item.file);
          });
          await api.post(`/products/${targetId}/images`, imgFormData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          toast.success(`Đã lưu ${newImageFiles.length} ảnh thật của sản phẩm!`);
        } catch (imgErr) {
          console.error(imgErr);
          toast.error('Sản phẩm đã tạo nhưng tải ảnh gặp sự cố: ' + (imgErr.response?.data?.error?.message || imgErr.message));
        }
      }

      navigate('/products');
    } catch (err) {
      const msg =
        err.response?.data?.error?.details?.[0]?.message ||
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        'Lỗi khi lưu sản phẩm';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner fullPage text="Đang tải dữ liệu cấu hình máy..." />;

  return (
    <div className="space-y-4 text-xs pb-12">
      {/* Breadcrumb & Mode Banner */}
      <div className="bg-white px-4 py-2.5 rounded-lg border border-gray-200 shadow-2xs flex justify-between items-center">
        <div>
          <h2 className="font-bold text-gray-900 text-sm">
            {isEdit ? 'Chỉnh sửa thông tin máy' : 'Sản phẩm › Thêm mới'}
          </h2>
          <p className="text-[11px] text-gray-500">
            Hệ thống quản lý biến thể, thông số động EAV và tự động nén ảnh WebP
          </p>
        </div>
        <Link to="/products" className="text-blue-600 hover:underline">
          ← Quay lại danh sách
        </Link>
      </div>

      {/* 2-COLUMN MAIN LAYOUT matching wireframe Image 5 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* ================= LEFT MAIN COLUMN (~68%) ================= */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Card 1: Thông tin chung */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-2xs space-y-3">
            <h3 className="font-bold text-gray-800 text-xs uppercase pb-2 border-b border-gray-100 flex items-center justify-between">
              <span>Thông tin chung</span>
              <span className="text-[10px] text-gray-400 font-normal">Tên · SKU · Danh mục · Hãng · Mô tả ngắn</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-gray-700 font-medium mb-1">Tên sản phẩm *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={handleNameChange}
                  placeholder="VD: Laptop Dell XPS 14 9440 Core Ultra 7 155H 16GB 1TB RTX 4050"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-600 focus:outline-none text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-gray-700 font-medium">Mã SKU gốc *</label>
                    <button
                      type="button"
                      onClick={() => {
                        const newSku = generateSkuFromName(formData.name);
                        setFormData({ ...formData, sku: newSku });
                        toast.success('Đã tự động tạo SKU: ' + newSku);
                      }}
                      className="text-[10px] text-blue-600 hover:underline font-semibold"
                    >
                      ⚡ Tự tạo mã SKU
                    </button>
                  </div>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="VD: DELL-XPS14-9440"
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-1">Danh mục *</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md bg-white focus:outline-none"
                    required
                  >
                    <option value="">-- Chọn danh mục --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-1">Thương hiệu (Hãng) *</label>
                  <select
                    value={formData.brand_id}
                    onChange={(e) => setFormData({ ...formData, brand_id: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md bg-white focus:outline-none"
                    required
                  >
                    <option value="">-- Chọn hãng --</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Mô tả ngắn (Hiển thị ở trang danh sách)</label>
                <textarea
                  rows={2}
                  value={formData.short_description}
                  onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                  placeholder="VD: Thiết kế nhôm nguyên khối, chip AI thế hệ mới, màn hình 3.2K 120Hz siêu nét..."
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Hình ảnh và video (Drag & Drop + Watermark / WebP badge) */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-2xs space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 text-xs uppercase">
                Hình ảnh và video
              </h3>
              <span className="text-[10px] text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded">
                ✓ Tự động nén WebP & Đóng dấu Watermark logo
              </span>
            </div>

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFilesAdded(e.target.files)}
            />

            {/* Hidden replace input */}
            <input
              type="file"
              ref={replaceFileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleReplaceFileSelected}
            />

            {/* Drag & Drop Zone */}
            <div
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handleFilesAdded(e.dataTransfer.files);
              }}
              className={`p-6 border-2 border-dashed rounded-lg text-center cursor-pointer transition ${
                dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <HiOutlinePhoto className="w-10 h-10 text-blue-500 mx-auto mb-2" />
              <p className="font-semibold text-gray-700">Bấm vào đây để chọn ảnh thật từ máy tính hoặc kéo thả vào</p>
              <p className="text-[10px] text-gray-400 mt-1">
                Hỗ trợ JPG, PNG, WEBP. Ảnh được hiển thị trực tiếp và tự động nén WebP khi lưu sản phẩm.
              </p>
            </div>

            {/* Uploaded Gallery Thumbnails */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-700 text-[11px] block">
                  Ảnh hiện có ({images.length + newImageFiles.length} ảnh):
                </span>
                {replacing && (
                  <span className="text-blue-600 font-medium text-[11px] animate-pulse">
                    Đang thay đổi ảnh...
                  </span>
                )}
              </div>

              {images.length === 0 && newImageFiles.length === 0 ? (
                <div className="text-gray-400 italic text-center py-2 bg-gray-50 rounded border border-gray-200">
                  Chưa có ảnh thật nào được chọn. Hãy bấm khung trên để tải ảnh lên!
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {/* Existing Server Images */}
                  {images.map((img) => (
                    <div
                      key={img.id}
                      className={`relative border rounded-lg p-1.5 bg-white flex flex-col justify-between transition shadow-2xs hover:shadow-sm ${
                        img.is_thumbnail === 1 ? 'border-amber-400 ring-2 ring-amber-300/50 bg-amber-50/10' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="relative w-full h-24 bg-gray-50 rounded flex items-center justify-center overflow-hidden">
                        <img
                          src={img.url}
                          alt="product"
                          className="max-h-full max-w-full object-contain"
                          onError={(e) => { e.currentTarget.src = '/laptop-placeholder.svg'; }}
                        />
                        {img.is_thumbnail === 1 && (
                          <span className="absolute top-1 left-1 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow flex items-center gap-0.5">
                            <HiStar className="w-3 h-3" /> Đại diện
                          </span>
                        )}
                      </div>

                      {/* Control buttons */}
                      <div className="mt-2 pt-1.5 border-t border-gray-100 flex items-center justify-between gap-1 text-[11px]">
                        <button
                          type="button"
                          onClick={() => handleSetThumbnail(img.id)}
                          className={`px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5 transition ${
                            img.is_thumbnail === 1
                              ? 'bg-amber-100 text-amber-800'
                              : 'text-gray-600 hover:text-amber-700 hover:bg-gray-100'
                          }`}
                          title="Đặt làm ảnh đại diện"
                        >
                          {img.is_thumbnail === 1 ? (
                            <HiStar className="w-3.5 h-3.5 text-amber-500" />
                          ) : (
                            <HiOutlineStar className="w-3.5 h-3.5" />
                          )}
                          <span>Đại diện</span>
                        </button>

                        <div className="flex items-center gap-0.5">
                          {isEdit && (
                            <button
                              type="button"
                              onClick={() => {
                                setTargetReplaceImgId(img.id);
                                replaceFileInputRef.current?.click();
                              }}
                              className="px-1.5 py-0.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded font-medium flex items-center gap-0.5 transition"
                              title="Thay đổi ảnh này bằng ảnh khác"
                            >
                              <HiOutlinePencilSquare className="w-3.5 h-3.5" />
                              <span>Sửa</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              if (isEdit) {
                                handleDeleteServerImage(img.id);
                              } else {
                                setImages(images.filter((x) => x.id !== img.id));
                              }
                            }}
                            className="p-1 text-red-500 hover:bg-red-50 hover:text-red-700 rounded transition"
                            title="Xóa ảnh này"
                          >
                            <HiOutlineTrash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* New Selected Real Images */}
                  {newImageFiles.map((item, idx) => (
                    <div
                      key={item.id}
                      className="relative border-2 border-dashed border-emerald-400 rounded-lg p-1.5 bg-emerald-50/20 flex flex-col justify-between"
                    >
                      <div className="relative w-full h-24 bg-white/60 rounded flex items-center justify-center overflow-hidden">
                        <img
                          src={item.url}
                          alt="new upload"
                          className="max-h-full max-w-full object-contain rounded"
                        />
                        <span className="absolute top-1 left-1 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                          Mới
                        </span>
                      </div>
                      <div className="mt-2 pt-1.5 border-t border-emerald-100 flex items-center justify-between text-[11px]">
                        <span className="text-[10px] text-emerald-700 truncate max-w-[80px]" title={item.name}>
                          Chưa lưu
                        </span>
                        <button
                          type="button"
                          onClick={() => setNewImageFiles(newImageFiles.filter((_, i) => i !== idx))}
                          className="p-1 text-red-500 hover:bg-red-50 hover:text-red-700 rounded transition"
                          title="Hủy ảnh này"
                        >
                          <HiOutlineTrash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Phiên bản và màu (Bảng tổ hợp Dung lượng x Màu x SKU) matching wireframe Image 5 */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-2xs space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-800 text-xs uppercase">
                  Phiên bản và màu sắc (Variant Matrix)
                </h3>
                <span className="text-[10px] text-gray-400">
                  Bảng tổ hợp (RAM/SSD × Màu) · Giá bán · Giá nhập · Tồn kho · SKU riêng cho từng biến thể
                </span>
              </div>
              <button
                type="button"
                onClick={addVariantRow}
                className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold rounded transition text-[11px]"
              >
                + Thêm biến thể
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                    <th className="p-2">Cấu hình (RAM/SSD)</th>
                    <th className="p-2">Màu sắc</th>
                    <th className="p-2">Giá bán (VND)</th>
                    {can('cost:read') && <th className="p-2">Giá nhập</th>}
                    <th className="p-2 text-center">Tồn</th>
                    <th className="p-2 text-center w-8">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {variants.map((v, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="p-2">
                        <div className="flex space-x-1">
                          <input
                            type="text"
                            value={v.ram}
                            onChange={(e) => {
                              const updated = [...variants];
                              updated[idx].ram = e.target.value;
                              setVariants(updated);
                            }}
                            className="w-16 px-1.5 py-1 border border-gray-300 rounded text-[11px]"
                          />
                          <input
                            type="text"
                            value={v.storage}
                            onChange={(e) => {
                              const updated = [...variants];
                              updated[idx].storage = e.target.value;
                              setVariants(updated);
                            }}
                            className="w-16 px-1.5 py-1 border border-gray-300 rounded text-[11px]"
                          />
                        </div>
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={v.color}
                          onChange={(e) => {
                            const updated = [...variants];
                            updated[idx].color = e.target.value;
                            setVariants(updated);
                          }}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-[11px]"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={v.price}
                          onChange={(e) => {
                            const updated = [...variants];
                            updated[idx].price = Number(e.target.value);
                            setVariants(updated);
                          }}
                          className="w-24 px-2 py-1 border border-gray-300 rounded font-semibold text-blue-600 text-[11px]"
                        />
                      </td>
                      {can('cost:read') && (
                        <td className="p-2">
                          <input
                            type="number"
                            value={v.cost}
                            onChange={(e) => {
                              const updated = [...variants];
                              updated[idx].cost = Number(e.target.value);
                              setVariants(updated);
                            }}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-gray-500 text-[11px]"
                          />
                        </td>
                      )}
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          value={v.stock}
                          onChange={(e) => {
                            const updated = [...variants];
                            updated[idx].stock = Number(e.target.value);
                            setVariants(updated);
                          }}
                          className="w-14 px-1.5 py-1 border border-gray-300 rounded text-center font-bold text-[11px]"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeVariantRow(idx)}
                          className="text-red-500 hover:text-red-700"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Card 4: Mô tả chi tiết (Trình soạn thảo) matching wireframe Image 5 */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-2xs space-y-2">
            <h3 className="font-bold text-gray-800 text-xs uppercase pb-2 border-b border-gray-100 flex justify-between items-center">
              <span>Mô tả chi tiết (Trình soạn thảo)</span>
              <span className="text-gray-400 font-normal text-[10px]">Hỗ trợ HTML / Markdown</span>
            </h3>

            {/* Fake Editor Toolbar */}
            <div className="flex space-x-1 p-1.5 bg-gray-100 rounded border border-gray-200 text-gray-600 font-bold">
              <span className="px-2 py-0.5 bg-white rounded shadow-2xs cursor-pointer">B</span>
              <span className="px-2 py-0.5 bg-white rounded shadow-2xs cursor-pointer italic">I</span>
              <span className="px-2 py-0.5 bg-white rounded shadow-2xs cursor-pointer underline">U</span>
              <span className="px-2 py-0.5 bg-white rounded shadow-2xs cursor-pointer">H1</span>
              <span className="px-2 py-0.5 bg-white rounded shadow-2xs cursor-pointer">H2</span>
              <span className="px-2 py-0.5 bg-white rounded shadow-2xs cursor-pointer">🔗 Link</span>
              <span className="px-2 py-0.5 bg-white rounded shadow-2xs cursor-pointer">🖼 Ảnh</span>
            </div>

            <textarea
              rows={6}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Nhập nội dung bài đánh giá chi tiết sản phẩm, ưu điểm nổi bật, thiết kế, thời lượng pin..."
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600 font-sans"
            />
          </div>

          {/* Card 5: Thông số kỹ thuật động (EAV Specs builder: nhóm · tên · giá trị · [+ dòng]) */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-2xs space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-800 text-xs uppercase">
                  Thông số kỹ thuật động (EAV Specification)
                </h3>
                <span className="text-[10px] text-gray-400">
                  Nhóm thuộc tính · Tên thông số · Giá trị cụ thể · Không fix cứng cấu trúc CSDL
                </span>
              </div>
              <button
                type="button"
                onClick={addSpecRow}
                className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold rounded transition text-[11px]"
              >
                + Thêm dòng
              </button>
            </div>

            <div className="space-y-2">
              {specGroups.map((s, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-3">
                    <input
                      type="text"
                      value={s.group}
                      onChange={(e) => {
                        const updated = [...specGroups];
                        updated[idx].group = e.target.value;
                        setSpecGroups(updated);
                      }}
                      placeholder="Nhóm (CPU, RAM...)"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded bg-gray-50 font-medium text-[11px]"
                    />
                  </div>
                  <div className="col-span-4">
                    <input
                      type="text"
                      value={s.name}
                      onChange={(e) => {
                        const updated = [...specGroups];
                        updated[idx].name = e.target.value;
                        setSpecGroups(updated);
                      }}
                      placeholder="Tên thông số"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-[11px]"
                    />
                  </div>
                  <div className="col-span-4">
                    <input
                      type="text"
                      value={s.value}
                      onChange={(e) => {
                        const updated = [...specGroups];
                        updated[idx].value = e.target.value;
                        setSpecGroups(updated);
                      }}
                      placeholder="Giá trị"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-[11px]"
                    />
                  </div>
                  <div className="col-span-1 text-center">
                    <button
                      type="button"
                      onClick={() => removeSpecRow(idx)}
                      className="text-red-400 hover:text-red-600 font-bold"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ================= RIGHT SIDEBAR COLUMN (~32%) ================= */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Card 1: Xuất bản matching wireframe Image 5 */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-2xs space-y-3">
            <h4 className="font-bold text-gray-800 text-xs uppercase pb-2 border-b border-gray-100">
              Xuất bản
            </h4>
            <div className="space-y-2">
              <div>
                <label className="block text-gray-600 font-medium mb-1">Trạng thái</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md bg-white font-semibold"
                >
                  <option value="active">Đang bán (Hiển thị ngay)</option>
                  <option value="draft">Bản nháp (Chưa bán)</option>
                  <option value="hidden">Đang ẩn</option>
                  <option value="discontinued">Ngừng kinh doanh</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-600 font-medium mb-1">Hẹn giờ đăng</label>
                <input
                  type="datetime-local"
                  value={formData.publish_schedule}
                  onChange={(e) => setFormData({ ...formData, publish_schedule: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md bg-white text-[11px]"
                />
              </div>

              <div className="pt-2 border-t border-gray-100 space-y-1.5">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_featured}
                    onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  <span>Ghim sản phẩm nổi bật (Featured)</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_new}
                    onChange={(e) => setFormData({ ...formData, is_new: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  <span>Gắn nhãn Hàng Mới Về (New)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Card 2: Giá & Khuyến mãi */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-2xs space-y-3">
            <h4 className="font-bold text-gray-800 text-xs uppercase pb-2 border-b border-gray-100">
              Giá niêm yết & Khuyến mãi
            </h4>
            <div className="space-y-2">
              <div>
                <label className="block text-gray-600 font-medium mb-1">Giá bán lẻ (VND) *</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="28990000"
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md font-bold text-gray-900"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-600 font-medium mb-1">Giá khuyến mãi (Nếu có)</label>
                <input
                  type="number"
                  value={formData.sale_price}
                  onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                  placeholder="26990000"
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md font-bold text-rose-600"
                />
              </div>

              {can('cost:read') && (
                <div>
                  <label className="block text-gray-600 font-medium mb-1">Giá nhập (Chỉ kế toán/admin thấy)</label>
                  <input
                    type="number"
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                    placeholder="23500000"
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-gray-500 bg-gray-50"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Thu cũ & Trả góp matching wireframe Image 5 */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-2xs space-y-2.5">
            <h4 className="font-bold text-gray-800 text-xs uppercase pb-2 border-b border-gray-100">
              Thu cũ và trả góp
            </h4>
            <div className="space-y-2">
              <label className="flex items-center justify-between cursor-pointer">
                <span>Áp dụng Thu cũ đổi mới</span>
                <input
                  type="checkbox"
                  checked={formData.trade_in_enabled}
                  onChange={(e) => setFormData({ ...formData, trade_in_enabled: e.target.checked })}
                  className="rounded text-blue-600"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span>Hỗ trợ Trả góp 0% lãi suất</span>
                <input
                  type="checkbox"
                  checked={formData.installment_0}
                  onChange={(e) => setFormData({ ...formData, installment_0: e.target.checked })}
                  className="rounded text-blue-600"
                />
              </label>
            </div>
          </div>

          {/* Card 4: Cam kết bán hàng & Bảo hành */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-2xs space-y-2">
            <h4 className="font-bold text-gray-800 text-xs uppercase pb-2 border-b border-gray-100">
              Cam kết & Bảo hành
            </h4>
            <div className="space-y-1 text-gray-600">
              <p className="flex items-center">✓ Hàng chính hãng 100% nguyên seal</p>
              <p className="flex items-center">✓ 1 đổi 1 trong 30 ngày nếu lỗi phần cứng</p>
              <p className="flex items-center">✓ Bảo hành 12 - 24 tháng chính hãng</p>
              <p className="flex items-center">✓ Giao hỏa tốc 2 giờ nội thành</p>
            </div>
          </div>

          {/* Card 5: Cấu hình SEO */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-2xs space-y-2.5">
            <h4 className="font-bold text-gray-800 text-xs uppercase pb-2 border-b border-gray-100">
              Cấu hình SEO & Slug
            </h4>
            <div className="space-y-2">
              <div>
                <label className="block text-gray-600 mb-1">Đường dẫn thân thiện (Slug)</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-gray-600 mb-1">SEO Tiêu đề</label>
                <input
                  type="text"
                  value={formData.meta_title}
                  onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>

          {/* Card 6: Sản phẩm tương tự & Phụ kiện kèm */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-2xs space-y-2">
            <h4 className="font-bold text-gray-800 text-xs uppercase pb-2 border-b border-gray-100">
              SP tương tự / Phụ kiện kèm
            </h4>
            <p className="text-[11px] text-gray-500">
              Tự động gợi ý Balo laptop, Chuột không dây, Lót chuột và Hub chuyển đổi Type-C
            </p>
          </div>
        </div>
      </div>

      {/* ================= FIXED BOTTOM ACTION BAR matching wireframe Image 5 ================= */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 p-3 lg:pl-64 flex justify-end items-center space-x-3 shadow-lg">
        <button
          type="button"
          onClick={() => navigate('/products')}
          className="px-5 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 font-medium text-gray-700"
        >
          Hủy
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={() => handleSubmit('draft')}
          className="px-5 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 font-semibold text-gray-700"
        >
          Lưu nháp
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={() => handleSubmit('active')}
          className="px-8 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md shadow-md transition"
        >
          {saving ? 'ĐANG LƯU...' : 'LƯU & ĐĂNG'}
        </button>
      </div>
    </div>
  );
}
