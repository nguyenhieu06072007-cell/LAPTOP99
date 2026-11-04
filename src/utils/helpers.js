/**
 * Format a number as Vietnamese VND currency
 */
export function formatVND(amount) {
  if (amount == null) return '—'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount)
}

/**
 * Format a date string to Vietnamese locale
 */
export function formatDate(dateStr, options) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...options,
  })
}

/**
 * Format a datetime string
 */
export function formatDateTime(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Generate a URL-friendly slug from Vietnamese text
 */
export function slugify(text) {
  if (!text) return ''
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Get inventory movement type label and color
 */
export function getMovementType(type) {
  const map = {
    import: { label: 'Nhập kho', color: 'bg-green-100 text-green-800' },
    export: { label: 'Xuất kho', color: 'bg-red-100 text-red-800' },
    adjust: { label: 'Điều chỉnh', color: 'bg-yellow-100 text-yellow-800' },
    return: { label: 'Hoàn trả', color: 'bg-blue-100 text-blue-800' },
  }
  return map[type] || { label: type, color: 'bg-gray-100 text-gray-800' }
}

/**
 * Get action label and color for audit logs
 */
export function getAuditAction(action) {
  const map = {
    create: { label: 'Tạo mới', color: 'bg-green-100 text-green-800' },
    update: { label: 'Cập nhật', color: 'bg-blue-100 text-blue-800' },
    delete: { label: 'Xoá', color: 'bg-red-100 text-red-800' },
    restore: { label: 'Khôi phục', color: 'bg-purple-100 text-purple-800' },
    login: { label: 'Đăng nhập', color: 'bg-gray-100 text-gray-800' },
    lockout: { label: 'Khoá TK', color: 'bg-red-100 text-red-800' },
    lock: { label: 'Khoá TK', color: 'bg-red-100 text-red-800' },
    unlock: { label: 'Mở khoá', color: 'bg-green-100 text-green-800' },
    change_password: { label: 'Đổi mật khẩu', color: 'bg-yellow-100 text-yellow-800' },
    reset_password: { label: 'Đặt lại MK', color: 'bg-yellow-100 text-yellow-800' },
    add_images: { label: 'Thêm ảnh', color: 'bg-blue-100 text-blue-800' },
    update_image: { label: 'Sửa ảnh', color: 'bg-blue-100 text-blue-800' },
    delete_image: { label: 'Xoá ảnh', color: 'bg-red-100 text-red-800' },
    stock_import: { label: 'Nhập kho', color: 'bg-green-100 text-green-800' },
    stock_export: { label: 'Xuất kho', color: 'bg-red-100 text-red-800' },
    stock_adjust: { label: 'Điều chỉnh kho', color: 'bg-yellow-100 text-yellow-800' },
    stock_return: { label: 'Hoàn trả kho', color: 'bg-blue-100 text-blue-800' },
  }
  return map[action] || { label: action, color: 'bg-gray-100 text-gray-800' }
}

/**
 * Truncate text to a max length
 */
export function truncate(text, max = 50) {
  if (!text || text.length <= max) return text || ''
  return text.slice(0, max) + '…'
}

