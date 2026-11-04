import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import Pagination from '../../components/ui/Pagination';
import StatusBadge from '../../components/ui/StatusBadge';
import SearchInput from '../../components/ui/SearchInput';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { toast } from 'react-hot-toast';
import {
  HiPlus,
  HiPencil,
  HiXMark,
  HiCheck,
  HiLockClosed,
  HiLockOpen,
  HiKey,
  HiShieldCheck,
  HiOutlineInformationCircle,
  HiUserGroup,
  HiTableCells,
  HiShieldExclamation,
  HiBuildingStorefront,
  HiEye,
  HiEyeSlash,
  HiArrowPath,
  HiSparkles,
  HiCheckCircle,
  HiExclamationTriangle,
  HiClipboardDocumentCheck,
} from 'react-icons/hi2';
import { Navigate } from 'react-router-dom';

const BRANCH_OPTIONS = [
  'Toàn hệ thống (HQ)',
  'Chi nhánh Hà Nội (123 Thái Hà)',
  'Chi nhánh TP.HCM (456 Lê Hồng Phong)',
  'Chi nhánh Đà Nẵng (789 Nguyễn Văn Linh)',
];

const VISIBILITY_OPTIONS = [
  { value: 'all', label: 'Toàn công ty (Tất cả đơn & khách hàng)', desc: 'Xem toàn bộ dữ liệu trên toàn quốc' },
  { value: 'branch', label: 'Theo Chi nhánh phân công', desc: 'Chỉ xem đơn hàng và tồn kho thuộc chi nhánh của mình' },
  { value: 'own', label: 'Chỉ dữ liệu cá nhân phụ trách (Own Only)', desc: 'Chỉ xem đơn hàng do chính mình tạo / chăm sóc (Chống lộ data VIP)' },
];

const BADGE_COLORS = {
  purple: { bg: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
  indigo: { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500' },
  blue: { bg: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  amber: { bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  emerald: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  cyan: { bg: 'bg-cyan-50 text-cyan-700 border-cyan-200', dot: 'bg-cyan-500' },
  teal: { bg: 'bg-teal-50 text-teal-700 border-teal-200', dot: 'bg-teal-500' },
};

export default function UserListPage() {
  const { user: currentUser, can } = useAuth();

  if (!can('user:manage')) {
    return <Navigate to="/" replace />;
  }

  // Active Main Tab: 'users' | 'roles' | 'matrix' | 'security'
  const [activeTab, setActiveTab] = useState('users');

  // Users State
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Add / Edit User Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userFormData, setUserFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    phone: '',
    role_id: '',
    branch: 'Toàn hệ thống (HQ)',
    data_visibility: 'all',
    custom_permissions: [],
  });
  const [showCustomPermOverride, setShowCustomPermOverride] = useState(false);

  // Create / Edit Role Modal State
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleFormData, setRoleFormData] = useState({
    name: '',
    display_name: '',
    description: '',
    badge_color: 'blue',
    permissions: [],
  });

  // Reset Password Dialog State
  const [resetModalData, setResetModalData] = useState(null);

  // Matrix Bulk Edit State
  const [matrixState, setMatrixState] = useState({});
  const [matrixSaving, setMatrixSaving] = useState(false);

  // Security Policies State
  const [securityPolicies, setSecurityPolicies] = useState({
    idorProtection: true,
    maskCostPrice: true,
    maskCustomerPhone: true,
    enforce2FA: true,
    sessionTimeoutMinutes: 30,
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [search, roleFilter, branchFilter, statusFilter, page]);

  const fetchInitialData = async () => {
    try {
      const [rolesRes, catRes] = await Promise.all([
        api.get('/users/roles'),
        api.get('/users/permissions-catalog'),
      ]);
      setRoles(rolesRes.data.data);
      setCatalog(catRes.data.data);

      // Initialize matrix state
      const initialMatrix = {};
      rolesRes.data.data.forEach((r) => {
        initialMatrix[r.id] = Array.isArray(r.permissions) ? [...r.permissions] : [];
      });
      setMatrixState(initialMatrix);
    } catch (err) {
      console.error('Failed to load roles or catalog', err);
      toast.error('Lỗi tải danh mục quyền hạn và vai trò');
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users', {
        params: {
          search,
          role_id: roleFilter,
          branch: branchFilter,
          status: statusFilter,
          page,
          limit,
        },
      });
      setUsers(res.data.data);
      setTotal(res.data.meta?.total || 0);
    } catch (err) {
      toast.error('Lỗi tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  // Open User Modal
  const handleOpenUserModal = (u = null) => {
    if (u) {
      setEditingUser(u);
      setUserFormData({
        full_name: u.full_name,
        email: u.email,
        phone: u.phone || '',
        role_id: u.role_id,
        branch: u.branch || 'Toàn hệ thống (HQ)',
        data_visibility: u.data_visibility || 'all',
        custom_permissions: Array.isArray(u.custom_permissions) ? u.custom_permissions : [],
      });
      setShowCustomPermOverride((u.custom_permissions && u.custom_permissions.length > 0) || false);
    } else {
      setEditingUser(null);
      const defaultRole = roles[0]?.id || '';
      setUserFormData({
        full_name: '',
        email: '',
        password: '',
        phone: '',
        role_id: defaultRole,
        branch: 'Toàn hệ thống (HQ)',
        data_visibility: 'all',
        custom_permissions: [],
      });
      setShowCustomPermOverride(false);
    }
    setIsUserModalOpen(true);
  };

  // Save User
  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!userFormData.role_id) {
      return toast.error('Vui lòng chọn vai trò chính cho nhân viên');
    }

    try {
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, {
          full_name: userFormData.full_name.trim(),
          phone: userFormData.phone?.trim() || null,
          role_id: Number(userFormData.role_id),
          branch: userFormData.branch,
          data_visibility: userFormData.data_visibility,
          custom_permissions: showCustomPermOverride ? userFormData.custom_permissions : [],
        });
        toast.success(`Cập nhật tài khoản "${userFormData.full_name}" thành công!`);
      } else {
        if (!userFormData.password || userFormData.password.length < 8) {
          return toast.error('Mật khẩu tối thiểu 8 ký tự theo quy định bảo mật');
        }
        await api.post('/users', {
          full_name: userFormData.full_name.trim(),
          email: userFormData.email.trim().toLowerCase(),
          password: userFormData.password,
          phone: userFormData.phone?.trim() || null,
          role_id: Number(userFormData.role_id),
          branch: userFormData.branch,
          data_visibility: userFormData.data_visibility,
          custom_permissions: showCustomPermOverride ? userFormData.custom_permissions : [],
        });
        toast.success(`Tạo nhân viên mới "${userFormData.full_name}" thành công!`);
      }
      setIsUserModalOpen(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || err.message || 'Lỗi lưu thông tin nhân sự');
    }
  };

  // Toggle User Status (Lock / Unlock)
  const handleToggleStatus = async (u) => {
    if (u.id === currentUser?.id) {
      return toast.error('Không thể khoá tài khoản của chính mình');
    }
    const newStatus = u.status === 'active' ? 'locked' : 'active';
    try {
      await api.patch(`/users/${u.id}/status`, { status: newStatus });
      toast.success(newStatus === 'locked' ? `Đã khoá tài khoản ${u.full_name}` : `Đã mở khoá tài khoản ${u.full_name}`);
      fetchUsers();
    } catch (err) {
      toast.error('Lỗi cập nhật trạng thái');
    }
  };

  // Fast Reset Password
  const handleResetPassword = async (u) => {
    const tempPass = 'Laptop@' + Math.floor(100000 + Math.random() * 900000);
    try {
      await api.post(`/users/${u.id}/reset-password`, { new_password: tempPass });
      setResetModalData({
        user: u,
        password: tempPass,
      });
      toast.success('Đã đặt lại mật khẩu ngẫu nhiên thành công');
    } catch (err) {
      toast.error('Lỗi đặt lại mật khẩu');
    }
  };

  // Open Role Modal
  const handleOpenRoleModal = (r = null) => {
    if (r) {
      setEditingRole(r);
      setRoleFormData({
        name: r.name,
        display_name: r.display_name || r.name,
        description: r.description || '',
        badge_color: r.badge_color || 'blue',
        permissions: Array.isArray(r.permissions) ? r.permissions : [],
      });
    } else {
      setEditingRole(null);
      setRoleFormData({
        name: '',
        display_name: '',
        description: '',
        badge_color: 'blue',
        permissions: ['product:read', 'order:read:own'],
      });
    }
    setIsRoleModalOpen(true);
  };

  // Save Role
  const handleSaveRole = async (e) => {
    e.preventDefault();
    try {
      if (editingRole) {
        await api.put(`/users/roles/${editingRole.id}`, {
          display_name: roleFormData.display_name,
          description: roleFormData.description,
          badge_color: roleFormData.badge_color,
          permissions: roleFormData.permissions,
        });
        toast.success(`Cập nhật vai trò "${roleFormData.display_name}" thành công!`);
      } else {
        await api.post('/users/roles', {
          name: roleFormData.name,
          display_name: roleFormData.display_name,
          description: roleFormData.description,
          badge_color: roleFormData.badge_color,
          permissions: roleFormData.permissions,
        });
        toast.success(`Tạo vai trò mới "${roleFormData.display_name}" thành công!`);
      }
      setIsRoleModalOpen(false);
      fetchInitialData();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || err.message || 'Lỗi lưu vai trò');
    }
  };

  // Matrix Cell Toggle
  const handleMatrixToggle = (roleId, permId) => {
    const role = roles.find((r) => r.id === roleId);
    if (role?.name === 'super_admin') {
      return toast.error('Super Admin luôn sở hữu toàn quyền (*)');
    }
    setMatrixState((prev) => {
      const currentPerms = prev[roleId] || [];
      const hasPerm = currentPerms.includes(permId);
      const nextPerms = hasPerm ? currentPerms.filter((p) => p !== permId) : [...currentPerms, permId];
      return {
        ...prev,
        [roleId]: nextPerms,
      };
    });
  };

  // Save Full Matrix Changes
  const handleSaveMatrix = async () => {
    try {
      setMatrixSaving(true);
      for (const r of roles) {
        if (r.name === 'super_admin') continue;
        const perms = matrixState[r.id] || [];
        await api.put(`/users/roles/${r.id}`, { permissions: perms });
      }
      toast.success('Đã lưu toàn bộ thay đổi Ma trận Phân quyền!');
      fetchInitialData();
    } catch (err) {
      toast.error('Lỗi khi lưu ma trận quyền');
    } finally {
      setMatrixSaving(false);
    }
  };

  // Helper: Count stats
  const activeCount = users.filter((u) => u.status === 'active').length;
  const financialAccessCount = users.filter(
    (u) =>
      u.role === 'super_admin' ||
      u.role === 'accountant' ||
      (Array.isArray(u.custom_permissions) && u.custom_permissions.includes('cost:read'))
  ).length;

  return (
    <div className="space-y-6">
      {/* Page Title & Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <div className="flex items-center space-x-2 text-xs text-gray-500 font-medium">
            <span>Hệ thống</span>
            <span>›</span>
            <span>Bảo mật & Phân quyền</span>
            <span>›</span>
            <span className="text-blue-600 font-semibold">RBAC Enterprise</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 mt-1 flex items-center gap-2">
            <HiShieldCheck className="w-7 h-7 text-blue-600" />
            <span>Phân quyền & Kiểm soát Truy cập (RBAC)</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Quản trị nhân sự đa chi nhánh, thiết lập ma trận phân quyền chi tiết (EAV, Kho, S/N, Giá vốn) và bảo vệ dữ liệu khách hàng (Data Visibility).
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleOpenRoleModal()}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-xs font-semibold shadow-xs transition"
          >
            <HiShieldCheck className="w-4 h-4 text-purple-600" />
            <span>+ Tạo Vai trò mới</span>
          </button>
          <button
            onClick={() => handleOpenUserModal()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <HiPlus className="w-4 h-4" />
            <span>Thêm Nhân viên mới</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
            👥
          </div>
          <div>
            <div className="text-[11px] font-medium text-gray-500">Tổng số nhân sự</div>
            <div className="text-lg font-black text-gray-900">{total || users.length} tài khoản</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
            ✅
          </div>
          <div>
            <div className="text-[11px] font-medium text-gray-500">Đang hoạt động</div>
            <div className="text-lg font-black text-emerald-600">{activeCount} nhân sự</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-lg">
            🛡️
          </div>
          <div>
            <div className="text-[11px] font-medium text-gray-500">Nhóm Vai trò (Roles)</div>
            <div className="text-lg font-black text-purple-700">{roles.length} nhóm quyền</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg">
            💰
          </div>
          <div>
            <div className="text-[11px] font-medium text-gray-500">Quyền xem Giá vốn/Doanh thu</div>
            <div className="text-lg font-black text-amber-700">{financialAccessCount} tài khoản (Bảo mật)</div>
          </div>
        </div>
      </div>

      {/* Main Feature Tabs Navigation */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="flex border-b border-gray-200 bg-gray-50/60 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 py-3 px-5 border-b-2 transition whitespace-nowrap ${
              activeTab === 'users'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
            }`}
          >
            <HiUserGroup className="w-4 h-4" />
            <span>1. Quản lý Nhân sự & Phân quyền ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('roles')}
            className={`flex items-center gap-2 py-3 px-5 border-b-2 transition whitespace-nowrap ${
              activeTab === 'roles'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
            }`}
          >
            <HiShieldCheck className="w-4 h-4" />
            <span>2. Danh sách Nhóm Vai trò ({roles.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('matrix')}
            className={`flex items-center gap-2 py-3 px-5 border-b-2 transition whitespace-nowrap ${
              activeTab === 'matrix'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
            }`}
          >
            <HiTableCells className="w-4 h-4" />
            <span>3. Ma trận Phân quyền Chi tiết (Grid Matrix)</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 py-3 px-5 border-b-2 transition whitespace-nowrap ${
              activeTab === 'security'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
            }`}
          >
            <HiShieldExclamation className="w-4 h-4" />
            <span>4. Chính sách Bảo mật & Data Visibility</span>
          </button>
        </div>

        {/* TAB 1: USERS LIST & MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="p-4 space-y-4">
            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              <div className="md:col-span-2">
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="Tìm kiếm theo Tên, Email, SĐT nhân viên..."
                />
              </div>

              <div>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-600 bg-white"
                >
                  <option value="">-- Tất cả Vai trò --</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.display_name || r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-600 bg-white"
                >
                  <option value="">-- Tất cả Chi nhánh --</option>
                  {BRANCH_OPTIONS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-600 bg-white"
                >
                  <option value="">-- Trạng thái --</option>
                  <option value="active">Đang hoạt động</option>
                  <option value="locked">Đang bị khoá</option>
                </select>
              </div>
            </div>

            {/* Users Data Table */}
            <div className="border border-gray-200 rounded-lg overflow-x-auto">
              {loading ? (
                <div className="p-12 flex justify-center items-center">
                  <LoadingSpinner text="Đang tải dữ liệu nhân sự..." />
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-700 font-bold uppercase text-[11px] tracking-wider">
                      <th className="p-3">Nhân sự</th>
                      <th className="p-3">Chi nhánh & SĐT</th>
                      <th className="p-3">Vai trò chính</th>
                      <th className="p-3">Phạm vi Dữ liệu (Visibility)</th>
                      <th className="p-3">Quyền bổ sung</th>
                      <th className="p-3">Trạng thái</th>
                      <th className="p-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="p-8 text-center text-gray-500">
                          Không tìm thấy nhân viên nào phù hợp với bộ lọc tìm kiếm.
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => {
                        const roleObj = roles.find((r) => r.id === u.role_id) || {};
                        const badgeStyle = BADGE_COLORS[roleObj.badge_color || 'blue'] || BADGE_COLORS.blue;
                        const hasCustomPerms = Array.isArray(u.custom_permissions) && u.custom_permissions.length > 0;

                        return (
                          <tr key={u.id} className="hover:bg-blue-50/30 transition">
                            {/* User Name & Email */}
                            <td className="p-3">
                              <div className="flex items-center space-x-2.5">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black flex items-center justify-center text-xs shadow-2xs">
                                  {u.full_name?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                                <div>
                                  <div className="font-bold text-gray-900 flex items-center gap-1.5">
                                    <span>{u.full_name}</span>
                                    {u.id === currentUser?.id && (
                                      <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-1.5 py-0.2 rounded">
                                        Bạn
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-gray-500 text-[11px]">{u.email}</div>
                                </div>
                              </div>
                            </td>

                            {/* Branch & Phone */}
                            <td className="p-3">
                              <div className="font-medium text-gray-800 flex items-center gap-1">
                                <HiBuildingStorefront className="w-3.5 h-3.5 text-gray-400" />
                                <span>{u.branch || 'Toàn hệ thống'}</span>
                              </div>
                              <div className="text-gray-500 text-[11px]">{u.phone || 'Chưa cập nhật SĐT'}</div>
                            </td>

                            {/* Main Role Badge */}
                            <td className="p-3">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${badgeStyle.bg}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${badgeStyle.dot}`} />
                                <span>{u.role_display_name || roleObj.display_name || u.role}</span>
                              </span>
                            </td>

                            {/* Data Visibility Scope */}
                            <td className="p-3">
                              {u.data_visibility === 'own' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200 text-[11px] font-medium" title="Chỉ thấy đơn hàng của cá nhân phụ trách">
                                  <span>👤 Chỉ đơn cá nhân</span>
                                </span>
                              ) : u.data_visibility === 'branch' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-medium" title="Chỉ thấy dữ liệu trong chi nhánh">
                                  <span>🏢 Chi nhánh phụ trách</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium" title="Toàn quyền xem dữ liệu cả nước">
                                  <span>🌐 Toàn công ty (All)</span>
                                </span>
                              )}
                            </td>

                            {/* Custom Permissions Override */}
                            <td className="p-3">
                              {hasCustomPerms ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-semibold">
                                  <HiSparkles className="w-3 h-3 text-purple-500" />
                                  <span>+{u.custom_permissions.length} quyền riêng</span>
                                </span>
                              ) : (
                                <span className="text-gray-400 text-[11px]">Chuẩn theo vai trò</span>
                              )}
                            </td>

                            {/* Status Badge */}
                            <td className="p-3">
                              <StatusBadge status={u.status} />
                            </td>

                            {/* Actions */}
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end space-x-1.5">
                                <button
                                  onClick={() => handleOpenUserModal(u)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                                  title="Chỉnh sửa & Cấp quyền riêng"
                                >
                                  <HiPencil className="w-4 h-4" />
                                </button>

                                <button
                                  onClick={() => handleResetPassword(u)}
                                  className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition"
                                  title="Đặt lại mật khẩu nhanh"
                                >
                                  <HiKey className="w-4 h-4" />
                                </button>

                                <button
                                  onClick={() => handleToggleStatus(u)}
                                  disabled={u.id === currentUser?.id}
                                  className={`p-1.5 rounded transition ${
                                    u.id === currentUser?.id
                                      ? 'text-gray-300 cursor-not-allowed'
                                      : u.status === 'active'
                                      ? 'text-red-600 hover:bg-red-50'
                                      : 'text-emerald-600 hover:bg-emerald-50'
                                  }`}
                                  title={u.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                                >
                                  {u.status === 'active' ? (
                                    <HiLockClosed className="w-4 h-4" />
                                  ) : (
                                    <HiLockOpen className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {total > limit && (
              <div className="pt-2 flex justify-end">
                <Pagination
                  currentPage={page}
                  totalPages={Math.ceil(total / limit)}
                  onPageChange={setPage}
                />
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ROLES & GROUPS LIST */}
        {activeTab === 'roles' && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Danh sách các Nhóm Vai trò (Roles) trong Hệ thống</h3>
                <p className="text-xs text-gray-500">
                  Mỗi vai trò đóng gói tập hợp quyền hạn theo vị trí công việc. Nhân viên được gán vai trò sẽ tự động thừa hưởng toàn bộ quyền của vai trò đó.
                </p>
              </div>
              <button
                onClick={() => handleOpenRoleModal()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition"
              >
                <HiPlus className="w-4 h-4" />
                <span>Thêm Vai trò mới</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {roles.map((r) => {
                const badgeStyle = BADGE_COLORS[r.badge_color || 'blue'] || BADGE_COLORS.blue;
                const isSuper = r.name === 'super_admin';
                const permList = Array.isArray(r.permissions) ? r.permissions : [];

                return (
                  <div
                    key={r.id}
                    className="p-4 rounded-xl border border-gray-200 bg-white hover:border-blue-400 hover:shadow-xs transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeStyle.bg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${badgeStyle.dot}`} />
                          <span>{r.display_name || r.name}</span>
                        </span>

                        <span className="text-[11px] font-mono text-gray-400">#{r.name}</span>
                      </div>

                      <p className="text-xs text-gray-600 line-clamp-2 mb-3 min-h-[32px]">
                        {r.description || 'Chưa có mô tả chi tiết cho vai trò này.'}
                      </p>

                      <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-100 text-[11px] text-gray-600 space-y-1 mb-3">
                        <div className="font-semibold text-gray-700 flex items-center justify-between">
                          <span>Quyền hạn được cấp:</span>
                          <span className="text-blue-600 font-bold">
                            {isSuper ? 'Toàn quyền tối cao (*)' : `${permList.length} chức năng`}
                          </span>
                        </div>
                        {!isSuper && permList.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {permList.slice(0, 4).map((p) => (
                              <span key={p} className="px-1.5 py-0.2 bg-white border border-gray-200 rounded text-[10px] text-gray-700 font-mono">
                                {p}
                              </span>
                            ))}
                            {permList.length > 4 && (
                              <span className="px-1.5 py-0.2 bg-gray-200/60 rounded text-[10px] text-gray-600">
                                +{permList.length - 4} khác
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-[11px] text-gray-400">
                        {users.filter((u) => u.role_id === r.id).length} nhân sự thuộc nhóm
                      </span>
                      <button
                        onClick={() => handleOpenRoleModal(r)}
                        className="px-2.5 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded font-semibold transition"
                      >
                        Chỉnh sửa quyền ›
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: GRANULAR PERMISSION MATRIX GRID */}
        {activeTab === 'matrix' && (
          <div className="p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
              <div className="flex items-center space-x-2 text-xs text-blue-900">
                <HiOutlineInformationCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <span>
                  Bảng ma trận chéo thể hiện quyền hạn của từng Vai trò đối với từng tính năng cụ thể. Bạn có thể bấm vào ô để bật/tắt quyền và nhấn nút "Lưu thay đổi".
                </span>
              </div>
              <button
                onClick={handleSaveMatrix}
                disabled={matrixSaving}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition flex-shrink-0"
              >
                {matrixSaving ? <LoadingSpinner size="sm" /> : <HiClipboardDocumentCheck className="w-4 h-4" />}
                <span>Lưu thay đổi Ma trận</span>
              </button>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-100/80 border-b border-gray-200">
                    <th className="p-3 w-80 text-gray-800 font-bold uppercase text-[11px]">
                      Phân hệ & Chức năng chi tiết
                    </th>
                    {roles.map((r) => (
                      <th key={r.id} className="p-3 text-center text-gray-800 font-bold text-[11px] whitespace-nowrap min-w-[120px]">
                        <div>{r.display_name || r.name}</div>
                        <span className="text-[10px] font-normal text-gray-500 font-mono">#{r.name}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {catalog.map((cat) => (
                    <React.Fragment key={cat.module}>
                      {/* Module Group Header Row */}
                      <tr className="bg-gray-50 font-bold text-gray-800">
                        <td colSpan={roles.length + 1} className="py-2.5 px-3 border-t border-b border-gray-200">
                          <span className="text-blue-700 text-xs">📁 {cat.module_name}</span>
                          <span className="text-[11px] text-gray-400 font-normal ml-2">({cat.description})</span>
                        </td>
                      </tr>

                      {/* Permission Rows under this Module */}
                      {cat.permissions.map((perm) => (
                        <tr key={perm.id} className="hover:bg-blue-50/20 transition">
                          <td className="p-3 border-r border-gray-100">
                            <div className="font-semibold text-gray-900">{perm.name}</div>
                            <div className="text-[11px] text-gray-500">{perm.desc}</div>
                            <div className="text-[10px] text-gray-400 font-mono mt-0.5">{perm.id}</div>
                          </td>

                          {roles.map((r) => {
                            const isSuper = r.name === 'super_admin';
                            const rolePerms = matrixState[r.id] || [];
                            const isGranted = isSuper || rolePerms.includes(perm.id) || rolePerms.includes('*');

                            return (
                              <td
                                key={r.id}
                                onClick={() => !isSuper && handleMatrixToggle(r.id, perm.id)}
                                className={`p-3 text-center border-r border-gray-100 transition select-none ${
                                  isSuper ? 'cursor-default' : 'cursor-pointer hover:bg-blue-100/50'
                                }`}
                              >
                                {isGranted ? (
                                  <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold shadow-2xs">
                                    <HiCheck className="w-4 h-4" />
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-400">
                                    <span className="text-sm font-black">·</span>
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: SECURITY POLICIES & DATA VISIBILITY */}
        {activeTab === 'security' && (
          <div className="p-5 space-y-6 max-w-4xl">
            <div>
              <h3 className="text-base font-bold text-gray-900">Thiết lập Chính sách Bảo mật & Phòng thủ Lỗ hổng</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Các quy chuẩn an toàn dữ liệu đáp ứng mục II bản đặc tả kỹ thuật: Chống IDOR, chống rò rỉ giá vốn và bảo vệ thông tin khách hàng.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              {/* Policy 1: Zero-Trust IDOR */}
              <div className="p-4 rounded-xl border border-gray-200 bg-white flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                    <span className="text-blue-600">🛡️</span>
                    <span>Cơ chế Phòng vệ Tham chiếu Trực tiếp (Zero-Trust IDOR Prevention)</span>
                  </div>
                  <p className="text-gray-600">
                    Ngăn chặn hoàn toàn việc nhân viên thay đổi ID trên URL (ví dụ: <code className="bg-gray-100 px-1 py-0.5 rounded">/orders/10</code> thành <code className="bg-gray-100 px-1 py-0.5 rounded">/orders/11</code>). Mọi truy vấn database đều tự động kiểm tra quyền sở hữu (Context User ID) trước khi trả về dữ liệu.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={securityPolicies.idorProtection}
                    onChange={(e) => {
                      setSecurityPolicies({ ...securityPolicies, idorProtection: e.target.checked });
                      toast.success('Đã cập nhật chính sách Zero-Trust IDOR');
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Policy 2: Mask Cost Price */}
              <div className="p-4 rounded-xl border border-gray-200 bg-white flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                    <span className="text-amber-600">💰</span>
                    <span>Ẩn Giá vốn & Biên Lợi nhuận đối với Bộ phận Kho & Bán lẻ</span>
                  </div>
                  <p className="text-gray-600">
                    Ẩn cột Giá nhập trên màn hình Danh sách sản phẩm, Phiếu kiểm kho và Phiếu xuất hàng. Chỉ Super Admin và Kế toán mới được phân quyền xem giá vốn thực tế của từng SKU.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={securityPolicies.maskCostPrice}
                    onChange={(e) => {
                      setSecurityPolicies({ ...securityPolicies, maskCostPrice: e.target.checked });
                      toast.success('Đã bật chế độ Ẩn Giá Vốn cho nhân sự vận hành');
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Policy 3: Mask Customer Phone */}
              <div className="p-4 rounded-xl border border-gray-200 bg-white flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                    <span className="text-purple-600">📱</span>
                    <span>Che giấu Số điện thoại Khách hàng VIP (Data Masking)</span>
                  </div>
                  <p className="text-gray-600">
                    Chỉ hiển thị 4 số đuôi (ví dụ: <code className="bg-gray-100 px-1 py-0.5 rounded">098***4321</code>) cho nhân viên không thuộc bộ phận Giao hàng/Chăm sóc trực tiếp để ngăn chặn rủi ro tuồn tệp khách hàng cho đối thủ.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={securityPolicies.maskCustomerPhone}
                    onChange={(e) => {
                      setSecurityPolicies({ ...securityPolicies, maskCustomerPhone: e.target.checked });
                      toast.success('Đã cập nhật chính sách Masking SĐT Khách hàng');
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Policy 4: Enforce 2FA */}
              <div className="p-4 rounded-xl border border-gray-200 bg-white flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                    <span className="text-emerald-600">🔐</span>
                    <span>Bắt buộc Xác thực 2 Lớp (Enforce 2FA via OTP/Authenticator)</span>
                  </div>
                  <p className="text-gray-600">
                    Bắt buộc đối với toàn bộ tài khoản có quyền truy cập module Tài chính, Quản trị hệ thống và Đổi mật khẩu. Tài khoản chưa liên kết 2FA sẽ bị khoá tính năng xuất báo cáo.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={securityPolicies.enforce2FA}
                    onChange={(e) => {
                      setSecurityPolicies({ ...securityPolicies, enforce2FA: e.target.checked });
                      toast.success('Đã kích hoạt chính sách bắt buộc 2FA');
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: ADD / EDIT USER WITH GRANULAR PERMISSIONS */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b bg-gray-50/80">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <HiShieldCheck className="w-5 h-5 text-blue-600" />
                  <span>{editingUser ? 'Chỉnh sửa Nhân viên & Quyền hạn' : 'Thêm Nhân viên mới & Phân quyền (RBAC)'}</span>
                </h2>
                <p className="text-xs text-gray-500">
                  Thiết lập vị trí công việc, chi nhánh công tác, phạm vi dữ liệu và cấp quyền chi tiết
                </p>
              </div>
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 p-1.5 rounded-full transition"
              >
                <HiXMark className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <form id="userModalForm" onSubmit={handleSaveUser} className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Họ và tên nhân viên *</label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Nguyễn Văn Hoàng"
                      value={userFormData.full_name}
                      onChange={(e) => setUserFormData({ ...userFormData, full_name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-600 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Số điện thoại liên hệ</label>
                    <input
                      type="text"
                      placeholder="VD: 0912 345 678"
                      value={userFormData.phone}
                      onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-600 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Email đăng nhập *</label>
                    <input
                      type="email"
                      required
                      disabled={!!editingUser}
                      placeholder="VD: hoang.sale@laptopshop.vn"
                      value={userFormData.email}
                      onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-600 text-xs disabled:bg-gray-100"
                    />
                  </div>

                  {!editingUser && (
                    <div>
                      <label className="block text-gray-700 font-semibold mb-1">Mật khẩu khởi tạo * (Tối thiểu 8 ký tự)</label>
                      <input
                        type="password"
                        required
                        minLength={8}
                        placeholder="••••••••"
                        value={userFormData.password}
                        onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-600 text-xs"
                      />
                    </div>
                  )}
                </div>

                {/* Branch & Data Scope */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-gray-100">
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Chi nhánh công tác *</label>
                    <select
                      value={userFormData.branch}
                      onChange={(e) => setUserFormData({ ...userFormData, branch: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-600 text-xs bg-white"
                    >
                      {BRANCH_OPTIONS.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Phạm vi xem dữ liệu (Data Visibility) *</label>
                    <select
                      value={userFormData.data_visibility}
                      onChange={(e) => setUserFormData({ ...userFormData, data_visibility: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-600 text-xs bg-white"
                    >
                      {VISIBILITY_OPTIONS.map((v) => (
                        <option key={v.value} value={v.value}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Role Selector Grid */}
                <div className="pt-2 border-t border-gray-100">
                  <label className="block text-gray-800 font-bold mb-2 uppercase text-[11px] flex items-center justify-between">
                    <span>Chọn Vai trò chính của Nhân viên *</span>
                    <span className="text-gray-400 font-normal">Thừa hưởng gói quyền theo vai trò</span>
                  </label>

                  {editingUser && editingUser.id === currentUser?.id ? (
                    <div className="p-3 bg-amber-50 text-amber-800 rounded-lg border border-amber-200 text-xs">
                      ⚠️ Bạn đang đăng nhập bằng tài khoản này nên không thể tự thay đổi vai trò của chính mình.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto p-1">
                      {roles.map((r) => {
                        const isSelected = Number(userFormData.role_id) === Number(r.id);
                        const badgeStyle = BADGE_COLORS[r.badge_color || 'blue'] || BADGE_COLORS.blue;

                        return (
                          <div
                            key={r.id}
                            onClick={() => setUserFormData({ ...userFormData, role_id: r.id })}
                            className={`p-3 rounded-xl border cursor-pointer transition flex items-start justify-between ${
                              isSelected
                                ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600 shadow-xs'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/40'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${badgeStyle.bg}`}>
                                  {r.display_name || r.name}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-500 line-clamp-2">
                                {r.description}
                              </p>
                            </div>
                            <input
                              type="radio"
                              name="role_selection_radio"
                              checked={isSelected}
                              onChange={() => setUserFormData({ ...userFormData, role_id: r.id })}
                              className="mt-1 text-blue-600 focus:ring-0"
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* CUSTOM PERMISSION OVERRIDE SECTION */}
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between p-3 bg-purple-50/60 rounded-xl border border-purple-200/80">
                    <div className="flex items-center space-x-2">
                      <HiSparkles className="w-5 h-5 text-purple-600 flex-shrink-0" />
                      <div>
                        <div className="font-bold text-purple-900 text-xs">
                          Cấp thêm quyền riêng lẻ cho nhân viên này (Custom Override)
                        </div>
                        <div className="text-[11px] text-purple-700">
                          Cho phép bổ sung các quyền đặc thù mà không làm thay đổi vai trò mặc định
                        </div>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={showCustomPermOverride}
                        onChange={(e) => setShowCustomPermOverride(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>

                  {showCustomPermOverride && (
                    <div className="mt-3 p-4 bg-gray-50 rounded-xl border border-gray-200 max-h-56 overflow-y-auto space-y-4">
                      {catalog.map((cat) => (
                        <div key={cat.module} className="space-y-1.5">
                          <div className="font-bold text-gray-800 text-[11px] uppercase tracking-wider text-blue-700">
                            {cat.module_name}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {cat.permissions.map((perm) => {
                              const isChecked = userFormData.custom_permissions.includes(perm.id);
                              return (
                                <label
                                  key={perm.id}
                                  className={`flex items-start space-x-2 p-2 rounded-lg border cursor-pointer transition ${
                                    isChecked
                                      ? 'bg-purple-50/70 border-purple-300 text-purple-900 font-semibold'
                                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100/50'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      const next = checked
                                        ? [...userFormData.custom_permissions, perm.id]
                                        : userFormData.custom_permissions.filter((p) => p !== perm.id);
                                      setUserFormData({ ...userFormData, custom_permissions: next });
                                    }}
                                    className="mt-0.5 rounded text-purple-600 focus:ring-0"
                                  />
                                  <div>
                                    <div className="text-[11px] leading-tight">{perm.name}</div>
                                    <div className="text-[10px] text-gray-400 font-mono">{perm.id}</div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t bg-gray-50/80 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsUserModalOpen(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-xs font-semibold"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                form="userModalForm"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
              >
                {editingUser ? 'Lưu thay đổi tài khoản' : 'Tạo mới nhân viên'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE / EDIT ROLE MODAL */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-200">
            <div className="flex justify-between items-center px-6 py-4 border-b bg-gray-50/80">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <HiShieldCheck className="w-5 h-5 text-purple-600" />
                  <span>{editingRole ? `Cấu hình Vai trò: ${editingRole.display_name}` : 'Tạo Vai trò mới (Custom Role)'}</span>
                </h2>
                <p className="text-xs text-gray-500">
                  Thiết lập gói quyền hạn mặc định và màu sắc hiển thị cho nhóm vai trò
                </p>
              </div>
              <button
                onClick={() => setIsRoleModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full transition"
              >
                <HiXMark className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <form id="roleModalForm" onSubmit={handleSaveRole} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Mã định danh vai trò (Code) *</label>
                    <input
                      type="text"
                      required
                      disabled={!!editingRole}
                      placeholder="VD: sales_lead"
                      value={roleFormData.name}
                      onChange={(e) => setRoleFormData({ ...roleFormData, name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-600 text-xs disabled:bg-gray-100 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Tên hiển thị tiếng Việt *</label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Trưởng nhóm Kinh doanh"
                      value={roleFormData.display_name}
                      onChange={(e) => setRoleFormData({ ...roleFormData, display_name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-600 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Mô tả chức năng</label>
                    <input
                      type="text"
                      placeholder="VD: Duyệt chiết khấu, xem báo cáo doanh thu chi nhánh"
                      value={roleFormData.description}
                      onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-600 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Màu sắc thẻ nhãn (Badge Color)</label>
                    <select
                      value={roleFormData.badge_color}
                      onChange={(e) => setRoleFormData({ ...roleFormData, badge_color: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-600 text-xs bg-white"
                    >
                      <option value="blue">Xanh dương (Blue)</option>
                      <option value="indigo">Chàm (Indigo)</option>
                      <option value="purple">Tím (Purple)</option>
                      <option value="emerald">Xanh lục (Emerald)</option>
                      <option value="amber">Vàng cam (Amber)</option>
                      <option value="cyan">Xanh lơ (Cyan)</option>
                      <option value="teal">Xanh mòng két (Teal)</option>
                    </select>
                  </div>
                </div>

                {/* Permissions Tree Checklist */}
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-gray-800 font-bold uppercase text-[11px]">
                      Tích chọn Quyền hạn được cấp cho Vai trò này *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const allPermIds = catalog.flatMap((c) => c.permissions.map((p) => p.id));
                        setRoleFormData({
                          ...roleFormData,
                          permissions: roleFormData.permissions.length === allPermIds.length ? [] : allPermIds,
                        });
                      }}
                      className="text-blue-600 hover:underline text-[11px] font-semibold"
                    >
                      {roleFormData.permissions.length > 0 ? 'Bỏ chọn tất cả' : 'Chọn toàn bộ'}
                    </button>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 max-h-64 overflow-y-auto space-y-4">
                    {catalog.map((cat) => (
                      <div key={cat.module} className="space-y-1.5">
                        <div className="font-bold text-gray-800 text-[11px] uppercase tracking-wider text-blue-700">
                          {cat.module_name}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {cat.permissions.map((perm) => {
                            const isChecked = roleFormData.permissions.includes(perm.id);
                            return (
                              <label
                                key={perm.id}
                                className={`flex items-start space-x-2 p-2 rounded-lg border cursor-pointer transition ${
                                  isChecked
                                    ? 'bg-blue-50/80 border-blue-300 text-blue-900 font-semibold'
                                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100/50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    const next = checked
                                      ? [...roleFormData.permissions, perm.id]
                                      : roleFormData.permissions.filter((p) => p !== perm.id);
                                    setRoleFormData({ ...roleFormData, permissions: next });
                                  }}
                                  className="mt-0.5 rounded text-blue-600 focus:ring-0"
                                />
                                <div>
                                  <div className="text-[11px] leading-tight">{perm.name}</div>
                                  <div className="text-[10px] text-gray-400 font-mono">{perm.id}</div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </form>
            </div>

            <div className="px-6 py-3.5 border-t bg-gray-50/80 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsRoleModalOpen(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-xs font-semibold"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                form="roleModalForm"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
              >
                {editingRole ? 'Lưu cấu hình Vai trò' : 'Tạo mới Vai trò'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: FAST PASSWORD RESET RESULT DIALOG */}
      {resetModalData && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-gray-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto text-xl font-bold">
              🔑
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Mật khẩu tạm thời đã tạo</h3>
              <p className="text-xs text-gray-500 mt-1">
                Vui lòng sao chép và gửi mật khẩu mới cho nhân viên <strong>{resetModalData.user.full_name}</strong>:
              </p>
            </div>

            <div className="p-3 bg-gray-100 rounded-xl border border-gray-300 font-mono text-base font-bold text-blue-600 select-all tracking-wider">
              {resetModalData.password}
            </div>

            <div className="flex gap-2 justify-center">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(resetModalData.password);
                  toast.success('Đã sao chép mật khẩu vào bộ nhớ tạm');
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition"
              >
                📋 Sao chép mật khẩu
              </button>
              <button
                onClick={() => setResetModalData(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-xs font-semibold transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
