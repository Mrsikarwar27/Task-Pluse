import 'dotenv/config';
import { io } from 'socket.io-client';

// Extended acceptance checks for: exact start time (Part A) and repeating
// reminders (Part C) with a 60-second server scheduler. Run while the server
// is running: `node test/reminders.mjs`.
// NOTE: the scheduler runs every 60s, so several stages wait ~60-130s.

const API_URL = (process.env.TEST_API_URL || `http://127.0.0.1:${process.env.PORT || 5000}/api`).replace(
  /\/$/,
  ''
);
const SOCKET_URL = process.env.TEST_SOCKET_URL || `http://127.0.0.1:${process.env.PORT || 5000}`;
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

if (!adminEmail || !adminPassword) {
  console.error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in server/.env');
  process.exit(1);
}

const suffix = Date.now().toString(36);
const clientPassword = 'ClientA123!';

function pass(step, message, details) {
  console.log(`PASS  Step ${step}: ${message}`);
  if (details !== undefined) {
    console.log(
      typeof details === 'string' ? `      ${details}` : `      ${JSON.stringify(details, null, 2)}`
    );
  }
}

function fail(step, error) {
  console.log(`FAIL  Step ${step}: ${error.message}`);
  if (error.payload) console.log(`      ${JSON.stringify(error.payload, null, 2)}`);
  process.exitCode = 1;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
    const error = new Error(
      `${method} ${path} returned ${response.status}. Expected ${expected.join(' or ')}. Body: ${text}`
    );
    error.payload = data;
    throw error;
  }
  return { status: response.status, data };
}

function connectSocket(token, label) {
  const socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: false,
    forceNew: true,
  });
  const queue = [];
  socket.on('notification', (notification) => queue.push(notification));
  const waitFor = (predicate, timeoutMs) =>
    new Promise((resolve, reject) => {
      const check = () => {
        const found = queue.find(predicate);
        if (found) {
          clearInterval(poll);
          resolve(found);
        }
      };
      const poll = setInterval(check, 200);
      setTimeout(() => {
        clearInterval(poll);
        reject(new Error(`Timed out waiting for a ${label} notification.`));
      }, timeoutMs);
    });
  return { socket, queue, waitFor };
}

const minutesFromNow = (minutes) => new Date(Date.now() + minutes * 60 * 1000).toISOString();

async function main() {
  console.log('─'.repeat(78));
  console.log('TaskPulse start-time + repeating-reminder acceptance test');
  console.log(`API: ${API_URL}   (server scheduler interval: 60s)`);
  console.log('─'.repeat(78));

  let step = 0;

  const adminLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: adminEmail, password: adminPassword },
  });
  const adminToken = adminLogin.data.token;
  const clientResponse = await request('/users', {
    method: 'POST',
    token: adminToken,
    body: {
      name: `Reminder Client ${suffix}`,
      email: `reminder.${suffix}@taskpulse.test`,
      phone: '+1 555 0901',
      password: clientPassword,
    },
    expected: [201],
  });
  const client = clientResponse.data.client;

  const clientLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: client.email, password: clientPassword },
  });
  const clientToken = clientLogin.data.token;
  const clientSocket = connectSocket(clientToken, 'client reminder');
  const adminSocket = connectSocket(adminToken, 'admin reminder');
  await sleep(1000); // sockets connect

  const reminderNotificationsOfClient = [];
  function rememberReminders() {
    for (const notification of clientSocket.queue) {
      if (
        notification.type === 'task_reminder' &&
        !reminderNotificationsOfClient.some((item) => item._id === notification._id)
      ) {
        reminderNotificationsOfClient.push(notification);
      }
    }
  }
  const remindersForTask = (taskId) =>
    reminderNotificationsOfClient
      .filter((notification) => (notification.task?._id || notification.task) === taskId)
      .length;

  try {
    // ── 1. Task WITHOUT a start time: saves, has no reminders scheduled ──
    step = 1;
    const plainCreate = await request('/tasks', {
      method: 'POST',
      token: adminToken,
      body: {
        title: `No start task ${suffix}`,
        description: 'Created without a start time and without typed minutes.',
        assignedTo: client.id,
        deadline: minutesFromNow(120),
        priority: 'Medium',
        resources: [],
      },
      expected: [201],
    });
    const plainTask = plainCreate.data.task;
    if (plainTask.startAt !== null) throw new Error('startAt should default to null.');
    if (plainTask.nextReminderAt !== null && plainTask.nextReminderAt !== undefined) {
      throw new Error('No reminders should be scheduled without a start time.');
    }
    if (!Number.isInteger(plainTask.estimatedDuration) || plainTask.estimatedDuration < 1) {
      throw new Error('estimatedDuration should still be computed and stored.');
    }
    pass(step, 'Task without start time saves; no reminder scheduled; minutes computed in background.', {
      estimatedDuration: plainTask.estimatedDuration,
      startAt: plainTask.startAt,
      nextReminderAt: plainTask.nextReminderAt,
    });

    // Old API callers can still send explicit minutes.
    const legacy = await request('/tasks', {
      method: 'POST',
      token: adminToken,
      body: {
        title: `Legacy minutes task ${suffix}`,
        description: 'Old caller sending estimatedDuration=180.',
        assignedTo: client.id,
        deadline: minutesFromNow(300),
        estimatedDuration: 180,
        priority: 'Low',
        resources: [],
      },
      expected: [201],
    });
    if (legacy.data.task.estimatedDuration !== 180) {
      throw new Error('Explicit estimatedDuration should be honoured.');
    }
    pass('1b', 'Existing API callers that still send minutes keep working.', {
      estimatedDuration: legacy.data.task.estimatedDuration,
    });

    // ── 2. Start time validation: deadline before/at start → 400 ──
    step = 2;
    const badTime = await request('/tasks', {
      method: 'POST',
      token: adminToken,
      body: {
        title: `Bad times ${suffix}`,
        description: 'Deadline before start must be rejected.',
        assignedTo: client.id,
        deadline: minutesFromNow(60),
        startAt: minutesFromNow(90),
        priority: 'Medium',
        resources: [],
      },
      expected: [400],
    });
    pass(step, 'Creating a task with deadline before start returns a clear 400.', {
      status: `${badTime.status} Bad Request`,
      message: badTime.data?.error?.message,
    });

    // ── 3. Task with a start time ~35 minutes in the future ──
    step = 3;
    const startAt = minutesFromNow(35);
    const scheduled = await request('/tasks', {
      method: 'POST',
      token: adminToken,
      body: {
        title: `Scheduled task ${suffix}`,
        description: 'Created with an exact start time picked on the form.',
        assignedTo: client.id,
        deadline: minutesFromNow(155), // 155 - 35 = 120 minutes of work → duration preview "2 hours"
        startAt,
        priority: 'High',
        resources: [],
      },
      expected: [201],
    });
    const scheduledTask = scheduled.data.task;
    if (Date.parse(scheduledTask.startAt) !== Date.parse(startAt)) {
      throw new Error('startAt was not stored exactly.');
    }
    if (scheduledTask.estimatedDuration !== 120) {
      throw new Error(`Estimated duration should be 120 minutes, got ${scheduledTask.estimatedDuration}.`);
    }
    const expectedNext = new Date(Date.parse(startAt) - 30 * 60 * 1000);
    if (Math.abs(Date.parse(scheduledTask.nextReminderAt) - expectedNext.getTime()) > 1000) {
      throw new Error('nextReminderAt should be startAt minus 30 minutes.');
    }
    if (scheduledTask.remindersSent !== 0 || scheduledTask.reminderAckAt !== null) {
      throw new Error('Reminder counters should start at zero/null.');
    }
    pass(step, 'Task with start time saves; nextReminderAt = startAt − 30 min; counters reset.', {
      startAt: scheduledTask.startAt,
      estimatedDuration: scheduledTask.estimatedDuration,
      nextReminderAt: scheduledTask.nextReminderAt,
      remindersSent: scheduledTask.remindersSent,
      reminderAckAt: scheduledTask.reminderAckAt,
    });

    // Editing that same task moves the reminder window and recomputes minutes.
    const newStart = minutesFromNow(95);
    const edited = await request(`/tasks/${scheduledTask._id}`, {
      method: 'PUT',
      token: adminToken,
      body: { startAt: newStart, deadline: minutesFromNow(185) },
      expected: [200],
    });
    const expectedNextAfterEdit = new Date(Date.parse(newStart) - 30 * 60 * 1000);
    if (Math.abs(Date.parse(edited.data.task.nextReminderAt) - expectedNextAfterEdit.getTime()) > 1000) {
      throw new Error('Editing startAt should reset nextReminderAt to startAt − 30 min.');
    }
    if (edited.data.task.estimatedDuration !== 90) {
      throw new Error('Editing start/deadline should recompute minutes in the background.');
    }
    pass('3b', 'Editing the start time resets the reminder cycle and recomputes minutes.', {
      estimatedDuration: edited.data.task.estimatedDuration,
      nextReminderAt: edited.data.task.nextReminderAt,
    });

    // Deadline-before-start is also rejected on edit with a 400.
    const badEdit = await request(`/tasks/${scheduledTask._id}`, {
      method: 'PUT',
      token: adminToken,
      body: { deadline: minutesFromNow(60) },
      expected: [400],
    });
    pass('3c', 'Editing a task to a deadline before its start returns 400.', {
      message: badEdit.data?.error?.message,
    });

    // ── 4. Repeating reminder cycle with a live socket on the assignee ──
    // startAt ~22 minutes in the past means all four slots are already due;
    // the scheduler sends one per 60-second tick (catch-up), so 4 reminders
    // arrive in about 4 minutes. This is the fastest real-clock way to prove
    // the full schedule + 4-reminder cap.
    step = 4;
    const cycleStart = minutesFromNow(-22);
    const cycle = await request('/tasks', {
      method: 'POST',
      token: adminToken,
      body: {
        title: `Reminder cycle task ${suffix}`,
        description: 'Reminder cycle check with all slots already due.',
        assignedTo: client.id,
        deadline: minutesFromNow(600),
        startAt: cycleStart,
        priority: 'Medium',
        resources: [],
      },
      expected: [201],
    });
    const cycleTask = cycle.data.task;
    pass(step, 'Reminder task created for a live cycle through the scheduler.', {
      taskId: cycleTask._id,
      startAt: cycleTask.startAt,
      nextReminderAt: cycleTask.nextReminderAt,
    });

    const sent = [];
    for (let expectedSent = 1; expectedSent <= 4; expectedSent += 1) {
      const notification = await clientSocket.waitFor(
        (item) =>
          item.type === 'task_reminder' &&
          (item.task?._id || item.task) === cycleTask._id &&
          !sent.some((s) => s._id === item._id),
        150000
      );
      sent.push(notification);
      rememberReminders();
      let taskNow;
      do {
        await sleep(500);
        taskNow = (await request(`/tasks/${cycleTask._id}`, { token: clientToken })).data.task;
      } while (taskNow.remindersSent < expectedSent);
      if (taskNow.remindersSent !== expectedSent) {
        throw new Error(`Expected remindersSent=${expectedSent}, got ${taskNow.remindersSent}.`);
      }
      if (expectedSent < 4 && taskNow.nextReminderAt === null) {
        throw new Error('nextReminderAt should advance after reminder, not stop early.');
      }
      pass(`4.${expectedSent}`, `Reminder #${expectedSent} arrived (socket + persisted) and the schedule advanced.`, {
        message: notification.message,
        remindersSent: taskNow.remindersSent,
        nextReminderAt: taskNow.nextReminderAt,
      });
    }

    // Admin must NOT receive the start reminders.
    const adminGotReminder = adminSocket.queue.some(
      (item) => item.type === 'task_reminder' && (item.task?._id || item.task) === cycleTask._id
    );
    if (adminGotReminder) throw new Error('Admin must not receive start reminders.');
    pass('4.5', 'The Admin does not receive these start reminders (client only).', {
      adminReminderCount: 0,
    });

    // Persisted in MongoDB and visible through GET /notifications.
    const persisted = await request('/notifications', { token: clientToken });
    const persistedReminders = persisted.data.notifications.filter(
      (item) => item.type === 'task_reminder' && (item.task?._id || item.task) === cycleTask._id
    );
    if (persistedReminders.length !== 4) {
      throw new Error(`Expected 4 persisted reminders, found ${persistedReminders.length}.`);
    }
    pass('4.6', 'All 4 reminders are saved in MongoDB for the notification panel.', {
      persistedReminders: persistedReminders.length,
    });

    await sleep(70000); // one extra scheduler tick
    rememberReminders();
    const afterCap = (await request(`/tasks/${cycleTask._id}`, { token: clientToken })).data.task;
    if (remindersForTask(cycleTask._id) !== 4) {
      throw new Error('A 5th reminder was sent after the 4-reminder cap.');
    }
    pass('4.7', 'Schedule capped: no 5th reminder after the maximum (4 total).', {
      remindersSent: afterCap.remindersSent,
      nextReminderAt: afterCap.nextReminderAt,
      socketReminderCount: remindersForTask(cycleTask._id),
    });

    // ── 5. Acknowledgement endpoint ──
    step = 5;
    // A second client for the permission check: non-assignees get 404.
    const otherClientResponse = await request('/users', {
      method: 'POST',
      token: adminToken,
      body: {
        name: `Other Client ${suffix}`,
        email: `other.${suffix}@taskpulse.test`,
        phone: '+1 555 0902',
        password: clientPassword,
      },
      expected: [201],
    });
    const otherClient = otherClientResponse.data.client;
    const otherLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: otherClient.email, password: clientPassword },
    });
    const otherClientToken = otherLogin.data.token;

    const ackTaskResponse = await request('/tasks', {
      method: 'POST',
      token: adminToken,
      body: {
        title: `Acknowledge task ${suffix}`,
        description: 'Reminders must stop when acknowledged.',
        assignedTo: client.id,
        deadline: minutesFromNow(600),
        startAt: minutesFromNow(-20),
        priority: 'Medium',
        resources: [],
      },
      expected: [201],
    });
    const ackTask = ackTaskResponse.data.task;

    // Wait for the first reminder so the ack test is on an active cycle.
    await clientSocket.waitFor(
      (item) => item.type === 'task_reminder' && (item.task?._id || item.task) === ackTask._id,
      150000
    );

    // A client who is not the assignee cannot acknowledge (404).
    await request(`/tasks/${ackTask._id}/acknowledge-reminder`, {
      method: 'PATCH',
      token: otherClientToken,
      expected: [404],
    });
    pass('5a', 'A different client cannot acknowledge (404 Not Found).', {
      requester: otherClient.email,
    });

    const acked = await request(`/tasks/${ackTask._id}/acknowledge-reminder`, {
      method: 'PATCH',
      token: clientToken,
      expected: [200],
    });
    const ackedTask = acked.data.task;
    if (!ackedTask.reminderAckAt) throw new Error('reminderAckAt should be set.');
    if (ackedTask.nextReminderAt !== null) throw new Error('nextReminderAt should be null.');
    const sentBeforeAck = ackedTask.remindersSent;
    pass(step, 'Assigned client acknowledges via PATCH /api/tasks/:id/acknowledge-reminder.', {
      remindersSent: ackedTask.remindersSent,
      reminderAckAt: ackedTask.reminderAckAt,
      nextReminderAt: ackedTask.nextReminderAt,
      message: acked.data.message,
    });

    // Admin can also acknowledge (allowed per spec).
    const adminAck = await request(`/tasks/${ackTask._id}/acknowledge-reminder`, {
      method: 'PATCH',
      token: adminToken,
      expected: [200],
    });
    pass('5b', 'Admin is also allowed to acknowledge.', {
      reminderAckAt: adminAck.data.task.reminderAckAt,
    });

    // No further reminders arrive for the acknowledged task: compare the count
    // captured at ack time with the count after the next due slots passed.
    const remindersAtAck = remindersForTask(ackTask._id);
    await sleep(170000); // ≥3 scheduler ticks — covers the slot that was already due
    rememberReminders();
    if (remindersForTask(ackTask._id) !== remindersAtAck) {
      throw new Error('A reminder arrived after acknowledgement.');
    }
    pass('5c', 'No further reminders after acknowledgement (waited past the next slot).', {
      remindersSent: sentBeforeAck,
      socketReminderCount: remindersForTask(ackTask._id),
    });

    // ── 6. Status change to In Progress stops the cycle ──
    step = 6;
    const stopTaskResponse = await request('/tasks', {
      method: 'POST',
      token: adminToken,
      body: {
        title: `Status stop task ${suffix}`,
        description: 'Started, then set to In Progress before the max reminders.',
        assignedTo: client.id,
        deadline: minutesFromNow(600),
        startAt: minutesFromNow(-22),
        priority: 'Medium',
        resources: [],
      },
      expected: [201],
    });
    const stopTask = stopTaskResponse.data.task;
    await clientSocket.waitFor(
      (item) => item.type === 'task_reminder' && (item.task?._id || item.task) === stopTask._id,
      150000
    );
    const stopped = await request(`/tasks/${stopTask._id}/status`, {
      method: 'PATCH',
      token: clientToken,
      body: { status: 'In Progress' },
      expected: [200],
    });
    if (stopped.data.task.nextReminderAt !== null) {
      throw new Error('Status change to In Progress should clear nextReminderAt.');
    }
    // Compare socket counts captured at the status change with the count after
    // the next due slots passed (prevents reading stale pre-change events).
    const remindersAtStop = remindersForTask(stopTask._id);
    await sleep(170000); // ≥3 scheduler ticks — covers the slot that was already due
    rememberReminders();
    if (remindersForTask(stopTask._id) !== remindersAtStop) {
      throw new Error('A reminder arrived after the status changed to In Progress.');
    }
    pass(step, 'Status change to In Progress stops the reminder cycle immediately.', {
      nextReminderAt: stopped.data.task.nextReminderAt,
      socketReminderCount: remindersForTask(stopTask._id),
    });

    await request(`/users/${client.id}/deactivate`, {
      method: 'PATCH',
      token: adminToken,
      expected: [200],
    }).catch(() => {});
    console.log('Test client deactivated to silence any leftover cycles. DONE.');
  } catch (error) {
    fail(step, error);
  } finally {
    rememberReminders();
    console.log('Socket reminder totals (client):', {
      task_reminder_events: clientSocket.queue.filter((n) => n.type === 'task_reminder').length,
    });
    clientSocket.socket.disconnect();
    adminSocket.socket.disconnect();
  }
}

main();
