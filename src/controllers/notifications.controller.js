const NotificationModel = require('../models/notification.model');
const { asyncHandler } = require('../utils/helpers');

const NotificationsController = {
  getNotifications: asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit, 10) || 20;
    const notifications = await NotificationModel.getNotifications({ limit });
    res.json({
      data: notifications,
      unread_count: notifications.filter((n) => !n.read).length,
    });
  }),
};

module.exports = NotificationsController;
