import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api.js';
import { useAuth } from './AuthContext.jsx';
import { useSocket } from './SocketContext.jsx';
import { taskPath } from '../lib/utils.js';
import {
  getBrowserPermission,
  isBrowserNotificationSupported,
  requestBrowserPermission,
  setBrowserNotificationClickListener,
  showBrowserNotification,
} from '../lib/browserNotifications.js';

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [liveVersion, setLiveVersion] = useState(0);
  const [browserPermission, setBrowserPermission] = useState(getBrowserPermission);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Could not load notifications.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setError('');
      setToast(null);
      return;
    }
    refresh();
  }, [user?.id, refresh]);

  // Keep the permission state in sync with the browser (it can change at any
  // time from the browser's site settings). Nothing is stored by the app.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) return undefined;
    let status;
    const handleChange = () => setBrowserPermission(getBrowserPermission());
    navigator.permissions
      .query({ name: 'notifications' })
      .then((permissionStatus) => {
        status = permissionStatus;
        status.onchange = handleChange;
      })
      .catch(() => {});
    return () => {
      if (status) status.onchange = null;
    };
  }, []);

  useEffect(() => {
    if (!socket) return undefined;

    const handleNotification = (notification) => {
      if (!notification?._id) return;
      setNotifications((previous) => [
        notification,
        ...previous.filter((item) => item._id !== notification._id),
      ]);
      if (!notification.isRead) {
        setUnreadCount((count) => count + 1);
      }
      setToast({ notification, key: `${notification._id}-${Date.now()}` });
      setLiveVersion((version) => version + 1);

      // Part B: when the user is working in another tab or window, also raise
      // a real browser notification on top of their current work. When they
      // are already looking at TaskPulse the in-app bell/toast is enough.
      if (
        isBrowserNotificationSupported() &&
        Notification.permission === 'granted' &&
        document.hidden
      ) {
        const taskId = notification.task?._id || notification.task;
        showBrowserNotification({
          title: notification.task?.title || 'TaskPulse',
          body: notification.message,
          taskId: taskId ? String(taskId) : undefined,
          isReminder: notification.type === 'task_reminder',
        });
      }
    };

    socket.on('notification', handleNotification);
    return () => socket.off('notification', handleNotification);
  }, [socket]);

  // Clicking a browser notification calls this: the tab is focused by the
  // helper, then we open the related task and acknowledge reminders (Part C).
  useEffect(() => {
    setBrowserNotificationClickListener(async ({ taskId, isReminder }) => {
      if (!taskId) return;
      if (isReminder) {
        try {
          await api.patch(`/tasks/${taskId}/acknowledge-reminder`);
        } catch {
          // Not fatal: continue to open the task; further reminders are only
          // stopped when the endpoint succeeds.
        }
      }
      navigate(taskPath(user?.role, taskId));
    });
    return () => setBrowserNotificationClickListener(null);
  }, [navigate, user?.role]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 6500);
    return () => clearTimeout(timer);
  }, [toast]);

  const markRead = useCallback(
    async (id) => {
      const existing = notifications.find((item) => item._id === id);
      if (existing?.isRead) return existing;

      const { data } = await api.patch(`/notifications/${id}/read`);
      setNotifications((previous) =>
        previous.map((item) =>
          item._id === id ? { ...item, ...data.notification, isRead: true } : item
        )
      );
      setUnreadCount((count) => Math.max(0, count - 1));
      return data.notification;
    },
    [notifications]
  );

  const markAllRead = useCallback(async () => {
    await api.patch('/notifications/read-all');
    setNotifications((previous) => previous.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);
  }, []);

  // Requests browser notification permission ONLY on explicit user click.
  const enableBrowserNotifications = useCallback(async () => {
    const result = await requestBrowserPermission();
    setBrowserPermission(result || getBrowserPermission());
    return result;
  }, []);

  // Reveals the live permission state; used by buttons and panels.
  const refreshBrowserPermission = useCallback(() => {
    setBrowserPermission(getBrowserPermission());
    return getBrowserPermission();
  }, []);

  // Stops all further reminders for a task (assigned Client or Admin only).
  const acknowledgeTaskReminder = useCallback(async (taskId) => {
    const { data } = await api.patch(`/tasks/${taskId}/acknowledge-reminder`);
    return data;
  }, []);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      error,
      toast,
      liveVersion,
      refresh,
      markRead,
      markAllRead,
      clearToast: () => setToast(null),
      browserSupported: isBrowserNotificationSupported(),
      browserPermission,
      enableBrowserNotifications,
      refreshBrowserPermission,
      acknowledgeTaskReminder,
    }),
    [
      notifications,
      unreadCount,
      loading,
      error,
      toast,
      liveVersion,
      refresh,
      markRead,
      markAllRead,
      browserPermission,
      enableBrowserNotifications,
      refreshBrowserPermission,
      acknowledgeTaskReminder,
    ]
  );

  return (
    <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return context;
}
