import http from 'node:http';
import app from './app.js';
import { config } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { initSocket } from './sockets/index.js';

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

  const shutdown = async (signal) => {
    console.log(`\n[TaskPulse] ${signal} received. Shutting down...`);
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
