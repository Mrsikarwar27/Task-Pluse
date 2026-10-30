import { Notification } from '../models/Notification.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validObjectId } from '../utils/validators.js';

export const listNotifications = asyncHandler(async (req, res) => {
  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('task', 'title status deadline'),
    Notification.countDocuments({ user: req.user._id, isRead: false }),
  ]);

  res.json({ notifications, unreadCount });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  validObjectId(req.params.id, 'Notification');

  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { $set: { isRead: true } },
    { new: true }
  ).populate('task', 'title status deadline');

  if (!notification) throw new ApiError(404, 'Notification not found.');

  res.json({ notification });
});

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { user: req.user._id, isRead: false },
    { $set: { isRead: true } }
  );

  res.json({
    message: 'All notifications marked as read.',
    modifiedCount: result.modifiedCount,
  });
});
