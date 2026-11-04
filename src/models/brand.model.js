const { pool } = require('../config/db');

const SELECT = `SELECT b.*, (SELECT COUNT(*) FROM products p WHERE p.brand_id = b.id AND p.deleted_at IS NULL) AS product_count
                  FROM brands b`;

const BrandModel = {
  async findBrands(whereClause, params) {
    const [rows] = await pool.query(
      `${SELECT} ${whereClause} ORDER BY b.sort_order, b.name`,
      params,
    );
    return rows;
  },

  async findBrandById(id) {
    const [[row]] = await pool.query(`${SELECT} WHERE b.id = ?`, [id]);
    return row || null;
  },

  async insertBrand(conn, row) {
    const [r] = await conn.query('INSERT INTO brands SET ?', [row]);
    return r.insertId;
  },

  async updateBrand(conn, id, changes) {
    await conn.query('UPDATE brands SET ? WHERE id = ?', [changes, id]);
  },

  async deleteBrand(conn, id) {
    const [r] = await conn.query('DELETE FROM brands WHERE id = ?', [id]);
    return r.affectedRows;
  },

  async countBrandProducts(conn, id) {
    const [[{ n }]] = await conn.query('SELECT COUNT(*) AS n FROM products WHERE brand_id = ?', [id]);
    return n;
  },
};

module.exports = BrandModel;

