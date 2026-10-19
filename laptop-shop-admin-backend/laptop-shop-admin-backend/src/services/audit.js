/** Ghi nhật ký thao tác. `db` có thể là pool hoặc connection (trong transaction). */
async function writeAudit(db, req, { action, entity, entityId = null, oldValues = null, newValues = null, userId }) {
  await db.query(
    `INSERT INTO audit_logs (user_id, action, entity, entity_id, old_values, new_values, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      userId ?? req?.user?.id ?? null,
      action,
      entity,
      entityId,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null,
      req?.ip ? String(req.ip).slice(0, 45) : null,
    ],
  );
}

module.exports = { writeAudit };
