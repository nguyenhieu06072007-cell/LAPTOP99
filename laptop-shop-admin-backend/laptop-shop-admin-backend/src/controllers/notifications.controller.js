const { z } = require('zod');
const NotificationModel = require('../models/notification.model');
const { asyncHandler } = require('../utils/helpers');

const NotificationsController = {
  markRead: asyncHandler(async (req, res) => {
    const { ids } = z.object({ ids: z.array(z.string().min(1).max(150)).min(1).max(50) }).parse(req.body);
    await NotificationModel.markRead(req.user.id, ids);
    res.status(204).end();
  }),
  getNotifications: asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit, 10) || 20;
    const notifications = await NotificationModel.getNotifications({ limit, user: req.user });
    res.json({
      data: notifications,
      unread_count: notifications.filter((n) => !n.read).length,
    });
  }),
};

module.exports = NotificationsController;
