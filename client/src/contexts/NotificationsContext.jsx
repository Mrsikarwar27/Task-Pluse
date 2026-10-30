import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import api from '../lib/api.js';
import { useAuth } from './AuthContext.jsx';
import { useSocket } from './SocketContext.jsx';

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [liveVersion, setLiveVersion] = useState(0);

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
    };

    socket.on('notification', handleNotification);
    return () => socket.off('notification', handleNotification);
  }, [socket]);

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
