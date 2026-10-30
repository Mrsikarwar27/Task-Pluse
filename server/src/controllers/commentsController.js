import { Task } from '../models/Task.js';
import { Comment } from '../models/Comment.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getCounterpartRecipients, notifyUsers } from '../utils/notifications.js';
import { requiredString, validObjectId } from '../utils/validators.js';

async function getAccessibleTask(taskId, user) {
  validObjectId(taskId, 'Task');
  const task = await Task.findById(taskId);
  if (!task) throw new ApiError(404, 'Task not found.');

  if (user.role !== 'admin' && task.assignedTo.toString() !== user._id.toString()) {
    throw new ApiError(404, 'Task not found.');
  }
  return task;
}

export const getComments = asyncHandler(async (req, res) => {
  const task = await getAccessibleTask(req.params.id, req.user);

  const comments = await Comment.find({ task: task._id })
    .sort({ createdAt: 1 })
    .limit(500)
    .populate('author', 'name role');

  res.json({ comments });
});

export const createComment = asyncHandler(async (req, res) => {
  const task = await getAccessibleTask(req.params.id, req.user);
  const message = requiredString(req.body?.message, 'Comment', { max: 2000 });

  const comment = await Comment.create({
    task: task._id,
    author: req.user._id,
    message,
  });
  await comment.populate('author', 'name role');

  const recipients = await getCounterpartRecipients(req.user, task);
  const notificationMessage =
    req.user.role === 'client'
      ? `New query from ${req.user.name} on "${task.title}".`
      : `${req.user.name} replied on "${task.title}".`;

  await notifyUsers(recipients, {
    task,
    type: 'new_comment',
    message: notificationMessage,
  });

  res.status(201).json({ comment });
});
