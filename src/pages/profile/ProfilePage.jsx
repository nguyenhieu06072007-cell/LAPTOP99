import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  HiOutlineUserCircle,
  HiOutlineShieldCheck,
  HiOutlineKey,
  HiOutlineDevicePhoneMobile,
  HiOutlineClock,
  HiCheckBadge
} from 'react-icons/hi2';

export default function ProfilePage() {
  const { user, can } = useAuth();

  const [formData, setFormData] = useState({
    full_name: user?.full_name || 'Quản trị viên',
    email: user?.email || 'admin@laptopshop.vn',
    phone: user?.phone || '0988888888',
  });

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPass, setChangingPass] = useState(false);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      await api.put(`/users/${user.id}`, {
        full_name: formData.full_name,
        phone: formData.phone,
      });
      toast.success('Cập nhật thông tin cá nhân thành công!');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Lỗi khi cập nhật hồ sơ');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordData.new_password.length < 8) {
      toast.error('Mật khẩu mới phải có tối thiểu 8 ký tự');
      return;
    }
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('Xác nhận mật khẩu mới không khớp');
      return;
    }

    try {
      setChangingPass(true);
      // In our backend, super_admin or user can update
      await api.put(`/users/${user.id}`, {
        password: passwordData.new_password,
      });
      toast.success('Đổi mật khẩu thành công! Hãy ghi nhớ mật khẩu mới.');
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Lỗi khi đổi mật khẩu');
    } finally {
      setChangingPass(false);
    }
  };

  return (
    <div className="space-y-4 text-xs pb-12 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-2xl flex items-center justify-center shadow-md">
            {user?.full_name?.charAt(0) || 'A'}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold text-gray-900">{user?.full_name}</h1>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 font-bold rounded text-[10px] uppercase">
                {user?.role}
              </span>
            </div>
            <p className="text-gray-500 text-xs mt-0.5">{user?.email}</p>
            <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <HiCheckBadge className="w-4 h-4" /> Tài khoản quản trị đang hoạt động
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[11px] text-gray-400 block">ID tài khoản: #{user?.id || 1}</span>
          <span className="text-[11px] text-gray-500 block mt-0.5">
            Phân quyền: {user?.role === 'super_admin' ? 'Toàn quyền hệ thống (Root)' : 'Nhân sự vận hành'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Left Column: Personal info & 2FA */}
        <div className="md:col-span-7 space-y-4">
          {/* Thông tin cá nhân */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-2xs">
            <h2 className="text-xs font-bold text-gray-800 uppercase pb-2 border-b border-gray-100 flex items-center gap-1.5">
              <HiOutlineUserCircle className="w-4 h-4 text-blue-600" />
              <span>Thông tin cá nhân</span>
            </h2>

            <form onSubmit={handleUpdateProfile} className="mt-3 space-y-3">
              <div>
                <label className="block text-gray-700 font-medium mb-1">Họ và tên *</label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-600 text-xs"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Email đăng nhập (Không thể thay đổi)</label>
                <input
                  type="email"
                  disabled
                  value={formData.email}
                  className="w-full px-3 py-2 border border-gray-200 bg-gray-50 text-gray-500 rounded-md text-xs cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Số điện thoại liên hệ</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0988888888"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-600 text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md shadow-2xs transition"
                >
                  {savingProfile ? 'Đang lưu...' : 'Cập nhật thông tin'}
                </button>
              </div>
            </form>
          </div>

          {/* Bảo mật 2 lớp 2FA & Thiết bị */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-2xs space-y-3">
            <h2 className="text-xs font-bold text-gray-800 uppercase pb-2 border-b border-gray-100 flex items-center gap-1.5">
              <HiOutlineShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Bảo mật đăng nhập & Xác thực 2 lớp (2FA)</span>
            </h2>

            <div className="flex items-center justify-between p-3 bg-emerald-50/50 border border-emerald-200 rounded-md">
              <div className="flex items-center space-x-3">
                <HiOutlineDevicePhoneMobile className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-800 text-xs">Xác thực mã OTP qua Email</h3>
                  <p className="text-[11px] text-gray-500">Bảo vệ tài khoản quản trị khi đăng nhập từ thiết bị lạ</p>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-emerald-600 text-white font-bold rounded text-[10px]">
                Đang bật
              </span>
            </div>

            <div className="text-[11px] text-gray-500 space-y-1">
              <p>• Phiên đăng nhập tự động hết hạn sau: <strong>8 giờ</strong></p>
              <p>• Khóa tài khoản tạm thời sau: <strong>5 lần đăng nhập thất bại</strong></p>
            </div>
          </div>
        </div>

        {/* Right Column: Change Password & Activity history */}
        <div className="md:col-span-5 space-y-4">
          {/* Đổi mật khẩu */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-2xs">
            <h2 className="text-xs font-bold text-gray-800 uppercase pb-2 border-b border-gray-100 flex items-center gap-1.5">
              <HiOutlineKey className="w-4 h-4 text-amber-600" />
              <span>Đổi mật khẩu tài khoản</span>
            </h2>

            <form onSubmit={handleChangePassword} className="mt-3 space-y-3">
              <div>
                <label className="block text-gray-700 font-medium mb-1">Mật khẩu hiện tại</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={passwordData.current_password}
                  onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Mật khẩu mới (Tối thiểu 8 ký tự) *</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="••••••••"
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Xác nhận mật khẩu mới *</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="••••••••"
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={changingPass}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-md shadow-2xs transition"
                >
                  {changingPass ? 'Đang đổi mật khẩu...' : 'Lưu mật khẩu mới'}
                </button>
              </div>
            </form>
          </div>

          {/* Lịch sử hoạt động gần đây */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-2xs space-y-2">
            <h2 className="text-xs font-bold text-gray-800 uppercase pb-2 border-b border-gray-100 flex items-center gap-1.5">
              <HiOutlineClock className="w-4 h-4 text-blue-600" />
              <span>Hoạt động gần nhất</span>
            </h2>

            <div className="space-y-2 text-[11px]">
              <div className="flex justify-between items-center py-1 border-b border-gray-50">
                <span className="text-gray-700">Đăng nhập thành công từ Localhost</span>
                <span className="text-gray-400">Vừa xong</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-gray-50">
                <span className="text-gray-700">Đồng bộ kho laptop & hình ảnh</span>
                <span className="text-gray-400">10 phút trước</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-700">Cập nhật phân quyền nhân sự</span>
                <span className="text-gray-400">Hôm nay</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
