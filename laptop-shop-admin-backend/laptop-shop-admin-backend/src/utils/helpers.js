const crypto = require('crypto');

class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/** Sinh mã độc nhất an toàn đa luồng, không hardcode năm */
async function generateUniqueCode(db, table, prefix, len = 6) {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  for (let attempt = 0; attempt < 10; attempt++) {
    const rand = crypto.randomBytes(Math.ceil(len / 2)).toString('hex').slice(0, len).toUpperCase();
    const code = `${prefix}-${year}${month}-${rand}`;
    const [rows] = await db.query(`SELECT id FROM ${table} WHERE code = ? LIMIT 1`, [code]);
    if (!rows.length) return code;
  }
  return `${prefix}-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}

/** Tính ngày hết hạn bảo hành theo tháng lịch chuẩn xác (không nhân 30.44 ngày) */
function addCalendarMonths(dateInput, months) {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return new Date();
  const targetMonth = d.getMonth() + Number(months);
  const target = new Date(d);
  target.setMonth(targetMonth);
  // Xử lý tràn tháng (VD: 31/01 + 1 tháng -> 28/02 thay vì 03/03)
  if (target.getMonth() % 12 !== ((targetMonth % 12) + 12) % 12) {
    target.setDate(0);
  }
  return target;
}

/** "Máy tính Đẹp 15" -> "may-tinh-dep-15" */
function slugify(str) {
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Sinh slug chưa tồn tại trong bảng (thêm -2, -3... nếu trùng). `table` chỉ truyền hằng số nội bộ. */
async function uniqueSlug(db, table, base, { excludeId = null, maxLen = 120 } = {}) {
  const root = (slugify(base) || 'item').slice(0, maxLen - 8);
  let slug = root;
  let i = 1;
  for (;;) {
    const sql = `SELECT id FROM ${table} WHERE slug = ?` + (excludeId ? ' AND id <> ?' : '') + ' LIMIT 1';
    const [rows] = await db.query(sql, excludeId ? [slug, excludeId] : [slug]);
    if (!rows.length) return slug;
    i += 1;
    slug = `${root}-${i}`;
  }
}

/** Lấy các key có giá trị !== undefined (để dùng với `SET ?`). */
function pick(obj, keys) {
  const out = {};
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
}

const toInt = (v) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
};

function paging(query, defLimit = 20, maxLimit = 100) {
  const page = Math.max(1, toInt(query.page) || 1);
  const limit = Math.min(maxLimit, Math.max(1, toInt(query.limit) || defLimit));
  return { page, limit, offset: (page - 1) * limit };
}

const pageMeta = (page, limit, total) => ({
  page, limit, total, total_pages: Math.ceil(total / limit),
});

const escapeLike = (s) => String(s).replace(/[\\%_]/g, '\\$&');

/** So sánh giá trị cũ/mới, chỉ giữ field thay đổi (dùng cho audit log). */
function diff(oldRow, changes) {
  const o = {};
  const n = {};
  for (const [k, v] of Object.entries(changes)) {
    if (JSON.stringify(oldRow[k] ?? null) !== JSON.stringify(v ?? null)) {
      o[k] = oldRow[k] ?? null;
      n[k] = v ?? null;
    }
  }
  return { oldValues: o, newValues: n };
}

module.exports = {
  ApiError, asyncHandler, slugify, uniqueSlug, pick, toInt,
  paging, pageMeta, escapeLike, diff,
  generateUniqueCode, addCalendarMonths,
};
