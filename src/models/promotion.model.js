const { pool } = require('../config/db');

const PromotionModel = {
  parseGifts(row) {
    if (!row) return row;
    if (typeof row.gifts === 'string') {
      try { row.gifts = JSON.parse(row.gifts); } catch { row.gifts = []; }
    }
    return row;
  },

  async countPromotions(whereClause, params) {
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM promotions p ${whereClause}`, params);
    return total;
  },

  async findPromotions({ whereClause, params, limit, offset }) {
    const [rows] = await pool.query(
      `SELECT p.*, u.full_name AS created_by_name
         FROM promotions p
         LEFT JOIN users u ON u.id = p.created_by
         ${whereClause}
        ORDER BY p.created_at DESC, p.id DESC
        LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return rows.map(PromotionModel.parseGifts);
  },

  async findPromotionById(id) {
    const [[row]] = await pool.query(
      `SELECT p.*, u.full_name AS created_by_name
         FROM promotions p
         LEFT JOIN users u ON u.id = p.created_by
        WHERE p.id = ?`,
      [id],
    );
    return PromotionModel.parseGifts(row);
  },

  async findByCode(code) {
    const [[dup]] = await pool.query('SELECT id FROM promotions WHERE code = ?', [code]);
    return dup || null;
  },

  async insertPromotion(conn, row) {
    const [res] = await conn.query('INSERT INTO promotions SET ?', [row]);
    return res.insertId;
  },

  async updatePromotion(conn, id, changes) {
    await conn.query('UPDATE promotions SET ? WHERE id = ?', [changes, id]);
  },

  async updateStatus(conn, id, status) {
    await conn.query('UPDATE promotions SET status = ? WHERE id = ?', [status, id]);
  },

  async deletePromotion(conn, id) {
    const [res] = await conn.query('DELETE FROM promotions WHERE id = ?', [id]);
    return res.affectedRows;
  },
};

module.exports = PromotionModel;

