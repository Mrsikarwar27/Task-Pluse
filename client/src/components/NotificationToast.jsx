import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle2, MessageSquare, RefreshCw, UserPlus, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useNotifications } from '../contexts/NotificationsContext.jsx';
import { taskPath } from '../lib/utils.js';

const icons = {
  task_assigned: UserPlus,
  status_changed: RefreshCw,
  new_comment: MessageSquare,
  task_updated: CheckCircle2,
};

export default function NotificationToast() {
  const { toast, clearToast } = useNotifications();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!toast) return null;

  const { notification } = toast;
  const Icon = icons[notification.type] || Bell;
  const taskId = notification.task?._id || notification.task;
  const title = notification.task?.title;

  const openTask = () => {
    if (!taskId) return;
    clearToast();
    navigate(taskPath(user.role, taskId));
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[90] animate-toast-in sm:left-auto sm:w-full sm:max-w-sm">
      <div className="flex items-start gap-3 rounded-2xl border border-[#FCD9C4] bg-surface p-4 shadow-panel">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-primary">
            New notification
          </p>
          <p className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-ink">
            {notification.message}
          </p>
          {title ? (
            <button
              type="button"
              onClick={openTask}
              className="mt-2 text-xs font-bold text-primary hover:text-primary-container"
            >
              View task
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={clearToast}
          className="shrink-0 rounded-lg p-1 text-muted transition hover:bg-primary-soft hover:text-primary"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
