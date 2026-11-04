const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { pool } = require('../config/db');
const { ApiError, asyncHandler, paging, toInt, diff } = require('../utils/helpers');
const { writeAudit } = require('../services/audit');
const UserModel = require('../models/user.model');

const createRoleSchema = z.object({
  name: z.string().trim().min(2).max(50),
  display_name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(255).nullish(),
  badge_color: z.string().trim().default('blue'),
  permissions: z.array(z.string()).default([]),
});

const createSchema = z.object({
  full_name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email().max(150),
  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự').max(72),
  phone: z.string().trim().max(20).nullish(),
  role_id: z.number().int().positive(),
  branch: z.string().trim().nullish(),
  data_visibility: z.enum(['all', 'branch', 'own']).default('all'),
  custom_permissions: z.array(z.string()).nullish(),
});

const updateSchema = z.object({
  full_name: z.string().trim().min(1).max(100).optional(),
  phone: z.string().trim().max(20).nullable().optional(),
  role_id: z.number().int().positive().optional(),
  branch: z.string().trim().nullable().optional(),
  data_visibility: z.enum(['all', 'branch', 'own']).optional(),
  custom_permissions: z.array(z.string()).nullable().optional(),
});

const UsersController = {
  getPermissionsCatalog: (req, res) => {
    res.json({ data: UserModel.PERMISSIONS_CATALOG });
  },

  getRoles: asyncHandler(async (req, res) => {
    const roles = await UserModel.getRoles();
    res.json({ data: roles });
  }),

  createRole: asyncHandler(async (req, res) => {
    const b = createRoleSchema.parse(req.body);
    const roleCode = b.name.toLowerCase().replace(/[^a-z0-9_]/g, '_');

    const existing = await UserModel.findRoleByName(roleCode);
    if (existing) {
      throw new ApiError(400, `Mã vai trò '${roleCode}' đã tồn tại trong hệ thống`);
    }

    const newRole = await UserModel.createRole({
      name: roleCode,
      display_name: b.display_name,
      description: b.description,
      badge_color: b.badge_color,
      permissions: b.permissions,
    });

    await writeAudit(pool, req, {
      action: 'create', entity: 'role', entityId: newRole.id,
      newValues: { name: roleCode, display_name: b.display_name, permissions: b.permissions },
    });

    res.status(201).json({ data: newRole });
  }),

  updateRole: asyncHandler(async (req, res) => {
    const id = toInt(req.params.id);
    const { display_name, description, badge_color, permissions } = req.body;

    const oldRole = await UserModel.findRoleById(id);
    if (!oldRole) throw new ApiError(404, 'Không tìm thấy vai trò');

    if (oldRole.name === 'super_admin' && permissions && !permissions.includes('*')) {
      throw new ApiError(400, 'Không thể thu hồi toàn quyền của vai trò Super Admin');
    }

    const updates = {};
    if (display_name !== undefined) updates.display_name = display_name;
    if (description !== undefined) updates.description = description;
    if (badge_color !== undefined) updates.badge_color = badge_color;
    if (permissions !== undefined) updates.permissions = permissions;

    const updated = await UserModel.updateRole(id, updates);

    await writeAudit(pool, req, {
      action: 'update', entity: 'role', entityId: id,
      oldValues: { display_name: oldRole.display_name, permissions: oldRole.permissions },
      newValues: updates,
    });

    res.json({ data: updated });
  }),

  getUsers: asyncHandler(async (req, res) => {
    const { page, limit, offset } = paging(req.query);
    const { rows, meta } = await UserModel.getUsers({
      page,
      limit,
      offset,
      search: req.query.search,
      role_id: toInt(req.query.role_id),
      branch: req.query.branch,
      status: ['active', 'locked'].includes(req.query.status) ? req.query.status : null,
    });
    res.json({ data: rows, meta });
  }),

  createUser: asyncHandler(async (req, res) => {
    const b = createSchema.parse(req.body);

    const existingEmail = await UserModel.findUserByEmail(b.email);
    if (existingEmail) {
      throw new ApiError(400, 'Địa chỉ email này đã được sử dụng cho một tài khoản khác');
    }

    const hash = await bcrypt.hash(b.password, 10);
    const user = await UserModel.createUser({
      ...b,
      password_hash: hash,
    });

    await writeAudit(pool, req, {
      action: 'create', entity: 'user', entityId: user.id,
      newValues: {
        full_name: b.full_name, email: b.email, role_id: b.role_id,
        branch: b.branch, data_visibility: b.data_visibility, custom_permissions: b.custom_permissions,
      },
    });

    res.status(201).json({ data: user });
  }),

  updateUser: asyncHandler(async (req, res) => {
    const id = toInt(req.params.id);
    const b = updateSchema.parse(req.body);
    if (!Object.keys(b).length) throw new ApiError(400, 'Không có dữ liệu để cập nhật');

    if (id === req.user.id && b.role_id !== undefined && b.role_id !== req.user.role_id) {
      throw new ApiError(400, 'Không thể tự đổi vai trò của chính mình');
    }

    const old = await UserModel.findUserRawById(id);
    if (!old) throw new ApiError(404, 'Không tìm thấy tài khoản');

    const updatedUser = await UserModel.updateUser(id, b);
    const { oldValues, newValues } = diff(old, b);
    await writeAudit(pool, req, { action: 'update', entity: 'user', entityId: id, oldValues, newValues });

    res.json({ data: updatedUser });
  }),

  updateStatus: asyncHandler(async (req, res) => {
    const id = toInt(req.params.id);
    const { status } = z.object({ status: z.enum(['active', 'locked']) }).parse(req.body);
    if (id === req.user.id) throw new ApiError(400, 'Không thể tự khoá chính mình');

    const ok = await UserModel.updateStatus(id, status);
    if (!ok) throw new ApiError(404, 'Không tìm thấy tài khoản');

    await writeAudit(pool, req, {
      action: status === 'locked' ? 'lock' : 'unlock', entity: 'user', entityId: id, newValues: { status },
    });
    res.json({ data: { id, status } });
  }),

  resetPassword: asyncHandler(async (req, res) => {
    const id = toInt(req.params.id);
    const body = req.body && req.body.new_password ? req.body : { new_password: 'Laptop@' + Math.floor(100000 + Math.random() * 900000) };
    const hash = await bcrypt.hash(body.new_password, 10);
    const ok = await UserModel.resetPassword(id, hash);
    if (!ok) throw new ApiError(404, 'Không tìm thấy tài khoản');

    await writeAudit(pool, req, { action: 'reset_password', entity: 'user', entityId: id });
    res.json({ data: { message: 'Đã đặt lại mật khẩu thành công', temporary_password: body.new_password } });
  }),
};

module.exports = UsersController;

