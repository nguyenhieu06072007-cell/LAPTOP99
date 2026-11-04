const { pool, withTransaction } = require('../config/db');
const { ApiError, uniqueSlug, diff } = require('../utils/helpers');
const { writeAudit } = require('../services/audit');

const SELECT = `SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.deleted_at IS NULL) AS product_count
                  FROM categories c`;

function buildTree(rows) {
  const map = new Map(rows.map((r) => [r.id, { ...r, children: [] }]));
  const roots = [];
  for (const node of map.values()) {
    if (node.parent_id && map.has(node.parent_id)) map.get(node.parent_id).children.push(node);
    else roots.push(node);
  }
  return roots;
}

/** Gán parent_id = newParent có tạo vòng lặp với `id` không? */
async function wouldCycle(db, id, newParent) {
  const seen = new Set();
  let cur = newParent;
  while (cur) {
    if (cur === id) return true;
    if (seen.has(cur)) break;
    seen.add(cur);
    const [r] = await db.query('SELECT parent_id FROM categories WHERE id = ?', [cur]);
    cur = r[0] ? r[0].parent_id : null;
  }
  return false;
}

const CategoryModel = {
  buildTree,
  wouldCycle,

  async findAll({ tree = false } = {}) {
    const [rows] = await pool.query(`${SELECT} ORDER BY c.sort_order, c.name`);
    return tree ? buildTree(rows) : rows;
  },

  async findById(id) {
    const [[row]] = await pool.query(`${SELECT} WHERE c.id = ?`, [id]);
    return row;
  },

  async create(data, req) {
    const id = await withTransaction(async (conn) => {
      const slug = await uniqueSlug(conn, 'categories', data.slug || data.name);
      const row = { ...data, slug };
      const [r] = await conn.query('INSERT INTO categories SET ?', [row]);
      await writeAudit(conn, req, { action: 'create', entity: 'category', entityId: r.insertId, newValues: row });
      return r.insertId;
    });
    return this.findById(id);
  },

  async update(id, changes, req) {
    await withTransaction(async (conn) => {
      const [[old]] = await conn.query('SELECT * FROM categories WHERE id = ? FOR UPDATE', [id]);
      if (!old) throw new ApiError(404, 'Không tìm thấy danh mục');
      if (changes.parent_id && (await wouldCycle(conn, id, changes.parent_id))) {
        throw new ApiError(400, 'Danh mục cha không hợp lệ (tạo vòng lặp)');
      }
      if (changes.slug) changes.slug = await uniqueSlug(conn, 'categories', changes.slug, { excludeId: id });
      await conn.query('UPDATE categories SET ? WHERE id = ?', [changes, id]);
      const { oldValues, newValues } = diff(old, changes);
      await writeAudit(conn, req, { action: 'update', entity: 'category', entityId: id, oldValues, newValues });
    });
    return this.findById(id);
  },

  async delete(id, req) {
    await withTransaction(async (conn) => {
      const [[old]] = await conn.query('SELECT * FROM categories WHERE id = ? FOR UPDATE', [id]);
      if (!old) throw new ApiError(404, 'Không tìm thấy danh mục');
      const [[{ products }]] = await conn.query('SELECT COUNT(*) AS products FROM products WHERE category_id = ?', [id]);
      const [[{ children }]] = await conn.query('SELECT COUNT(*) AS children FROM categories WHERE parent_id = ?', [id]);
      if (products > 0) throw new ApiError(409, `Danh mục đang có ${products} sản phẩm (kể cả đã xoá mềm), không thể xoá`);
      if (children > 0) throw new ApiError(409, `Danh mục đang có ${children} danh mục con, hãy chuyển/xoá chúng trước`);
      await conn.query('DELETE FROM categories WHERE id = ?', [id]);
      await writeAudit(conn, req, { action: 'delete', entity: 'category', entityId: id, oldValues: old });
    });
    return { id, deleted: true };
  },
};

module.exports = CategoryModel;

