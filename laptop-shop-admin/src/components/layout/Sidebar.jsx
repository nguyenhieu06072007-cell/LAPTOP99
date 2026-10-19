import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  HiOutlineSquares2X2,
  HiOutlineFolder,
  HiOutlineComputerDesktop,
  HiOutlinePlusCircle,
  HiOutlineShoppingCart,
  HiOutlineCreditCard,
  HiOutlineArchiveBox,
  HiOutlineArrowDownTray,
  HiOutlineShieldCheck,
  HiOutlineArrowPathRoundedSquare,
  HiOutlineTicket,
  HiOutlineDocumentText,
  HiOutlineUsers,
  HiOutlineChartBarSquare,
  HiOutlineBell,
  HiOutlineSparkles,
  HiOutlineWrenchScrewdriver,
  HiOutlineUserGroup,
  HiOutlineClipboardDocumentList,
  HiArrowRightOnRectangle,
} from 'react-icons/hi2';

export default function Sidebar({ isMobileOpen, setIsMobileOpen }) {
  const { user, logout, can } = useAuth();
  const location = useLocation();

  const menuGroups = [
    {
      items: [
        { name: 'Tổng quan', path: '/', icon: HiOutlineSquares2X2 },
        { name: 'Danh mục', path: '/categories', icon: HiOutlineFolder },
        { name: 'Sản phẩm', path: '/products', icon: HiOutlineComputerDesktop },
        { name: 'Thêm / sửa SP', path: '/products/new', icon: HiOutlinePlusCircle },
        { name: 'Đơn hàng & Thanh toán', path: '/orders', icon: HiOutlineShoppingCart },
        { name: 'Kho', path: '/inventory', icon: HiOutlineArchiveBox },
        { name: 'Nhập hàng', path: '/batch-import', icon: HiOutlineArrowDownTray },
        { name: 'Bảo hành (S/N)', path: '/warranty', icon: HiOutlineShieldCheck },
        { name: 'Đổi trả (RMA)', path: '/returns', icon: HiOutlineArrowPathRoundedSquare },
        { name: 'Thu cũ đổi mới', path: '/trade-in', icon: HiOutlineSparkles },
        { name: 'Khuyến mãi', path: '/promotions', icon: HiOutlineTicket },
        { name: 'Thiết kế Banner', path: '/banners', icon: HiOutlineDocumentText },
        { name: 'Khách hàng', path: '/customers', icon: HiOutlineUsers },
        { name: 'Báo cáo', path: '/reports', icon: HiOutlineChartBarSquare },
        { name: 'Phân quyền', path: '/users', icon: HiOutlineUserGroup, permission: 'user:manage' },
        { name: 'Audit trail', path: '/audit-logs', icon: HiOutlineClipboardDocumentList, permission: 'audit:read' },
      ],
    },
  ];

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/60 lg:hidden backdrop-blur-xs"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-60 bg-[#1e2530] text-gray-300 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        } border-r border-gray-800 select-none`}
      >
        {/* Logo Brand Header */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-gray-800/80 bg-[#191f28]">
          <NavLink to="/" className="flex items-center space-x-2.5 group">
            <img src="/logo-laptop99.png" alt="Laptop99 Logo" className="h-9 w-9 rounded-lg object-cover transition-transform group-hover:scale-105" />
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-extrabold tracking-tight text-white">LAPTOP<span className="text-cyan-400">99</span></span>
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Admin CMS</span>
            </div>
          </NavLink>
        </div>

        {/* Scrollable Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 custom-scrollbar text-[13px]">
          {menuGroups[0].items.map((item) => {
            if (item.permission && !can(item.permission)) return null;
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center px-3.5 py-2.5 rounded-md font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-300 hover:bg-gray-800/70 hover:text-white'
                }`}
                end={item.path === '/'}
              >
                <item.icon className={`w-4 h-4 mr-3 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                <span className="truncate">{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User profile info & logout */}
        <div className="p-3 border-t border-gray-800/80 bg-[#191f28]/60 flex items-center justify-between">
          <div className="flex items-center min-w-0 space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 font-bold text-xs">
              {user?.full_name?.charAt(0) || 'A'}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-white truncate">{user?.full_name || 'Quản trị viên'}</p>
              <p className="text-[11px] text-gray-400 truncate">{user?.email || 'admin@laptopshop.vn'}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded transition"
            title="Đăng xuất"
          >
            <HiArrowRightOnRectangle className="w-5 h-5" />
          </button>
        </div>
      </aside>
    </>
  );
}
