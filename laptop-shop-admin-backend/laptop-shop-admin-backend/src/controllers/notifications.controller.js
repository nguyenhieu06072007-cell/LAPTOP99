const { z } = require('zod');
const NotificationModel = require('../models/notification.model');
const { asyncHandler } = require('../utils/helpers');

const readSchema = z.union([
  z.object({ all: z.literal(true) }),
  z.object({ ids: z.array(z.string().min(1).max(150)).min(1).max(50) }),
]);

const NotificationsController = {
  markRead: asyncHandler(async (req, res) => {
    await NotificationModel.markRead(req.user, readSchema.parse(req.body));
    res.status(204).end();
  }),
  getNotifications: asyncHandler(async (req, res) => {
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit, 10) || 20));
    const { events, unreadCount } = await NotificationModel.getNotifications({ limit, user: req.user });
    res.set('Cache-Control', 'no-store');
    res.json({ data: events, unread_count: unreadCount });
  }),
};

module.exports = NotificationsController;
