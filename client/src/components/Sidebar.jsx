import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  ClipboardList,
  LayoutDashboard,
  ListTodo,
  LogOut,
  PlusSquare,
  Users,
  X,
} from 'lucide-react';
import Logo from './Logo.jsx';
import Avatar from './Avatar.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useNotifications } from '../contexts/NotificationsContext.jsx';
import { cn } from '../lib/utils.js';

function NavItem({ to, icon: Icon, label, onClick, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
          isActive
            ? 'bg-primary-soft text-primary'
            : 'text-muted hover:bg-primary-softer hover:text-ink'
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive ? (
            <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary-solid" />
          ) : null}
          <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
          <span>{label}</span>
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar({ open, onClose, onOpenNotifications }) {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = user.role === 'admin';
  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col border-r border-line bg-surface transition-transform duration-300 ease-out xl:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full'
      )}
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-[18px]">
        <Logo />
        <button type="button" className="icon-btn xl:hidden" onClick={onClose} aria-label="Close menu">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-5">
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
          Menu
        </p>
        <nav className="space-y-1">
          {isAdmin ? (
            <>
              <NavItem to="/admin/dashboard" icon={LayoutDashboard} label="Dashboard" onClick={onClose} />
              <NavItem to="/admin/clients" icon={Users} label="Manage Clients" onClick={onClose} />
              <NavItem
                to="/admin/tasks/new"
                icon={PlusSquare}
                label="Create Task"
                onClick={onClose}
                end
              />
            </>
          ) : (
            <NavItem to="/client/dashboard" icon={ListTodo} label="My Tasks" onClick={onClose} />
          )}

          <button
            type="button"
            onClick={() => {
              onOpenNotifications();
              onClose();
            }}
            className="relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted transition hover:bg-primary-softer hover:text-ink"
          >
            <Bell className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
            <span>Notifications</span>
            {unreadCount > 0 ? (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-solid px-1.5 text-[10px] font-bold text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            ) : null}
          </button>
        </nav>

        <div className="mt-6 rounded-xl border border-[#F8E8DC] bg-primary-softer p-3.5">
          <div className="flex items-center gap-2 text-primary">
            <ClipboardList className="h-4 w-4" aria-hidden="true" />
            <p className="text-xs font-bold">Stay in sync</p>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
            {isAdmin
              ? 'Assign work, answer queries, and follow every status change.'
              : 'Update your status and ask questions directly on each task.'}
          </p>
        </div>
      </div>

      <div className="border-t border-line p-3">
        <div className="flex items-center gap-2.5 rounded-xl bg-primary-softer p-2.5">
          <Avatar name={user.name} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-ink">{user.name}</p>
            <p className="truncate text-[11px] font-medium capitalize text-muted">
              {user.role === 'admin' ? 'Administrator' : 'Client'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="icon-btn h-8 w-8 shrink-0 border-transparent bg-transparent"
            aria-label="Log out"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
