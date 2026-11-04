/**
 * Ma trận quyền hệ thống CMS / ERP Laptop
 */
const ROLE_PERMISSIONS = {
  super_admin: ['*'],
  sales_manager: [
    'order:read:all', 'order:write', 'order:discount:approve', 'order:cancel', 'order:print',
    'product:read', 'customer:read', 'customer:write',
    'promotion:read', 'promotion:write', 'report:read', 'report:sales'
  ],
  sales_executive: [
    'order:read:own', 'order:write',
    'product:read', 'customer:read', 'customer:write',
    'promotion:read', 'report:read',
  ],
  warehouse_manager: [
    'inventory:read', 'inventory:write', 'inventory:serial:manage', 'inventory:alert:config',
    'import:batch', 'product:read'
  ],
  product_manager: [
    'product:read', 'product:write', 'product:delete',
    'catalog:write', 'inventory:read', 'inventory:write',
    'cost:read', 'report:read', 'media:upload', 'import:batch'
  ],
  accountant: [
    'cost:read', 'report:read', 'finance:read', 'finance:reconcile', 'report:export',
    'order:read:all', 'inventory:read', 'product:read'
  ],
  technical_warranty: [
    'warranty:read', 'warranty:write', 'rma:manage', 'tradein:estimate',
    'product:read', 'inventory:serial:read'
  ],
  content_seo: [
    'product:read', 'product:write', 'catalog:write', 'media:upload'
  ],
  data_entry: ['product:read', 'product:write', 'inventory:read', 'media:upload'],
};

function normalizePermissionList(value) {
  if (value == null) return [];

  if (Array.isArray(value)) {
    return value.flatMap((item) => normalizePermissionList(item));
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      return normalizePermissionList(parsed);
    } catch {
      return trimmed
        .split(/[\s,]+/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [String(value)];
}

function permissionMatches(allowed, requested) {
  if (!allowed || !requested) return false;

  const allowedPerm = String(allowed).trim().toLowerCase();
  const requestedPerm = String(requested).trim().toLowerCase();

  // Wildcard '*' được cấp cho người dùng => có toàn bộ quyền
  if (allowedPerm === '*') return true;
  if (allowedPerm === requestedPerm) return true;

  // Xử lý wildcard dạng namespace như 'order:*', 'inventory:*'
  if (allowedPerm.includes('*')) {
    const regexPattern = `^${allowedPerm.replace(/[|\\{}()[\]^$+?.]/g, '\\$&').replace(/\*/g, '.*')}$`;
    const regex = new RegExp(regexPattern);
    return regex.test(requestedPerm);
  }

  return false;
}

function can(userOrRole, permission) {
  if (!userOrRole || !permission) return false;

  const role = typeof userOrRole === 'string' ? userOrRole : userOrRole.role;
  const roleName = String(role || '').trim().toLowerCase();
  if (roleName === 'super_admin') return true;

  const customPerms = typeof userOrRole === 'object' ? normalizePermissionList(userOrRole.custom_permissions) : [];
  const rolePerms = normalizePermissionList(ROLE_PERMISSIONS[role] || []);
  const allPerms = [...new Set([...rolePerms, ...customPerms])];

  if (allPerms.includes('*') || allPerms.some((p) => String(p).trim().toLowerCase() === '*')) {
    return true;
  }

  const requested = String(permission).trim().toLowerCase();
  return allPerms.some((p) => permissionMatches(p, requested));
}

module.exports = { ROLE_PERMISSIONS, can };
