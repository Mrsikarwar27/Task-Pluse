import 'dotenv/config';
import { io } from 'socket.io-client';

const API_URL = (process.env.TEST_API_URL || `http://127.0.0.1:${process.env.PORT || 5000}/api`).replace(
  /\/$/,
  ''
);
const SOCKET_URL =
  process.env.TEST_SOCKET_URL || `http://127.0.0.1:${process.env.PORT || 5000}`;
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

if (!adminEmail || !adminPassword) {
  console.error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in server/.env');
  process.exit(1);
}

const suffix = Date.now().toString(36);
const clientAPassword = 'ClientA123!';
const clientBPassword = 'ClientB123!';
const created = { clients: [], tasks: [] };

function line() {
  console.log('─'.repeat(78));
}

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
    const error = new Error(
      `${method} ${path} returned ${response.status}. Expected ${expected.join(' or ')}.`
    );
    error.payload = data;
    throw error;
  }

  return { status: response.status, data };
}

async function connectSocket(token, label) {
  const socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: false,
    forceNew: true,
  });
  const queue = [];

  socket.on('notification', (notification) => queue.push(notification));

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} socket timed out.`)), 8000);
    socket.once('connected', () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once('connect_error', (error) => {
      clearTimeout(timer);
      reject(new Error(`${label} socket failed: ${error.message}`));
    });
  });

  const waitFor = (predicate, timeout = 8000) => {
    const existing = queue.find(predicate);
    if (existing) return Promise.resolve(existing);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        socket.off('notification', handler);
        reject(new Error(`Timed out waiting for a ${label} socket notification.`));
      }, timeout);
      const handler = (notification) => {
        if (!predicate(notification)) return;
        clearTimeout(timer);
        socket.off('notification', handler);
        resolve(notification);
      };
      socket.on('notification', handler);
    });
  };

  return { socket, queue, waitFor };
}

function notificationTaskId(notification) {
  return notification.task?._id || notification.task;
}

async function main() {
  line();
  console.log('TaskPulse acceptance test');
  console.log(`API: ${API_URL}`);
  console.log(`Socket: ${SOCKET_URL}`);
  line();

  let step = 0;

  try {
    step = 1;
    const adminLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: adminEmail, password: adminPassword },
    });
    if (adminLogin.data.user.role !== 'admin') throw new Error('Logged-in user is not an admin.');
    let adminToken = adminLogin.data.token;
    const adminId = adminLogin.data.user.id;
    const adminSocket = await connectSocket(adminToken, 'admin');
    pass(step, 'Admin logs in and opens a live socket.', {
      user: adminLogin.data.user.email,
      role: adminLogin.data.user.role,
      socket: 'connected',
    });

    step = 2;
    const clientAEmail = `accept.a.${suffix}@taskpulse.test`;
    const clientBEmail = `accept.b.${suffix}@taskpulse.test`;
    const clientAResponse = await request('/users', {
      method: 'POST',
      token: adminToken,
      body: {
        name: `Acceptance Client A ${suffix}`,
        email: clientAEmail,
        phone: '+1 555 0201',
        password: clientAPassword,
      },
      expected: [201],
    });
    const clientBResponse = await request('/users', {
      method: 'POST',
      token: adminToken,
      body: {
        name: `Acceptance Client B ${suffix}`,
        email: clientBEmail,
        phone: '+1 555 0202',
        password: clientBPassword,
      },
      expected: [201],
    });
    const clientA = clientAResponse.data.client;
    const clientB = clientBResponse.data.client;
    created.clients.push(clientA, clientB);
    pass(step, 'Admin adds two Clients through POST /api/users.', {
      clientA: { id: clientA.id, email: clientA.email },
      clientB: { id: clientB.id, email: clientB.email },
    });

    step = 3;
    const deadline = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const taskResponse = await request('/tasks', {
      method: 'POST',
      token: adminToken,
      body: {
        title: `Acceptance task ${suffix}`,
        description:
          'This is a real task created by the acceptance test. It contains one link resource and one image resource.',
        assignedTo: clientA.id,
        deadline,
        estimatedDuration: 180,
        priority: 'High',
        resources: [
          {
            label: 'Project brief',
            url: 'https://example.com/taskpulse-brief',
            type: 'link',
          },
          {
            label: 'Reference image',
            url: 'https://picsum.photos/seed/taskpulse-acceptance/900/600',
            type: 'image',
          },
        ],
      },
      expected: [201],
    });
    const taskA = taskResponse.data.task;
    created.tasks.push(taskA);

    const taskBResponse = await request('/tasks', {
      method: 'POST',
      token: adminToken,
      body: {
        title: `Isolation fixture ${suffix}`,
        description: 'A second client’s task used to prove that client A cannot see it.',
        assignedTo: clientB.id,
        deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        estimatedDuration: 60,
        priority: 'Low',
        resources: [],
      },
      expected: [201],
    });
    const taskB = taskBResponse.data.task;
    created.tasks.push(taskB);

    pass(step, 'Admin creates Task A with one link and one image URL, plus an isolation task for Client B.', {
      taskA: { id: taskA._id, title: taskA.title, resources: taskA.resources },
      taskB: { id: taskB._id, title: taskB.title },
    });

    step = 4;
    const clientALogin = await request('/auth/login', {
      method: 'POST',
      body: { email: clientAEmail, password: clientAPassword },
    });
    let clientAToken = clientALogin.data.token;
    const clientATasks = await request('/tasks', { token: clientAToken });
    const visibleIds = clientATasks.data.tasks.map((task) => task._id);
    if (clientATasks.data.tasks.length !== 1) {
      throw new Error(`Client A expected exactly 1 task, received ${clientATasks.data.tasks.length}.`);
    }
    if (visibleIds[0] !== taskA._id) throw new Error('Client A did not receive the expected task.');
    if (visibleIds.includes(taskB._id)) throw new Error('Client A can see Client B’s task.');

    const clientAUsers = await request('/users', { token: clientAToken, expected: [403] });
    const clientATaskB = await request(`/tasks/${taskB._id}`, {
      token: clientAToken,
      expected: [404],
    });
    const clientAStats = await request('/stats', { token: clientAToken });
    if (clientAStats.data.stats.totalTasks !== 1) {
      throw new Error('Client A stats do not match the single assigned task.');
    }
    pass(step, 'Client A logs in and sees only their own task and no other data.', {
      visibleTaskIds: visibleIds,
      visibleTaskCount: clientATasks.data.tasks.length,
      clientUsersEndpoint: `${clientAUsers.status} Forbidden`,
      clientAccessToTaskB: `${clientATaskB.status} Not Found`,
      clientStats: clientAStats.data.stats,
    });

    step = 5;
    await request(`/tasks/${taskA._id}/status`, {
      method: 'PATCH',
      token: clientAToken,
      body: { status: 'In Progress' },
    });
    const inProgressNotification = await adminSocket.waitFor(
      (notification) =>
        notificationTaskId(notification) === taskA._id &&
        notification.type === 'status_changed' &&
        notification.message.includes('In Progress')
    );
    pass(step, 'Client A changes status to In Progress; Admin socket receives the event live.', {
      type: inProgressNotification.type,
      message: inProgressNotification.message,
      notificationId: inProgressNotification._id,
    });

    step = 6;
    await request(`/tasks/${taskA._id}/status`, {
      method: 'PATCH',
      token: clientAToken,
      body: { status: 'Completed' },
    });
    const completedNotification = await adminSocket.waitFor(
      (notification) =>
        notificationTaskId(notification) === taskA._id &&
        notification.type === 'status_changed' &&
        notification.message.includes('Completed')
    );
    pass(step, 'Client A changes status to Completed; Admin receives that live event too.', {
      type: completedNotification.type,
      message: completedNotification.message,
      notificationId: completedNotification._id,
    });

    const adminNotifications = await request('/notifications', { token: adminToken });
    const persistedStatusNotifications = adminNotifications.data.notifications.filter(
      (notification) =>
        notificationTaskId(notification) === taskA._id &&
        notification.type === 'status_changed'
    );
    if (persistedStatusNotifications.length < 2) {
      throw new Error('Both status notifications were not persisted in MongoDB.');
    }

    const adminRelogin = await request('/auth/login', {
      method: 'POST',
      body: { email: adminEmail, password: adminPassword },
    });
    adminToken = adminRelogin.data.token;
    const notificationsAfterRelogin = await request('/notifications', { token: adminToken });
    const persistedAfterRelogin = notificationsAfterRelogin.data.notifications.filter(
      (notification) =>
        notificationTaskId(notification) === taskA._id &&
        notification.type === 'status_changed'
    );
    if (persistedAfterRelogin.length < 2) {
      throw new Error('Status notifications did not survive an admin re-login.');
    }
    pass('6b', 'Both status notifications are saved and still present after a fresh Admin login.', {
      persistedBeforeRelogin: persistedStatusNotifications.length,
      persistedAfterRelogin: persistedAfterRelogin.length,
      unreadCount: notificationsAfterRelogin.data.unreadCount,
    });

    step = 7;
    const clientAQuery = 'Could you confirm the image dimensions you expect for the final deliverable?';
    await request(`/tasks/${taskA._id}/comments`, {
      method: 'POST',
      token: clientAToken,
      body: { message: clientAQuery },
      expected: [201],
    });
    const queryNotification = await adminSocket.waitFor(
      (notification) =>
        notificationTaskId(notification) === taskA._id &&
        notification.type === 'new_comment' &&
        notification.message.includes('Acceptance Client A')
    );
    const adminComments = await request(`/tasks/${taskA._id}/comments`, { token: adminToken });
    if (!adminComments.data.comments.some((comment) => comment.message === clientAQuery)) {
      throw new Error('Admin cannot read the query Client A posted.');
    }
    pass(step, 'Client A posts a query; Admin receives it live and can read the thread.', {
      socketMessage: queryNotification.message,
      commentsVisibleToAdmin: adminComments.data.comments.length,
    });

    step = 8;
    const clientASocket = await connectSocket(clientAToken, 'client A');
    const adminReply = 'Use a 1600×900 image so it works well in the final layout.';
    await request(`/tasks/${taskA._id}/comments`, {
      method: 'POST',
      token: adminToken,
      body: { message: adminReply },
      expected: [201],
    });
    const replyNotification = await clientASocket.waitFor(
      (notification) =>
        notificationTaskId(notification) === taskA._id &&
        notification.type === 'new_comment' &&
        notification.message.includes('replied')
    );
    const clientAComments = await request(`/tasks/${taskA._id}/comments`, { token: clientAToken });
    if (clientAComments.data.comments.length !== 2) {
      throw new Error(`Client A expected 2 comments, received ${clientAComments.data.comments.length}.`);
    }
    if (!clientAComments.data.comments.some((comment) => comment.message === adminReply)) {
      throw new Error('Client A cannot read the admin reply.');
    }
    pass(step, 'Admin replies; Client A receives it live and the thread contains both messages.', {
      socketMessage: replyNotification.message,
      commentsVisibleToClient: clientAComments.data.comments.length,
      reply: adminReply,
    });
    clientASocket.socket.disconnect();

    step = 9;
    const clientBLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: clientBEmail, password: clientBPassword },
    });
    const clientBToken = clientBLogin.data.token;
    const clientBTasks = await request('/tasks', { token: clientBToken });
    if (clientBTasks.data.tasks.some((task) => task._id === taskA._id)) {
      throw new Error('Client B can see Client A’s task in the task list.');
    }
    const clientBTaskA = await request(`/tasks/${taskA._id}`, {
      token: clientBToken,
      expected: [404],
    });
    const clientBComments = await request(`/tasks/${taskA._id}/comments`, {
      token: clientBToken,
      expected: [404],
    });
    const clientBStatus = await request(`/tasks/${taskA._id}/status`, {
      method: 'PATCH',
      token: clientBToken,
      body: { status: 'Blocked' },
      expected: [404],
    });
    pass(step, 'Second Client cannot open, comment on, or change the first Client’s task through the API.', {
      taskRead: `${clientBTaskA.status} Not Found`,
      commentsRead: `${clientBComments.status} Not Found`,
      statusChange: `${clientBStatus.status} Not Found`,
      ownVisibleTaskIds: clientBTasks.data.tasks.map((task) => task._id),
    });

    step = 10;
    const adminStats = await request('/stats', { token: adminToken });
    pass(step, 'Admin stats are computed from the same live data.', adminStats.data.stats);

    line();
    console.log('RESULT: ALL ACCEPTANCE CHECKS PASSED');
    console.log(`Admin: ${adminEmail}`);
    console.log(`Client A: ${clientAEmail} / ${clientAPassword}`);
    console.log(`Client B: ${clientBEmail} / ${clientBPassword}`);
    console.log(`Task A: ${taskA._id}`);
    console.log(`Admin user id: ${adminId}`);
    line();

    adminSocket.socket.disconnect();
  } catch (error) {
    fail(step, error);
    line();
    console.log('RESULT: ACCEPTANCE TEST FAILED');
    line();
    process.exitCode = 1;
  }
}

main();
