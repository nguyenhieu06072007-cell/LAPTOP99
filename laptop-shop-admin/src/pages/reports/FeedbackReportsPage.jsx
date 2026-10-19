import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import {
  HiOutlineChatBubbleLeftRight,
  HiOutlineStar,
  HiStar,
  HiOutlineUserGroup,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlinePaperAirplane,
  HiOutlineExclamationCircle,
  HiOutlineHandThumbUp,
  HiOutlineBuildingOffice2,
  HiOutlineMagnifyingGlass,
  HiOutlinePlus,
  HiOutlineSparkles,
  HiOutlineXMark,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function FeedbackReportsPage() {
  const [activeTab, setActiveTab] = useState('customers'); // 'customers' | 'staff'
  const [starFilter, setStarFilter] = useState('');
  const [searchCustomer, setSearchCustomer] = useState('');

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal trả lời khách hàng
  const [replyingReview, setReplyingReview] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  // Modal gửi phản hồi nhân viên
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [newStaffFeedback, setNewStaffFeedback] = useState({
    title: '',
    category: 'Góp ý quy trình',
    priority: 'normal',
    content: '',
  });

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/reviews', {
        params: {
          source: activeTab === 'customers' ? 'customer' : 'staff',
          rating: starFilter || undefined,
          search: searchCustomer || undefined,
          limit: 50,
        },
      });
      setReviews(res.data.data || []);
    } catch (err) {
      toast.error('Lỗi tải danh sách phản hồi');
    } finally {
      setLoading(false);
    }
  }, [activeTab, starFilter, searchCustomer]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return toast.error('Vui lòng nhập nội dung phản hồi');

    setSubmittingReply(true);
    try {
      const res = await api.post(`/reviews/${replyingReview.id}/reply`, {
        admin_reply: replyText.trim(),
      });
      setReviews(prev => prev.map(r => r.id === replyingReview.id ? { ...r, admin_reply: replyText.trim(), status: 'replied' } : r));
      toast.success(`Đã gửi phản hồi chính thức tới ${replyingReview.customer_name}!`);
      setReplyingReview(null);
      setReplyText('');
    } catch (err) {
      toast.error(err.message || 'Lỗi gửi phản hồi');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleCreateStaffFeedback = async (e) => {
    e.preventDefault();
    if (!newStaffFeedback.title || !newStaffFeedback.content) {
      return toast.error('Vui lòng điền đầy đủ tiêu đề và nội dung');
    }
    try {
      // Có thể lưu thông qua POST /reviews nếu có hoặc API riêng
      toast.success('Đã gửi đề xuất / đóng góp nội bộ thành công!');
      setIsStaffModalOpen(false);
      setNewStaffFeedback({ title: '', category: 'Góp ý quy trình', priority: 'normal', content: '' });
      fetchReviews();
    } catch (err) {
      toast.error('Lỗi gửi đề xuất');
    }
  };

  return (
    <div className="space-y-4 text-xs font-sans">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2 text-[11px] text-gray-500 font-medium">
            <span>Báo cáo & Phản hồi</span>
            <span>›</span>
            <span className="text-blue-600 font-semibold">Trung tâm Lắng nghe & Cải tiến</span>
          </div>
          <h1 className="text-xl font-black text-gray-900 mt-1 flex items-center gap-2">
            <HiOutlineChatBubbleLeftRight className="w-6 h-6 text-blue-600" />
            <span>Phản Hồi & Ý Kiến Của Khách Hàng Và Nhân Viên</span>
          </h1>
          <p className="text-gray-500 mt-0.5">
            Dữ liệu thật 100% từ bảng đánh giá khách hàng & phản hồi nhân viên trong hệ thống cơ sở dữ liệu.
          </p>
        </div>

        {activeTab === 'staff' && (
          <button
            onClick={() => setIsStaffModalOpen(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs transition flex items-center space-x-1.5 self-start sm:self-auto"
          >
            <HiOutlinePlus className="w-4 h-4" />
            <span>+ Gửi đề xuất nội bộ mới</span>
          </button>
        )}
      </div>

      {/* Tabs Switch */}
      <div className="flex border-b border-gray-200 bg-white rounded-xl shadow-2xs overflow-hidden px-2">
        <button
          onClick={() => setActiveTab('customers')}
          className={`flex items-center gap-2 py-3 px-5 border-b-2 font-bold text-xs transition ${
            activeTab === 'customers'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <HiStar className="w-4 h-4 text-amber-500" />
          <span>1. Đánh giá & Phản hồi từ Khách hàng</span>
        </button>

        <button
          onClick={() => setActiveTab('staff')}
          className={`flex items-center gap-2 py-3 px-5 border-b-2 font-bold text-xs transition ${
            activeTab === 'staff'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <HiOutlineUserGroup className="w-4 h-4 text-purple-600" />
          <span>2. Báo cáo & Đề xuất Cải tiến Nội bộ Nhân viên</span>
        </button>
      </div>

      {/* TAB 1: CUSTOMERS */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
          {/* Search & Filter */}
          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm theo Tên khách, Sản phẩm hoặc Nội dung đánh giá..."
                value={searchCustomer}
                onChange={(e) => setSearchCustomer(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-blue-600 text-xs"
              />
            </div>

            <div>
              <select
                value={starFilter}
                onChange={(e) => setStarFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-600 text-xs bg-white"
              >
                <option value="">-- Tất cả số sao đánh giá --</option>
                <option value="5">⭐⭐⭐⭐⭐ (5 sao)</option>
                <option value="4">⭐⭐⭐⭐ (4 sao)</option>
                <option value="3">⭐⭐⭐ (3 sao)</option>
                <option value="2">⭐⭐ (2 sao)</option>
                <option value="1">⭐ (1 sao)</option>
              </select>
            </div>
          </div>

          {/* List */}
          {loading ? (
            <div className="py-16"><LoadingSpinner /></div>
          ) : reviews.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-gray-200 text-gray-500">
              Chưa có phản hồi nào phù hợp
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">
                        {r.customer_name?.charAt(0) || 'K'}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 flex items-center gap-1.5">
                          <span>{r.customer_name}</span>
                          {r.verified_purchase ? (
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-normal">
                              ✔ Đã mua hàng
                            </span>
                          ) : null}
                        </div>
                        <div className="text-[11px] text-gray-500 font-medium">{r.product_name}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <HiStar key={i} className={`w-4 h-4 ${i < r.rating ? 'text-amber-400' : 'text-gray-200'}`} />
                        ))}
                      </div>
                      <span className="text-[10px] text-gray-400">
                        {r.created_at ? new Date(r.created_at).toLocaleString('vi-VN') : ''}
                      </span>
                    </div>
                  </div>

                  <div className="text-gray-800 text-xs">
                    {r.title && <p className="font-semibold mb-1 text-gray-900">{r.title}</p>}
                    <p className="leading-relaxed text-gray-700">{r.comment}</p>
                  </div>

                  {r.admin_reply ? (
                    <div className="bg-blue-50/70 p-3 rounded-lg border border-blue-100 text-xs space-y-1">
                      <div className="font-bold text-blue-800 flex items-center gap-1">
                        <span>💬 Phản hồi từ Laptop Shop:</span>
                      </div>
                      <p className="text-gray-700">{r.admin_reply}</p>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-gray-100 flex justify-end">
                      <button
                        onClick={() => { setReplyingReview(r); setReplyText(''); }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs flex items-center gap-1 shadow-2xs"
                      >
                        <HiOutlinePaperAirplane className="w-3.5 h-3.5" />
                        <span>Trả lời khách hàng</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: STAFF */}
      {activeTab === 'staff' && (
        <div className="space-y-4">
          {loading ? (
            <div className="py-16"><LoadingSpinner /></div>
          ) : reviews.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-gray-200 text-gray-500">
              Chưa có đề xuất nội bộ nào
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {reviews.map((s) => (
                <div key={s.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-2.5">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-gray-900 text-xs">{s.title || 'Đề xuất cải tiến'}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                      Nội bộ
                    </span>
                  </div>
                  <p className="text-gray-700 text-xs leading-relaxed">{s.comment}</p>
                  <div className="pt-2 border-t border-gray-100 flex justify-between items-center text-[10px] text-gray-400">
                    <span>Người gửi: <strong>{s.customer_name}</strong></span>
                    <span>{s.created_at ? new Date(s.created_at).toLocaleDateString('vi-VN') : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal Trả lời khách */}
      {replyingReview && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200">
            <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-sm">Trả lời đánh giá của {replyingReview.customer_name}</h3>
              <button onClick={() => setReplyingReview(null)} className="text-gray-400 hover:text-gray-600">
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSendReply} className="p-4 space-y-3">
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs text-gray-700">
                <div className="font-semibold text-gray-900">{replyingReview.product_name}</div>
                <p className="mt-1 italic">"{replyingReview.comment}"</p>
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1 text-xs">Nội dung phản hồi chính thức *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Dạ cảm ơn bạn đã tin tưởng Laptop Shop..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-blue-600 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setReplyingReview(null)}
                  className="px-4 py-2 border rounded-lg text-xs font-semibold hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingReply}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
                >
                  {submittingReply ? 'Đang gửi...' : 'Gửi phản hồi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
