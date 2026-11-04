const { pool } = require('../config/db');
const { paging, pageMeta, toInt } = require('../utils/helpers');

const AuditModel = {
  async getAuditLogs(query) {
    const { page, limit, offset } = paging(query, 30);
    const where = [];
    const params = [];
    if (toInt(query.user_id)) { where.push('a.user_id = ?'); params.push(toInt(query.user_id)); }
    if (query.entity) { where.push('a.entity = ?'); params.push(String(query.entity)); }
    if (toInt(query.entity_id)) { where.push('a.entity_id = ?'); params.push(toInt(query.entity_id)); }
    if (query.action) { where.push('a.action = ?'); params.push(String(query.action)); }
    if (query.from && !Number.isNaN(Date.parse(query.from))) { where.push('a.created_at >= ?'); params.push(new Date(query.from)); }
    if (query.to && !Number.isNaN(Date.parse(query.to))) { where.push('a.created_at <= ?'); params.push(new Date(query.to)); }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM audit_logs a ${w}`, params);
    const [rows] = await pool.query(
      `SELECT a.id, a.user_id, u.full_name AS user_name, a.action, a.entity, a.entity_id,
              a.old_values, a.new_values, a.ip_address, a.created_at
         FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id
         ${w} ORDER BY a.id DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);

    return { rows, meta: pageMeta(page, limit, total) };
  },
};

module.exports = AuditModel;

