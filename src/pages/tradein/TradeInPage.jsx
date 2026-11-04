import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import {
  HiOutlineArrowPathRoundedSquare,
  HiOutlineCalculator,
  HiOutlineArrowPath,
  HiOutlineCheckCircle,
} from 'react-icons/hi2';

const formatVND = (v) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v || 0);

export default function TradeInPage() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [calcBrand, setCalcBrand] = useState('Apple');
  const [calcModel, setCalcModel] = useState('MacBook Air M1 2020 8GB 256GB');
  const [calcGrade, setCalcGrade] = useState('A');
  const [batteryHealthy, setBatteryHealthy] = useState(true);
  const [screenGood, setScreenGood] = useState(true);
  const [hasCharger, setHasCharger] = useState(true);

  const baseValueMap = {
    'MacBook Air M1 2020 8GB 256GB': 12500000,
    'Dell XPS 13 9300 Core i7 16GB 512GB': 11000000,
    'Asus Zenbook 14 UX425 i5 1135G7': 8500000,
    'Lenovo ThinkPad T14 Gen 2 i5 16GB': 9500000,
    'HP Envy 13 ba1000 i7 16GB': 9000000,
  };

  const getCalculatedPrice = () => {
    let base = baseValueMap[calcModel] || 10000000;
    if (calcGrade === 'B') base *= 0.88;
    if (calcGrade === 'C') base *= 0.72;
    if (!batteryHealthy) base -= 1000000;
    if (!screenGood) base -= 2000000;
    if (!hasCharger) base -= 500000;
    const subsidy = 2000000;
    return {
      rawTradeIn: Math.round(base),
      subsidy,
      totalTradeIn: Math.round(Math.max(base + subsidy, 3000000)),
    };
  };

  const appraisal = getCalculatedPrice();

  const fetchTradeIns = async () => {
    try {
      setLoading(true);
      const res = await api.get('/orders/tradeins/list');
      setContracts(res.data?.data || []);
    } catch (err) {
      toast.error('Không thể tải danh sách yêu cầu thu cũ đổi mới');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTradeIns();
  }, []);

  const handleApproveTradeIn = async (item) => {
    const finalPrice = Number(item.final_price || item.estimated_price || 0);
    try {
      await api.patch(`/orders/tradeins/${item.id}/status`, {
        status: 'Đã định giá',
        final_price: finalPrice,
      });
      setContracts((prev) =>
        prev.map((c) => (c.id === item.id ? { ...c, status: 'Đã định giá', final_price: finalPrice } : c))
      );
      toast.success(`Đã duyệt định giá thu cũ ${item.code}: ${formatVND(finalPrice)}`);
    } catch (err) {
      toast.error('Lỗi duyệt định giá thu cũ');
    }
  };

  if (loading) return <LoadingSpinner fullPage text="Đang tải yêu cầu Thu cũ đổi mới từ khách hàng..." />;

  return (
    <div className="space-y-4 text-xs pb-12">
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-2xs flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <HiOutlineArrowPathRoundedSquare className="w-5 h-5 text-indigo-600" />
            <span>Chương trình Thu cũ Đổi mới & Trợ giá lên đời Laptop ({contracts.length} yêu cầu thực tế)</span>
          </h1>
          <p className="text-[11px] text-gray-500">
            Đồng bộ trực tiếp với các yêu cầu định giá thu cũ do khách hàng gửi trên website. Khi duyệt, khách có thể áp dụng trừ tiền ngay khi đặt đơn.
          </p>
        </div>

        <button
          onClick={() => {
            fetchTradeIns();
            toast.success('Đã đồng bộ danh sách thu cũ đổi mới!');
          }}
          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md flex items-center space-x-1.5 transition"
        >
          <HiOutlineArrowPath className="w-4 h-4" />
          <span>Làm mới</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Calculator */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-2xs space-y-3">
            <h2 className="text-xs font-bold text-gray-800 uppercase pb-2 border-b border-gray-100 flex items-center gap-1.5">
              <HiOutlineCalculator className="w-4 h-4 text-indigo-600" />
              <span>Bảng tính tham khảo định giá thu cũ</span>
            </h2>

            <div className="space-y-2">
              <label className="block text-gray-700 font-semibold">1. Chọn dòng máy tham khảo</label>
              <div className="grid grid-cols-3 gap-2">
                {['Apple', 'Dell', 'Asus', 'Lenovo', 'HP'].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setCalcBrand(b)}
                    className={`py-1.5 rounded font-medium border text-center transition ${
                      calcBrand === b ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>

              <select
                value={calcModel}
                onChange={(e) => setCalcModel(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded bg-white text-xs mt-1"
              >
                {Object.keys(baseValueMap).map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2 pt-2 border-t border-gray-100">
              <label className="block text-gray-700 font-semibold">2. Ngoại quan & Linh kiện</label>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { grade: 'A', name: 'Loại 1 (99%)', desc: 'Đẹp như mới' },
                  { grade: 'B', name: 'Loại 2 (95%)', desc: 'Xước nhẹ' },
                  { grade: 'C', name: 'Loại 3', desc: 'Cấn móp nhẹ' },
                ].map((item) => (
                  <div
                    key={item.grade}
                    onClick={() => setCalcGrade(item.grade)}
                    className={`p-2 rounded border cursor-pointer transition ${
                      calcGrade === item.grade ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className="font-bold block text-gray-800">{item.name}</span>
                    <span className="text-[10px] text-gray-500 block mt-0.5">{item.desc}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5 pt-1 text-[11px]">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" checked={batteryHealthy} onChange={(e) => setBatteryHealthy(e.target.checked)} />
                  <span>Pin tốt (&gt; 80%)</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" checked={screenGood} onChange={(e) => setScreenGood(e.target.checked)} />
                  <span>Màn hình đẹp, không ám ố</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" checked={hasCharger} onChange={(e) => setHasCharger(e.target.checked)} />
                  <span>Đầy đủ sạc zin theo máy</span>
                </label>
              </div>
            </div>

            <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100 space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Giá thu mua máy cũ:</span>
                <span className="font-bold">{formatVND(appraisal.rawTradeIn)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Trợ giá lên đời hãng:</span>
                <span className="font-bold text-emerald-600">+{formatVND(appraisal.subsidy)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-indigo-200 text-sm font-black text-indigo-700">
                <span>Tổng mức thu mua đề xuất:</span>
                <span>{formatVND(appraisal.totalTradeIn)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Real customer trade-in requests */}
        <div className="lg:col-span-7 bg-white rounded-lg border border-gray-200 shadow-2xs overflow-hidden">
          <div className="p-3.5 border-b border-gray-200 bg-gray-50/70 flex items-center justify-between font-bold text-gray-800">
            <span>Danh sách yêu cầu Thu cũ đổi mới từ khách hàng ({contracts.length})</span>
          </div>

          {contracts.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              Chưa có yêu cầu thu cũ đổi mới nào từ khách hàng.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {contracts.map((c) => (
                <div key={c.id} className="p-4 hover:bg-gray-50 transition space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono font-bold text-indigo-600">{c.code}</span>
                      <h4 className="font-bold text-gray-900 text-sm">
                        {c.brand} {c.model} ({c.year}) · RAM {c.ram}GB
                      </h4>
                      <p className="text-gray-500 text-[11px]">
                        Khách hàng: <b>{c.customer_name}</b> · {c.customer_phone} · Tình trạng: {c.condition_desc}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        c.status === 'Đã định giá'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
                    <div>
                      <span className="text-gray-500">Giá tạm tính: </span>
                      <b className="text-gray-800">{formatVND(c.estimated_price)}</b>
                      {c.final_price && (
                        <span className="ml-3 text-emerald-700 font-bold">
                          → Giá duyệt chính thức: {formatVND(c.final_price)}
                        </span>
                      )}
                    </div>

                    {c.status !== 'Đã định giá' && (
                      <button
                        onClick={() => handleApproveTradeIn(c)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold flex items-center gap-1"
                      >
                        <HiOutlineCheckCircle className="w-4 h-4" />
                        <span>Duyệt giá thu mua</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
