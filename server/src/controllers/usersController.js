import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Task } from '../models/Task.js';
import { ApiError, assert } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  escapeRegex,
  optionalString,
  parsePagination,
  requiredString,
  validBoolean,
  validEmail,
  validObjectId,
  validPassword,
} from '../utils/validators.js';

async function clientStats(clientIds) {
  if (!clientIds.length) return new Map();

  const rows = await Task.aggregate([
    { $match: { assignedTo: { $in: clientIds } } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$assignedTo',
        totalTasks: { $sum: 1 },
        inProgress: { $sum: { $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0] } },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
        mostRecentTask: {
          $first: {
            id: '$_id',
            title: '$title',
            status: '$status',
            deadline: '$deadline',
            createdAt: '$createdAt',
          },
        },
      },
    },
  ]);

  return new Map(rows.map((row) => [row._id.toString(), row]));
}

function withStats(user, statsMap) {
  const stats = statsMap.get(user._id.toString());
  return {
    ...user.toSafeJSON(),
    stats: {
      totalTasks: stats?.totalTasks || 0,
      inProgress: stats?.inProgress || 0,
      completed: stats?.completed || 0,
      mostRecentTask: stats?.mostRecentTask || null,
    },
  };
}

export const createClient = asyncHandler(async (req, res) => {
  if (req.body?.role && req.body.role !== 'client') {
    throw new ApiError(422, 'Only client accounts can be created through this endpoint.');
  }

  const name = requiredString(req.body?.name, 'Name', { max: 80 });
  const email = validEmail(req.body?.email);
  const phone = requiredString(req.body?.phone, 'Phone', { max: 40 });
  const password = validPassword(req.body?.password);

  const existing = await User.findOne({ email });
  if (existing) {
    throw new ApiError(409, 'A user with this email already exists.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const client = await User.create({
    name,
    email,
    phone,
    passwordHash,
    role: 'client',
    isActive: true,
  });

  res.status(201).json({ client: withStats(client, new Map()) });
});

export const listClients = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { role: 'client' };

  const q = optionalString(req.query.q, 'Search', { max: 100 });
  if (q) {
    const regex = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
  }

  const status = req.query.status;
  if (status && status !== 'all') {
    if (status === 'active') filter.isActive = true;
    else if (status === 'inactive') filter.isActive = false;
    else throw new ApiError(422, 'Status filter must be active, inactive, or all.');
  }

  const [clients, total, totalClients, activeClients] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
    User.countDocuments({ role: 'client' }),
    User.countDocuments({ role: 'client', isActive: true }),
  ]);

  const statsMap = await clientStats(clients.map((client) => client._id));

  res.json({
    clients: clients.map((client) => withStats(client, statsMap)),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
    summary: {
      total: totalClients,
      active: activeClients,
      inactive: totalClients - activeClients,
    },
  });
});

export const getClient = asyncHandler(async (req, res) => {
  validObjectId(req.params.id, 'Client');
  const client = await User.findOne({ _id: req.params.id, role: 'client' });
  if (!client) throw new ApiError(404, 'Client not found.');

  const statsMap = await clientStats([client._id]);
  res.json({ client: withStats(client, statsMap) });
});

export const updateClient = asyncHandler(async (req, res) => {
  validObjectId(req.params.id, 'Client');
  const client = await User.findOne({ _id: req.params.id, role: 'client' });
  if (!client) throw new ApiError(404, 'Client not found.');

  if (req.body?.name !== undefined) {
    client.name = requiredString(req.body.name, 'Name', { max: 80 });
  }
  if (req.body?.email !== undefined) {
    client.email = validEmail(req.body.email);
  }
  if (req.body?.phone !== undefined) {
    client.phone = requiredString(req.body.phone, 'Phone', { max: 40 });
  }
  if (req.body?.password) {
    const password = validPassword(req.body.password);
    client.passwordHash = await bcrypt.hash(password, 12);
  }
  if (req.body?.isActive !== undefined) {
    client.isActive = validBoolean(req.body.isActive, 'isActive');
  }
  if (req.body?.role !== undefined && req.body.role !== 'client') {
    throw new ApiError(422, 'Client role cannot be changed.');
  }

  await client.save();
  const statsMap = await clientStats([client._id]);
  res.json({ client: withStats(client, statsMap) });
});

export const deactivateClient = asyncHandler(async (req, res) => {
  validObjectId(req.params.id, 'Client');
  const client = await User.findOne({ _id: req.params.id, role: 'client' });
  if (!client) throw new ApiError(404, 'Client not found.');

  if (!client.isActive) {
    throw new ApiError(409, 'This client is already deactivated.');
  }

  client.isActive = false;
  await client.save();

  const statsMap = await clientStats([client._id]);
  res.json({
    client: withStats(client, statsMap),
    message: 'Client deactivated. They can no longer log in.',
  });
});
