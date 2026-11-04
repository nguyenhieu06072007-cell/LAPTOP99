import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { HiEye, HiEyeSlash, HiShieldCheck, HiKey, HiExclamationTriangle } from 'react-icons/hi2';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@laptopshop.vn');
  const [password, setPassword] = useState('Admin@123456');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // 2FA / OTP State
  const [isOtpMode, setIsOtpMode] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpCountdown, setOtpCountdown] = useState(60);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Vui lòng nhập đầy đủ Email và Mật khẩu.');
      return;
    }
    setErrorMessage('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      setErrorMessage(err.message || 'Email hoặc mật khẩu không chính xác.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) value = value.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    // Auto focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  return (
    <div className="min-h-screen bg-[#e9edf3] flex flex-col justify-center items-center p-4">
      {/* Top Banner Tag */}
      <div className="text-xs text-gray-500 font-medium mb-3">
        Trang 1/21 · Đăng nhập quản trị · Laptop CMS / ERP
      </div>

      {/* Main Outer Container matching wireframe image 1 */}
      <div className="w-full max-w-4xl bg-white border-4 border-gray-800 rounded-2xl shadow-xl overflow-hidden p-6 sm:p-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          
          {/* Left Decorative/Informational Box */}
          <div className="hidden md:block md:col-span-3 border-2 border-dashed border-gray-200 rounded-xl h-72 p-4 text-center text-xs text-gray-400 flex flex-col justify-center items-center">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl mb-3">
              💻
            </div>
            <p className="font-semibold text-gray-600">Hệ thống Quản trị</p>
            <p className="mt-1">E-Commerce & ERP Kho Laptop Đa Biến Thể</p>
          </div>

          {/* Center Main Form */}
          <div className="md:col-span-6 flex flex-col items-center">
            {/* LOGO official */}
            <div className="w-full flex justify-center py-2 mb-3">
              <div className="bg-[#1e2530] px-5 py-2.5 rounded-xl shadow-md border border-gray-700/60 flex items-center space-x-3">
                <img src="/logo-laptop99.png" alt="Laptop99 Logo" className="h-10 w-10 rounded-lg object-cover" />
                <div className="text-left leading-tight">
                  <div className="text-base font-extrabold text-white tracking-tight">LAPTOP<span className="text-cyan-400">99</span></div>
                  <div className="text-[10px] text-gray-300 font-semibold uppercase tracking-wider">Quản trị hệ thống</div>
                </div>
              </div>
            </div>

            {/* Header Title */}
            <div className="w-full bg-gray-200/50 py-2 rounded text-center font-bold text-gray-800 text-sm mb-4">
              Đăng nhập quản trị
            </div>

            {/* Error Notification */}
            {errorMessage && (
              <div className="w-full mb-3 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md flex items-center space-x-2">
                <HiExclamationTriangle className="w-4 h-4 flex-shrink-0 text-red-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            {!isOtpMode ? (
              <form onSubmit={handleSubmit} className="w-full space-y-3">
                {/* Email / Username */}
                <div>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email / Tên đăng nhập"
                    className="w-full px-3.5 py-2.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 transition"
                    required
                  />
                </div>

                {/* Password with Eye icon toggle */}
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mật khẩu"
                    className="w-full px-3.5 py-2.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 pr-10 transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <HiEyeSlash className="w-4 h-4" /> : <HiEye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Remember & Forgot Password row */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center justify-center p-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 text-gray-700">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="mr-2 text-blue-600 rounded"
                    />
                    <span>Ghi nhớ</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => toast('Vui lòng liên hệ Super Admin hoặc nhập email ở khung bên dưới để nhận liên kết khôi phục.')}
                    className="p-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-center"
                  >
                    Quên mật khẩu?
                  </button>
                </div>

                {/* Primary Blue Login Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs tracking-wider rounded-md uppercase transition shadow-md flex items-center justify-center"
                >
                  {loading ? <LoadingSpinner size="sm" /> : 'ĐĂNG NHẬP'}
                </button>

                {/* OTP Switch Button */}
                <button
                  type="button"
                  onClick={() => setIsOtpMode(true)}
                  className="w-full py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium text-xs rounded-md transition"
                >
                  Dùng mã OTP thay mật khẩu
                </button>
              </form>
            ) : (
              <div className="w-full space-y-4">
                <p className="text-xs text-gray-600 text-center">
                  Nhập mã OTP 6 số đã gửi tới email/SĐT của bạn:
                </p>
                <div className="flex justify-center space-x-2">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`otp-${idx}`}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      className="w-9 h-10 border-2 border-gray-300 rounded text-center font-bold text-base focus:border-blue-600 focus:outline-none"
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-md uppercase transition"
                >
                  XÁC NHẬN OTP
                </button>
                <button
                  type="button"
                  onClick={() => setIsOtpMode(false)}
                  className="w-full py-1 text-xs text-gray-500 hover:text-gray-800 text-center block"
                >
                  ← Quay lại dùng mật khẩu
                </button>
              </div>
            )}
          </div>

          {/* Right Decorative Box */}
          <div className="hidden md:block md:col-span-3 border-2 border-dashed border-gray-200 rounded-xl h-72 p-4 text-center text-xs text-gray-400 flex flex-col justify-center items-center">
            <HiShieldCheck className="w-10 h-10 text-emerald-500 mb-2" />
            <p className="font-semibold text-gray-600">Bảo mật RBAC & Audit</p>
            <p className="mt-1 text-[11px]">Bảo vệ chống Brute-force & Khoá tài khoản tự động</p>
          </div>
        </div>

        {/* Bottom 3 Info Boxes matching wireframe Image 1 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6 pt-5 border-t border-gray-200 text-[11px] text-gray-600">
          <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
            <span className="font-semibold text-gray-800 block mb-1">Xác thực 2 lớp (2FA):</span>
            <div className="flex items-center space-x-1 font-mono text-gray-500">
              <span>[_] [_] [_] [_] [_] [_]</span>
            </div>
            <div className="mt-1 flex justify-between text-blue-600">
              <span>Gửi lại (60s)</span>
              <span className="font-semibold cursor-pointer">XÁC NHẬN</span>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
            <span className="font-semibold text-gray-800 block mb-1">Quên mật khẩu:</span>
            <p>Nhập email ➔ Nhận liên kết ➔ Đặt mật khẩu mới an toàn qua Token.</p>
          </div>

          <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
            <span className="font-semibold text-gray-800 block mb-1">Chính sách an ninh:</span>
            <p className="text-gray-500">Lỗi: sai mật khẩu · tài khoản bị khoá (sau 5 lần) · phiên hết hạn · quá số lần thử.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
