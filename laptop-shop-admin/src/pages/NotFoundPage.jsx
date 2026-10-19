import React from 'react';
import { Link } from 'react-router-dom';
import { HiHome } from 'react-icons/hi2';

export default function NotFoundPage() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
      <div className="text-9xl font-extrabold text-gray-200 tracking-widest">
        404
      </div>
      <div className="bg-blue-600 text-white px-2 text-sm rounded rotate-12 absolute">
        Page Not Found
      </div>
      <h1 className="mt-8 text-3xl font-bold text-gray-900">
        Trang không tồn tại
      </h1>
      <p className="mt-4 text-gray-500 max-w-md">
        Xin lỗi, trang bạn đang tìm kiếm không tồn tại, đã bị xóa hoặc tạm thời không thể truy cập.
      </p>
      <Link
        to="/"
        className="mt-8 flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm"
      >
        <HiHome className="w-5 h-5" />
        Quay lại trang chủ
      </Link>
    </div>
  );
}
