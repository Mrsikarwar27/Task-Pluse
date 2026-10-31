import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  BellOff,
  BellRing,
  Check,
  CheckCheck,
  CheckCircle2,
  Loader2,
  MessageSquare,
  RefreshCw,
  UserPlus,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useNotifications } from '../contexts/NotificationsContext.jsx';
import { cn, formatRelative, taskPath } from '../lib/utils.js';
import { DESKTOP_HINT_DENIED } from '../lib/browserNotifications.js';
import api from '../lib/api.js';
import EmptyState from './EmptyState.jsx';
import ErrorState from './ErrorState.jsx';

const icons = {
  task_assigned: UserPlus,
  status_changed: RefreshCw,
  new_comment: MessageSquare,
  task_updated: CheckCircle2,
  task_reminder: BellRing,
};

export default function NotificationsPanel({ open, onClose }) {
  const { user } = useAuth();
  const {
    notifications,
    unreadCount,
    loading,
    error,
    refresh,
    markRead,
    markAllRead,
    browserPermission,
    acknowledgeTaskReminder,
  } = useNotifications();
  const navigate = useNavigate();
  const [actionError, setActionError] = useState('');
  const [markingId, setMarkingId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [ackingId, setAckingId] = useState(null);
  // taskId -> task with reminder fields, for reminder notifications in the list
  const [reminderTasks, setReminderTasks] = useState({});

  const reminderTaskIds = useMemo(() => {
    const ids = notifications
      .filter((notification) => notification.type === 'task_reminder')
      .map((notification) => String(notification.task?._id || notification.task || ''))
      .filter(Boolean);
    return [...new Set(ids)].sort();
  }, [notifications]);

  useEffect(() => {
    if (!open) return undefined;
    setActionError('');
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  // Look up which reminder tasks are still actively looping, so the
  // "Got It - Stop Reminders" button appears only while reminders continue.
  useEffect(() => {
    if (!open || !reminderTaskIds.length) return undefined;
    let active = true;
    Promise.all(
      reminderTaskIds.map((taskId) =>
        api
          .get(`/tasks/${taskId}`)
          .then(({ data }) => ({ taskId, task: data.task }))
          .catch(() => null)
      )
    ).then((rows) => {
      if (!active) return;
      setReminderTasks((previous) => {
        const next = { ...previous };
        for (const row of rows) {
          if (row) next[row.taskId] = row.task;
        }
        return next;
      });
    });
    return () => {
      active = false;
    };
  }, [open, reminderTaskIds]);

  if (!open) return null;

  const handleOpen = async (notification) => {
    const taskId = notification.task?._id || notification.task;
    setActionError('');
    if (!notification.isRead) {
      setMarkingId(notification._id);
      try {
        await markRead(notification._id);
      } catch (err) {
        setActionError(err?.response?.data?.error?.message || 'Could not mark notification as read.');
      } finally {
        setMarkingId(null);
      }
    }
    if (taskId) {
      onClose();
      navigate(taskPath(user.role, taskId));
    }
  };

  const handleMarkRead = async (event, notification) => {
    event.stopPropagation();
    setActionError('');
    setMarkingId(notification._id);
    try {
      await markRead(notification._id);
    } catch (err) {
      setActionError(err?.response?.data?.error?.message || 'Could not mark notification as read.');
    } finally {
      setMarkingId(null);
    }
  };

  const handleMarkAll = async () => {
    setActionError('');
    setMarkingAll(true);
    try {
      await markAllRead();
    } catch (err) {
      setActionError(err?.response?.data?.error?.message || 'Could not mark all notifications as read.');
    } finally {
      setMarkingAll(false);
    }
  };

  // Part C: acknowledge a repeating reminder straight from the panel.
  const handleAcknowledge = async (event, notification) => {
    event.stopPropagation();
    const taskId = String(notification.task?._id || notification.task || '');
    if (!taskId || ackingId || reminderTasks[taskId]?.reminderAckAt) return;
    setActionError('');
    setAckingId(notification._id);
    try {
      const data = await acknowledgeTaskReminder(taskId);
      setReminderTasks((previous) => ({ ...previous, [taskId]: data.task }));
      if (!notification.isRead) {
        try {
          await markRead(notification._id);
        } catch {
          // Notification already read or offline; reminders are stopped regardless.
        }
      }
    } catch (err) {
      setActionError(err?.response?.data?.error?.message || 'Could not stop the reminders.');
    } finally {
      setAckingId(null);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[75]">
      <div className="fixed inset-0 animate-fade-in bg-ink backdrop-blur-[2px]" onClick={onClose} />
      <aside
        className="fixed inset-y-0 right-0 flex w-full max-w-[430px] animate-slide-in flex-col border-l border-line bg-surface shadow-panel"
        aria-label="Notifications"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-ink">Notifications</h2>
              <p className="text-xs font-medium text-muted">
                {unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
              </p>
            </div>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close notifications">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 border-b border-line bg-primary-softer px-5 py-2.5">
          <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted">
            Recent activity
          </span>
          <button
            type="button"
            onClick={handleMarkAll}
            disabled={unreadCount === 0 || markingAll}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold text-primary transition hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-40"
          >
            {markingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
            Mark all as read
          </button>
        </div>

        {actionError ? (
          <div className="border-b border-[#FECACA] bg-dangerSoft px-5 py-2.5 text-xs font-medium text-danger">
            {actionError}
          </div>
        ) : browserPermission === 'denied' ? (
          <div className="border-b border-line bg-primary-softer px-5 py-2.5 text-[11px] font-medium leading-snug text-muted">
            {DESKTOP_HINT_DENIED}
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto">
          {loading && !notifications.length ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex gap-3">
                  <div className="skeleton h-9 w-9 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-3.5 w-full" />
                    <div className="skeleton h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-5">
              <ErrorState message={error} onRetry={refresh} />
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={BellOff}
                title="No notifications yet"
                description="Task assignments, status changes and queries will appear here."
              />
            </div>
          ) : (
            <ul>
              {notifications.map((notification) => {
                const Icon = icons[notification.type] || Bell;
                const isMarking = markingId === notification._id;
                const reminderTaskId = String(notification.task?._id || notification.task || '');
                const remindersActive =
                  notification.type === 'task_reminder' &&
                  Boolean(reminderTaskId) &&
                  reminderTaskId in reminderTasks &&
                  Boolean(reminderTasks[reminderTaskId]?.nextReminderAt);
                const isAcking = ackingId === notification._id;
                return (
                  <li
                    key={notification._id}
                    className={cn(
                      'relative border-b border-line transition',
                      !notification.isRead && 'bg-primary-soft'
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => handleOpen(notification)}
                      className="flex w-full items-start gap-3 px-5 py-4 pr-12 text-left transition hover:bg-primary-softer"
                    >
                      <span
                        className={cn(
                          'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                          notification.isRead
                            ? 'bg-cream text-muted'
                            : 'bg-surface text-primary shadow-sm'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start gap-2">
                          <span className="line-clamp-2 flex-1 text-sm font-semibold leading-snug text-ink">
                            {notification.message}
                          </span>
                          {!notification.isRead ? (
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
                          ) : null}
                        </span>
                        {notification.task?.title ? (
                          <span className="mt-1 block truncate text-xs font-medium text-primary">
                            {notification.task.title}
                          </span>
                        ) : null}
                        <span className="mt-1 block text-[11px] font-medium text-muted">
                          {formatRelative(notification.createdAt)}
                        </span>
                      </span>
                    </button>
                    {remindersActive ? (
                      <div className="px-5 pb-3">
                        <button
                          type="button"
                          onClick={(event) => handleAcknowledge(event, notification)}
                          disabled={isAcking}
                          className="btn-primary w-full px-3 py-2 text-xs"
                        >
                          {isAcking ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <BellRing className="h-3.5 w-3.5" />
                          )}
                          Got It - Stop Reminders
                        </button>
                      </div>
                    ) : null}
                    {!notification.isRead ? (
                      <button
                        type="button"
                        onClick={(event) => handleMarkRead(event, notification)}
                        disabled={isMarking}
                        className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg border border-[#FCD9C4] bg-surface text-primary transition hover:bg-primary-soft disabled:opacity-50"
                        aria-label="Mark notification as read"
                        title="Mark as read"
                      >
                        {isMarking ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-line px-5 py-3 text-center text-[11px] font-medium text-muted">
          Notifications are saved and stay here after you sign out.
        </div>
      </aside>
    </div>,
    document.body
  );
}
