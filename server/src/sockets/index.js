import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { User } from '../models/User.js';

let io = null;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: config.clientOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const header = socket.handshake.headers?.authorization || '';
      const token =
        socket.handshake.auth?.token ||
        (header.startsWith('Bearer ') ? header.slice(7) : null);

      if (!token) return next(new Error('Authentication required.'));

      const decoded = jwt.verify(token, config.jwtSecret);
      const user = await User.findById(decoded.sub).select('_id name role isActive');
      if (!user || !user.isActive) return next(new Error('Unauthorized.'));

      socket.user = user;
      return next();
    } catch {
      return next(new Error('Unauthorized.'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.user._id.toString()}`);
    socket.emit('connected', {
      userId: socket.user._id.toString(),
      role: socket.user.role,
    });
  });

  return io;
}

export function emitToUser(userId, event, payload) {
  if (!io || !userId) return;
  io.to(`user:${userId.toString()}`).emit(event, payload);
}
