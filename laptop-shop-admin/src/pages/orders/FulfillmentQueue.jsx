import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/axios';

export default function FulfillmentQueue({ mode, onSaved }) {
  const assigning = mode === 'assignment';
  const [queue, setQueue] = useState([]);
  const [staff, setStaff] = useState([]);
  const [order, setOrder] = useState(null);
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    api.get(assigning ? '/orders/assignment-queue' : '/orders/serial-queue', {
      params: { page, limit: 30 }, signal: controller.signal,
    }).then(({ data }) => {
      if (controller.signal.aborted) return;
      setQueue(data.data);
      setStaff(data.staff || []);
    }).catch((failure) => {
      if (!controller.signal.aborted) setError(failure.message);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [assigning, page, version]);

  async function save(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = assigning
      ? { staff_id: Number(form.get('staff_id')) }
      : { lines: order.items.map((_, index) => form.get(`line-${index}`).trim().split(/[\s,;]+/).filter(Boolean)) };
    setBusy(true);
    try {
      await api.patch(`/orders/${order.id}/${assigning ? 'assignee' : 'serials'}`, body);
      setOrder(null);
      setVersion((value) => value + 1);
      onSaved?.();
      toast.success(assigning ? 'Đã phân công đơn' : 'Đã gán serial cho đơn');
    } catch (failure) {
      toast.error(failure.message);
    } finally {
      setBusy(false);
    }
  }

  return <section className="space-y-3 rounded border bg-white p-4">
    <h2 className="font-bold">{assigning ? 'Phân công đơn web và đơn của chi nhánh' : 'Đơn chờ gán serial'}</h2>
    {loading ? <p>Đang tải danh sách…</p> : error ? <p role="alert">{error}</p>
      : queue.length === 0 ? <p>Chưa có đơn ở trang này.</p>
        : <ul className="divide-y">{queue.map((row) => <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
          <span>{row.code} · {row.branch} {assigning && `· ${row.product_name} · ${row.assigned_to ? 'Đã phân công' : 'Chờ phân công'}`}</span>
          <button onClick={() => setOrder(row)} disabled={busy} className="rounded border px-3 py-1">
            {assigning ? 'Chọn nhân viên' : 'Gán serial'}
          </button>
        </li>)}</ul>}
    {order && <form key={order.id} onSubmit={save} className="space-y-2 rounded bg-slate-50 p-3">
      <h3 className="font-semibold">{order.code}</h3>
      {assigning ? <label className="block">Nhân viên phụ trách
        <select name="staff_id" required className="ml-2 rounded border p-2" defaultValue={order.assigned_to || ''}>
          <option value="">Chọn nhân viên</option>
          {staff.map((person) => <option key={person.id} value={person.id}>{person.full_name} · {person.branch}</option>)}
        </select>
      </label> : order.items.map((item, index) => <label className="block" key={index}>
        {item.name} · {item.sku} · {item.qty} máy
        <textarea required name={`line-${index}`} className="mt-1 block w-full rounded border p-2"
          placeholder="Nhập mỗi serial trên một dòng" />
      </label>)}
      <div className="flex gap-2">
        <button disabled={busy} className="rounded bg-blue-700 px-3 py-1.5 text-white">Lưu</button>
        <button type="button" onClick={() => setOrder(null)} disabled={busy}>Đóng</button>
      </div>
    </form>}
    <div className="flex gap-3">
      <button disabled={loading || page === 1} onClick={() => setPage(page - 1)}>Trang trước</button>
      <span>Trang {page}</span>
      <button disabled={loading || queue.length < 30} onClick={() => setPage(page + 1)}>Trang sau</button>
    </div>
  </section>;
}
