import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import {
  HiOutlineShieldCheck,
  HiOutlineMagnifyingGlass,
  HiOutlineQrCode,
  HiOutlineArrowPath,
  HiOutlineCheckCircle,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function WarrantySerialPage() {
  const [serialList, setSerialList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchSerial, setSearchSerial] = useState('');
  const [searchedItem, setSearchedItem] = useState(null);

  const fetchSerials = async () => {
    try {
      setLoading(true);
      const res = await api.get('/orders/serials/list');
      const rows = res.data?.data || [];
      setSerialList(rows);
      if (rows.length > 0 && !searchedItem) {
        setSearchedItem(rows[0]);
      }
    } catch (err) {
      toast.error('Không thể tải danh sách Serial bảo hành từ đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSerials();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchSerial.trim().toLowerCase();
    if (!q) {
      toast.error('Vui lòng nhập Serial Number (S/N) hoặc Mã đơn hàng');
      return;
    }
    const found = serialList.find(
      (s) =>
        s.serial.toLowerCase().includes(q) ||
        (s.order_code || '').toLowerCase().includes(q) ||
        (s.customer || '').toLowerCase().includes(q)
    );
    if (found) {
      setSearchedItem(found);
      toast.success(`Đã tìm thấy thông tin bảo hành S/N: ${found.serial}`);
    } else {
      setSearchedItem(null);
      toast.error(`Không tìm thấy mã Serial "${searchSerial}" trong các đơn hàng thực tế`);
    }
  };

  if (loading) return <LoadingSpinner fullPage text="Đang đồng bộ Serial Number (S/N) từ đơn hàng khách..." />;

  return (
    <div className="space-y-4 text-xs">
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-gray-900">
            Quản lý Bảo hành & Truy vết Serial Number (S/N) Thực Tế ({serialList.length} máy)
          </h2>
          <p className="text-[11px] text-gray-500 mt-1">
            Đồng bộ 100% với các mã Serial Number (S/N) được cấp phát tự động khi khách hàng đặt đơn trên trang khách hàng.
          </p>
        </div>
        <button
          onClick={() => {
            fetchSerials();
            toast.success('Đã đồng bộ danh sách Serial Number mới nhất!');
          }}
          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-bold flex items-center gap-1.5 transition"
        >
          <HiOutlineArrowPath className="w-4 h-4" />
          <span>Làm mới S/N</span>
        </button>
      </div>

      {/* Search Serial bar */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-2xs">
        <form onSubmit={handleSearch} className="flex gap-2 max-w-xl">
          <div className="relative flex-1">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchSerial}
              onChange={(e) => setSearchSerial(e.target.value)}
              placeholder="Nhập mã Serial Number (S/N), mã đơn (DH-2026...) hoặc tên khách hàng..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono text-xs"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md transition shadow-2xs flex items-center space-x-1"
          >
            <HiOutlineQrCode className="w-4 h-4" />
            <span>Tra cứu</span>
          </button>
        </form>

        {serialList.length > 0 && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500">
            <span>Mã S/N thực tế từ đơn khách:</span>
            {serialList.slice(0, 6).map((s) => (
              <button
                key={s.serial}
                type="button"
                onClick={() => {
                  setSearchSerial(s.serial);
                  setSearchedItem(s);
                }}
                className={`px-2 py-0.5 rounded font-mono border transition ${
                  searchedItem?.serial === s.serial
                    ? 'bg-blue-600 text-white border-blue-600 font-bold'
                    : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                }`}
              >
                {s.serial}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Searched details */}
      {searchedItem && (
        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-2xs space-y-4">
          <div className="flex justify-between items-start pb-3 border-b border-gray-100">
            <div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                {searchedItem.status === 'active' ? 'Bảo hành điện tử còn hiệu lực' : 'Đã hết hạn bảo hành'}
              </span>
              <h3 className="font-bold text-gray-900 text-sm mt-1">{searchedItem.product}</h3>
              <p className="font-mono text-blue-600 mt-0.5">
                Serial (S/N): <b>{searchedItem.serial}</b> | Đơn hàng: <b>{searchedItem.order_code}</b>
              </p>
            </div>
            <div className="text-right">
              <span className="text-gray-400 block text-[10px]">Hạn bảo hành đến:</span>
              <span className="font-bold text-gray-800 text-sm">{searchedItem.expiryDate}</span>
              <span className="text-[10px] text-emerald-600 block">({searchedItem.warrantyMonths} tháng chính hãng)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-gray-50 p-3 rounded border border-gray-200">
            <div>
              <span className="text-gray-400 text-[10px]">Khách hàng sở hữu:</span>
              <p className="font-semibold text-gray-800">{searchedItem.customer}</p>
            </div>
            <div>
              <span className="text-gray-400 text-[10px]">Ngày đặt mua / Kích hoạt:</span>
              <p className="font-semibold text-gray-800">{searchedItem.purchaseDate}</p>
            </div>
            <div>
              <span className="text-gray-400 text-[10px]">Chính sách bảo hành:</span>
              <p className="font-semibold text-gray-800">Bảo hành chính hãng & 1 đổi 1 trong 15 ngày</p>
            </div>
          </div>

          {/* History */}
          <div className="space-y-2">
            <h4 className="font-bold text-gray-800 text-xs uppercase">
              Nhật ký kích hoạt & Lịch sử bảo hành
            </h4>
            <div className="space-y-1.5">
              {(searchedItem.history || []).map((h, i) => (
                <div key={i} className="flex justify-between items-center p-2.5 bg-slate-50 border border-gray-200 rounded text-[11px]">
                  <div>
                    <span className="font-semibold text-gray-700">{h.action}</span>
                    <span className="text-gray-400 ml-2">({h.date})</span>
                  </div>
                  <span className="text-gray-500 font-medium">{h.staff}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Full table of all real serial numbers */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-2xs overflow-hidden">
        <div className="p-3.5 border-b border-gray-200 bg-gray-50/70 flex items-center justify-between font-bold text-gray-800">
          <span>Danh sách toàn bộ Serial Number (S/N) từ đơn hàng khách ({serialList.length})</span>
        </div>
        {serialList.length === 0 ? (
          <div className="p-10 text-center text-gray-400">Chưa có mã Serial (S/N) nào được cấp phát.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase text-[10px]">
                  <th className="p-3">Mã Serial (S/N)</th>
                  <th className="p-3">Mã Đơn Hàng</th>
                  <th className="p-3">Sản Phẩm</th>
                  <th className="p-3">Khách Hàng</th>
                  <th className="p-3">Ngày Kích Hoạt</th>
                  <th className="p-3">Hạn Bảo Hành</th>
                  <th className="p-3 text-center">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {serialList.map((item) => (
                  <tr
                    key={item.serial}
                    onClick={() => setSearchedItem(item)}
                    className={`hover:bg-blue-50/40 cursor-pointer transition ${
                      searchedItem?.serial === item.serial ? 'bg-blue-50/60' : ''
                    }`}
                  >
                    <td className="p-3 font-mono font-bold text-blue-600">{item.serial}</td>
                    <td className="p-3 font-mono font-semibold text-gray-800">{item.order_code}</td>
                    <td className="p-3 font-medium text-gray-900 max-w-xs truncate">{item.product}</td>
                    <td className="p-3 text-gray-700">{item.customer}</td>
                    <td className="p-3 text-gray-600">{item.purchaseDate}</td>
                    <td className="p-3 font-semibold text-gray-800">{item.expiryDate} ({item.warrantyMonths}T)</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Còn hạn BH
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
