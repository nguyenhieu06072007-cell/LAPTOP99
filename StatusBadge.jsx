import React from 'react';

const StatusBadge = ({ status, type = 'product' }) => {
  const configs = {
    product: {
      draft: { label: 'Nháp', className: 'bg-gray-100 text-gray-800' },
      active: { label: 'Đang bán', className: 'bg-green-100 text-green-800' },
      hidden: { label: 'Đã ẩn', className: 'bg-yellow-100 text-yellow-800' },
      discontinued: { label: 'Ngừng kinh doanh', className: 'bg-red-100 text-red-800' }
    },
    stock: {
      in_stock: { label: 'Còn hàng', className: 'bg-green-100 text-green-800' },
      low_stock: { label: 'Sắp hết', className: 'bg-yellow-100 text-yellow-800' },
      out_of_stock: { label: 'Hết hàng', className: 'bg-red-100 text-red-800' }
    },
    user: {
      active: { label: 'Hoạt động', className: 'bg-green-100 text-green-800' },
      locked: { label: 'Đã khóa', className: 'bg-red-100 text-red-800' }
    }
  };

  const typeConfig = configs[type] || configs.product;
  const statusConfig = typeConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800' };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.className}`}>
      {statusConfig.label}
    </span>
  );
};

export default StatusBadge;
