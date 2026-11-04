import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import {
  HiOutlineTicket,
  HiOutlinePlus,
  HiOutlineSparkles,
  HiOutlineClock,
  HiOutlineGift,
  HiOutlineXMark,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlinePercentBadge,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const formatVND = (v) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v || 0);

const getTypeLabel = (type, discount_value) => {
  if (type === 'percent') return `Giảm ${discount_value}%`;
  if (type === 'cash') return `Trừ ${formatVND(discount_value)}`;
  return `Combo Quà ${formatVND(discount_value)}`;
};

const getTypeColor = (type) => {
  if (type === 'percent') return 'bg-blue-50 text-blue-700 border-blue-200';
  if (type === 'cash') return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-purple-50 text-purple-700 border-purple-200';
};

export default function PromotionCampaignPage() {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    code: '',
    title: '',
    type: 'percent',
    discount_value: 10,
    min_order_value: 10000000,
    target_category: 'Tất cả các dòng laptop',
    gifts: '',
    max_uses: 100,
    start_date: today,
    end_date: today,
    status: 'active',
  });

  const fetchPromotions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/promotions');
      setPromotions(res.data.data || []);
    } catch (err) {
      toast.error('Lỗi tải danh sách khuyến mãi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);

  const handleOpenModal = (p = null) => {
    if (p) {
      setEditingPromo(p);
      setFormData({
        code: p.code,
        title: p.title,
        type: p.type,
        discount_value: p.discount_value,
        min_order_value: p.min_order_value,
        target_category: p.target_category,
        gifts: Array.isArray(p.gifts) ? p.gifts.join(', ') : '',
        max_uses: p.max_uses,
        start_date: p.start_date?.split('T')[0] || today,
        end_date: p.end_date?.split('T')[0] || today,
        status: p.status,
      });
    } else {
      setEditingPromo(null);
      setFormData({
        code: 'PROMO' + Math.floor(1000 + Math.random() * 9000),
        title: '',
        type: 'percent',
        discount_value: 10,
        min_order_value: 10000000,
        target_category: 'Tất cả các dòng laptop',
        gifts: 'Balo laptop cao cấp, Chuột quang không dây',
        max_uses: 100,
        start_date: today,
        end_date: today,
        status: 'active',
      });
    }
    setIsModalOpen(true);
  };

  const handleSavePromo = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.code) return toast.error('Vui lòng nhập tên và mã khuyến mãi');
    if (formData.end_date < formData.start_date) return toast.error('Ngày kết thúc phải sau ngày bắt đầu');

    setSaving(true);
    try {
      const payload = {
        ...formData,
        discount_value: Number(formData.discount_value),
        min_order_value: Number(formData.min_order_value),
        max_uses: Number(formData.max_uses),
        gifts: formData.gifts
          ? formData.gifts.split(',').map(g => g.trim()).filter(Boolean)
          : [],
      };

      if (editingPromo) {
        const res = await api.put(`/promotions/${editingPromo.id}`, payload);
        setPromotions(prev => prev.map(p => p.id === editingPromo.id ? res.data.data : p));
        toast.success(`Cập nhật chương trình "${formData.title}" thành công!`);
      } else {
        const res = await api.post('/promotions', payload);
        setPromotions(prev => [res.data.data, ...prev]);
        toast.success(`Đã kích hoạt chương trình khuyến mãi mới: ${formData.title}!`);
      }
      setIsModalOpen(false);
    } catch (err) {
      toast.error(err.message || 'Lỗi lưu khuyến mãi');
    } finally {
      setSaving(false);
    }
  };

  const togglePromoStatus = async (promo) => {
    const newStatus = promo.status === 'active' ? 'ended' : 'active';
    try {
      await api.patch(`/promotions/${promo.id}/status`, { status: newStatus });
      setPromotions(prev => prev.map(p =>
        p.id === promo.id ? { ...p, status: newStatus } : p
      ));
      toast.success(newStatus === 'active' ? `Đã kích hoạt lại ${promo.code}` : `Đã tạm dừng ${promo.code}`);
    } catch (err) {
      toast.error(err.message || 'Lỗi cập nhật trạng thái');
    }
  };

  const deletePromo = async (promo) => {
    if (!window.confirm(`Xoá chương trình ${promo.code}?`)) return;
    try {
      await api.delete(`/promotions/${promo.id}`);
      setPromotions(prev => prev.filter(p => p.id !== promo.id));
      toast.success('Đã xoá chương trình');
    } catch (err) {
      toast.error(err.message || 'Lỗi xoá khuyến mãi');
    }
  };

  const activeCount = promotions.filter(p => p.status === 'active').length;
  const totalUsed = promotions.reduce((acc, p) => acc + (p.used_count || 0), 0);

  return (
    <div className="space-y-4 text-xs font-sans">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2 text-[11px] text-gray-500 font-medium">
            <span>Marketing</span>
            <span>›</span>
            <span className="text-blue-600 font-semibold">Quản lý Khuyến mãi & Flash Sale</span>
          </div>
          <h1 className="text-xl font-black text-gray-900 mt-1 flex items-center gap-2">
            <HiOutlineTicket className="w-6 h-6 text-blue-600" />
            <span>Chương Trình Khuyến Mãi & Cấu Hình Ưu Đãi (Campaign Builder)</span>
          </h1>
          <p className="text-gray-500 mt-0.5">
            Thiết lập Flash Sale, mã voucher giảm giá %, giảm tiền mặt và gói quà tặng combo.
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs transition flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <HiOutlinePlus className="w-4 h-4" />
          <span>+ Set up Chương trình Mới</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">⚡</div>
          <div>
            <div className="text-[11px] font-medium text-gray-500">Chiến dịch đang chạy</div>
            <div className="text-lg font-black text-emerald-600">{activeCount} chương trình</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">🎟️</div>
          <div>
            <div className="text-[11px] font-medium text-gray-500">Lượt voucher đã dùng</div>
            <div className="text-lg font-black text-blue-700">{totalUsed} lượt</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-lg">🎁</div>
          <div>
            <div className="text-[11px] font-medium text-gray-500">Tổng chương trình</div>
            <div className="text-lg font-black text-purple-700">{promotions.length} campaign</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg">📅</div>
          <div>
            <div className="text-[11px] font-medium text-gray-500">Sắp diễn ra</div>
            <div className="text-lg font-black text-amber-600">
              {promotions.filter(p => p.status === 'scheduled').length} chiến dịch
            </div>
          </div>
        </div>
      </div>

      {/* Campaigns Grid */}
      {loading ? (
        <div className="py-16"><LoadingSpinner /></div>
      ) : promotions.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-2xs py-16 text-center">
          <div className="text-4xl mb-3">🎟️</div>
          <p className="font-medium text-gray-600">Chưa có chương trình khuyến mãi nào</p>
          <p className="text-[11px] text-gray-400 mt-1">Bấm "+ Set up Chương trình Mới" để bắt đầu</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {promotions.map((p) => {
            const gifts = Array.isArray(p.gifts) ? p.gifts : (typeof p.gifts === 'string' ? JSON.parse(p.gifts || '[]') : []);
            const usagePercent = p.max_uses > 0 ? Math.min(100, Math.round((p.used_count / p.max_uses) * 100)) : 0;

            return (
              <div
                key={p.id}
                className={`bg-white rounded-xl border transition p-4 space-y-3 shadow-2xs flex flex-col justify-between ${
                  p.status === 'active' ? 'border-gray-200 hover:border-blue-400' : 'border-gray-200 bg-gray-50/50 opacity-75'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-gray-900 text-white tracking-wider">
                        {p.code}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getTypeColor(p.type)}`}>
                        {getTypeLabel(p.type, p.discount_value)}
                      </span>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      p.status === 'active' ? 'bg-emerald-100 text-emerald-800'
                      : p.status === 'scheduled' ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-200 text-gray-700'
                    }`}>
                      ● {p.status === 'active' ? 'Đang diễn ra' : p.status === 'scheduled' ? 'Sắp diễn ra' : 'Đã tạm dừng'}
                    </span>
                  </div>

                  <h3 className="font-bold text-gray-900 text-sm mb-1.5 leading-snug">{p.title}</h3>

                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-1.5 text-[11px] text-gray-600 mb-3">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Áp dụng cho:</span>
                      <span className="font-semibold text-gray-900">{p.target_category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Đơn hàng tối thiểu:</span>
                      <span className="font-semibold text-gray-900">{formatVND(p.min_order_value)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Thời gian hiệu lực:</span>
                      <span className="font-semibold text-gray-900">
                        {p.start_date?.split('T')[0]} → {p.end_date?.split('T')[0]}
                      </span>
                    </div>

                    {gifts.length > 0 && (
                      <div className="pt-1.5 border-t border-gray-200 flex items-start gap-1">
                        <HiOutlineGift className="w-3.5 h-3.5 text-purple-600 flex-shrink-0 mt-0.5" />
                        <div className="text-[10px] text-purple-800 font-medium">
                          Tặng kèm: {gifts.join(', ')}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] text-gray-500 font-medium mb-1">
                      <span>Lượt sử dụng ngân sách:</span>
                      <span>
                        <strong className="text-gray-900">{p.used_count}</strong> / {p.max_uses} lượt ({usagePercent}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full ${
                          usagePercent > 80 ? 'bg-red-500' : usagePercent > 50 ? 'bg-amber-500' : 'bg-blue-600'
                        }`}
                        style={{ width: `${usagePercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <button
                    onClick={() => togglePromoStatus(p)}
                    className={`px-3 py-1.5 rounded text-xs font-semibold transition ${
                      p.status === 'active'
                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-800'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {p.status === 'active' ? '⏸️ Tạm dừng' : '▶️ Kích hoạt lại'}
                  </button>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleOpenModal(p)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                      title="Chỉnh sửa"
                    >
                      <HiOutlinePencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deletePromo(p)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                      title="Xoá"
                    >
                      <HiOutlineTrash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL SETUP */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-200">
            <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <HiOutlineTicket className="w-5 h-5 text-blue-600" />
                  <span>{editingPromo ? 'Cấu Hình Lại Chương Trình' : 'Thiết Lập Chương Trình Khuyến Mãi Mới'}</span>
                </h3>
                <p className="text-xs text-gray-500">Cài đặt mức giảm, ngân sách voucher, quà tặng và thời hạn</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <form id="promoForm" onSubmit={handleSavePromo} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-gray-700 font-semibold mb-1">Tên chương trình *</label>
                    <input required value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-600 text-xs"
                      placeholder="VD: Tuần Lễ Vàng ASUS ROG 2026" />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Mã Voucher *</label>
                    <input required value={formData.code}
                      onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-600 text-xs font-mono font-bold uppercase"
                      placeholder="ROG-VIP-2026" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Hình thức ưu đãi *</label>
                    <select value={formData.type}
                      onChange={e => setFormData({...formData, type: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-600 text-xs bg-white">
                      <option value="percent">Giảm theo Phần trăm (%)</option>
                      <option value="cash">Trừ tiền mặt (VND)</option>
                      <option value="combo">Tặng Combo Quà Tặng</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">
                      {formData.type === 'percent' ? 'Tỷ lệ giảm (%) *' : formData.type === 'cash' ? 'Số tiền trừ (VNĐ) *' : 'Giá trị gói quà *'}
                    </label>
                    <input required type="number" min={1} value={formData.discount_value}
                      onChange={e => setFormData({...formData, discount_value: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-600 text-xs" />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Đơn tối thiểu (VNĐ)</label>
                    <input type="number" min={0} value={formData.min_order_value}
                      onChange={e => setFormData({...formData, min_order_value: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-600 text-xs" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Danh mục áp dụng</label>
                    <select value={formData.target_category}
                      onChange={e => setFormData({...formData, target_category: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-600 text-xs bg-white">
                      <option>Tất cả các dòng laptop</option>
                      <option>Laptop Gaming & Đồ Hoạ</option>
                      <option>Laptop Sinh viên & Văn phòng</option>
                      <option>MacBook & Apple Laptop</option>
                      <option>Laptop Doanh Nhân Cao Cấp</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Giới hạn lượt dùng *</label>
                    <input required type="number" min={1} value={formData.max_uses}
                      onChange={e => setFormData({...formData, max_uses: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-600 text-xs" />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Quà tặng combo (phân cách dấu phẩy)</label>
                  <input value={formData.gifts}
                    onChange={e => setFormData({...formData, gifts: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-600 text-xs"
                    placeholder="Balo chống sốc, Chuột không dây Logitech, Bàn di chuột cỡ lớn" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Ngày bắt đầu *</label>
                    <input required type="date" value={formData.start_date}
                      onChange={e => setFormData({...formData, start_date: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-600 text-xs bg-white" />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Ngày kết thúc *</label>
                    <input required type="date" value={formData.end_date}
                      onChange={e => setFormData({...formData, end_date: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-600 text-xs bg-white" />
                  </div>
                </div>
              </form>
            </div>

            <div className="p-3.5 border-t bg-gray-50 flex justify-end gap-2">
              <button type="button" onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold">
                Hủy
              </button>
              <button type="submit" form="promoForm" disabled={saving}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition disabled:opacity-60">
                {saving ? 'Đang lưu...' : editingPromo ? 'Lưu thay đổi' : 'Kích hoạt chương trình'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
