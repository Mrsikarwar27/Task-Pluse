import { Task, TASK_PRIORITIES, TASK_STATUSES } from '../models/Task.js';
import { User } from '../models/User.js';
import { Comment } from '../models/Comment.js';
import { Notification } from '../models/Notification.js';
import { ApiError, assert } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getCounterpartRecipients, notifyUsers } from '../utils/notifications.js';
import {
  escapeRegex,
  normalizeResources,
  optionalString,
  parsePagination,
  requiredString,
  validDate,
  validEnum,
  validObjectId,
} from '../utils/validators.js';

const TASK_POPULATE = [
  { path: 'assignedTo', select: 'name email phone role isActive' },
  { path: 'createdBy', select: 'name role' },
];

function populateTask(query) {
  return query.populate(TASK_POPULATE);
}

function ensureTaskAccess(task, user) {
  if (user.role === 'admin') return;
  const assignedId = (task.assignedTo?._id || task.assignedTo).toString();
  if (assignedId !== user._id.toString()) {
    // 404 avoids revealing that another client's task exists.
    throw new ApiError(404, 'Task not found.');
  }
}

async function buildTaskFilter(req) {
  const filter = {};

  if (req.user.role === 'client') {
    filter.assignedTo = req.user._id;
  } else if (req.query.client) {
    validObjectId(req.query.client, 'Client');
    filter.assignedTo = req.query.client;
  }

  if (req.query.status && req.query.status !== 'All') {
    filter.status = validEnum(req.query.status, TASK_STATUSES, 'Status');
  }

  if (req.query.priority && req.query.priority !== 'All') {
    filter.priority = validEnum(req.query.priority, TASK_PRIORITIES, 'Priority');
  }

  const q = optionalString(req.query.q, 'Search', { max: 100 });
  if (q) {
    const regex = new RegExp(escapeRegex(q), 'i');
    const search = [{ title: regex }, { description: regex }];

    if (req.user.role === 'admin') {
      const matchingClients = await User.find({
        role: 'client',
        $or: [{ name: regex }, { email: regex }],
      })
        .select('_id')
        .limit(100)
        .lean();

      if (matchingClients.length) {
        search.push({ assignedTo: { $in: matchingClients.map((client) => client._id) } });
      }
    }

    filter.$or = search;
  }

  return filter;
}

async function getStatusCounts(baseFilter) {
  const rows = await Task.aggregate([
    { $match: baseFilter },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const counts = {
    All: 0,
    'Not Started': 0,
    'In Progress': 0,
    Blocked: 0,
    Completed: 0,
  };

  for (const row of rows) {
    if (counts[row._id] !== undefined) counts[row._id] = row.count;
    counts.All += row.count;
  }

  return counts;
}

export const createTask = asyncHandler(async (req, res) => {
  const title = requiredString(req.body?.title, 'Task title', { max: 160 });
  const description = requiredString(req.body?.description, 'Description', { max: 5000 });
  const assignedTo = validObjectId(req.body?.assignedTo, 'Client');
  const deadline = validDate(req.body?.deadline);
  const durationValue = Number(req.body?.estimatedDuration);
  assert(
    Number.isInteger(durationValue) && durationValue >= 1,
    422,
    'Estimated duration must be a whole number of minutes (at least 1).'
  );
  const priority = validEnum(req.body?.priority || 'Medium', TASK_PRIORITIES, 'Priority');
  const status = validEnum(req.body?.status || 'Not Started', TASK_STATUSES, 'Status');
  const resources = normalizeResources(req.body?.resources) || [];

  const client = await User.findOne({ _id: assignedTo, role: 'client' });
  if (!client) throw new ApiError(404, 'Client not found.');
  if (!client.isActive) {
    throw new ApiError(422, 'This client is deactivated and cannot receive new tasks.');
  }

  const task = await Task.create({
    title,
    description,
    assignedTo,
    createdBy: req.user._id,
    deadline,
    estimatedDuration: durationValue,
    priority,
    status,
    resources,
  });

  const populated = await populateTask(Task.findById(task._id));
  await notifyUsers([client._id], {
    task: populated,
    type: 'task_assigned',
    message: `${req.user.name} assigned you "${task.title}".`,
  });

  res.status(201).json({ task: populated });
});

export const listTasks = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const baseFilter = await buildTaskFilter(req);

  const filtered = { ...baseFilter };
  if (req.query.status && req.query.status !== 'All') {
    filtered.status = req.query.status;
  }

  const [tasks, total, counts, overdueCount] = await Promise.all([
    populateTask(Task.find(filtered).sort({ createdAt: -1 }).skip(skip).limit(limit)),
    Task.countDocuments(filtered),
    getStatusCounts(baseFilter),
    Task.countDocuments({
      ...baseFilter,
      deadline: { $lt: new Date() },
      status: { $ne: 'Completed' },
    }),
  ]);

  res.json({
    tasks,
    counts,
    overdueCount,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  });
});

export const getTask = asyncHandler(async (req, res) => {
  validObjectId(req.params.id, 'Task');
  const task = await populateTask(Task.findById(req.params.id));
  if (!task) throw new ApiError(404, 'Task not found.');
  ensureTaskAccess(task, req.user);

  res.json({ task });
});

export const updateTask = asyncHandler(async (req, res) => {
  validObjectId(req.params.id, 'Task');
  const task = await Task.findById(req.params.id);
  if (!task) throw new ApiError(404, 'Task not found.');

  const oldAssignee = task.assignedTo.toString();
  const oldStatus = task.status;
  let assigneeChanged = false;
  let statusChanged = false;

  if (req.body?.title !== undefined) {
    task.title = requiredString(req.body.title, 'Task title', { max: 160 });
  }
  if (req.body?.description !== undefined) {
    task.description = requiredString(req.body.description, 'Description', { max: 5000 });
  }
  if (req.body?.assignedTo !== undefined) {
    const assignedTo = validObjectId(req.body.assignedTo, 'Client');
    assigneeChanged = assignedTo !== oldAssignee;
    if (assigneeChanged) {
      const client = await User.findOne({ _id: assignedTo, role: 'client' });
      if (!client) throw new ApiError(404, 'Client not found.');
      if (!client.isActive) {
        throw new ApiError(422, 'This client is deactivated and cannot receive tasks.');
      }
      task.assignedTo = assignedTo;
    }
  }
  if (req.body?.deadline !== undefined) {
    task.deadline = validDate(req.body.deadline);
  }
  if (req.body?.estimatedDuration !== undefined) {
    const durationValue = Number(req.body.estimatedDuration);
    assert(
      Number.isInteger(durationValue) && durationValue >= 1,
      422,
      'Estimated duration must be a whole number of minutes (at least 1).'
    );
    task.estimatedDuration = durationValue;
  }
  if (req.body?.priority !== undefined) {
    task.priority = validEnum(req.body.priority, TASK_PRIORITIES, 'Priority');
  }
  if (req.body?.status !== undefined) {
    const nextStatus = validEnum(req.body.status, TASK_STATUSES, 'Status');
    statusChanged = nextStatus !== oldStatus;
    task.status = nextStatus;
  }
  if (req.body?.resources !== undefined) {
    task.resources = normalizeResources(req.body.resources);
  }

  await task.save();
  const populated = await populateTask(Task.findById(task._id));

  const recipients = await getCounterpartRecipients(req.user, populated);
  if (recipients.length) {
    if (assigneeChanged) {
      await notifyUsers(recipients, {
        task: populated,
        type: 'task_assigned',
        message: `${req.user.name} assigned you "${task.title}".`,
      });
    } else if (statusChanged) {
      await notifyUsers(recipients, {
        task: populated,
        type: 'status_changed',
        message: `${req.user.name} changed the status of "${task.title}" to ${task.status}.`,
      });
    } else {
      await notifyUsers(recipients, {
        task: populated,
        type: 'task_updated',
        message: `${req.user.name} updated "${task.title}".`,
      });
    }
  }

  res.json({ task: populated, message: 'Task updated successfully.' });
});

export const updateTaskStatus = asyncHandler(async (req, res) => {
  validObjectId(req.params.id, 'Task');
  const task = await populateTask(Task.findById(req.params.id));
  if (!task) throw new ApiError(404, 'Task not found.');
  ensureTaskAccess(task, req.user);

  const status = validEnum(req.body?.status, TASK_STATUSES, 'Status');
  if (task.status === status) {
    return res.json({ task, message: 'Status is unchanged.' });
  }

  task.status = status;
  await task.save();
  const populated = await populateTask(Task.findById(task._id));

  const recipients = await getCounterpartRecipients(req.user, populated);
  const message =
    req.user.role === 'client'
      ? `${req.user.name} changed the status of "${task.title}" to ${status}.`
      : `${req.user.name} updated the status of "${task.title}" to ${status}.`;

  await notifyUsers(recipients, {
    task: populated,
    type: 'status_changed',
    message,
  });

  res.json({ task: populated, message: `Status changed to ${status}.` });
});

export const deleteTask = asyncHandler(async (req, res) => {
  validObjectId(req.params.id, 'Task');
  const task = await Task.findById(req.params.id);
  if (!task) throw new ApiError(404, 'Task not found.');

  await Promise.all([
    Comment.deleteMany({ task: task._id }),
    Notification.deleteMany({ task: task._id }),
    task.deleteOne(),
  ]);

  res.json({ message: 'Task deleted successfully.' });
});
