const DashboardModel = require('../models/dashboard.model');
const { can } = require('../config/permissions');
const { asyncHandler } = require('../utils/helpers');

const DashboardController = {
  getDashboard: asyncHandler(async (req, res) => {
    const withCost = can(req.user.role, 'cost:read');
    const range = req.query.range || '30d';

    const data = await DashboardModel.getDashboardData({ range, withCost });
    res.json({ data });
  }),
};

module.exports = DashboardController;

