import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/axios';

const states = { received: 'Đã tiếp nhận', repairing: 'Đang sửa', completed: 'Đã sửa xong', returned: 'Đã trả máy' };

export default function WarrantyCases({ serial, orderCode, mayWrite, delivered }) {
  const [records, setRecords] = useState([]);
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    api.get('/orders/warranty/cases', { params: { serial, order_code: orderCode }, signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setRecords(data.data); })
      .catch((failure) => { if (!controller.signal.aborted) setError(failure.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [serial, orderCode, version]);

  async function save(event, id) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    const note = form.get('note').trim();
    if (!note) return;
    setBusy(true);
    try {
      if (id) await api.patch(`/orders/warranty/cases/${id}`, { note, status: form.get('status') });
      else await api.post('/orders/warranty/cases', { serial, order_code: orderCode, issue: note });
      element.reset();
      setVersion((count) => count + 1);
      toast.success('Đã lưu nhật ký bảo hành');
    } catch (failure) {
      toast.error(failure.message);
    } finally {
      setBusy(false);
    }
  }

  return <section className="space-y-3 border-t pt-3">
    <h4 className="font-bold">Phiếu bảo hành và sửa chữa</h4>
    {loading ? <p>Đang tải hồ sơ…</p> : error ? <p role="alert">{error}</p> : <>
      {records.length === 0 && <p>Chưa có phiếu tiếp nhận cho serial này.</p>}
      {records.map((record) => <article key={record.id} className="space-y-2 rounded border p-3">
        <h5 className="font-bold">Phiếu #{record.id} · {states[record.status]}</h5>
        <ol className="space-y-1 text-gray-700">
          {record.history.map((entry, index) => <li key={index}>
            {new Date(entry.date).toLocaleString('vi-VN')} · {entry.staff} · {states[entry.status]} · {entry.note}
          </li>)}
        </ol>
        {mayWrite && record.status !== 'returned' && <form onSubmit={(event) => save(event, record.id)} className="flex flex-wrap gap-2">
          <select name="status" aria-label="Trạng thái phiếu" className="rounded border p-2">
            {Object.entries(states).slice(Object.keys(states).indexOf(record.status), Object.keys(states).indexOf(record.status) + 2)
              .map(([value, title]) => <option key={value} value={value}>{title}</option>)}
          </select>
          <input name="note" aria-label="Ghi chú sửa chữa" required maxLength={1000} placeholder="Ghi chú sửa chữa" className="flex-1 rounded border p-2" />
          <button disabled={busy} className="rounded bg-blue-700 px-3 text-white">Cập nhật</button>
        </form>}
      </article>)}
      {mayWrite && delivered && records.every((record) => record.status === 'returned') && <form onSubmit={save} className="flex gap-2">
        <input name="note" aria-label="Tình trạng khi tiếp nhận" required maxLength={1000} placeholder="Tình trạng máy khi tiếp nhận" className="flex-1 rounded border p-2" />
        <button disabled={busy} className="rounded bg-blue-700 px-3 text-white">Tạo phiếu tiếp nhận</button>
      </form>}
    </>}
  </section>;
}
