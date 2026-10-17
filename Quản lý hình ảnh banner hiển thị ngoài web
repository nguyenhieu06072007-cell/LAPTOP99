import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import {
  HiOutlineSparkles,
  HiOutlinePlusCircle,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineArrowPath,
  HiOutlineCheckCircle,
  HiOutlineArrowUpTray,
  HiOutlinePhoto,
  HiOutlineArrowsPointingOut,
  HiOutlineAdjustmentsHorizontal,
  HiOutlineViewfinderCircle,
} from 'react-icons/hi2';

const BG_THEMES = {
  crimson: { label: 'Đỏ CellphoneS (Nổi bật)', css: 'linear-gradient(135deg, #FFF5F5 0%, #FFE4E6 55%, #FECDD3 100%)' },
  blue: { label: 'Xanh Laptop99 (Mặc định)', css: 'linear-gradient(135deg, #FFFFFF 0%, #EFF6FF 58%, #DBEAFE 100%)' },
  indigo: { label: 'Xanh Indigo Gaming', css: 'linear-gradient(135deg, #FFFFFF 0%, #EEF2FF 58%, #E0E7FF 100%)' },
  emerald: { label: 'Xanh Ngọc Văn Phòng', css: 'linear-gradient(135deg, #FFFFFF 0%, #ECFDF5 58%, #D1FAE5 100%)' },
  rose: { label: 'Đỏ Hồng Săn Deal', css: 'linear-gradient(135deg, #FFFFFF 0%, #FFF1F2 58%, #FFE4E6 100%)' },
  amber: { label: 'Vàng Gold Cao Cấp', css: 'linear-gradient(135deg, #FFFFFF 0%, #FFFBEB 58%, #FEF3C7 100%)' },
};

const EMPTY_FORM = {
  title: 'Chiến dịch Laptop chính hãng',
  highlight_text: 'Ưu đãi cực đỉnh',
  subtitle: 'Thiết kế mỏng nhẹ, hiệu năng mạnh mẽ, chính hãng bảo hành uy tín.',
  badge_text: '🔥 Chiến dịch nổi bật · Giá tốt nhất',
  badge_style: 'red',
  bg_theme: 'blue',
  cta_text: 'Khám phá ngay',
  cta_link: '#/products',
  tab_title: 'Chiến dịch mới',
  tab_sub: 'Ưu đãi hấp dẫn',
  image_url: '',
  product_id: '',
  custom_price: 0,
  custom_old_price: 0,
  specs_json: '',
  sort_order: 1,
  is_active: 1,
  autoplay_ms: 3000,
  image_mode: 'complete', // 'complete' (Chế độ A: Ảnh poster hoàn chỉnh 1 ô sạch đẹp) | 'background' (Chế độ B)
  content_position: 'left',
  image_position: 'center center',
  overlay_style: 'none',
};

export default function BannerManagementPage() {
  const [banners, setBanners] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Tính năng Tự động căn chỉnh chiều dài và rộng chuẩn khung hình Storefront (1256x588 px / chuẩn 2.14:1)
  const [autoFitEnabled, setAutoFitEnabled] = useState(true);
  const [autoFitMode, setAutoFitMode] = useState('full_frame'); // 'full_frame' (Phủ kín 100% không cắt xén), 'fit_left', 'blur_fill', 'theme_fill', 'cover'
  const [fitAlign, setFitAlign] = useState('left'); // 'left', 'center', 'right'
  const [imageMetadata, setImageMetadata] = useState(null);
  const [processingFit, setProcessingFit] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bRes, pRes] = await Promise.all([
        api.get('/banners'),
        fetch('http://localhost:4000/api/client/products?limit=50').then((r) => r.json()),
      ]);
      const list = bRes.data?.data || [];
      setBanners(list);
      setProducts(pRes?.data || []);
      if (list.length > 0) {
        if (!editingId || editingId === 'NEW' || !list.some((b) => b.id === editingId)) {
          selectBanner(list[0]);
        }
      } else {
        handleCreateNew();
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
      title: b.title || '',
      highlight_text: b.highlight_text || '',
      subtitle: b.subtitle || '',
      badge_text: b.badge_text || '',
      badge_style: b.badge_style || 'blue',
      bg_theme: b.bg_theme || 'blue',
      cta_text: b.cta_text || 'Khám phá ngay',
      cta_link: b.cta_link || (b.product_id ? `#/product/${b.product_id}` : '#/products'),
      tab_title: b.tab_title || '',
      tab_sub: b.tab_sub || '',
      image_url: b.image_url || b.product_thumb || '',
      product_id: b.product_id || '',
      custom_price: b.custom_price || b.product_sale_price || b.product_base_price || 0,
      custom_old_price: b.custom_old_price || b.product_base_price || 0,
      specs_json: b.specs_json || '',
      sort_order: b.sort_order || 1,
      is_active: b.is_active ? 1 : 0,
      autoplay_ms: b.autoplay_ms || 3000,
      image_mode: b.image_mode || 'complete',
      content_position: b.content_position || 'left',
      image_position: b.image_position || 'center center',
      overlay_style: b.overlay_style || 'none',
    });
  };

  const handleCreateNew = () => {
    setEditingId('NEW');
    setForm({
      ...EMPTY_FORM,
      title: 'Chiến dịch Laptop mới',
      tab_title: 'Chiến dịch mới',
      tab_sub: 'Ưu đãi hấp dẫn',
      image_url: '',
      sort_order: (banners?.length || 0) + 1,
    });
  };

  const handleProductPick = (pid) => {
    const p = products.find((x) => String(x.id) === String(pid));
    if (!p) {
      setForm((prev) => ({ ...prev, product_id: '', cta_link: '#/products' }));
      return;
    }
    setForm((prev) => ({
      ...prev,
      product_id: p.id,
      cta_link: `#/product/${p.id}`,
      image_url: p.thumbnail || prev.image_url,
      custom_price: p.sale_price || p.price,
      custom_old_price: p.price,
      specs_json: [p.cpu_model, p.ram_gb ? `RAM ${p.ram_gb}GB` : '', p.storage_gb ? `SSD ${p.storage_gb}GB` : '']
        .filter(Boolean)
        .join(','),
      tab_title: p.name.split(' ').slice(0, 3).join(' '),
      tab_sub: 'Giá tốt nhất',
    }));
  };

  /**
   * Tự động căn chỉnh chiều dài và rộng chuẩn xác tuyệt đối khung hình slider khách hàng (1256 x 588 px)
   */
  const autoFitImage = (img, mode = 'full_frame', options = {}) => {
    return new Promise((resolve, reject) => {
      try {
        const TARGET_W = 1256;
        const TARGET_H = 588; // Tỷ lệ chuẩn xác tuyệt đối 628:294 của khung hình khách hàng
        const canvas = document.createElement('canvas');
        canvas.width = TARGET_W;
        canvas.height = TARGET_H;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Trình duyệt không hỗ trợ Canvas 2D'));

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const srcW = img.naturalWidth || img.width;
        const srcH = img.naturalHeight || img.height;
        const srcRatio = srcW / srcH;
        const targetRatio = TARGET_W / TARGET_H;

        if (mode === 'full_frame' || mode === 'stretch') {
          // CHẾ ĐỘ 1 (KHUYÊN DÙNG): PHỦ ĐẦY 100% KHUNG HÌNH (FULL-BLEED KHÔNG CẮT CHỮ)
          // Toàn bộ ảnh phủ khít 100% khung banner, không cắt xén một pixel nào từ lề trái sang lề phải!
          ctx.drawImage(img, 0, 0, TARGET_W, TARGET_H);
        } else if (mode === 'fit_left') {
          // CHẾ ĐỘ 2: CĂN GIỮ NGUYÊN MÉP TRÁI (BẢO TOÀN CHỮ BÊN TRÁI)
          ctx.fillStyle = '#171A21';
          ctx.fillRect(0, 0, TARGET_W, TARGET_H);
          let drawW, drawH;
          if (srcRatio > targetRatio) {
            drawH = TARGET_H;
            drawW = TARGET_H * srcRatio;
          } else {
            drawW = TARGET_W;
            drawH = TARGET_W / srcRatio;
          }
          // Bắt đầu từ X = 0 để tuyệt đối không bị cắt chữ góc trái!
          ctx.drawImage(img, 0, 0, drawW, drawH);
        } else if (mode === 'blur_fill') {
          // CHẾ ĐỘ 3: CĂN VỪA KHUNG & LÀM MỜ VIỀN NGHỆ THUẬT (SMART BLUR FILL)
          ctx.save();
          let bgW, bgH, bgX, bgY;
          if (srcRatio > targetRatio) {
            bgH = TARGET_H;
            bgW = TARGET_H * srcRatio;
            bgX = (TARGET_W - bgW) / 2;
            bgY = 0;
          } else {
            bgW = TARGET_W;
            bgH = TARGET_W / srcRatio;
            bgX = 0;
            bgY = (TARGET_H - bgH) / 2;
          }
          if (ctx.filter !== undefined) {
            ctx.filter = 'blur(26px) brightness(0.65) saturate(1.25)';
          }
          ctx.drawImage(img, bgX - 25, bgY - 25, bgW + 50, bgH + 50);
          ctx.restore();

          // Lớp tối nhẹ tăng tương phản
          ctx.fillStyle = 'rgba(17, 19, 24, 0.35)';
          ctx.fillRect(0, 0, TARGET_W, TARGET_H);

          let drawW, drawH, drawX, drawY;
          if (srcRatio > targetRatio) {
            drawW = TARGET_W;
            drawH = TARGET_W / srcRatio;
            drawX = 0;
            drawY = (TARGET_H - drawH) / 2;
          } else {
            drawH = TARGET_H;
            drawW = TARGET_H * srcRatio;
            drawX = (TARGET_W - drawW) / 2;
            drawY = 0;
          }

          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
          ctx.shadowBlur = 24;
          ctx.drawImage(img, drawX, drawY, drawW, drawH);
          ctx.restore();
        } else if (mode === 'theme_fill') {
          // CHẾ ĐỘ 4: CĂN VỪA & PHỦ NỀN THEME XÁM THAN
          const bg = options.themeColor || '#171A21';
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, TARGET_W, TARGET_H);

          let drawW, drawH, drawX, drawY;
          if (srcRatio > targetRatio) {
            drawW = TARGET_W;
            drawH = TARGET_W / srcRatio;
            drawX = 0;
            drawY = (TARGET_H - drawH) / 2;
          } else {
            drawH = TARGET_H;
            drawW = TARGET_H * srcRatio;
            drawX = (TARGET_W - drawW) / 2;
            drawY = 0;
          }

          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
          ctx.shadowBlur = 20;
          ctx.drawImage(img, drawX, drawY, drawW, drawH);
          ctx.restore();
        } else {
          // CHẾ ĐỘ 5: CẮT TÂM COVER
          ctx.fillStyle = '#171A21';
          ctx.fillRect(0, 0, TARGET_W, TARGET_H);

          let drawW, drawH, drawX, drawY;
          if (srcRatio > targetRatio) {
            drawH = TARGET_H;
            drawW = TARGET_H * srcRatio;
            drawY = 0;
            const align = options.align || fitAlign || 'center';
            if (align === 'left') drawX = 0;
            else if (align === 'right') drawX = TARGET_W - drawW;
            else drawX = (TARGET_W - drawW) / 2;
          } else {
            drawW = TARGET_W;
            drawH = TARGET_W / srcRatio;
            drawX = 0;
            const align = options.align || fitAlign || 'center';
            if (align === 'top') drawY = 0;
            else if (align === 'bottom') drawY = TARGET_H - drawH;
            else drawY = (TARGET_H - drawH) / 2;
          }
          ctx.drawImage(img, drawX, drawY, drawW, drawH);
        }

        const outMime = options.isPng ? 'image/png' : 'image/jpeg';
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Lỗi chuyển đổi ảnh Canvas'));
          },
          outMime,
          0.92
        );
      } catch (err) {
        reject(err);
      }
    });
  };

  const handleImageFileUpload = async (file, customMode = null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      return toast.error('Vui lòng chọn tệp hình ảnh hợp lệ (JPG, PNG, WEBP, GIF, SVG)');
    }
    setUploading(true);
    try {
      let fileToUpload = file;
      const activeMode = customMode || autoFitMode;

      // Nếu bật tính năng tự động căn chỉnh và không chọn chế độ "original" và không phải SVG:
      if (autoFitEnabled && activeMode !== 'original' && !file.type.includes('svg')) {
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const img = await new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = reject;
          image.src = dataUrl;
        });

        const origW = img.naturalWidth || img.width;
        const origH = img.naturalHeight || img.height;
        const origRatio = (origW / origH).toFixed(2);

        const fittedBlob = await autoFitImage(img, activeMode, {
          align: fitAlign,
          themeColor: '#171A21',
          isPng: file.type === 'image/png',
        });

        const ext = file.type === 'image/png' ? 'png' : 'jpg';
        fileToUpload = new File([fittedBlob], `banner-autofit-${Date.now()}.${ext}`, {
          type: file.type === 'image/png' ? 'image/png' : 'image/jpeg',
        });

        setImageMetadata({
          originalWidth: origW,
          originalHeight: origH,
          originalRatio: origRatio,
          processedWidth: 1256,
          processedHeight: 588,
          mode: activeMode,
        });

        toast.success(`⚡ Đã tự động căn chỉnh: ${origW}×${origH} → 1256×588 px (Chuẩn 2.14:1 full-bleed)!`);
      } else {
        try {
          const dataUrl = await new Promise((resolve) => {
            const r = new FileReader();
            r.onload = (e) => resolve(e.target.result);
            r.readAsDataURL(file);
          });
          const img = await new Promise((resolve) => {
            const i = new Image();
            i.onload = () => resolve(i);
            i.src = dataUrl;
          });
          setImageMetadata({
            originalWidth: img.naturalWidth || img.width,
            originalHeight: img.naturalHeight || img.height,
            originalRatio: ((img.naturalWidth || img.width) / (img.naturalHeight || img.height)).toFixed(2),
            processedWidth: img.naturalWidth || img.width,
            processedHeight: img.naturalHeight || img.height,
            mode: 'original',
          });
        } catch (_) {}
      }

      const fd = new FormData();
      fd.append('image', fileToUpload);
      const res = await api.post('/banners/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const uploadedUrl = res.data?.data?.url;
      if (uploadedUrl) {
        setForm((prev) => ({
          ...prev,
          image_url: uploadedUrl,
          image_mode: 'complete',
        }));
        if (!editingId) {
          setEditingId('NEW');
        }
        toast.success('Đã tải hình ảnh lên máy chủ! Nhấn "Lưu Thiết Kế Banner" để cập nhật ngay ra trang khách hàng.');
      }
    } catch (err) {
      toast.error(err.message || 'Lỗi khi tải ảnh lên máy chủ');
    } finally {
      setUploading(false);
    }
  };

  const handleAutoFitCurrentImageUrl = async (mode = autoFitMode) => {
    if (!form.image_url) {
      return toast.error('Vui lòng chọn hoặc tải ảnh trước khi căn chỉnh');
    }
    setProcessingFit(true);
    try {
      const fullUrl = resolveImg(form.image_url);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('Không thể tải ảnh từ URL để xử lý'));
        img.src = fullUrl;
      });

      const origW = img.naturalWidth || img.width;
      const origH = img.naturalHeight || img.height;
      const origRatio = (origW / origH).toFixed(2);

      const fittedBlob = await autoFitImage(img, mode, {
        align: fitAlign,
        themeColor: '#171A21',
        isPng: false,
      });

      const fileToUpload = new File([fittedBlob], `banner-autofit-${Date.now()}.jpg`, {
        type: 'image/jpeg',
      });

      const fd = new FormData();
      fd.append('image', fileToUpload);
      const res = await api.post('/banners/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const uploadedUrl = res.data?.data?.url;
      if (uploadedUrl) {
        setForm((prev) => ({ ...prev, image_url: uploadedUrl }));
        setImageMetadata({
          originalWidth: origW,
          originalHeight: origH,
          originalRatio: origRatio,
          processedWidth: 1256,
          processedHeight: 588,
          mode: mode,
        });
        toast.success(`⚡ Đã tự động căn chỉnh ảnh ${origW}×${origH} thành 1256×588 px (Chuẩn 2.14:1 full-bleed)!`);
      }
    } catch (err) {
      toast.error('Lỗi khi tự động căn chỉnh: ' + (err.message || 'Thử tải lại ảnh trực tiếp từ máy tính'));
    } finally {
      setProcessingFit(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      return toast.error('Vui lòng nhập tiêu đề banner');
    }
    if (!form.image_url.trim()) {
      return toast.error('Vui lòng tải ảnh quảng cáo lên máy chủ');
    }
    setSaving(true);
    try {
      const isNew = !editingId || editingId === 'NEW' || isNaN(Number(editingId));
      if (isNew) {
        const res = await api.post('/banners', form);
        toast.success('Đã tạo banner mới và cập nhật tức thì ra trang khách hàng!');
        await loadData();
        if (res.data?.data) selectBanner(res.data.data);
      } else {
        const res = await api.put(`/banners/${editingId}`, form);
        toast.success('Đã lưu và cập nhật banner tức thì ra trang khách hàng!');
        await loadData();
        if (res.data?.data) selectBanner(res.data.data);
      }
    } catch (err) {
      toast.error(err.message || 'Lỗi lưu banner');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (b) => {
    try {
      await api.patch(`/banners/${b.id}/status`, { is_active: !b.is_active });
      toast.success(!b.is_active ? 'Đã bật hiển thị banner' : 'Đã ẩn banner');
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (b) => {
    if (!window.confirm(`Xóa banner "${b.title} ${b.highlight_text}"?`)) return;
    try {
      await api.delete(`/banners/${b.id}`);
      toast.success('Đã xóa banner');
      setEditingId(null);
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const resolveImg = (u) => {
    if (!u) return '';
    if (u.startsWith('http')) return u;
    return `http://localhost:4000${u.startsWith('/') ? u : '/' + u}`;
  };

  const vnd = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(Number(n) || 0)) + ' ₫';
  const specsList = (form.specs_json || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <HiOutlineSparkles className="w-7 h-7 text-red-600" />
            Thiết kế &amp; Quản lý Banner Quảng Cáo (Auto-slide 3 giây)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Tải ảnh quảng cáo trực tiếp từ máy tính, tùy chỉnh nội dung, màu nền, sản phẩm gắn kèm và tốc độ chuyển động 3s cho Hero Banner.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="px-3.5 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-50 flex items-center gap-1.5"
          >
            <HiOutlineArrowPath className="w-4 h-4" /> Làm mới
          </button>
          <button
            onClick={handleCreateNew}
            className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 flex items-center gap-1.5 shadow-sm"
          >
            <HiOutlinePlusCircle className="w-5 h-5" /> + Thêm Banner Mới
          </button>
        </div>
      </div>

      {/* Live Preview Box — Modern Full-Bleed Preview (Mode A & Mode B) */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-red-600">
              Xem trước trực tiếp (Live Full-Bleed Banner Preview — Chuyển cảnh {form.autoplay_ms || 3000}ms)
            </span>
            <span
              className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${
                form.image_mode === 'complete'
                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                  : 'bg-blue-100 text-blue-800 border border-blue-200'
              }`}
            >
              {form.image_mode === 'complete'
                ? '🎨 Chế độ A: Ảnh quảng cáo hoàn chỉnh'
                : '🌟 Chế độ B: Ảnh nền + Nội dung động'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">
              📐 Tỷ lệ chuẩn: 16:7 (1200 × 525 px)
            </span>
            <span className="text-xs text-gray-500">
              Click toàn bộ banner mở: <b className="text-red-600">{form.cta_link || '#/products'}</b>
            </span>
          </div>
        </div>

        {/* Full-Bleed Preview Stage Container (Chuẩn tỷ lệ 16:7 đồng bộ giao diện khách hàng) */}
        <div className="relative w-full aspect-[16/7] min-h-[250px] max-h-[380px] rounded-xl overflow-hidden border border-gray-300 bg-gray-950 shadow-md group">
          {/* 1. Background image: Full-bleed 100% width and height */}
          {form.image_url ? (
            <img
              src={resolveImg(form.image_url)}
              alt={form.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
              style={{ objectPosition: form.image_position || 'center center' }}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-gray-400 gap-2">
              <HiOutlinePhoto className="w-12 h-12 text-gray-600" />
              <span className="text-sm font-medium">Chưa có ảnh — Vui lòng tải ảnh lên hoặc chọn sản phẩm</span>
            </div>
          )}

          {/* 2. Contrast Overlay (Only in Mode B) */}
          {form.image_mode !== 'complete' && form.overlay_style !== 'none' && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  form.overlay_style === 'gradient_light'
                    ? 'linear-gradient(90deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.75) 45%, transparent 100%)'
                    : form.overlay_style === 'gradient_charcoal'
                    ? 'linear-gradient(135deg, rgba(23,26,33,0.92) 0%, rgba(23,26,33,0.55) 55%, transparent 100%)'
                    : form.content_position === 'right'
                    ? 'linear-gradient(270deg, rgba(17,19,24,0.94) 0%, rgba(17,19,24,0.75) 45%, transparent 100%)'
                    : form.content_position === 'center'
                    ? 'radial-gradient(circle at center, rgba(17,19,24,0.85) 0%, rgba(17,19,24,0.5) 65%, transparent 100%)'
                    : 'linear-gradient(90deg, rgba(17,19,24,0.94) 0%, rgba(17,19,24,0.75) 45%, transparent 100%)',
              }}
            />
          )}

          {/* 3. Mode B: Dynamic Product Content Overlay rendered directly on top */}
          {form.image_mode !== 'complete' ? (
            <div
              className={`absolute top-1/2 -translate-y-1/2 z-10 p-6 flex flex-col gap-2 pointer-events-none ${
                form.content_position === 'right'
                  ? 'right-0 text-left items-start max-w-[55%]'
                  : form.content_position === 'center'
                  ? 'left-1/2 -translate-x-1/2 text-center items-center max-w-[78%]'
                  : 'left-0 text-left items-start max-w-[55%]'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm ${
                    form.badge_style === 'red' ? 'bg-red-600' : 'bg-blue-600'
                  }`}
                >
                  {form.badge_text || 'Chiến dịch nổi bật'}
                </span>
                <span className="text-xs font-bold text-white bg-black/60 backdrop-blur-xs border border-white/20 px-2.5 py-0.5 rounded-full">
                  LAPTOP99 OFFICIAL
                </span>
              </div>

              <h2 className="text-2xl md:text-3xl font-extrabold text-white leading-tight drop-shadow-md">
                {form.title}{' '}
                <span className="text-red-400 drop-shadow">{form.highlight_text}</span>
              </h2>

              {form.subtitle && (
                <p className="text-xs text-gray-200 line-clamp-2 drop-shadow-sm max-w-xl">
                  {form.subtitle}
                </p>
              )}

              {specsList.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {specsList.map((sp, i) => (
                    <span
                      key={i}
                      className="text-xs font-bold bg-black/60 backdrop-blur-xs border border-white/20 text-gray-100 px-2.5 py-1 rounded-md"
                    >
                      {sp}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-baseline gap-3 pt-1">
                <span className="text-2xl font-extrabold text-white drop-shadow-md">
                  {vnd(form.custom_price)}
                </span>
                {Number(form.custom_old_price) > Number(form.custom_price) && (
                  <span className="text-sm text-gray-300 line-through">
                    {vnd(form.custom_old_price)}
                  </span>
                )}
                {Number(form.custom_old_price) > Number(form.custom_price) && (
                  <span className="text-xs font-bold bg-red-600 text-white px-2 py-0.5 rounded">
                    Tiết kiệm {vnd(form.custom_old_price - form.custom_price)}
                  </span>
                )}
              </div>

              <div className="pt-1 flex items-center gap-3">
                <span className="inline-flex items-center px-5 py-2 rounded-lg bg-red-600 text-white text-sm font-bold shadow-md">
                  {form.cta_text || 'Khám phá ngay'} →
                </span>
                <span className="text-xs text-gray-300">Nhấn vào banner để xem chi tiết →</span>
              </div>
            </div>
          ) : (
            /* Mode A: Complete designed banner (No duplicate text, clean full-bleed) */
            <div className="absolute bottom-4 right-4 z-10">
              <span className="inline-flex items-center gap-1.5 bg-black/80 backdrop-blur-md text-white text-xs font-bold px-4 py-2 rounded-full border border-white/30 shadow-lg">
                Click toàn bộ banner mở: {form.cta_link || '#/products'} →
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: List on Left + Designer Form on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Danh sách các Slide Banner */}
        <div className="lg:col-span-5 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-bold text-gray-800 text-sm">Danh sách Slide Banner ({banners.length})</h3>
            <span className="text-xs text-red-600 font-semibold">Tự chuyển sau 3 giây</span>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-500 text-sm">Đang tải danh sách banner...</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {banners.map((b) => (
                <div
                  key={b.id}
                  onClick={() => selectBanner(b)}
                  className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer transition ${
                    editingId === b.id ? 'bg-red-50/80 border-l-4 border-red-600' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-14 h-12 rounded-lg border border-gray-200 bg-white p-1 flex items-center justify-center flex-shrink-0">
                      {b.image_url || b.product_thumb ? (
                        <img
                          src={resolveImg(b.image_url || b.product_thumb)}
                          alt={b.title}
                          className="max-h-10 object-contain"
                        />
                      ) : (
                        <span className="text-[10px] text-gray-400">Banner</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-red-600">#{b.sort_order}</span>
                        <p className="text-sm font-bold text-gray-900 truncate">
                          {b.title} {b.highlight_text}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        Tab: {b.tab_title || b.title} · {vnd(b.custom_price || b.product_sale_price || b.product_base_price)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleToggle(b)}
                      className={`p-1.5 rounded-md border ${
                        b.is_active
                          ? 'text-green-600 border-green-200 bg-green-50'
                          : 'text-gray-400 border-gray-200 bg-gray-50'
                      }`}
                      title={b.is_active ? 'Đang hiển thị (Nhấn để ẩn)' : 'Đang ẩn (Nhấn để hiện)'}
                    >
                      {b.is_active ? <HiOutlineEye className="w-4 h-4" /> : <HiOutlineEyeSlash className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDelete(b)}
                      className="p-1.5 rounded-md border border-red-200 text-red-600 hover:bg-red-50"
                      title="Xóa banner"
                    >
                      <HiOutlineTrash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Form Thiết kế Banner */}
        <form
          onSubmit={handleSave}
          className="lg:col-span-7 bg-white border border-gray-200 rounded-xl p-5 space-y-4 shadow-xs"
        >
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <HiOutlinePencilSquare className="w-5 h-5 text-red-600" />
              {editingId === 'NEW' ? 'Tạo Thiết Kế Banner Mới' : `Chỉnh sửa Banner #${editingId}`}
            </h3>
            <span className="text-xs px-2.5 py-1 rounded-full bg-red-50 text-red-700 font-semibold">
              Chỉ hiển thị tại Trang Quản Trị Admin
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. CHỌN CHẾ ĐỘ BANNER (CHẾ ĐỘ A: ẢNH HOÀN CHỈNH VS CHẾ ĐỘ B: ẢNH NỀN + NỘI DUNG ĐỘNG) */}
            <div className="md:col-span-2 bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-800">
                  Cấu hình Chế Độ Banner (Two Banner Modes) *
                </label>
                <span className="text-[11px] text-gray-500 font-medium">
                  {form.image_mode === 'complete' ? 'Đang chọn: Chế độ A' : 'Đang chọn: Chế độ B'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, image_mode: 'background' })}
                  className={`p-3.5 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${
                    form.image_mode !== 'complete'
                      ? 'border-red-600 bg-red-50/80 ring-2 ring-red-600/20 text-gray-900 shadow-xs'
                      : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  <span className="text-2xl flex-shrink-0">🌟</span>
                  <div>
                    <div className="font-extrabold text-sm text-gray-900">
                      Chế độ B: Ảnh Nền &amp; Thông Tin Động
                    </div>
                    <div className="text-xs text-gray-500 mt-1 leading-relaxed">
                      Dành cho ảnh laptop/ảnh nền chưa có chữ. Hệ thống tự render tiêu đề, giá, cấu hình, badge và nút CTA đè lên ảnh.
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setForm({ ...form, image_mode: 'complete' })}
                  className={`p-3.5 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${
                    form.image_mode === 'complete'
                      ? 'border-red-600 bg-red-50/80 ring-2 ring-red-600/20 text-gray-900 shadow-xs'
                      : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  <span className="text-2xl flex-shrink-0">🎨</span>
                  <div>
                    <div className="font-extrabold text-sm text-gray-900">
                      Chế độ A: Ảnh Quảng Cáo Hoàn Chỉnh
                    </div>
                    <div className="text-xs text-gray-500 mt-1 leading-relaxed">
                      Dành cho ảnh banner đã thiết kế hoàn chỉnh (có sẵn chữ, logo, giá). Hiển thị 100% full-bleed, không chèn chữ đè.
                    </div>
                  </div>
                </button>
              </div>

              {form.image_mode === 'complete' && (
                <div className="text-xs text-purple-800 bg-purple-50 border border-purple-200 rounded-lg p-2.5 font-medium flex items-center gap-2">
                  <span>ℹ️</span>
                  <span>
                    Chế độ A sẽ hiển thị nguyên ảnh phủ kín toàn bộ khung banner. Vui lòng chọn <b>Sản phẩm liên kết</b> bên dưới để khách click vào banner sẽ mở đúng trang chi tiết sản phẩm.
                  </span>
                </div>
              )}
            </div>

            {/* HÌNH ẢNH QUẢNG CÁO — TẢI ẢNH LÊN & TỰ ĐỘNG CĂN CHỈNH KÍCH THƯỚC */}
            <div className="md:col-span-2 space-y-3 bg-white p-4 rounded-xl border border-gray-200">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <HiOutlineArrowsPointingOut className="w-4 h-4 text-red-600" />
                  Tải Hình Ảnh &amp; Tự Động Căn Chỉnh Khung Hình (16:7 / 1200×525px) *
                </label>
                <label className="flex items-center gap-2 cursor-pointer bg-red-50 hover:bg-red-100 text-red-700 px-3 py-1 rounded-lg text-xs font-bold border border-red-200 transition">
                  <input
                    type="checkbox"
                    checked={autoFitEnabled}
                    onChange={(e) => setAutoFitEnabled(e.target.checked)}
                    className="rounded text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Bật Tự động Căn chỉnh chiều dài &amp; rộng (Khuyên dùng)</span>
                </label>
              </div>

              {/* TÙY CHỌN CHẾ ĐỘ CĂN CHỈNH KÍCH THƯỚC (AUTO-FIT MODES) */}
              {autoFitEnabled && (
                <div className="bg-gray-50/90 border border-gray-200 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-gray-700 flex items-center gap-1">
                      <HiOutlineAdjustmentsHorizontal className="w-4 h-4 text-gray-600" />
                      Chế độ Tự Động Căn Chỉnh Khung Hình Hero Slider:
                    </span>
                    <span className="text-[11px] text-gray-500 font-medium">
                      Tỷ lệ chuẩn khung hình khách hàng: <b className="text-red-600">1256 × 588 px (Chuẩn 2.14:1)</b>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {/* Option 1: Full-Bleed 100% Khung Hình (Khuyên dùng) */}
                    <button
                      type="button"
                      onClick={() => setAutoFitMode('full_frame')}
                      className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                        autoFitMode === 'full_frame'
                          ? 'border-red-600 bg-red-50/80 ring-2 ring-red-600/20 text-gray-900 shadow-2xs'
                          : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-gray-900">⚡ Phủ kín 100% Khung</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">Khuyên Dùng</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1 leading-snug">
                        Khít 100% khung banner, không cắt xén góc nào, hiển thị trọn vẹn toàn bộ chữ, đồ họa &amp; nút CTA.
                      </p>
                    </button>

                    {/* Option 2: Giữ nguyên mép trái */}
                    <button
                      type="button"
                      onClick={() => setAutoFitMode('fit_left')}
                      className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                        autoFitMode === 'fit_left'
                          ? 'border-red-600 bg-red-50/80 ring-2 ring-red-600/20 text-gray-900 shadow-2xs'
                          : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-gray-900">🛡️ Căn chuẩn mép trái</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">Fit Left</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1 leading-snug">
                        Căn từ lề trái sang, đảm bảo tuyệt đối các dòng chữ tiêu đề bên trái không bao giờ bị cắt xén.
                      </p>
                    </button>

                    {/* Option 3: Ambient Blur Fill */}
                    <button
                      type="button"
                      onClick={() => setAutoFitMode('blur_fill')}
                      className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                        autoFitMode === 'blur_fill'
                          ? 'border-red-600 bg-red-50/80 ring-2 ring-red-600/20 text-gray-900 shadow-2xs'
                          : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-gray-900">🌟 Căn vừa &amp; Phủ mờ viền</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-bold">Blur Fill</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1 leading-snug">
                        Giữ nguyên tỷ lệ ảnh gốc, tự động phủ viền mờ nghệ thuật từ chính màu ảnh sang 2 bên.
                      </p>
                    </button>

                    {/* Option 4: Cover Center Crop */}
                    <button
                      type="button"
                      onClick={() => setAutoFitMode('cover')}
                      className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                        autoFitMode === 'cover'
                          ? 'border-red-600 bg-red-50/80 ring-2 ring-red-600/20 text-gray-900 shadow-2xs'
                          : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-gray-900">✂️ Cắt tâm thông minh</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-bold">Cover</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1 leading-snug">
                        Phóng đầy khung hình và cắt đều các mép thừa xung quanh.
                      </p>
                    </button>
                  </div>

                  {/* Nút bấm tự động căn chỉnh lại ảnh hiện tại */}
                  {form.image_url && (
                    <div className="flex flex-wrap items-center justify-between pt-1 gap-2 border-t border-gray-200/70">
                      <span className="text-xs text-gray-600">
                        Ảnh hiện tại đang gắn: <code className="text-gray-800 font-semibold">{form.image_url.split('/').pop()}</code>
                      </span>
                      <button
                        type="button"
                        disabled={processingFit || uploading}
                        onClick={() => handleAutoFitCurrentImageUrl(autoFitMode)}
                        className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-bold hover:bg-black flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
                      >
                        <HiOutlineViewfinderCircle className="w-4 h-4 text-red-400" />
                        {processingFit ? 'Đang căn chỉnh...' : '⚡ Tự động căn chỉnh lại ảnh này (Auto-Fit 1256×588)'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* INPUT FILE & DRAG DROP ZONE */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageFileUpload(file);
                  e.target.value = '';
                }}
              />

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleImageFileUpload(file);
                }}
                className={`border-2 border-dashed rounded-xl p-4 transition flex flex-col sm:flex-row items-center justify-between gap-4 ${
                  dragOver ? 'border-red-500 bg-red-50/60' : 'border-gray-300 bg-gray-50/60 hover:border-red-400'
                }`}
              >
                <div className="flex items-center gap-4 min-w-0 w-full sm:w-auto">
                  <div className="w-24 h-20 rounded-lg border border-gray-200 bg-white p-1.5 flex items-center justify-center flex-shrink-0 shadow-2xs">
                    {form.image_url ? (
                      <img
                        src={resolveImg(form.image_url)}
                        alt="Banner preview"
                        className="max-h-16 max-w-full object-contain"
                      />
                    ) : (
                      <HiOutlinePhoto className="w-8 h-8 text-gray-300" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-800">
                      {uploading
                        ? 'Đang xử lý & tải hình ảnh lên máy chủ...'
                        : form.image_url
                        ? 'Đã có hình ảnh quảng cáo cho Banner'
                        : 'Chưa có hình ảnh quảng cáo'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Hỗ trợ JPG, PNG, WEBP, GIF, SVG. Kéo thả ảnh vào đây hoặc bấm nút tải ảnh để hệ thống tự động căn chuẩn khung.
                    </p>
                    {form.image_url && (
                      <span className="inline-block mt-1 text-[11px] font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded">
                        ✓ Đã gắn tệp ảnh: {form.image_url.split('/').pop()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    <HiOutlineArrowUpTray className="w-4 h-4" />
                    {uploading ? 'Đang tải lên...' : form.image_url ? 'Đổi ảnh từ máy tính' : 'Tải ảnh quảng cáo lên'}
                  </button>
                  {form.image_url && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, image_url: '' })}
                      className="px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-600 text-xs font-semibold hover:bg-gray-100 cursor-pointer"
                    >
                      Xóa ảnh
                    </button>
                  )}
                </div>
              </div>

              {/* THÔNG SỐ KÍCH THƯỚC SAU KHI CĂN CHỈNH */}
              {imageMetadata && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex flex-wrap items-center justify-between text-xs text-emerald-900 gap-2">
                  <div className="flex items-center gap-2 font-bold">
                    <HiOutlineCheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>
                      Đã tự động căn chuẩn khung hình: <b>{imageMetadata.processedWidth} × {imageMetadata.processedHeight} px (16:7)</b>
                    </span>
                  </div>
                  <div className="text-[11px] text-emerald-700">
                    Ảnh nguồn: {imageMetadata.originalWidth} × {imageMetadata.originalHeight} px (Tỉ lệ {imageMetadata.originalRatio}) · Chế độ: {imageMetadata.mode}
                  </div>
                </div>
              )}
            </div>

            {/* CĂN CHỈNH VỊ TRÍ ẢNH & OVERLAY */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Căn chỉnh vị trí ảnh (object-position)
              </label>
              <select
                value={form.image_position}
                onChange={(e) => setForm({ ...form, image_position: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="center center">Căn giữa (Center Center - Mặc định)</option>
                <option value="right center">Căn sang phải (Right Center - Máy ở bên phải)</option>
                <option value="left center">Căn sang trái (Left Center - Máy ở bên trái)</option>
                <option value="top center">Căn lên trên (Top Center)</option>
                <option value="bottom center">Căn xuống dưới (Bottom Center)</option>
              </select>
            </div>

            {form.image_mode !== 'complete' ? (
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Vị trí hiển thị nội dung Overlay
                  </label>
                  <select
                    value={form.content_position}
                    onChange={(e) => setForm({ ...form, content_position: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                  >
                    <option value="left">Bên trái (Left - Phổ biến &amp; Khuyên dùng)</option>
                    <option value="center">Ở giữa (Center)</option>
                    <option value="right">Bên phải (Right)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Lớp Gradient tương phản (Độ dễ đọc)
                  </label>
                  <select
                    value={form.overlay_style}
                    onChange={(e) => setForm({ ...form, overlay_style: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                  >
                    <option value="gradient_dark">Tối tương phản cao (Khuyên dùng)</option>
                    <option value="gradient_charcoal">Xám than công nghệ</option>
                    <option value="gradient_light">Trắng sáng (Dành cho ảnh nền sáng)</option>
                    <option value="none">Không dùng Gradient (Ảnh nguyên bản)</option>
                  </select>
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">
                  Nội dung Text Overlay (Chế độ A)
                </label>
                <div className="w-full px-3 py-2 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 bg-gray-50">
                  Chế độ A tự động tắt chữ đè. Ảnh hiển thị full-bleed nguyên bản 100%.
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Tiêu đề chính (Dòng 1) *</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="VD: MacBook chính hãng –"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Cụm từ nổi bật (Dòng 2)</label>
              <input
                value={form.highlight_text}
                onChange={(e) => setForm({ ...form, highlight_text: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="VD: Hiệu năng vượt trội"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">Mô tả ngắn chiến dịch</label>
              <textarea
                rows={2}
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Nhãn Badge góc trên</label>
              <input
                value={form.badge_text}
                onChange={(e) => setForm({ ...form, badge_text: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Tông màu nền Banner</label>
              <select
                value={form.bg_theme}
                onChange={(e) => setForm({ ...form, bg_theme: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {Object.entries(BG_THEMES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Hoặc chọn nhanh Sản phẩm có sẵn trong kho để tự động đồng bộ Ảnh, Giá &amp; Cấu hình
              </label>
              <select
                value={form.product_id}
                onChange={(e) => handleProductPick(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">-- Tự thiết kế &amp; tải ảnh quảng cáo riêng --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.brand}] {p.name} — {vnd(p.sale_price || p.price)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Giá ưu đãi hiển thị (VNĐ)</label>
              <input
                type="number"
                value={form.custom_price}
                onChange={(e) => setForm({ ...form, custom_price: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Giá gốc gạch ngang (VNĐ)</label>
              <input
                type="number"
                value={form.custom_old_price}
                onChange={(e) => setForm({ ...form, custom_old_price: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Chip cấu hình nổi bật (phân cách bằng dấu phẩy)
              </label>
              <input
                value={form.specs_json}
                onChange={(e) => setForm({ ...form, specs_json: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="VD: Apple M2,RAM 16GB,SSD 512GB"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Chữ trên nút CTA</label>
              <input
                value={form.cta_text}
                onChange={(e) => setForm({ ...form, cta_text: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Đường dẫn điều hướng khi bấm nút CTA</label>
              <input
                value={form.cta_link}
                onChange={(e) => setForm({ ...form, cta_link: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Tiêu đề Tab dưới chân Banner</label>
              <input
                value={form.tab_title}
                onChange={(e) => setForm({ ...form, tab_title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Mô tả phụ ở Tab chân Banner</label>
              <input
                value={form.tab_sub}
                onChange={(e) => setForm({ ...form, tab_sub: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Thứ tự hiển thị</label>
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Thời gian tự động chuyển (ms)</label>
              <input
                type="number"
                step="500"
                min="1500"
                value={form.autoplay_ms}
                onChange={(e) => setForm({ ...form, autoplay_ms: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(form.is_active)}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked ? 1 : 0 })}
                className="rounded text-red-600"
              />
              Hiển thị slide này trên Trang chủ
            </label>

            <button
              type="submit"
              disabled={saving || uploading}
              className="px-5 py-2.5 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <HiOutlineCheckCircle className="w-5 h-5" />
              {saving ? 'Đang lưu...' : 'Lưu Thiết Kế Banner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
