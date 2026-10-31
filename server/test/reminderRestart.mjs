import 'dotenv/config';
import { spawn } from 'node:child_process';
import { io } from 'socket.io-client';

// Proves that a server restart during an active reminder cycle continues the
// count from the database without sending the same reminder twice.
// The script spawns its own server on PORT ${PORT}-1000 so it can kill/restart it.

const basePort = Number(process.env.PORT || 5000);
const PORT = process.env.TEST_PORT || 5031;
const API_URL = `http://127.0.0.1:${PORT}/api`;
const SOCKET_URL = `http://127.0.0.1:${PORT}`;
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function startServer() {
  const child = spawn('node', ['src/server.js'], {
    cwd: new URL('..', import.meta.url).pathname,
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (d) => process.stdout.write(`[srv] ${d}`));
  child.stderr.on('data', (d) => process.stderr.write(`[srv] ${d}`));
  return child;
}

function waitForHealth(retries = 40) {
  return new Promise((resolve, reject) => {
    const attempt = async () => {
      try {
        const response = await fetch(`${API_URL}/health`);
        if (response.ok) return resolve(true);
      } catch {}
      if (--retries <= 0) return reject(new Error('Server did not come up.'));
      setTimeout(attempt, 500);
    };
    attempt();
  });
}

async function request(path, { method = 'GET', token, body, expected = [200] } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!expected.includes(response.status)) {
    throw new Error(`${method} ${path} → ${response.status}, expected ${expected.join(',')}: ${text}`);
  }
  return data;
}

async function main() {
  if (!adminEmail || !adminPassword) {
    console.error('ADMIN_EMAIL/ADMIN_PASSWORD missing in server/.env');
    process.exit(1);
  }

  process.stdout.write('─'.repeat(78) + '\n');
  console.log(`Reminder restart test. Own server on port ${PORT}, scheduler interval 60s.`);
  process.stdout.write('─'.repeat(78) + '\n');

  let server = startServer();
  await waitForHealth();
  console.log('Server #1 up.');

  const admin = await request('/auth/login', {
    method: 'POST',
    body: { email: adminEmail, password: adminPassword },
  });
  const adminToken = admin.token;
  const clientResponse = await request('/users', {
    method: 'POST',
    token: adminToken,
    body: {
      name: `Restart Client ${Date.now().toString(36)}`,
      email: `restart.${Date.now().toString(36)}@taskpulse.test`,
      phone: '+1 555 0903',
      password: 'ClientA123!',
    },
    expected: [201],
  });
  const client = clientResponse.client;
  const login = await request('/auth/login', {
    method: 'POST',
    body: { email: client.email, password: 'ClientA123!' },
  });
  const clientToken = login.token;

  const socket = io(SOCKET_URL, { auth: { token: clientToken }, transports: ['websocket'] });
  const reminders = [];
  socket.on('notification', (n) => {
    if (n.type === 'task_reminder') reminders.push(n);
  });
  socket.on('connect_error', (e) => console.warn('[socket]', e.message));
  await sleep(800);

  // startAt ~75s in the future: slot "start − 30 min" is due immediately,
  // slot "at start" comes due right around the restart, slots 3 and 4 are
  // +10 min / +20 min after start (far away for this short test).
  const startAt = new Date(Date.now() + 75 * 1000).toISOString();
  const task = (
    await request('/tasks', {
      method: 'POST',
      token: adminToken,
      body: {
        title: 'Restart persistence task',
        description: 'Restart during the reminder cycle must continue the DB count.',
        assignedTo: client.id,
        deadline: new Date(Date.now() + 3600 * 1000).toISOString(),
        startAt,
        priority: 'Low',
        resources: [],
      },
      expected: [201],
    })
  ).task;
  const taskId = task._id;
  console.log(`Task ${taskId}. startAt=${startAt}  nextReminderAt=${task.nextReminderAt}`);

  const getState = async () =>
    (await request(`/tasks/${taskId}`, { token: clientToken })).task;

  // Wait for reminder #1 from the pre-restart cycle.
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Never received reminder #1.')), 180000);
    const poll = setInterval(() => {
      if (reminders.some((n) => (n.task?._id || n.task) === taskId)) {
        clearTimeout(timeout);
        clearInterval(poll);
        resolve();
      }
    }, 250);
  });
  let state = await getState();
  if (state.remindersSent !== 1) throw new Error(`Reminder #1: expected remindersSent=1, got ${state.remindersSent}`);
  console.log('Reminder #1 delivered before restart.', {
    remindersSent: state.remindersSent,
    nextReminderAt: state.nextReminderAt,
  });

  // ── Restart mid-cycle ──
  console.log('Restarting server (SIGTERM → exit → fresh start).');
  server.kill('SIGTERM');
  await new Promise((resolve) => server.once('exit', resolve));
  console.log('Server #1 stopped.');
  server = startServer();
  await waitForHealth();
  console.log('Server #2 up (fresh node process).');

  // Wait until past the "at startAt" slot.
  {
    const slotTime = Date.parse(startAt);
    const msToSlot = Math.max(0, slotTime - Date.now());
    await sleep(msToSlot + 5000);
    console.log('Past the startAt slot now.');
  }

  // reminder #2 must arrive exactly once after the restart, from the DB count.
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('No reminder after the restart — the DB count was not continued.')),
      180000
    );
    const poll = setInterval(async () => {
      const count = reminders.filter((n) => (n.task?._id || n.task) === taskId).length;
      if (count >= 2) {
        const s = await getState();
        if (s.remindersSent === 2) {
          clearTimeout(timeout);
          clearInterval(poll);
          resolve();
        }
      }
    }, 500);
  });
  console.log('Reminder #2 delivered after the restart (count continued from DB).', {
    remindersSent: (await getState()).remindersSent,
    socketReminders: reminders.length,
  });

  // No duplicates: wait for two more ticks; next slots are far in the future.
  await sleep(125000);
  state = await getState();
  const okCount = state.remindersSent === 2;
  const okNoDup = reminders.filter((n) => (n.task?._id || n.task) === taskId).length === 2;
  console.log('After two post-restart ticks:', {
    remindersSent: state.remindersSent,
    nextReminderAt: state.nextReminderAt,
    socketReminderCount: reminders.length,
  });
  if (!okCount) throw new Error(`remindersSent drifted to ${state.remindersSent}.`);
  if (!okNoDup) throw new Error('A duplicate reminder was sent after the restart.');

  await request(`/users/${client.id}/deactivate`, { method: 'PATCH', token: adminToken }).catch(() => {});
  server.kill('SIGTERM');
  await new Promise((resolve) => server.once('exit', resolve));

  console.log('─'.repeat(78));
  console.log('RESULT: RESTART TEST PASSED — count continued from the DB, no duplicates.');
  console.log('─'.repeat(78));
}

main().catch((error) => {
  console.error('RESULT: RESTART TEST FAILED —', error.message);
  process.exitCode = 1;
  process.exit(process.exitCode);
});
