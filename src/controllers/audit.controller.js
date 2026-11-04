const AuditModel = require('../models/audit.model');
const { asyncHandler } = require('../utils/helpers');

const AuditController = {
  getAuditLogs: asyncHandler(async (req, res) => {
    const { rows, meta } = await AuditModel.getAuditLogs(req.query);
    res.json({ data: rows, meta });
  }),
};

module.exports = AuditController;

