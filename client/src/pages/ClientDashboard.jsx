import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowUpRight,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Link2,
  ListTodo,
  RefreshCw,
  SearchX,
  X,
} from 'lucide-react';
import DueLabel from '../components/DueLabel.jsx';
import BrowserNotificationsButton from '../components/BrowserNotificationsButton.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import Pagination from '../components/Pagination.jsx';
import PriorityBadge from '../components/PriorityBadge.jsx';
import StatCard from '../components/StatCard.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { CardSkeleton } from '../components/LoadingState.jsx';
import api, { getApiErrorMessage } from '../lib/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useNotifications } from '../contexts/NotificationsContext.jsx';
import {
  cn,
  formatDurationWords,
  formatScheduleMoment,
} from '../lib/utils.js';

const PAGE_SIZE = 8;

const tabs = [
  { value: '', label: 'All' },
  { value: 'Not Started', label: 'Not Started' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Blocked', label: 'Blocked' },
  { value: 'Completed', label: 'Completed' },
];

function TaskCard({ task }) {
  const resourceCount = task.resources?.length || 0;
  return (
    <Link
      to={`/client/tasks/${task._id}`}
      className="card group flex h-full flex-col p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[#EAD6C6] hover:shadow-lift"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted transition group-hover:text-primary" />
      </div>

      <h3 className="mt-3 line-clamp-2 text-base font-extrabold leading-snug tracking-tight text-ink group-hover:text-primary">
        {task.title}
      </h3>
      <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-muted">
        {task.description}
      </p>

      <div className="mt-4 space-y-2 border-t border-line pt-3">
        {task.startAt ? (
          <div className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted">
              <CalendarClock className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                Starts: <span className="font-semibold text-ink">{formatScheduleMoment(task.startAt)}</span>
              </span>
            </span>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              Due: <span className="font-semibold text-ink">{formatScheduleMoment(task.deadline)}</span>
            </span>
          </span>
          <DueLabel deadline={task.deadline} status={task.status} />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <Clock3 className="h-3.5 w-3.5" />
            Duration: {formatDurationWords(task.estimatedDuration)}
          </span>
          {resourceCount > 0 ? (
            <span className="flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5" />
              {resourceCount} resource{resourceCount === 1 ? '' : 's'}
            </span>
          ) : null}
          {task.createdBy?.name ? (
            <span className="truncate">Assigned by {task.createdBy.name}</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export default function ClientDashboard() {
  const { user } = useAuth();
  const { liveVersion } = useNotifications();
  const [searchParams, setSearchParams] = useSearchParams();

  const q = searchParams.get('q') || '';
  const status = searchParams.get('status') || '';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    document.title = 'My Tasks · TaskPulse';
  }, []);

  useEffect(() => {
    let active = true;
    setStatsLoading(true);
    setStatsError('');
    api
      .get('/stats')
      .then(({ data: response }) => {
        if (active) setStats(response.stats);
      })
      .catch((err) => {
        if (active) setStatsError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (active) setStatsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [liveVersion, reloadKey]);

  useEffect(() => {
    let active = true;
    if (!data) setLoading(true);
    setError('');
    api
      .get('/tasks', {
        params: {
          q: q || undefined,
          status: status || undefined,
          page,
          limit: PAGE_SIZE,
        },
      })
      .then(({ data: response }) => {
        if (active) setData(response);
      })
      .catch((err) => {
        if (active) setError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [q, status, page, liveVersion, reloadKey]);

  const setStatus = (nextStatus) => {
    const next = new URLSearchParams(searchParams);
    if (nextStatus) next.set('status', nextStatus);
    else next.delete('status');
    next.delete('page');
    setSearchParams(next);
  };

  const goToPage = (nextPage) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(nextPage));
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearFilters = () => setSearchParams(new URLSearchParams());
  const counts = data?.counts || {};
  const tasks = data?.tasks || [];
  const hasFilters = Boolean(q || status);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">My work</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.035em] text-ink sm:text-3xl">
            My Tasks
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            Hi {user.name.split(' ')[0]}, here is everything assigned to you.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BrowserNotificationsButton withHint />
          <button
            type="button"
            className="btn-secondary btn-sm w-fit"
            onClick={() => setReloadKey((key) => key + 1)}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {statsError ? (
        <ErrorState
          message={statsError}
          onRetry={() => setReloadKey((key) => key + 1)}
          title="Could not load your summary"
        />
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <StatCard
          icon={ListTodo}
          label="My Total Tasks"
          value={stats?.totalTasks}
          loading={statsLoading}
          footer="All assigned work"
        />
        <StatCard
          icon={Clock3}
          label="In Progress"
          value={stats?.inProgress}
          loading={statsLoading}
          tone="warning"
          footer="Currently in motion"
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed"
          value={stats?.completed}
          loading={statsLoading}
          tone="success"
          footer="Finished tasks"
        />
        <StatCard
          icon={CalendarDays}
          label="Overdue"
          value={stats?.overdue}
          loading={statsLoading}
          tone="danger"
          footer={stats?.overdue > 0 ? 'Needs your attention' : 'Nothing overdue'}
        />
      </div>

      <section className="card flex flex-col gap-3 p-3 sm:p-4">
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.value || 'all'}
              type="button"
              onClick={() => setStatus(tab.value)}
              className={cn(
                'inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition',
                status === tab.value
                  ? 'bg-primary-soft text-primary'
                  : 'text-muted hover:bg-primary-softer hover:text-ink'
              )}
            >
              {tab.label}
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px]',
                  status === tab.value ? 'bg-surface text-primary' : 'bg-primary-softer text-muted'
                )}
              >
                {counts[tab.value || 'All'] ?? 0}
              </span>
            </button>
          ))}
        </div>

        {q ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
            <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#FCD9C4] bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">
              <span className="truncate">Search: “{q}”</span>
              <button
                type="button"
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  next.delete('q');
                  next.delete('page');
                  setSearchParams(next);
                }}
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
            {hasFilters ? (
              <button
                type="button"
                className="text-xs font-bold text-primary hover:underline"
                onClick={clearFilters}
              >
                Clear all
              </button>
            ) : null}
          </div>
        ) : null}
      </section>

      {error ? (
        <ErrorState message={error} onRetry={() => setReloadKey((key) => key + 1)} />
      ) : loading ? (
        <CardSkeleton count={4} className="xl:grid-cols-2" />
      ) : tasks.length === 0 ? (
        <div className="card p-4 sm:p-5">
          <EmptyState
            icon={hasFilters ? SearchX : ClipboardList}
            title={hasFilters ? 'No tasks in this view' : 'No tasks assigned yet'}
            description={
              hasFilters
                ? 'Try another status tab or clear your search.'
                : 'When your administrator assigns work, it will appear here with all the details.'
            }
            action={
              hasFilters ? (
                <button type="button" className="btn-secondary btn-sm" onClick={clearFilters}>
                  Clear filters
                </button>
              ) : null
            }
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {tasks.map((task) => (
              <TaskCard key={task._id} task={task} />
            ))}
          </div>
          <div className="card overflow-hidden">
            <Pagination
              pagination={data?.pagination}
              onPageChange={goToPage}
              itemLabel="tasks"
            />
          </div>
        </>
      )}
    </div>
  );
}
