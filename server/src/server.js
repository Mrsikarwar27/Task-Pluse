import http from 'node:http';
import app from './app.js';
import { config } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { initSocket } from './sockets/index.js';
import { startReminderScheduler, stopReminderScheduler } from './reminderScheduler.js';

async function start() {
  await connectDatabase();
  console.log('[TaskPulse] MongoDB connected.');

  const server = http.createServer(app);
  initSocket(server);

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(
        `[TaskPulse] Port ${config.port} is already in use. Stop the other process or change PORT in server/.env.`
      );
    } else {
      console.error('[TaskPulse] Server error:', error.message);
    }
    process.exit(1);
  });

  server.listen(config.port, () => {
    console.log(`[TaskPulse] API listening on http://localhost:${config.port}`);
    console.log(`[TaskPulse] Socket.io ready. Allowed origins: ${config.clientOrigins.join(', ')}`);
  });

  // Repeating start reminders (Part C). State lives on the task documents, so
  // restarting the server never restarts the countdown or double-sends.
  startReminderScheduler();

  const shutdown = async (signal) => {
    console.log(`\n[TaskPulse] ${signal} received. Shutting down...`);
    stopReminderScheduler();
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((error) => {
  console.error('[TaskPulse] Failed to start server:', error.message);
  process.exit(1);
});
