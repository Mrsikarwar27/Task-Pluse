import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { emitToUser } from '../sockets/index.js';

function idOf(value) {
  if (!value) return null;
  return (value._id || value).toString();
}

export async function notifyUsers(recipientIds, { task, type, message }) {
  const uniqueIds = [...new Set(recipientIds.map(idOf).filter(Boolean))];
  if (!uniqueIds.length) return [];

  const taskId = idOf(task);
  const notifications = await Notification.insertMany(
    uniqueIds.map((userId) => ({
      user: userId,
      task: taskId,
      type,
      message,
    }))
  );

  await Notification.populate(notifications, {
    path: 'task',
    select: 'title status deadline',
  });

  for (const notification of notifications) {
    emitToUser(notification.user, 'notification', notification.toObject());
  }

  return notifications;
}

export async function getCounterpartRecipients(actor, task) {
  if (actor.role === 'admin') {
    const assigneeId = idOf(task.assignedTo);
    return assigneeId ? [assigneeId] : [];
  }

  const admins = await User.find({ role: 'admin', isActive: true }).select('_id').lean();
  return admins.map((admin) => admin._id.toString());
}
