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

  if (allowedPerm === '*' || requestedPerm === '*') return true;
  if (allowedPerm === requestedPerm) return true;

  const regex = new RegExp(`^${allowedPerm.replace(/[|\\{}()[\]^$+?.]/g, '\\$&').replace(/\*/g, '.*')}$`);
  return regex.test(requestedPerm);
}

function can(userOrRole, permission) {
  if (!userOrRole || !permission) return false;

  const role = typeof userOrRole === 'string' ? userOrRole : userOrRole.role;
  const customPerms = typeof userOrRole === 'object' ? normalizePermissionList(userOrRole.custom_permissions) : [];
  const rolePerms = normalizePermissionList(ROLE_PERMISSIONS[role] || []);
  const allPerms = [...new Set([...rolePerms, ...customPerms])];

  if (allPerms.some((p) => permissionMatches(p, '*')) || String(role || '').trim().toLowerCase() === 'super_admin') {
    return true;
  }

  return allPerms.some((p) => permissionMatches(p, permission));
}

module.exports = { ROLE_PERMISSIONS, can };
