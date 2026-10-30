import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Filter,
  Plus,
  RefreshCw,
  RotateCw,
  SearchX,
  Users,
  X,
} from 'lucide-react';
import Avatar from '../components/Avatar.jsx';
import DueLabel from '../components/DueLabel.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import Pagination from '../components/Pagination.jsx';
import PriorityBadge from '../components/PriorityBadge.jsx';
import StatCard from '../components/StatCard.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { RowSkeleton } from '../components/LoadingState.jsx';
import api from '../lib/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useNotifications } from '../contexts/NotificationsContext.jsx';
import { cn, formatDateTime } from '../lib/utils.js';
import { getApiErrorMessage } from '../lib/api.js';

const PAGE_SIZE = 8;

export default function AdminDashboard() {
  const { user } = useAuth();
  const { liveVersion } = useNotifications();
  const [searchParams, setSearchParams] = useSearchParams();

  const q = searchParams.get('q') || '';
  const client = searchParams.get('client') || '';
  const status = searchParams.get('status') || '';
  const priority = searchParams.get('priority') || '';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [clients, setClients] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    document.title = 'Dashboard · TaskPulse';
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
    api
      .get('/users', { params: { limit: 100, status: 'all' } })
      .then(({ data: response }) => {
        if (active) setClients(response.clients);
      })
      .catch(() => {
        if (active) setClients([]);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (data) setRefreshing(true);
    else setLoading(true);
    setError('');
    api
      .get('/tasks', {
        params: {
          q: q || undefined,
          client: client || undefined,
          status: status || undefined,
          priority: priority || undefined,
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
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      });
    return () => {
      active = false;
    };
  }, [q, client, status, priority, page, liveVersion, reloadKey]);

  const updateParam = useCallback(
    (key, value) => {
      const next = new URLSearchParams(searchParams);
      if (!value || value === 'all') next.delete(key);
      else next.set(key, value);
      next.delete('page');
      setSearchParams(next);
    },
    [searchParams, setSearchParams]
  );

  const goToPage = (nextPage) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(nextPage));
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearFilters = () => setSearchParams(new URLSearchParams());
  const hasFilters = Boolean(q || client || status || priority);
  const tasks = data?.tasks || [];
  const counts = data?.counts || { All: 0 };

  const refreshAll = () => {
    setReloadKey((key) => key + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">Overview</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.035em] text-ink sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            Welcome back, {user.name.split(' ')[0]}. Here is the latest work across your clients.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn-secondary btn-sm" onClick={refreshAll}>
            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
            Refresh
          </button>
          <Link to="/admin/tasks/new" className="btn-primary btn-sm">
            <Plus className="h-3.5 w-3.5" />
            Create Task
          </Link>
        </div>
      </div>

      {statsError ? <ErrorState message={statsError} onRetry={refreshAll} /> : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <StatCard
          icon={Users}
          label="Total Clients"
          value={stats?.totalClients}
          loading={statsLoading}
          footer={`${stats?.activeClients ?? 0} active client${stats?.activeClients === 1 ? '' : 's'}`}
        />
        <StatCard
          icon={ClipboardList}
          label="Total Tasks"
          value={stats?.totalTasks}
          loading={statsLoading}
          tone="accent"
          footer={
            stats?.overdue > 0 ? (
              <span className="font-semibold text-danger">{stats.overdue} overdue</span>
            ) : (
              'No overdue tasks'
            )
          }
        />
        <StatCard
          icon={Clock3}
          label="In Progress"
          value={stats?.inProgress}
          loading={statsLoading}
          tone="warning"
          footer="Currently being worked on"
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed"
          value={stats?.completed}
          loading={statsLoading}
          tone="success"
          footer="Finished tasks"
        />
      </div>

      <section className="card p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-ink">
            <Filter className="h-4 w-4 text-primary" />
            Filters
            {refreshing ? <RotateCw className="h-3.5 w-3.5 animate-spin text-muted" /> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {q ? (
              <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#FCD9C4] bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">
                <span className="truncate">Search: “{q}”</span>
                <button
                  type="button"
                  onClick={() => updateParam('q', '')}
                  className="rounded-full p-0.5 hover:bg-white/70"
                  aria-label="Clear search"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ) : null}
            {hasFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-primary hover:bg-primary-soft"
              >
                <X className="h-3.5 w-3.5" />
                Clear all
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="filter-client" className="label">
              Client
            </label>
            <select
              id="filter-client"
              className="select"
              value={client}
              onChange={(event) => updateParam('client', event.target.value)}
            >
              <option value="">All clients</option>
              {clients.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filter-status" className="label">
              Status
            </label>
            <select
              id="filter-status"
              className="select"
              value={status}
              onChange={(event) => updateParam('status', event.target.value)}
            >
              <option value="">All statuses</option>
              <option>Not Started</option>
              <option>In Progress</option>
              <option>Blocked</option>
              <option>Completed</option>
            </select>
          </div>
          <div>
            <label htmlFor="filter-priority" className="label">
              Priority
            </label>
            <select
              id="filter-priority"
              className="select"
              value={priority}
              onChange={(event) => updateParam('priority', event.target.value)}
            >
              <option value="">All priorities</option>
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </div>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-line px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="text-base font-extrabold tracking-tight text-ink">Tasks</h2>
            <p className="mt-0.5 text-xs text-muted">
              {data?.pagination?.total ?? 0} task{data?.pagination?.total === 1 ? '' : 's'} in this view
            </p>
          </div>
          {data?.overdueCount > 0 ? (
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[#FECACA] bg-dangerSoft px-2.5 py-1 text-[11px] font-bold text-danger">
              <Clock3 className="h-3 w-3" />
              {data.overdueCount} overdue
            </span>
          ) : null}
        </div>

        {error ? (
          <div className="p-4 sm:p-5">
            <ErrorState message={error} onRetry={refreshAll} />
          </div>
        ) : loading ? (
          <RowSkeleton count={6} />
        ) : tasks.length === 0 ? (
          <div className="p-4 sm:p-5">
            <EmptyState
              icon={hasFilters ? SearchX : ClipboardList}
              title={hasFilters ? 'No tasks match these filters' : 'No tasks yet'}
              description={
                hasFilters
                  ? 'Try a different client, status, priority or search term.'
                  : 'Create the first task and assign it to a client.'
              }
              action={
                hasFilters ? (
                  <button type="button" className="btn-secondary btn-sm" onClick={clearFilters}>
                    Clear filters
                  </button>
                ) : (
                  <Link to="/admin/tasks/new" className="btn-primary btn-sm">
                    <Plus className="h-3.5 w-3.5" />
                    Create Task
                  </Link>
                )
              }
            />
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto xl:block">
              <table className="w-full min-w-[820px] border-collapse">
                <thead className="border-b border-line bg-primary-softer/60">
                  <tr>
                    <th className="table-th">Task</th>
                    <th className="table-th">Client</th>
                    <th className="table-th">Deadline</th>
                    <th className="table-th">Priority</th>
                    <th className="table-th">Status</th>
                    <th className="table-th text-right">Open</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {tasks.map((task) => (
                    <tr key={task._id} className="transition hover:bg-primary-softer/60">
                      <td className="table-td max-w-[300px]">
                        <Link
                          to={`/admin/tasks/${task._id}`}
                          className="block truncate font-bold text-ink hover:text-primary"
                        >
                          {task.title}
                        </Link>
                        <p className="mt-1 line-clamp-1 text-xs text-muted">{task.description}</p>
                      </td>
                      <td className="table-td">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={task.assignedTo?.name} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-ink">
                              {task.assignedTo?.name || 'Unknown client'}
                            </p>
                            <p className="truncate text-[11px] text-muted">
                              {task.assignedTo?.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="table-td">
                        <p className="whitespace-nowrap text-sm font-medium text-ink">
                          {formatDateTime(task.deadline)}
                        </p>
                        <DueLabel deadline={task.deadline} status={task.status} className="mt-1" />
                      </td>
                      <td className="table-td">
                        <PriorityBadge priority={task.priority} />
                      </td>
                      <td className="table-td">
                        <StatusBadge status={task.status} />
                      </td>
                      <td className="table-td text-right">
                        <Link
                          to={`/admin/tasks/${task._id}`}
                          className="icon-btn ml-auto"
                          aria-label={`Open ${task.title}`}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-line xl:hidden">
              {tasks.map((task) => (
                <Link
                  key={task._id}
                  to={`/admin/tasks/${task._id}`}
                  className="block px-4 py-4 transition hover:bg-primary-softer/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold leading-snug text-ink">{task.title}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <Avatar name={task.assignedTo?.name} size="sm" />
                        <span className="truncate text-xs font-medium text-muted">
                          {task.assignedTo?.name || 'Unknown client'}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={task.status} />
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted">
                    {task.description}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                    <PriorityBadge priority={task.priority} />
                    <span className="text-xs text-muted">{formatDateTime(task.deadline)}</span>
                    <DueLabel deadline={task.deadline} status={task.status} />
                  </div>
                </Link>
              ))}
            </div>

            <Pagination
              pagination={data?.pagination}
              onPageChange={goToPage}
              itemLabel="tasks"
            />
          </>
        )}
      </section>
    </div>
  );
}
