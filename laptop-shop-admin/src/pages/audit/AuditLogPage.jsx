import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import Pagination from '../../components/ui/Pagination';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { HiChevronDown, HiChevronUp } from 'react-icons/hi2';
import { Navigate } from 'react-router-dom';

export default function AuditLogPage() {
  const { can } = useAuth();

  if (!can('audit:read')) {
    return <Navigate to="/" replace />;
  }

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    entity: '', action: '', from: '', to: ''
  });

  useEffect(() => {
    fetchLogs();
  }, [page, filters]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/audit-logs', {
        params: { ...filters, page, limit: 10 }
      });
      setLogs(res.data.data);
      setTotal(res.data.meta.total);
    } catch (err) {
      toast.error('Lỗi tải lịch sử hoạt động');
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action) => {
    const colors = {
      create: 'bg-green-100 text-green-800',
      update: 'bg-blue-100 text-blue-800',
      delete: 'bg-red-100 text-red-800',
      login: 'bg-gray-100 text-gray-800'
    };
    const c = colors[action] || 'bg-gray-100 text-gray-800';
    return <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${c} uppercase`}>{action}</span>;
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Lịch sử hệ thống (Audit)</h1>
      </div>

      <div className="flex gap-4 items-center bg-white p-4 rounded-lg shadow-sm">
        <select
          value={filters.entity}
          onChange={(e) => setFilters({ ...filters, entity: e.target.value })}
          className="border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
        >
          <option value="">Tất cả Entity</option>
          <option value="product">Product</option>
          <option value="brand">Brand</option>
          <option value="category">Category</option>
          <option value="user">User</option>
        </select>
        <select
          value={filters.action}
          onChange={(e) => setFilters({ ...filters, action: e.target.value })}
          className="border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
        >
          <option value="">Tất cả hành động</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
        </select>
        <input
          type="date"
          value={filters.from}
          onChange={(e) => setFilters({ ...filters, from: e.target.value })}
          className="border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
        />
        <span className="text-gray-500">-</span>
        <input
          type="date"
          value={filters.to}
          onChange={(e) => setFilters({ ...filters, to: e.target.value })}
          className="border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
        />
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center"><LoadingSpinner /></div>
        ) : (
          <>
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="p-4 w-10"></th>
                  <th className="p-4 font-medium text-gray-600">ID</th>
                  <th className="p-4 font-medium text-gray-600">Người dùng</th>
                  <th className="p-4 font-medium text-gray-600">Hành động</th>
                  <th className="p-4 font-medium text-gray-600">Entity</th>
                  <th className="p-4 font-medium text-gray-600">Entity ID</th>
                  <th className="p-4 font-medium text-gray-600">IP Address</th>
                  <th className="p-4 font-medium text-gray-600">Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.length === 0 ? (
                  <tr><td colSpan="8" className="p-8 text-center text-gray-500">Không có dữ liệu log.</td></tr>
                ) : (
                  logs.map((log) => (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleExpand(log.id)}>
                        <td className="p-4 text-gray-400">
                          {(log.old_values || log.new_values) ? (
                            expandedId === log.id ? <HiChevronUp /> : <HiChevronDown />
                          ) : null}
                        </td>
                        <td className="p-4 text-gray-500 text-sm">#{log.id}</td>
                        <td className="p-4 font-medium">{log.user?.full_name || 'System'}</td>
                        <td className="p-4">{getActionBadge(log.action)}</td>
                        <td className="p-4 text-gray-600">{log.entity}</td>
                        <td className="p-4 text-gray-600">{log.entity_id || '-'}</td>
                        <td className="p-4 text-gray-500 text-sm">{log.ip_address || '-'}</td>
                        <td className="p-4 text-gray-500 text-sm">{new Date(log.created_at).toLocaleString('vi-VN')}</td>
                      </tr>
                      {expandedId === log.id && (log.old_values || log.new_values) && (
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <td colSpan="8" className="p-6">
                            <div className="grid grid-cols-2 gap-6">
                              {log.old_values && (
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Giá trị cũ</h4>
                                  <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">
                                    {JSON.stringify(log.old_values, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.new_values && (
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Giá trị mới</h4>
                                  <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">
                                    {JSON.stringify(log.new_values, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
            <div className="p-4 border-t">
              <Pagination currentPage={page} totalPages={Math.ceil(total / 10)} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
