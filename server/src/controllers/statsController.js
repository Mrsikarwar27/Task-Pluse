import { Task } from '../models/Task.js';
import { User } from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getStats = asyncHandler(async (req, res) => {
  const now = new Date();

  if (req.user.role === 'admin') {
    const [totalClients, activeClients, totalTasks, inProgress, completed, overdue, blocked] =
      await Promise.all([
        User.countDocuments({ role: 'client' }),
        User.countDocuments({ role: 'client', isActive: true }),
        Task.countDocuments({}),
        Task.countDocuments({ status: 'In Progress' }),
        Task.countDocuments({ status: 'Completed' }),
        Task.countDocuments({ deadline: { $lt: now }, status: { $ne: 'Completed' } }),
        Task.countDocuments({ status: 'Blocked' }),
      ]);

    return res.json({
      role: 'admin',
      stats: {
        totalClients,
        activeClients,
        totalTasks,
        inProgress,
        completed,
        overdue,
        blocked,
      },
    });
  }

  const mine = { assignedTo: req.user._id };
  const [totalTasks, inProgress, completed, overdue, blocked, notStarted] = await Promise.all([
    Task.countDocuments(mine),
    Task.countDocuments({ ...mine, status: 'In Progress' }),
    Task.countDocuments({ ...mine, status: 'Completed' }),
    Task.countDocuments({ ...mine, deadline: { $lt: now }, status: { $ne: 'Completed' } }),
    Task.countDocuments({ ...mine, status: 'Blocked' }),
    Task.countDocuments({ ...mine, status: 'Not Started' }),
  ]);

  res.json({
    role: 'client',
    stats: {
      totalTasks,
      inProgress,
      completed,
      overdue,
      blocked,
      notStarted,
    },
  });
});
