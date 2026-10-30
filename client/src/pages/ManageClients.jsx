import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  ListTodo,
  Pencil,
  Plus,
  SearchX,
  UserCheck,
  UserRound,
  UserX,
  Users,
  X,
} from 'lucide-react';
import Avatar from '../components/Avatar.jsx';
import ClientFormModal from '../components/ClientFormModal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import DueLabel from '../components/DueLabel.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import Pagination from '../components/Pagination.jsx';
import { CardSkeleton } from '../components/LoadingState.jsx';
import api, { getApiErrorMessage } from '../lib/api.js';
import { useNotifications } from '../contexts/NotificationsContext.jsx';
import { cn } from '../lib/utils.js';

const PAGE_SIZE = 6;

function ActiveBadge({ active }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.05em]',
        active
          ? 'border-[#BBF7D0] bg-successSoft text-success'
          : 'border-[#E7E5E4] bg-[#F5F5F4] text-[#57534E]'
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function ClientCard({ client, onEdit, onDeactivate, onReactivate, busy }) {
  const navigate = useNavigate();
  const stats = client.stats || {};
  const recent = stats.mostRecentTask;

  return (
    <article className="card flex flex-col p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-start gap-3">
        <Avatar name={client.name} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-extrabold tracking-tight text-ink">
              {client.name}
            </h3>
            <ActiveBadge active={client.isActive} />
          </div>
          <p className="mt-0.5 truncate text-xs font-medium text-muted">{client.email}</p>
          <p className="truncate text-xs text-muted">{client.phone}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            className="icon-btn h-8 w-8"
            onClick={() => onEdit(client)}
            aria-label={`Edit ${client.name}`}
            title="Edit client"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          {client.isActive ? (
            <button
              type="button"
              className="icon-btn h-8 w-8 hover:border-[#FECACA] hover:bg-dangerSoft hover:text-danger"
              onClick={() => onDeactivate(client)}
              disabled={busy}
              aria-label={`Deactivate ${client.name}`}
              title="Deactivate client"
            >
              <UserX className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              className="icon-btn h-8 w-8 hover:border-[#BBF7D0] hover:bg-successSoft hover:text-success"
              onClick={() => onReactivate(client)}
              disabled={busy}
              aria-label={`Reactivate ${client.name}`}
              title="Reactivate client"
            >
              <UserCheck className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 divide-x divide-line rounded-xl border border-line bg-primary-softer/60 py-3">
        <div className="px-2 text-center">
          <p className="text-lg font-extrabold tracking-tight text-ink">{stats.totalTasks || 0}</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-muted">
            Total tasks
          </p>
        </div>
        <div className="px-2 text-center">
          <p className="text-lg font-extrabold tracking-tight text-primary">
            {stats.inProgress || 0}
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-muted">
            In progress
          </p>
        </div>
        <div className="px-2 text-center">
          <p className="text-lg font-extrabold tracking-tight text-success">{stats.completed || 0}</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-muted">
            Completed
          </p>
        </div>
      </div>

      <div className="mt-4 flex-1 rounded-xl border border-line bg-white p-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
          Most recent task
        </p>
        {recent ? (
          <button
            type="button"
            onClick={() => navigate(`/admin/tasks/${recent.id}`)}
            className="mt-1.5 w-full text-left"
          >
            <span className="line-clamp-1 text-sm font-semibold text-ink transition hover:text-primary">
              {recent.title}
            </span>
            <span className="mt-1 flex items-center gap-2">
              <DueLabel deadline={recent.deadline} status={recent.status} />
            </span>
          </button>
        ) : (
          <p className="mt-1.5 text-sm text-muted">No tasks assigned yet.</p>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          className="btn-secondary btn-sm"
          onClick={() => navigate(`/admin/dashboard?client=${client.id}`)}
        >
          <ListTodo className="h-3.5 w-3.5" />
          View Tasks
        </button>
        <button
          type="button"
          className="btn-primary btn-sm"
          onClick={() => navigate(`/admin/tasks/new?client=${client.id}`)}
          disabled={!client.isActive}
          title={!client.isActive ? 'Reactivate this client before assigning work' : undefined}
        >
          <Plus className="h-3.5 w-3.5" />
          Assign Task
        </button>
      </div>
    </article>
  );
}

export default function ManageClients() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { liveVersion } = useNotifications();
  const q = searchParams.get('q') || '';
  const status = searchParams.get('status') || 'all';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [confirmClient, setConfirmClient] = useState(null);
  const [deactivating, setDeactivating] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState('');
  const [flash, setFlash] = useState('');

  useEffect(() => {
    document.title = 'Manage Clients · TaskPulse';
  }, []);

  useEffect(() => {
    if (!flash) return undefined;
    const timer = setTimeout(() => setFlash(''), 4500);
    return () => clearTimeout(timer);
  }, [flash]);

  useEffect(() => {
    let active = true;
    if (!data) setLoading(true);
    setError('');
    api
      .get('/users', {
        params: { q: q || undefined, status, page, limit: PAGE_SIZE },
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
    if (nextStatus === 'all') next.delete('status');
    else next.set('status', nextStatus);
    next.delete('page');
    setSearchParams(next);
  };

  const goToPage = (nextPage) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(nextPage));
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearSearch = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('q');
    next.delete('page');
    setSearchParams(next);
  };

  const openCreate = () => {
    setEditingClient(null);
    setModalOpen(true);
  };

  const openEdit = (client) => {
    setEditingClient(client);
    setModalOpen(true);
  };

  const handleSaved = (client, wasEdit) => {
    setFlash(wasEdit ? `${client.name} was updated.` : `${client.name} was added as a client.`);
    setReloadKey((key) => key + 1);
  };

  const handleDeactivate = async () => {
    if (!confirmClient) return;
    setDeactivating(true);
    setActionError('');
    try {
      const { data: response } = await api.patch(`/users/${confirmClient.id}/deactivate`);
      setFlash(response.message || `${confirmClient.name} was deactivated.`);
      setConfirmClient(null);
      setReloadKey((key) => key + 1);
    } catch (err) {
      setActionError(getApiErrorMessage(err));
      setConfirmClient(null);
    } finally {
      setDeactivating(false);
    }
  };

  const handleReactivate = async (client) => {
    setBusyId(client.id);
    setActionError('');
    try {
      await api.put(`/users/${client.id}`, { isActive: true });
      setFlash(`${client.name} was reactivated and can log in again.`);
      setReloadKey((key) => key + 1);
    } catch (err) {
      setActionError(getApiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const clients = data?.clients || [];
  const summary = data?.summary || { total: 0, active: 0, inactive: 0 };
  const hasFilters = Boolean(q || status !== 'all');
  const tabs = [
    { key: 'all', label: 'All', count: summary.total },
    { key: 'active', label: 'Active', count: summary.active },
    { key: 'inactive', label: 'Inactive', count: summary.inactive },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">People</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.035em] text-ink sm:text-3xl">
            Manage Clients
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            Create client accounts, review their work and assign new tasks.
          </p>
        </div>
        <button type="button" className="btn-primary btn-sm w-fit" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Client
        </button>
      </div>

      {flash ? (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-[#FCD9C4] bg-primary-soft px-4 py-3 text-sm font-semibold text-primary"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          {flash}
        </div>
      ) : null}

      {actionError ? (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-xl border border-[#FECACA] bg-dangerSoft px-4 py-3 text-sm font-medium text-danger"
        >
          <span className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {actionError}
          </span>
          <button type="button" onClick={() => setActionError('')} aria-label="Dismiss error">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <section className="card flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-primary-softer p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatus(tab.key)}
              className={cn(
                'inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition',
                status === tab.key
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-muted hover:text-ink'
              )}
            >
              {tab.label}
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px]',
                  status === tab.key ? 'bg-primary-soft text-primary' : 'bg-white/70 text-muted'
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {q ? (
            <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#FCD9C4] bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">
              <span className="truncate">Search: “{q}”</span>
              <button type="button" onClick={clearSearch} aria-label="Clear search">
                <X className="h-3 w-3" />
              </button>
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
            <Users className="h-3.5 w-3.5" />
            {summary.total} total
          </span>
          <span className="h-1 w-1 rounded-full bg-line" />
          <span className="text-xs font-medium text-muted">{summary.active} active</span>
          <span className="h-1 w-1 rounded-full bg-line" />
          <span className="text-xs font-medium text-muted">{summary.inactive} inactive</span>
        </div>
      </section>

      {error ? (
        <ErrorState message={error} onRetry={() => setReloadKey((key) => key + 1)} />
      ) : loading ? (
        <CardSkeleton count={6} className="xl:grid-cols-3" />
      ) : clients.length === 0 ? (
        <div className="card p-4 sm:p-5">
          <EmptyState
            icon={hasFilters ? SearchX : UserRound}
            title={hasFilters ? 'No clients match this view' : 'No clients yet'}
            description={
              hasFilters
                ? 'Try clearing the search or choosing a different status tab.'
                : 'Add your first client account to start assigning work.'
            }
            action={
              hasFilters ? (
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => setSearchParams(new URLSearchParams())}
                >
                  Clear filters
                </button>
              ) : (
                <button type="button" className="btn-primary btn-sm" onClick={openCreate}>
                  <Plus className="h-3.5 w-3.5" />
                  Add Client
                </button>
              )
            }
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            {clients.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                onEdit={openEdit}
                onDeactivate={setConfirmClient}
                onReactivate={handleReactivate}
                busy={busyId === client.id}
              />
            ))}
          </div>
          <div className="card overflow-hidden">
            <Pagination
              pagination={data?.pagination}
              onPageChange={goToPage}
              itemLabel="clients"
            />
          </div>
        </>
      )}

      <ClientFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        client={editingClient}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={Boolean(confirmClient)}
        onClose={() => setConfirmClient(null)}
        onConfirm={handleDeactivate}
        title="Deactivate client?"
        description={
          confirmClient
            ? `${confirmClient.name} will no longer be able to log in. Their tasks, comments and history will stay intact. You can reactivate them at any time.`
            : ''
        }
        confirmLabel="Deactivate Client"
        loading={deactivating}
        danger
      />
    </div>
  );
}
