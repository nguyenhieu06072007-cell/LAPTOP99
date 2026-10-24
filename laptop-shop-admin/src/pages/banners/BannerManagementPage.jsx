import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import {
  HiOutlineSparkles,
  HiOutlineBolt,
  HiOutlineBuildingStorefront,
  HiOutlineFire,
  HiOutlineComputerDesktop,
  HiOutlinePlusCircle,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineArrowPath,
  HiOutlineCheckCircle,
  HiOutlineArrowUpTray,
  HiOutlinePhoto,
  HiOutlineTag,
  HiOutlineClock,
  HiOutlineCheck,
  HiOutlineXMark,
  HiOutlineArrowTopRightOnSquare,
  HiOutlineFunnel,
  HiOutlineMagnifyingGlass,
  HiOutlineShoppingBag,
  HiOutlineShoppingCart,
} from 'react-icons/hi2';

const POSITIONS = [
  { id: 'all', label: 'Tất cả vị trí', icon: HiOutlineSparkles, color: 'gray' },
  { id: 'entry_popup', label: '🎯 Banner Popup Đầu Trang', icon: HiOutlineSparkles, color: 'purple' },
  { id: 'hero', label: 'Hero Slider Trang Chủ', icon: HiOutlineComputerDesktop, color: 'blue' },
  { id: 'flash_sale', label: 'Dải Flash Sale Giờ Vàng', icon: HiOutlineBolt, color: 'rose' },
  { id: 'brand_showcase', label: 'Chuyên Trang Thương Hiệu', icon: HiOutlineBuildingStorefront, color: 'indigo' },
  { id: 'hot_deal', label: 'Deal Tâm Điểm Giảm Sâu', icon: HiOutlineFire, color: 'amber' },
];

const BRANDS = ['Apple', 'ASUS', 'Lenovo', 'Dell', 'MSI', 'HP', 'Acer'];

const BG_THEMES = {
  dark: { label: 'Đen Huyền Bí (Apple / Stealth)', css: 'linear-gradient(135deg, #0F172A 0%, #1E293B 55%, #334155 100%)' },
  crimson: { label: 'Đỏ Gaming / Flash Sale', css: 'linear-gradient(135deg, #18090C 0%, #2A0F17 50%, #BE123C 100%)' },
  indigo: { label: 'Xanh Tím Cyber (ASUS / Acer)', css: 'linear-gradient(135deg, #171A21 0%, #25161C 50%, #BE123C 100%)' },
  blue: { label: 'Xanh Công Nghệ (Lenovo / HP)', css: 'linear-gradient(135deg, #0C4A6E 0%, #0284C7 55%, #1E3A8A 100%)' },
  emerald: { label: 'Xanh Ngọc Doanh Nhân (Dell)', css: 'linear-gradient(135deg, #064E3B 0%, #059669 55%, #0F172A 100%)' },
  purple: { label: 'Tím Neon Hoàng Gia', css: 'linear-gradient(135deg, #2E1065 0%, #7C3AED 55%, #0F172A 100%)' },
  amber: { label: 'Vàng Gold Cao Cấp', css: 'linear-gradient(135deg, #451A03 0%, #B45309 55%, #1C1917 100%)' },
};

const BADGE_STYLES = {
  red: { label: 'Đỏ Nổi Bật (Deal Sốc)', cls: 'bg-red-600 text-white' },
  blue: { label: 'Xanh Chính Hãng', cls: 'bg-blue-600 text-white' },
  emerald: { label: 'Xanh Lá Uy Tín', cls: 'bg-emerald-600 text-white' },
  amber: { label: 'Vàng Cam Giờ Vàng', cls: 'bg-amber-500 text-white' },
  purple: { label: 'Tím Đặc Quyền', cls: 'bg-purple-600 text-white' },
};

const EMPTY_FORM = {
  position: 'hero',
  brand: 'Apple',
  title: 'Chiến dịch Laptop chính hãng',
  highlight_text: 'Ưu đãi cực đỉnh',
  subtitle: 'Thiết kế mỏng nhẹ, hiệu năng mạnh mẽ, chính hãng bảo hành uy tín.',
  badge_text: '🚀 CHIẾN DỊCH NỔI BẬT • GIÁ TỐT NHẤT',
  badge_style: 'red',
  bg_theme: 'crimson',
  cta_text: 'Khám phá ngay',
  cta_link: '#/products',
  secondary_cta_text: 'Săn Voucher',
  secondary_cta_link: '#/promos',
  tab_title: 'Chiến dịch mới',
  tab_sub: 'Ưu đãi hấp dẫn',
  image_url: '',
  product_id: '',
  custom_price: 0,
  custom_old_price: 0,
  specs_json: '',
  perks_json: '["Giảm thêm 500K - 1 Triệu cho HSSV","Thu cũ đổi mới trợ giá 2.5 Triệu","Bảo hành chính hãng 12-24 tháng"]',
  countdown_end: '',
  sort_order: 1,
  is_active: 1,
  autoplay_ms: 3500,
  image_mode: 'background',
  content_position: 'left',
  image_position: 'center center',
  overlay_style: 'gradient_dark',
};

const formatVND = (v) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v || 0);

export default function BannerManagementPage() {
  const [banners, setBanners] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newPerkInput, setNewPerkInput] = useState('');
  const fileInputRef = useRef(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bRes, pRes] = await Promise.all([
        api.get('/banners'),
        fetch('https://laptop99-ejug.onrender.com/api/client/products?limit=100').then((r) => r.json()),
      ]);
      const list = bRes.data?.data || [];
      setBanners(list);
      setProducts(pRes?.data || []);
      if (list.length > 0) {
        if (!editingId || editingId === 'NEW' || !list.some((b) => b.id === editingId)) {
          selectBanner(list[0]);
        }
      } else {
        handleCreateNew('hero');
      }
    } catch (err) {
      toast.error(err.message || 'Không thể tải danh sách banner');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectBanner = (b) => {
    if (!b) return;
    setEditingId(b.id);
    setForm({
      position: b.position || 'hero',
      brand: b.brand || 'Apple',
      title: b.title || '',
      highlight_text: b.highlight_text || '',
      subtitle: b.subtitle || '',
      badge_text: b.badge_text || '',
      badge_style: b.badge_style || 'red',
      bg_theme: b.bg_theme || 'crimson',
      cta_text: b.cta_text || 'Khám phá ngay',
      cta_link: b.cta_link || '#/products',
      secondary_cta_text: b.secondary_cta_text || '',
      secondary_cta_link: b.secondary_cta_link || '',
      tab_title: b.tab_title || '',
      tab_sub: b.tab_sub || '',
      image_url: b.image_url || b.product_thumb || '',
      product_id: b.product_id || '',
      custom_price: b.custom_price || b.product_sale_price || b.product_base_price || 0,
      custom_old_price: b.custom_old_price || b.product_base_price || 0,
      specs_json: b.specs_json || '',
      perks_json: typeof b.perks_json === 'string' ? b.perks_json : JSON.stringify(b.perks_json || []),
      countdown_end: b.countdown_end ? b.countdown_end.slice(0, 16) : '',
      sort_order: b.sort_order || 1,
      is_active: b.is_active ? 1 : 0,
      autoplay_ms: b.autoplay_ms || 3500,
      image_mode: b.image_mode || 'background',
      content_position: b.content_position || 'left',
      image_position: b.image_position || 'center center',
      overlay_style: b.overlay_style || 'gradient_dark',
    });
  };

  const handleCreateNew = (forcedPosition) => {
    setEditingId('NEW');
    const pos = forcedPosition && forcedPosition !== 'all' ? forcedPosition : activeTab !== 'all' ? activeTab : 'hero';
    let defaultTitle = 'Chiến dịch Laptop chính hãng';
    let defaultBadge = '🚀 CHIẾN DỊCH NỔI BẬT';
    let defaultTheme = 'crimson';

    if (pos === 'entry_popup') {
      setForm({
        ...EMPTY_FORM,
        position: 'entry_popup',
        brand: 'Lenovo',
        title: 'LOQ 2026',
        highlight_text: 'GIẢM TỚI 6 TRIỆU/MÁY',
        badge_text: 'DEAL CỰC SỐC',
        subtitle: 'SỐ LƯỢNG CÓ HẠN',
        specs_json: 'Chip Core 5 / 7 ĐỜI MỚI, Giá từ 25 TRIỆU, 100% sRGB 165Hz',
        custom_price: 24990000,
        custom_old_price: 30990000,
        bg_theme: 'purple',
        cta_text: 'SĂN DEAL NGAY',
        cta_link: '#/product/p60',
        secondary_cta_text: 'Xem kho voucher',
        secondary_cta_link: '#/promos',
        sort_order: (banners?.filter((b) => b.position === 'entry_popup')?.length || 0) + 1,
        is_active: 1,
      });
      return;
    }

    if (pos === 'flash_sale') {
      defaultTitle = 'ĐẠI TIỆC LAPTOP CHÍNH HÃNG';
      defaultBadge = '⚡ FLASH SALE GIỜ VÀNG • ĐỘC QUYỀN HÔM NAY';
      defaultTheme = 'crimson';
    } else if (pos === 'brand_showcase') {
      defaultTitle = 'Tuần Lễ Laptop Chính Hãng — Ưu Đãi Đặc Quyền';
      defaultBadge = 'CHÍNH HÃNG AUTHORIZED RESELLER';
      defaultTheme = 'dark';
    } else if (pos === 'hot_deal') {
      defaultTitle = 'Laptop Gaming / Doanh Nhân Giảm Giá Sâu';
      defaultBadge = '🔥 DEAL TÂM ĐIỂM GIỜ VÀNG • TIẾT KIỆM 2.000.000 đ';
      defaultTheme = 'crimson';
    }

    setForm({
      ...EMPTY_FORM,
      position: pos,
      title: defaultTitle,
      badge_text: defaultBadge,
      bg_theme: defaultTheme,
      sort_order: (banners?.filter((b) => b.position === pos)?.length || 0) + 1,
    });
  };

  const handleProductPick = (pid) => {
    const p = products.find((x) => String(x.id) === String(pid));
    if (!p) {
      setForm((prev) => ({ ...prev, product_id: '' }));
      return;
    }
    const cpu = p.cpu_model || p.cpu || '';
    const ram = p.ram_gb ? `RAM ${p.ram_gb}GB` : '';
    const ssd = p.storage_gb ? `SSD ${p.storage_gb}GB` : '';
    const specs = [cpu, ram, ssd].filter(Boolean).join(',');

    setForm((prev) => ({
      ...prev,
      product_id: p.id,
      title: prev.position === 'hot_deal' ? p.name : prev.title,
      cta_link: `#/product/${p.id}`,
      image_url: p.thumbnail || prev.image_url,
      custom_price: p.sale_price || p.price,
      custom_old_price: p.price,
      specs_json: specs || prev.specs_json,
      tab_title: p.name.split(' ').slice(0, 3).join(' '),
      tab_sub: 'Giá tốt nhất',
    }));
  };

  const handleUploadImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      return toast.error('Vui lòng chọn tệp hình ảnh (.jpg, .png, .webp, .svg)');
    }
    if (file.size > 10 * 1024 * 1024) {
      return toast.error('Tệp quá lớn (tối đa 10MB)');
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await api.post('/banners/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const uploadedUrl = res.data?.data?.url;
      if (uploadedUrl) {
        setForm((prev) => ({ ...prev, image_url: uploadedUrl }));
        toast.success('Đã tải hình ảnh lên thành công!');
      }
    } catch (err) {
      toast.error(err.message || 'Lỗi tải ảnh lên');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getPerksList = () => {
    try {
      const parsed = typeof form.perks_json === 'string' ? JSON.parse(form.perks_json) : form.perks_json;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const handleAddPerk = () => {
    if (!newPerkInput.trim()) return;
    const current = getPerksList();
    const updated = [...current, newPerkInput.trim()];
    setForm({ ...form, perks_json: JSON.stringify(updated) });
    setNewPerkInput('');
  };

  const handleRemovePerk = (idx) => {
    const current = getPerksList();
    const updated = current.filter((_, i) => i !== idx);
    setForm({ ...form, perks_json: JSON.stringify(updated) });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      return toast.error('Vui lòng nhập tiêu đề banner');
    }
    setSaving(true);
    try {
      const isNew = !editingId || editingId === 'NEW' || isNaN(Number(editingId));
      if (isNew) {
        const res = await api.post('/banners', form);
        toast.success('Đã tạo banner mới và cập nhật tức thì ra Storefront!');
        await loadData();
        if (res.data?.data) selectBanner(res.data.data);
      } else {
        const res = await api.put(`/banners/${editingId}`, form);
        toast.success('Đã lưu thiết kế banner và cập nhật tức thì ra Storefront!');
        await loadData();
        if (res.data?.data) selectBanner(res.data.data);
      }
    } catch (err) {
      toast.error(err.message || 'Lỗi khi lưu banner');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (b) => {
    try {
      await api.patch(`/banners/${b.id}/status`, { is_active: !b.is_active });
      toast.success(!b.is_active ? 'Đã bật hiển thị banner' : 'Đã tạm ẩn banner');
      setBanners((prev) => prev.map((x) => (x.id === b.id ? { ...x, is_active: !x.is_active } : x)));
      if (editingId === b.id) {
        setForm((prev) => ({ ...prev, is_active: !b.is_active ? 1 : 0 }));
      }
    } catch (err) {
      toast.error(err.message || 'Lỗi thay đổi trạng thái');
    }
  };

  const handleDelete = async (b) => {
    if (!window.confirm(`Bạn có chắc muốn xóa banner "${b.title}"?`)) return;
    try {
      await api.delete(`/banners/${b.id}`);
      toast.success('Đã xóa banner');
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Lỗi khi xóa banner');
    }
  };

  const filteredBanners = banners.filter((b) => {
    const matchTab = activeTab === 'all' || (b.position || 'hero') === activeTab;
    const matchSearch =
      !search ||
      b.title?.toLowerCase().includes(search.toLowerCase()) ||
      b.brand?.toLowerCase().includes(search.toLowerCase()) ||
      b.badge_text?.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-gray-950 via-slate-900 to-rose-950 border border-gray-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-rose-600/20 to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-600/30 text-rose-300 border border-rose-500/40 flex items-center gap-1.5">
                <HiOutlineSparkles className="w-4 h-4 text-rose-400 animate-pulse" />
                CMS Quảng Cáo Đa Kênh Flagship
              </span>
              <span className="text-xs text-gray-400">Đồng bộ tự động 100% với Khách hàng</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              Thiết Kế &amp; Quản Lý Banner Quảng Cáo Chuyên Nghiệp
            </h1>
            <p className="text-sm text-gray-300 mt-1 max-w-3xl">
              Tùy biến đầy đủ 4 khu vực chiến dịch trên Storefront: <strong>Hero Carousel</strong>,{' '}
              <strong>Dải Flash Sale Giờ Vàng</strong>, <strong>Chuyên Trang Thương Hiệu (7 Hãng)</strong>, và{' '}
              <strong>Deal Tâm Điểm Giảm Sâu</strong>.
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <a
              href="https://laptop99.vercel.app"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md transition"
            >
              <HiOutlineArrowTopRightOnSquare className="w-4 h-4 text-rose-400" />
              Xem Storefront Live
            </a>
            <button
              onClick={() => handleCreateNew()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-lg shadow-rose-600/30 transition transform active:scale-98"
            >
              <HiOutlinePlusCircle className="w-5 h-5" />
              Tạo Banner Mới
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Filter Tabs by Position */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {POSITIONS.map((pos) => {
          const Icon = pos.icon;
          const count =
            pos.id === 'all'
              ? banners.length
              : banners.filter((b) => (b.position || 'hero') === pos.id).length;
          const isActive = activeTab === pos.id;
          return (
            <button
              key={pos.id}
              onClick={() => {
                setActiveTab(pos.id);
                if (pos.id !== 'all' && editingId === 'NEW') {
                  setForm((prev) => ({ ...prev, position: pos.id }));
                }
              }}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all border ${
                isActive
                  ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-500'}`} />
              <span>{pos.label}</span>
              <span
                className={`ml-1 px-2 py-0.5 rounded-full text-xs font-black ${
                  isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main 2-Column Work Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: BANNER LIST (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <HiOutlineMagnifyingGlass className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm banner theo tiêu đề, hãng..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/30"
              />
            </div>
            <button
              onClick={loadData}
              title="Tải lại danh sách"
              className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600"
            >
              <HiOutlineArrowPath className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="space-y-2.5 max-h-[820px] overflow-y-auto pr-1">
            {filteredBanners.length === 0 ? (
              <div className="text-center py-12 text-gray-400 space-y-2">
                <HiOutlinePhoto className="w-12 h-12 mx-auto text-gray-300" />
                <p className="text-sm font-semibold">Không tìm thấy banner nào phù hợp</p>
                <button
                  onClick={() => handleCreateNew(activeTab)}
                  className="text-xs text-rose-600 font-bold hover:underline"
                >
                  + Tạo banner mới cho mục này
                </button>
              </div>
            ) : (
              filteredBanners.map((b) => {
                const isSelected = editingId === b.id;
                const posObj = POSITIONS.find((p) => p.id === (b.position || 'hero')) || POSITIONS[1];
                return (
                  <div
                    key={b.id}
                    onClick={() => selectBanner(b)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer relative group ${
                      isSelected
                        ? 'border-rose-500 bg-rose-50/50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50/70'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-20 h-14 rounded-lg bg-gray-900 border border-gray-200 overflow-hidden shrink-0 relative">
                        {b.image_url ? (
                          <img
                            src={b.image_url.startsWith('http') ? b.image_url : `https://laptop99.vercel.app${b.image_url}`}
                            alt={b.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                            No Img
                          </div>
                        )}
                        {!b.is_active && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <span className="text-[10px] text-white font-black bg-gray-800/90 px-1.5 py-0.5 rounded">
                              ẨN
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                              b.position === 'flash_sale'
                                ? 'bg-red-100 text-red-700'
                                : b.position === 'brand_showcase'
                                ? 'bg-indigo-100 text-indigo-700'
                                : b.position === 'hot_deal'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {posObj.label.split(' ')[0]} {b.brand ? `• ${b.brand}` : ''}
                          </span>
                          {b.custom_price > 0 && (
                            <span className="text-[11px] font-bold text-rose-600">
                              {formatVND(b.custom_price)}
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-black text-gray-900 truncate">{b.title}</h4>
                        <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">
                          {b.subtitle || b.highlight_text || 'Chưa có mô tả'}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleToggle(b)}
                          title={b.is_active ? 'Bấm để ẩn banner' : 'Bấm để kích hoạt'}
                          className={`w-7 h-4 flex items-center rounded-full p-0.5 transition ${
                            b.is_active ? 'bg-emerald-500 justify-end' : 'bg-gray-300 justify-start'
                          }`}
                        >
                          <div className="w-3 h-3 rounded-full bg-white shadow-xs" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(b)}
                          title="Xóa banner này"
                          className="text-gray-400 hover:text-red-600 p-1 rounded"
                        >
                          <HiOutlineTrash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE REAL-WORLD PREVIEW + EDITOR FORM (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* LIVE REAL-WORLD STOREFRONT PREVIEW CONTAINER */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <h3 className="font-bold text-gray-900 text-sm">
                  Xem Trước Trực Quan Thực Tế (Live Storefront Preview)
                </h3>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
                Vị trí:{' '}
                {form.position === 'entry_popup'
                  ? '🎯 Banner Popup Đầu Trang (Laptop88 Cyber Style)'
                  : form.position === 'flash_sale'
                  ? '⚡ Dải Flash Sale Giờ Vàng'
                  : form.position === 'brand_showcase'
                  ? `🏢 Chuyên Trang ${form.brand || 'Apple'}`
                  : form.position === 'hot_deal'
                  ? '🔥 Deal Tâm Điểm Giảm Sâu'
                  : '🖥️ Hero Slider Trang Chủ'}
              </span>
            </div>

            {/* PREVIEW VARIANT: ENTRY POPUP BANNER (LAPTOP88 CYBER GAMING STYLE) */}
            {form.position === 'entry_popup' && (
              <div className="relative rounded-3xl p-6 text-white shadow-2xl overflow-hidden border-2 border-purple-500/70 bg-gradient-to-b from-[#180C2E] via-[#0E061D] to-[#06020D] flex flex-col items-center text-center">
                {/* Floating 3D Stickers */}
                <span className="absolute top-4 left-4 text-2xl select-none animate-bounce" style={{ animationDuration: '3s' }}>🕹️</span>
                <span className="absolute top-8 right-5 text-2xl select-none animate-pulse">👾</span>
                <span className="absolute bottom-12 left-5 text-2xl select-none">🎮</span>
                <span className="absolute bottom-6 right-5 text-xl select-none">✨</span>

                {/* Close button mock */}
                <div className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-white/20 border border-white/40 flex items-center justify-center text-white font-bold text-xs shadow-md">
                  ✕
                </div>

                {/* Top Header Row with Chevrons */}
                <div className="flex items-center gap-2 mb-1 z-10">
                  <span className="text-purple-400 font-black text-xs tracking-widest">«««</span>
                  <span className="text-[11px] font-black uppercase tracking-widest text-purple-200 bg-purple-900/60 border border-purple-400/40 px-3.5 py-0.5 rounded-full shadow-inner">
                    {form.badge_text || 'DEAL CỰC SỐC'}
                  </span>
                  <span className="text-purple-400 font-black text-xs tracking-widest">»»»</span>
                </div>

                {/* Big Headline */}
                <h3 className="text-3xl font-black text-white tracking-wider drop-shadow-[0_4px_16px_rgba(168,85,247,0.7)] uppercase z-10 my-0.5">
                  {form.title || 'LOQ 2026'}
                </h3>

                {/* Highlight Ribbon */}
                <div className="z-10 my-1">
                  <span className="inline-block px-5 py-1 rounded-full text-xs font-black uppercase tracking-wide bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 text-white shadow-lg shadow-purple-600/50 border border-pink-400/40">
                    {form.highlight_text || 'GIẢM TỚI 6 TRIỆU/MÁY'}
                  </span>
                </div>

                {/* Laptop Image with Radial Aura Glow */}
                <div className="relative w-full h-44 my-2 flex items-center justify-center z-10">
                  <div className="absolute inset-0 m-auto w-40 h-40 bg-purple-600/30 rounded-full blur-2xl pointer-events-none" />
                  <img
                    src={form.image_url ? (form.image_url.startsWith('http') ? form.image_url : `https://laptop99.vercel.app${form.image_url}`) : 'https://laptop99.vercel.app/uploads/products/laptop-gaming-lenovo-loq-15irx9-i5-13450hx-16gb-512gb-rtx-4050-1.jpg'}
                    alt="Entry Popup Product"
                    className="max-h-full max-w-[85%] object-contain drop-shadow-[0_12px_28px_rgba(0,0,0,0.85)]"
                  />
                </div>

                {/* 3 Bottom Feature Pills */}
                <div className="grid grid-cols-3 gap-2 w-full max-w-md z-10 my-1">
                  {(() => {
                    const specs = form.specs_json ? form.specs_json.split(',').map(s => s.trim()).filter(Boolean) : ['Chip Core 5/7 ĐỜI MỚI', 'Giá từ 25 TRIỆU', '100% sRGB 165Hz'];
                    return (
                      <>
                        <div className="bg-white/95 rounded-xl py-1.5 px-2 text-center shadow-md">
                          <span className="block text-[10px] font-black text-purple-900 leading-tight">
                            {specs[0] || 'Chip Core 5/7'}
                          </span>
                        </div>
                        <div className="bg-white rounded-xl py-1.5 px-2 text-center shadow-md ring-2 ring-purple-400 scale-105">
                          <span className="block text-[11px] font-black text-purple-700 leading-tight">
                            {specs[1] || (form.custom_price ? `Giá từ ${formatVND(form.custom_price)}` : 'Giá từ 25 TRIỆU')}
                          </span>
                        </div>
                        <div className="bg-white/95 rounded-xl py-1.5 px-2 text-center shadow-md">
                          <span className="block text-[10px] font-black text-purple-900 leading-tight">
                            {specs[2] || '100% sRGB 165Hz'}
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Bottom Emergency Ribbon */}
                <div className="z-10 mt-2">
                  <span className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-purple-700 to-indigo-700 text-purple-100 border border-purple-400/50 shadow-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    {form.subtitle || 'SỐ LƯỢNG CÓ HẠN'}
                  </span>
                </div>
              </div>
            )}

            {/* PREVIEW VARIANT A: FLASH SALE BANNER STRIP */}
            {form.position === 'flash_sale' && (
              <div className="rounded-2xl bg-gradient-to-r from-gray-950 via-slate-900 to-rose-950 border border-gray-800 border-t-2 border-t-rose-500 p-4 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="space-y-2 flex-1 z-10">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-md shadow-rose-600/40">
                    <HiOutlineBolt className="w-3.5 h-3.5" />
                    {form.badge_text || '⚡ FLASH SALE GIỜ VÀNG • ĐỘC QUYỀN HÔM NAY'}
                  </span>
                  <h4 className="text-base font-black uppercase tracking-tight text-white leading-tight">
                    {form.title}{' '}
                    <span className="text-rose-400 drop-shadow-[0_0_10px_rgba(244,63,94,0.6)]">
                      {form.highlight_text ? `— ${form.highlight_text}` : ''}
                    </span>
                  </h4>
                  <div className="text-xs text-gray-300 font-medium flex items-center gap-2 flex-wrap">
                    {getPerksList().length > 0 ? (
                      getPerksList().map((pk, i) => (
                        <span key={i} className="inline-flex items-center gap-1">
                          {i > 0 && <span>•</span>}
                          {pk}
                        </span>
                      ))
                    ) : (
                      <span>{form.subtitle || 'Đặc quyền S-Student • Thu cũ trợ giá 3 Triệu'}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 z-10">
                  {form.image_url && (
                    <div className="w-20 h-16 rounded-xl bg-black/40 border border-white/10 p-1 shrink-0 relative flex items-center justify-center">
                      <img
                        src={form.image_url.startsWith('http') ? form.image_url : `https://laptop99.vercel.app${form.image_url}`}
                        alt="Flash Sale Preview"
                        className="max-h-full max-w-full object-contain drop-shadow-[0_4px_12px_rgba(244,63,94,0.5)]"
                      />
                    </div>
                  )}

                  <div className="flex flex-col items-center">
                    <span className="text-[10px] uppercase font-bold text-gray-400 mb-1">Kết thúc sau:</span>
                    <div className="flex items-center gap-1">
                      <div className="bg-gray-900 border border-gray-700 rounded-lg px-2 py-1 text-center min-w-[32px]">
                        <span className="text-sm font-black text-white">04</span>
                        <span className="block text-[8px] text-gray-400 uppercase">Giờ</span>
                      </div>
                      <span className="font-bold text-gray-500">:</span>
                      <div className="bg-gray-900 border border-gray-700 rounded-lg px-2 py-1 text-center min-w-[32px]">
                        <span className="text-sm font-black text-white">38</span>
                        <span className="block text-[8px] text-gray-400 uppercase">Phút</span>
                      </div>
                      <span className="font-bold text-gray-500">:</span>
                      <div className="bg-gray-900 border border-gray-700 rounded-lg px-2 py-1 text-center min-w-[32px]">
                        <span className="text-sm font-black text-rose-400">25</span>
                        <span className="block text-[8px] text-gray-400 uppercase">Giây</span>
                      </div>
                    </div>
                  </div>

                  <button className="px-4 py-2.5 rounded-full text-xs font-black uppercase tracking-wider bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-lg shadow-rose-600/30 whitespace-nowrap">
                    {form.cta_text || 'SĂN VOUCHER NGAY'} →
                  </button>
                </div>
              </div>
            )}

            {/* PREVIEW VARIANT B: BRAND SHOWCASE BANNER */}
            {form.position === 'brand_showcase' && (
              <div
                className="rounded-2xl p-5 text-white shadow-xl relative overflow-hidden border border-white/10"
                style={{ background: BG_THEMES[form.bg_theme]?.css || BG_THEMES.dark.css }}
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                  <div className="md:col-span-7 space-y-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-white/15 text-white border border-white/20 backdrop-blur-md">
                      {form.badge_text || `CHÍNH HÃNG ${form.brand.toUpperCase()} • AUTHORIZED`}
                    </span>
                    <h3 className="text-lg font-black tracking-tight leading-snug">{form.title}</h3>
                    <p className="text-xs text-gray-300 leading-relaxed">{form.subtitle}</p>

                    <div className="space-y-1 py-1">
                      {getPerksList().map((pk, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-gray-200">
                          <HiOutlineCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>{pk}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <button className="px-4 py-2 rounded-xl text-xs font-black bg-white text-rose-700 shadow-lg">
                        {form.cta_text || `Xem toàn bộ Laptop ${form.brand}`} →
                      </button>
                      {form.secondary_cta_text && (
                        <button className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/15 hover:bg-white/25 text-white border border-white/20 backdrop-blur-md">
                          <HiOutlineTag className="w-3.5 h-3.5 inline mr-1" />
                          {form.secondary_cta_text}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-5 bg-black/40 border border-white/15 rounded-xl p-3.5 backdrop-blur-md flex flex-col items-center text-center space-y-2">
                    <div className="w-full h-28 bg-white/5 rounded-lg p-2 flex items-center justify-center">
                      <img
                        src={form.image_url.startsWith('http') ? form.image_url : `https://laptop99.vercel.app${form.image_url}`}
                        alt={form.title}
                        className="max-h-full max-w-full object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]"
                      />
                    </div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-600/30 text-rose-300 border border-rose-500/30">
                      Tâm điểm {form.brand}
                    </span>
                    <div className="text-xs font-bold text-white line-clamp-1">{form.title}</div>
                    <div className="text-base font-black text-rose-400">
                      {formatVND(form.custom_price || 22990000)}
                    </div>
                    <span className="text-[10px] text-gray-300 font-semibold hover:underline">
                      Khám phá cấu hình chi tiết →
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* PREVIEW VARIANT C: HOT DEAL SPOTLIGHT CARD */}
            {form.position === 'hot_deal' && (
              <div className="rounded-2xl bg-gradient-to-br from-gray-950 via-slate-900 to-rose-950 border border-rose-500/40 p-4 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center gap-4">
                <div className="w-40 h-28 rounded-xl bg-black/50 border border-white/10 p-2 shrink-0 flex items-center justify-center relative">
                  <img
                    src={form.image_url.startsWith('http') ? form.image_url : `https://laptop99.vercel.app${form.image_url}`}
                    alt="Hot Deal Preview"
                    className="max-h-full max-w-full object-contain drop-shadow-[0_8px_20px_rgba(244,63,94,0.4)]"
                  />
                </div>

                <div className="flex-1 space-y-1.5 min-w-0">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black text-rose-300 bg-rose-500/20 border border-rose-500/30">
                    {form.badge_text || '🔥 DEAL TÂM ĐIỂM GIỜ VÀNG • TIẾT KIỆM 2.000.000 đ'}
                  </span>

                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-black text-rose-500">
                      {formatVND(form.custom_price || 22990000)}
                    </span>
                    {form.custom_old_price > form.custom_price && (
                      <>
                        <span className="text-xs text-gray-400 line-through">
                          {formatVND(form.custom_old_price)}
                        </span>
                        <span className="text-[10px] font-black px-1.5 py-0.5 bg-rose-600 text-white rounded">
                          -{Math.round((1 - form.custom_price / form.custom_old_price) * 100)}%
                        </span>
                      </>
                    )}
                  </div>

                  <h4 className="text-sm font-black text-white truncate">{form.title}</h4>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(form.specs_json ? form.specs_json.split(',') : ['Apple M2', 'RAM 8GB', 'SSD 256GB']).map(
                      (sp, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 bg-white/10 rounded-md text-gray-200">
                          {sp.trim()}
                        </span>
                      )
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 shrink-0 w-full md:w-auto">
                  <button className="px-4 py-2.5 rounded-xl text-xs font-black bg-rose-600 text-white shadow-lg shadow-rose-600/30">
                    {form.cta_text || 'Mua ngay giá sốc'} →
                  </button>
                  <button className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 border border-white/20 text-white flex items-center justify-center gap-1">
                    <HiOutlineShoppingCart className="w-3.5 h-3.5" />
                    {form.secondary_cta_text || 'Thêm vào giỏ'}
                  </button>
                </div>
              </div>
            )}

            {/* PREVIEW VARIANT D: HERO SLIDER CAROUSEL */}
            {form.position === 'hero' && (
              <div
                className="rounded-2xl p-6 text-white shadow-xl relative overflow-hidden min-h-[220px] flex flex-col justify-between"
                style={{
                  background: form.image_url
                    ? `linear-gradient(90deg, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.7) 50%, rgba(15,23,42,0.2) 100%), url(${
                        form.image_url.startsWith('http') ? form.image_url : `https://laptop99.vercel.app${form.image_url}`
                      }) center/cover no-repeat`
                    : BG_THEMES[form.bg_theme]?.css,
                }}
              >
                <div className="space-y-2 max-w-md">
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-rose-600 text-white">
                    {form.badge_text || 'CHÍNH HÃNG VN/A'}
                  </span>
                  <h3 className="text-xl font-black text-white leading-tight">
                    {form.title}{' '}
                    <span className="text-rose-400">{form.highlight_text ? `— ${form.highlight_text}` : ''}</span>
                  </h3>
                  <p className="text-xs text-gray-300 line-clamp-2">{form.subtitle}</p>
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <button className="px-5 py-2.5 rounded-xl text-xs font-black bg-rose-600 text-white shadow-lg">
                    {form.cta_text || 'Khám phá ngay'} →
                  </button>
                  {form.custom_price > 0 && (
                    <span className="text-base font-black text-white drop-shadow">
                      {formatVND(form.custom_price)}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* COMPREHENSIVE EDITOR FORM */}
          <form onSubmit={handleSave} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <HiOutlinePencilSquare className="w-5 h-5 text-rose-600" />
                {editingId === 'NEW' ? 'Tạo Thiết Kế Banner Quảng Cáo Mới' : `Chỉnh Sửa Banner #${editingId}`}
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-semibold">Trạng thái:</span>
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, is_active: prev.is_active ? 0 : 1 }))}
                  className={`px-3 py-1 rounded-full text-xs font-black transition ${
                    form.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {form.is_active ? '✓ Đang Hiển Thị' : 'Tạm Ẩn'}
                </button>
              </div>
            </div>

            {/* Section 1: Position & Brand Selector */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                    <HiOutlineFunnel className="w-4 h-4 text-rose-600" />
                    Vị Trí Hiển Thị Trên Storefront (*)
                  </label>
                  <select
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl bg-white font-bold text-gray-800 focus:ring-2 focus:ring-rose-500/30"
                  >
                    <option value="entry_popup">🎯 1. Banner Popup Đầu Vào Trang (Laptop88 Cyber Style)</option>
                    <option value="hero">🖥️ 2. Hero Slider Đầu Trang (Carousel)</option>
                    <option value="flash_sale">⚡ 3. Dải Banner Flash Sale Giờ Vàng (Đếm ngược)</option>
                    <option value="brand_showcase">🏢 4. Chuyên Trang Thương Hiệu Theo Hãng (Apple, ASUS...)</option>
                    <option value="hot_deal">🔥 5. Banner Deal Tâm Điểm Giảm Sâu</option>
                  </select>
                </div>

                {form.position === 'brand_showcase' && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                      <HiOutlineBuildingStorefront className="w-4 h-4 text-indigo-600" />
                      Thuộc Hãng Máy Tính (Brand)
                    </label>
                    <select
                      value={form.brand}
                      onChange={(e) => setForm({ ...form, brand: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl bg-white font-bold text-gray-800"
                    >
                      {BRANDS.map((br) => (
                        <option key={br} value={br}>
                          {br}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {form.position === 'hero' && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Tiêu Đề Thẻ Tab Trên Slider
                    </label>
                    <input
                      type="text"
                      value={form.tab_title}
                      onChange={(e) => setForm({ ...form, tab_title: e.target.value })}
                      placeholder="VD: MACBOOK AIR M3"
                      className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl bg-white"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Section 2: Advertising Copy (Title, Highlight, Badge, Theme) */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase text-gray-500 tracking-wider">
                Nội Dung &amp; Thông Điệp Quảng Cáo
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Tiêu Đề Chính Banner (*)
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="VD: Tuần Lễ MacBook Chính Hãng"
                    className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl font-bold text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Đoạn Nhấn Mạnh / Điểm Nổi Bật
                  </label>
                  <input
                    type="text"
                    value={form.highlight_text}
                    onChange={(e) => setForm({ ...form, highlight_text: e.target.value })}
                    placeholder="VD: Giảm Đến 35% + Trả Góp 0%"
                    className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl text-rose-600 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Huy Hiệu (Badge Text)</label>
                  <input
                    type="text"
                    value={form.badge_text}
                    onChange={(e) => setForm({ ...form, badge_text: e.target.value })}
                    placeholder="VD: ⚡ FLASH SALE GIỜ VÀNG"
                    className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Mô Tả Chi Tiết / Phụ Đề</label>
                  <textarea
                    rows={2}
                    value={form.subtitle}
                    onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                    placeholder="VD: Trải nghiệm sức mạnh chip Apple M2/M3 siêu mượt, pin tới 18h..."
                    className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Màu Nền / Theme</label>
                  <select
                    value={form.bg_theme}
                    onChange={(e) => setForm({ ...form, bg_theme: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl bg-white"
                  >
                    {Object.entries(BG_THEMES).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Màu Sắc Huy Hiệu</label>
                  <select
                    value={form.badge_style}
                    onChange={(e) => setForm({ ...form, badge_style: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl bg-white"
                  >
                    {Object.entries(BADGE_STYLES).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Section 3: Perks / Features List (Especially for Brand Showcase & Flash Sale) */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <label className="block text-xs font-bold text-gray-800 flex items-center justify-between">
                <span>Danh Sách Ưu Đãi / Đặc Quyền (Bullets)</span>
                <span className="text-[11px] text-gray-500 font-normal">Hiển thị các dòng có dấu tích xanh</span>
              </label>

              <div className="space-y-1.5">
                {getPerksList().map((pk, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700"
                  >
                    <div className="flex items-center gap-2">
                      <HiOutlineCheck className="w-4 h-4 text-emerald-500" />
                      <span>{pk}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemovePerk(idx)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <HiOutlineXMark className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newPerkInput}
                  onChange={(e) => setNewPerkInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddPerk();
                    }
                  }}
                  placeholder="Thêm ưu đãi mới (VD: Giảm thêm 500K cho HSSV) rồi bấm Thêm"
                  className="flex-1 px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white"
                />
                <button
                  type="button"
                  onClick={handleAddPerk}
                  className="px-3.5 py-1.5 bg-gray-800 hover:bg-gray-900 text-white rounded-lg text-xs font-bold whitespace-nowrap"
                >
                  + Thêm dòng
                </button>
              </div>
            </div>

            {/* Section 4: Image & Product Linking */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase text-gray-500 tracking-wider">
                Hình Ảnh Quảng Cáo &amp; Liên Kết Sản Phẩm
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                    <HiOutlineShoppingBag className="w-4 h-4 text-rose-600" />
                    Chọn Sản Phẩm Liên Kết Từ CSDL (Tự động điền giá, cấu hình &amp; ảnh)
                  </label>
                  <select
                    value={form.product_id}
                    onChange={(e) => handleProductPick(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl bg-white font-medium"
                  >
                    <option value="">-- Tùy chọn: Chọn sản phẩm liên kết từ 100 Laptop --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {formatVND(p.sale_price || p.price)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Đường Dẫn Hình Ảnh (URL hoặc tải lên)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={form.image_url}
                      onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                      placeholder="VD: /uploads/products/real-macbook-pro.jpg"
                      className="flex-1 px-3.5 py-2 text-sm border border-gray-300 rounded-xl text-gray-700"
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleUploadImage}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0"
                    >
                      <HiOutlineArrowUpTray className="w-4 h-4" />
                      {uploading ? 'Đang tải...' : 'Tải tệp'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {form.position === 'entry_popup'
                      ? '3 Thẻ Thông Số Đáy (cách nhau dấu phẩy)'
                      : 'Thông Số Tóm Tắt (specs_json)'}
                  </label>
                  <input
                    type="text"
                    value={form.specs_json}
                    onChange={(e) => setForm({ ...form, specs_json: e.target.value })}
                    placeholder={
                      form.position === 'entry_popup'
                        ? 'VD: Chip Core 5 / 7 ĐỜI MỚI, Giá từ 25 TRIỆU, 100% sRGB 165Hz'
                        : 'VD: Apple M2,RAM 8GB,SSD 256GB,13.6 Retina'
                    }
                    className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Giá Khuyến Mãi Hiển Thị (VNĐ)
                  </label>
                  <input
                    type="number"
                    value={form.custom_price}
                    onChange={(e) => setForm({ ...form, custom_price: Number(e.target.value) })}
                    placeholder="22990000"
                    className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl font-bold text-rose-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Giá Gốc Chưa Giảm (VNĐ - Gạch chân)
                  </label>
                  <input
                    type="number"
                    value={form.custom_old_price}
                    onChange={(e) => setForm({ ...form, custom_old_price: Number(e.target.value) })}
                    placeholder="24990000"
                    className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl text-gray-500 line-through"
                  />
                </div>
              </div>
            </div>

            {/* Section 5: Calls to Action & Countdown */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase text-gray-500 tracking-wider">
                Nút Bấm Kêu Gọi Hành Động (CTA) &amp; Thứ Tự
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Chữ Nút Chính (CTA Text)</label>
                  <input
                    type="text"
                    value={form.cta_text}
                    onChange={(e) => setForm({ ...form, cta_text: e.target.value })}
                    placeholder="VD: SĂN VOUCHER NGAY / Khám phá ngay"
                    className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Liên Kết Nút Chính (CTA Link)</label>
                  <input
                    type="text"
                    value={form.cta_link}
                    onChange={(e) => setForm({ ...form, cta_link: e.target.value })}
                    placeholder="VD: #/products?brand=Apple"
                    className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl text-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Chữ Nút Phụ (Secondary CTA)</label>
                  <input
                    type="text"
                    value={form.secondary_cta_text}
                    onChange={(e) => setForm({ ...form, secondary_cta_text: e.target.value })}
                    placeholder="VD: Săn Voucher Apple / Thêm vào giỏ"
                    className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Liên Kết Nút Phụ</label>
                  <input
                    type="text"
                    value={form.secondary_cta_link}
                    onChange={(e) => setForm({ ...form, secondary_cta_link: e.target.value })}
                    placeholder="VD: #/promos"
                    className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl text-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Thứ Tự Sắp Xếp (Thấp hiện trước)
                  </label>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                    <HiOutlineClock className="w-4 h-4 text-rose-500" />
                    Thời Gian Kết Thúc Đếm Ngược (Flash Sale)
                  </label>
                  <input
                    type="datetime-local"
                    value={form.countdown_end}
                    onChange={(e) => setForm({ ...form, countdown_end: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl text-gray-700"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => handleCreateNew(form.position)}
                className="px-4 py-2.5 rounded-xl text-sm font-bold border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
              >
                + Đặt Lại / Tạo Mới
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-black bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-lg shadow-rose-600/30 transition transform active:scale-98"
              >
                <HiOutlineCheckCircle className="w-5 h-5" />
                {saving ? 'Đang lưu thiết kế...' : 'Lưu & Cập Nhật Ngay Ra Storefront'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
