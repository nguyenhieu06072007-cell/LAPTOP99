const { pool } = require('../config/db');

const ReviewModel = {
  async countReviews(whereClause, params) {
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM product_reviews r ${whereClause}`, params);
    return total;
  },

  async findReviews({ whereClause, params, limit, offset }) {
    const [rows] = await pool.query(
      `SELECT r.*, u.full_name AS replied_by_name
         FROM product_reviews r
         LEFT JOIN users u ON u.id = r.replied_by
         ${whereClause}
        ORDER BY r.created_at DESC, r.id DESC
        LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return rows;
  },

  async findReviewById(id) {
    const [[review]] = await pool.query('SELECT * FROM product_reviews WHERE id = ?', [id]);
    return review || null;
  },

  async updateReply(conn, id, { adminReply, userId }) {
    await conn.query(
      `UPDATE product_reviews
          SET admin_reply = ?, replied_by = ?, replied_at = NOW(), status = 'replied'
        WHERE id = ?`,
      [adminReply, userId, id],
    );
  },

  async updateStatus(conn, id, status) {
    await conn.query('UPDATE product_reviews SET status = ? WHERE id = ?', [status, id]);
  },
};

module.exports = ReviewModel;

