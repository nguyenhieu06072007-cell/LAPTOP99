import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/axios';

const statuses = { pending: 'Chờ duyệt', approved: 'Đã duyệt', replied: 'Đã phản hồi', hidden: 'Đã ẩn' };

export default function ReviewModerationPage() {
  const [reviews, setReviews] = useState([]);
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    api.get('/reviews', { params: { status, page, limit: 20 }, signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        setReviews(data.data);
        setTotal(data.meta.total);
      }).catch((failure) => {
        if (!controller.signal.aborted) setError(failure.message);
      }).finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [status, page, version]);

  async function moderate(id, nextStatus, reply) {
    setBusy(id);
    try {
      if (reply !== undefined) await api.post(`/reviews/${id}/reply`, { admin_reply: reply });
      else await api.patch(`/reviews/${id}/status`, { status: nextStatus });
      setVersion((value) => value + 1);
      toast.success('Đã cập nhật đánh giá');
    } catch (failure) {
      toast.error(failure.message);
    } finally {
      setBusy(null);
    }
  }

  return <section className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h1 className="text-xl font-bold">Duyệt đánh giá sản phẩm</h1>
      <label className="text-sm">Trạng thái <select value={status} className="rounded border p-2"
        onChange={(event) => { setPage(1); setStatus(event.target.value); }}>
        <option value="">Tất cả</option>
        {Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
    </div>
    {loading ? <p>Đang tải đánh giá…</p> : error ? <p role="alert">{error}</p>
      : reviews.length === 0 ? <p>Chưa có đánh giá ở trang này.</p>
        : reviews.map((review) => <article key={review.id} className="space-y-2 rounded border bg-white p-4">
          <h2 className="font-semibold">{review.product_name} · {review.rating} sao</h2>
          <p className="text-sm text-gray-600">{review.customer_name} · {statuses[review.status]}</p>
          <p>{review.comment}</p>
          {review.admin_reply && <p className="text-sm">Phản hồi: {review.admin_reply}</p>}
          <div className="flex flex-wrap gap-2 text-sm">
            {review.status !== 'approved' && <button className="rounded border px-3 py-1" disabled={busy !== null}
              onClick={() => moderate(review.id, 'approved')}>Công khai</button>}
            {review.status !== 'hidden' && <button className="rounded border px-3 py-1" disabled={busy !== null}
              onClick={() => moderate(review.id, 'hidden')}>Ẩn đánh giá</button>}
          </div>
          {review.status !== 'hidden' && <form className="flex flex-wrap gap-2" onSubmit={(event) => {
            event.preventDefault();
            const reply = new FormData(event.currentTarget).get('reply').trim();
            if (reply) moderate(review.id, null, reply);
          }}>
            <input aria-label="Nội dung phản hồi" name="reply" required maxLength={5000}
              placeholder="Nhập phản hồi" className="min-w-48 flex-1 rounded border p-2" />
            <button className="rounded bg-blue-700 px-3 text-white" disabled={busy !== null}>Gửi phản hồi</button>
          </form>}
        </article>)}
    <div className="flex items-center gap-3 text-sm">
      <button disabled={page === 1} onClick={() => setPage(page - 1)}>Trang trước</button>
      <span>Trang {page}</span>
      <button disabled={page * 20 >= total} onClick={() => setPage(page + 1)}>Trang sau</button>
    </div>
  </section>;
}
