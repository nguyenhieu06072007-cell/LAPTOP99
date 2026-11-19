import React, { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import Pagination from '../../components/ui/Pagination';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
const inputClass = 'rounded border p-2 w-full';

async function readImage(entry) {
  const chunks = [];
  let bytes = 0;
  return new Promise((resolve, reject) => {
    const stream = entry.internalStream('uint8array');
    stream.on('data', (chunk) => {
      bytes += chunk.length;
      if (bytes > MAX_FILE_BYTES) {
        stream.pause();
        reject(new Error('Ảnh vượt quá 5 MB.'));
      } else {
        chunks.push(chunk);
      }
    }).on('error', reject).on('end', () => resolve(chunks)).resume();
  });
}

async function parseFiles(workbook, zipFile) {
  if (workbook.size > MAX_FILE_BYTES) throw new Error('File Excel tối đa 5 MB.');
  const { readSheet } = await import('read-excel-file/browser');
  const [header, ...cells] = await readSheet(workbook);
  const columns = (header || []).map((value) => String(value ?? '').trim().toLowerCase());
  if (!columns.includes('sku') || !columns.includes('quantity')) {
    throw new Error('Excel cần 2 cột SKU và Quantity.');
  }
  const rows = cells.flatMap((cells, index) => {
    if (!cells.some((value) => value != null && String(value).trim())) return [];
    const cell = (column) => cells[columns.indexOf(column)];
    const sku = String(cell('sku') ?? '').trim();
    const quantity = Number(cell('quantity'));
    const unitCost = cell('unit_cost');
    if (!sku || !Number.isInteger(quantity) || quantity < 1) {
      throw new Error(`Dòng ${index + 2}: cần SKU và số lượng nguyên dương.`);
    }
    return [{
      sku, quantity,
      unit_cost: unitCost == null || unitCost === '' ? undefined : Number(unitCost),
      serials: String(cell('serials') ?? '').split(/[;,\n]+/).map((value) => value.trim()).filter(Boolean),
      imageName: String(cell('image_file_name') ?? '').trim(),
    }];
  });
  if (!rows.length || rows.length > 100) throw new Error('Mỗi lần nhập từ 1 đến 100 dòng.');
  if (!rows.some((row) => row.imageName)) return rows;
  if (!zipFile || zipFile.size > 30 * 1024 * 1024) throw new Error('Chọn file ZIP ảnh không quá 30 MB.');
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(zipFile);
  for (const row of rows.filter((row) => row.imageName)) {
    const imageName = row.imageName;
    const mime = MIME[imageName.split('.').pop().toLowerCase()];
    const matches = Object.values(zip.files).filter((file) => !file.dir && file.name.split('/').pop() === imageName);
    if (!mime || matches.length !== 1) throw new Error(`Cần một ảnh JPG, PNG hoặc WEBP tên ${imageName} trong ZIP.`);
    row.image = { entry: matches[0], mime };
  }
  return rows;
}

export default function BatchImportPage() {
  const { can } = useAuth();
  const [mode, setMode] = useState('manual');
  const [supplier, setSupplier] = useState('');
  const [warehouse, setWarehouse] = useState('');
  const [notes, setNotes] = useState('');
  const [sku, setSku] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [cost, setCost] = useState('');
  const [serials, setSerials] = useState('');
  const [workbook, setWorkbook] = useState(null);
  const [zipFile, setZipFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const request = useRef(null);
  const [receipts, setReceipts] = useState([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState(null);
  const canReceive = can('inventory:write') && can('import:batch');
  const canUpload = can('product:write') || can('media:upload');

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/inventory/receipts', { params: { page, limit: 20 } });
      setReceipts(data.data || []);
      setMeta(data.meta);
    } catch (error) {
      toast.error(error.message);
    }
  }, [page]);
  useEffect(() => { load(); }, [load]);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setResult(null);
    try {
      const rows = mode === 'batch' ? await parseFiles(workbook, zipFile) : [{
        sku, quantity: Number(quantity), unit_cost: cost === '' ? undefined : Number(cost),
        serials: serials.split('\n').map((value) => value.trim()).filter(Boolean),
      }];
      if (rows.some((row) => row.image) && !canUpload) throw new Error('Tài khoản không có quyền tải ảnh sản phẩm.');
      const payload = {
        supplier, warehouse, notes,
        rows: rows.map(({ sku, quantity, unit_cost, serials }) => ({ sku, quantity, unit_cost, serials })),
      };
      const fingerprint = JSON.stringify(payload);
      if (request.current?.fingerprint !== fingerprint) request.current = { fingerprint, key: crypto.randomUUID() };
      const { data } = await api.post('/inventory/receipts', { ...payload, request_key: request.current.key });
      const imageErrors = [];
      let uploaded = 0;
      if (!data.replayed) {
        for (const entry of data.data) {
          const row = rows[entry.row_number - 1];
          if (!row.image) continue;
          try {
            const chunks = await readImage(row.image.entry);
            const form = new FormData();
            form.append('images', new Blob(chunks, { type: row.image.mime }), row.imageName);
            await api.post(`/products/${entry.product_id}/images`, form);
            uploaded++;
          } catch (error) {
            imageErrors.push(`${row.sku}: ${error.message}`);
          }
        }
      }
      setResult({ count: data.data.length, uploaded, imageErrors, replayed: data.replayed });
      if (page !== 1) setPage(1);
      else await load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  const currency = (value) => value == null ? '—' : Number(value).toLocaleString('vi-VN') + ' ₫';

  return (
    <div className="space-y-4 text-sm">
      <h1 className="text-xl font-bold">Phiếu nhập kho và serial</h1>
      {canReceive && (
        <form onSubmit={submit} className="space-y-3 rounded-xl border bg-white p-4">
          <div className="flex gap-2">
            <button type="button" className="rounded border px-3 py-2" aria-pressed={mode === 'manual'} onClick={() => setMode('manual')}>Nhập thủ công</button>
            <button type="button" className="rounded border px-3 py-2" aria-pressed={mode === 'batch'} onClick={() => setMode('batch')}>Nhập Excel + ZIP</button>
          </div>
          <fieldset disabled={busy} className="grid gap-3 md:grid-cols-2">
            <label>Nhà cung cấp <input className={inputClass} required maxLength={150} value={supplier} onChange={(e) => setSupplier(e.target.value)} /></label>
            <label>Kho nhận <input className={inputClass} required maxLength={150} value={warehouse} onChange={(e) => setWarehouse(e.target.value)} /></label>
            <label className="md:col-span-2">Ghi chú <input className={inputClass} maxLength={255} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
            {mode === 'manual' ? <>
              <label>SKU hiện có <input className={inputClass} required value={sku} onChange={(e) => setSku(e.target.value)} /></label>
              <label>Số lượng <input className={inputClass} type="number" min="1" required value={quantity} onChange={(e) => setQuantity(e.target.value)} /></label>
              <label>Giá nhập (VNĐ) <input className={inputClass} type="number" min="0" value={cost} onChange={(e) => setCost(e.target.value)} /></label>
              <label>Serial (mỗi dòng một mã) <textarea className={inputClass} value={serials} onChange={(e) => setSerials(e.target.value)} /></label>
            </> : <>
              <p className="md:col-span-2 text-gray-600">Excel nhập tồn cho SKU hiện có. Cột bắt buộc: SKU, Quantity. Cột tùy chọn: Unit_Cost, Serials, Image_File_Name.</p>
              <label>Excel (.xlsx) <input className={inputClass} type="file" accept=".xlsx" required onChange={(e) => setWorkbook(e.target.files[0])} /></label>
              <label>Ảnh (.zip, tùy chọn) <input className={inputClass} type="file" accept=".zip" onChange={(e) => setZipFile(e.target.files[0])} /></label>
            </>}
          </fieldset>
          <button type="submit" disabled={busy} className="rounded bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50">{busy ? 'Đang ghi nhận…' : 'Lưu phiếu nhập kho'}</button>
        </form>
      )}
      {result && <div role="status" className="rounded border bg-white p-4">
        {result.replayed ? 'Phiếu này đã được ghi nhận trước đó.' : `Đã ghi nhận ${result.count} dòng nhập kho. Đã tải ${result.uploaded} ảnh.`}
        <button className="ml-3 text-blue-700 underline" onClick={() => { request.current = null; setResult(null); }}>Tạo phiếu khác</button>
        {!!result.imageErrors.length && <ul className="mt-2 list-disc pl-5 text-amber-800">{result.imageErrors.map((error, index) => <li key={index}>{error}</li>)}</ul>}
      </div>}
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="min-w-full text-left">
          <thead><tr>{['Ngày nhập', 'SKU', 'Nhà cung cấp', 'Kho', 'Số lượng', 'Serial', 'Giá nhập', 'Người ghi nhận'].map((title) => <th className="p-3" key={title}>{title}</th>)}</tr></thead>
          <tbody>{receipts.map((row) => <tr key={row.movement_id} className="border-t">
            <td className="p-3">{new Date(row.created_at).toLocaleString('vi-VN')}</td><td className="p-3">{row.sku}</td>
            <td className="p-3">{row.supplier}</td><td className="p-3">{row.warehouse}</td><td className="p-3">{row.quantity}</td>
            <td className="p-3">{row.serials.join(', ') || '—'}</td><td className="p-3">{currency(row.unit_cost)}</td>
            <td className="p-3">{row.created_by || '—'}</td>
          </tr>)}</tbody>
        </table>
        {!receipts.length && <p className="p-4 text-gray-600">Chưa có phiếu nhập kho.</p>}
      </div>
      <Pagination meta={meta} onPageChange={setPage} />
    </div>
  );
}
