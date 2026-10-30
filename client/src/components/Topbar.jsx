import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Activity, Bell, Menu, Moon, Search, Sun, X } from 'lucide-react';
import Avatar from './Avatar.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useNotifications } from '../contexts/NotificationsContext.jsx';
import { dashboardPath } from '../lib/utils.js';
import { useTheme } from '../contexts/ThemeContext.jsx';

const searchablePaths = ['/admin/dashboard', '/admin/clients', '/client/dashboard'];

export default function Topbar({ onMenu, onOpenNotifications }) {
  const { user } = useAuth();
  const { isDark, toggle } = useTheme();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const [term, setTerm] = useState(q);

  useEffect(() => {
    setTerm(q);
  }, [q, location.pathname]);

  const isSearchable = searchablePaths.includes(location.pathname);
  const placeholder = location.pathname === '/admin/clients' ? 'Search clients…' : 'Search tasks…';

  const submitSearch = (event) => {
    event.preventDefault();
    const target = isSearchable ? location.pathname : dashboardPath(user.role);
    const next = new URLSearchParams(isSearchable ? searchParams : undefined);
    const value = term.trim();
    if (value) next.set('q', value);
    else next.delete('q');
    next.delete('page');
    const query = next.toString();
    navigate(query ? `${target}?${query}` : target);
  };

  const clearSearch = () => {
    setTerm('');
    const next = new URLSearchParams(isSearchable ? searchParams : undefined);
    next.delete('q');
    next.delete('page');
    const target = isSearchable ? location.pathname : dashboardPath(user.role);
    const query = next.toString();
    navigate(query ? `${target}?${query}` : target);
  };

  const searchForm = (
    <form onSubmit={submitSearch} className="relative w-full">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        type="search"
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-10 w-full rounded-xl border border-line bg-surface pl-10 pr-9 text-sm text-ink outline-none transition placeholder:text-muted focus:border-accent focus:ring-4 focus:ring-accent"
      />
      {term ? (
        <button
          type="button"
          onClick={clearSearch}
          className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted hover:bg-primary-soft hover:text-primary"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </form>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-cream backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[1440px] items-center gap-2 px-4 py-3 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onMenu}
          className="icon-btn shrink-0 xl:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 xl:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-solid text-white">
            <Activity className="h-[18px] w-[18px]" strokeWidth={2.5} />
          </div>
          <span className="text-base font-extrabold tracking-tight text-ink">
            Task<span className="text-primary">Pulse</span>
          </span>
        </div>

        <div className="mx-auto hidden w-full max-w-xl md:block">{searchForm}</div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={toggle}
            className="icon-btn h-10 w-10 shrink-0"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={isDark}
            title={isDark ? 'Light mode' : 'Dark mode'}
          >
            {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          </button>
          <button
            type="button"
            onClick={onOpenNotifications}
            className="icon-btn relative h-10 w-10 shrink-0"
            aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
          >
            <Bell className="h-[18px] w-[18px]" />
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-cream bg-primary-solid px-1 text-[10px] font-bold leading-none text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            ) : null}
          </button>

          <div className="hidden items-center gap-2.5 rounded-xl border border-line bg-surface px-2 py-1.5 xl:flex">
            <Avatar name={user.name} size="sm" />
            <div className="pr-1">
              <p className="max-w-[140px] truncate text-xs font-bold text-ink">{user.name}</p>
              <p className="text-[10px] font-medium capitalize text-muted">
                {user.role === 'admin' ? 'Administrator' : 'Client'}
              </p>
            </div>
          </div>
          <div className="xl:hidden">
            <Avatar name={user.name} size="sm" />
          </div>
        </div>
      </div>

      <div className="px-4 pb-3 sm:px-6 md:hidden">{searchForm}</div>
    </header>
  );
}
