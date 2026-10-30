import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Clock3,
  ExternalLink,
  Flag,
  Image as ImageIcon,
  Info,
  Link2,
  Loader2,
  MessageSquare,
  Pencil,
  Send,
  Trash2,
  UserRound,
} from 'lucide-react';
import Avatar from '../components/Avatar.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import DueLabel from '../components/DueLabel.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import PriorityBadge from '../components/PriorityBadge.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { PageLoader } from '../components/LoadingState.jsx';
import api, { getApiErrorMessage } from '../lib/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useNotifications } from '../contexts/NotificationsContext.jsx';
import {
  cn,
  countdownLabel,
  dashboardPath,
  formatDate,
  formatDateTime,
  formatDuration,
  formatRelative,
} from '../lib/utils.js';

const statusOptions = [
  { value: 'Not Started', dot: 'bg-[#78716C]' },
  { value: 'In Progress', dot: 'bg-primary' },
  { value: 'Blocked', dot: 'bg-danger' },
  { value: 'Completed', dot: 'bg-success' },
];

function ImagePreviewCard({ resource }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [resource.url]);

  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group overflow-hidden rounded-xl border border-line bg-primary-softer transition hover:border-accent/40 hover:shadow-soft"
    >
      <div className="relative h-36 bg-primary-softer">
        {failed ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 bg-primary-soft text-xs font-medium text-muted">
            <ImageIcon className="h-5 w-5" />
            Preview unavailable — open link
          </div>
        ) : (
          <>
            {!loaded ? (
              <div className="absolute inset-0 flex items-center justify-center gap-2 text-xs font-medium text-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading preview…
              </div>
            ) : null}
            <img
              src={resource.url}
              alt={resource.label}
              className={cn(
                'h-36 w-full object-cover transition duration-300 group-hover:scale-[1.02]',
                loaded ? 'opacity-100' : 'opacity-0'
              )}
              onLoad={() => setLoaded(true)}
              onError={() => setFailed(true)}
              loading="lazy"
            />
          </>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-line bg-white px-3 py-2">
        <span className="truncate text-xs font-semibold text-ink">{resource.label}</span>
        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted group-hover:text-primary" />
      </div>
    </a>
  );
}

export default function TaskDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { liveVersion } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const initialLive = useRef(liveVersion);

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentsError, setCommentsError] = useState('');
  const [statusUpdating, setStatusUpdating] = useState('');
  const [statusError, setStatusError] = useState('');
  const [newComment, setNewComment] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [flash, setFlash] = useState(location.state?.flash || '');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [, setTick] = useState(0);

  useEffect(() => {
    document.title = task?.title ? `${task.title} · TaskPulse` : 'Task · TaskPulse';
  }, [task?.title]);

  useEffect(() => {
    if (!flash) return undefined;
    const timer = setTimeout(() => setFlash(''), 4500);
    return () => clearTimeout(timer);
  }, [flash]);

  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api
      .get(`/tasks/${id}`)
      .then(({ data }) => {
        if (active) setTask(data.task);
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
  }, [id, reloadKey]);

  useEffect(() => {
    let active = true;
    setCommentsLoading(true);
    setCommentsError('');
    api
      .get(`/tasks/${id}/comments`)
      .then(({ data }) => {
        if (active) setComments(data.comments);
      })
      .catch((err) => {
        if (active) setCommentsError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (active) setCommentsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, reloadKey]);

  useEffect(() => {
    if (liveVersion === initialLive.current) return undefined;
    initialLive.current = liveVersion;
    let active = true;

    api
      .get(`/tasks/${id}`)
      .then(({ data }) => {
        if (active) setTask(data.task);
      })
      .catch(() => {});

    api
      .get(`/tasks/${id}/comments`)
      .then(({ data }) => {
        if (active) setComments(data.comments);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [liveVersion, id]);

  const changeStatus = async (status) => {
    if (!task || task.status === status || statusUpdating) return;
    setStatusUpdating(status);
    setStatusError('');
    try {
      const { data } = await api.patch(`/tasks/${id}/status`, { status });
      setTask(data.task);
      setFlash(data.message || `Status changed to ${status}.`);
    } catch (err) {
      setStatusError(getApiErrorMessage(err));
    } finally {
      setStatusUpdating('');
    }
  };

  const submitComment = async (event) => {
    event?.preventDefault();
    const message = newComment.trim();
    if (!message || commentSubmitting) return;

    setCommentSubmitting(true);
    setCommentError('');
    try {
      const { data } = await api.post(`/tasks/${id}/comments`, { message });
      setComments((previous) => [...previous, data.comment]);
      setNewComment('');
      setFlash('Reply posted.');
    } catch (err) {
      setCommentError(getApiErrorMessage(err));
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await api.delete(`/tasks/${id}`);
      navigate(dashboardPath(user.role), { replace: true });
    } catch (err) {
      setDeleteError(getApiErrorMessage(err));
      setDeleting(false);
    }
  };

  if (loading) return <PageLoader label="Loading task…" />;

  if (error || !task) {
    return (
      <div className="space-y-6">
        <Link
          to={dashboardPath(user.role)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <ErrorState
          title="Task unavailable"
          message={error || 'This task could not be found.'}
          onRetry={() => setReloadKey((key) => key + 1)}
        />
      </div>
    );
  }

  const isAdmin = user.role === 'admin';
  const imageResources = (task.resources || []).filter((resource) => resource.type === 'image');
  const deadlinePassed =
    task.status !== 'Completed' && new Date(task.deadline).getTime() < Date.now();
  const countdown = countdownLabel(task.deadline, task.status);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <Link
          to={dashboardPath(user.role)}
          className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-muted transition hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {isAdmin ? 'dashboard' : 'my tasks'}
        </Link>

        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <PriorityBadge priority={task.priority} />
              <StatusBadge status={task.status} />
            </div>
            <h1 className="mt-3 break-words text-2xl font-extrabold leading-tight tracking-[-0.035em] text-ink sm:text-3xl">
              {task.title}
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
              {isAdmin ? (
                <>
                  <span className="flex items-center gap-1.5">
                    <UserRound className="h-3.5 w-3.5" />
                    Assigned to <span className="font-semibold text-ink">{task.assignedTo?.name}</span>
                  </span>
                  <span className="hidden h-1 w-1 rounded-full bg-line sm:block" />
                </>
              ) : null}
              <span>Created {formatDate(task.createdAt)}</span>
            </p>
          </div>

          {isAdmin ? (
            <div className="flex flex-wrap items-center gap-2">
              <Link to={`/admin/tasks/${task._id}/edit`} className="btn-secondary btn-sm">
                <Pencil className="h-3.5 w-3.5" />
                Edit Task
              </Link>
              <button
                type="button"
                className="btn-secondary btn-sm text-danger hover:border-[#FECACA] hover:bg-dangerSoft"
                onClick={() => {
                  setDeleteError('');
                  setDeleteOpen(true);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          ) : null}
        </div>
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <aside className="order-first space-y-5 xl:order-none xl:col-start-2 xl:row-start-1 xl:sticky xl:top-24 xl:self-start">
          <section className="card p-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <CircleDot className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-extrabold tracking-tight text-ink">Status</h2>
                <p className="text-xs text-muted">Keep the work up to date.</p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-line bg-primary-softer/60 px-3 py-2.5">
              <span className="text-xs font-semibold text-muted">Current</span>
              <StatusBadge status={task.status} />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {statusOptions.map((option) => {
                const selected = task.status === option.value;
                const updating = statusUpdating === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => changeStatus(option.value)}
                    disabled={selected || Boolean(statusUpdating)}
                    aria-pressed={selected}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-xl border px-2.5 py-2.5 text-xs font-bold transition',
                      selected
                        ? 'border-primary bg-primary-soft text-primary'
                        : 'border-line bg-white text-muted hover:border-accent/40 hover:bg-primary-softer hover:text-ink disabled:cursor-not-allowed disabled:opacity-60'
                    )}
                  >
                    {updating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <span className={cn('h-1.5 w-1.5 rounded-full', option.dot)} />
                    )}
                    {option.value}
                  </button>
                );
              })}
            </div>

            <p className="mt-3 text-[11px] leading-relaxed text-muted">
              {isAdmin
                ? 'Changing the status notifies the assigned client instantly.'
                : 'Your administrator is notified instantly when you update the status.'}
            </p>

            {statusError ? (
              <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-danger">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {statusError}
              </p>
            ) : null}
          </section>

          <section className="card p-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Info className="h-4 w-4" />
              </div>
              <h2 className="text-base font-extrabold tracking-tight text-ink">Task details</h2>
            </div>

            <div className="mt-4 rounded-xl border border-line bg-primary-softer/60 p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
                Time remaining
              </p>
              <p
                className={cn(
                  'mt-1 text-sm font-extrabold',
                  task.status === 'Completed'
                    ? 'text-success'
                    : deadlinePassed
                      ? 'text-danger'
                      : 'text-primary'
                )}
              >
                {countdown}
              </p>
            </div>

            <dl className="mt-4 space-y-3.5">
              <div className="flex items-start justify-between gap-3">
                <dt className="flex items-center gap-2 text-xs font-medium text-muted">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Deadline
                </dt>
                <dd className="text-right">
                  <p className="text-xs font-semibold text-ink">{formatDateTime(task.deadline)}</p>
                  <DueLabel deadline={task.deadline} status={task.status} className="mt-0.5" />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-xs font-medium text-muted">
                  <Clock3 className="h-3.5 w-3.5" />
                  Duration
                </dt>
                <dd className="text-xs font-semibold text-ink">
                  {formatDuration(task.estimatedDuration)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-xs font-medium text-muted">
                  <Flag className="h-3.5 w-3.5" />
                  Priority
                </dt>
                <dd>
                  <PriorityBadge priority={task.priority} />
                </dd>
              </div>
              {isAdmin ? (
                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-2 text-xs font-medium text-muted">
                    <UserRound className="h-3.5 w-3.5" />
                    Client
                  </dt>
                  <dd className="text-right">
                    <p className="text-xs font-semibold text-ink">{task.assignedTo?.name}</p>
                    <p className="text-[11px] text-muted">{task.assignedTo?.email}</p>
                  </dd>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
                <dt className="text-xs font-medium text-muted">Last updated</dt>
                <dd className="text-xs font-semibold text-ink">{formatRelative(task.updatedAt)}</dd>
              </div>
            </dl>
          </section>
        </aside>

        <div className="space-y-6 xl:col-start-1 xl:row-start-1">
          <section className="card p-5 sm:p-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-extrabold tracking-tight text-ink">Description</h2>
                <p className="text-xs text-muted">The full brief for this task.</p>
              </div>
            </div>
            <p className="mt-4 whitespace-pre-line text-sm leading-7 text-ink/90">
              {task.description}
            </p>
          </section>

          <section className="card p-5 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Link2 className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold tracking-tight text-ink">Resources</h2>
                  <p className="text-xs text-muted">Links and images shared by the admin.</p>
                </div>
              </div>
              <span className="chip w-fit">{task.resources?.length || 0} total</span>
            </div>

            {task.resources?.length ? (
              <>
                {imageResources.length ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {imageResources.map((resource, index) => (
                      <ImagePreviewCard key={`${resource.url}-${index}`} resource={resource} />
                    ))}
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  {task.resources.map((resource, index) => (
                    <a
                      key={`${resource.url}-${index}`}
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="chip max-w-full transition hover:border-accent/50 hover:bg-primary-soft hover:text-primary"
                    >
                      {resource.type === 'image' ? (
                        <ImageIcon className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <Link2 className="h-3.5 w-3.5 shrink-0" />
                      )}
                      <span className="max-w-[240px] truncate">{resource.label}</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  ))}
                </div>
              </>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-[#EADACD] bg-primary-softer px-4 py-6 text-center">
                <p className="text-sm font-semibold text-ink">No resources added</p>
                <p className="mt-1 text-xs text-muted">This task has no links or image previews.</p>
              </div>
            )}
          </section>

          <section className="card p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold tracking-tight text-ink">
                    Queries & Comments
                  </h2>
                  <p className="text-xs text-muted">Ask questions and keep the conversation clear.</p>
                </div>
              </div>
              <span className="chip">{comments.length}</span>
            </div>

            <div className="mt-5">
              {commentsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="skeleton h-9 w-9 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <div className="skeleton h-3.5 w-1/3" />
                        <div className="skeleton h-4 w-full" />
                        <div className="skeleton h-4 w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : commentsError ? (
                <ErrorState
                  message={commentsError}
                  onRetry={() => {
                    setCommentsLoading(true);
                    setCommentsError('');
                    api
                      .get(`/tasks/${id}/comments`)
                      .then(({ data }) => setComments(data.comments))
                      .catch((err) => setCommentsError(getApiErrorMessage(err)))
                      .finally(() => setCommentsLoading(false));
                  }}
                  title="Could not load comments"
                />
              ) : comments.length === 0 ? (
                <EmptyState
                  icon={MessageSquare}
                  title="No queries yet"
                  description={
                    isAdmin
                      ? 'Start the conversation if you need to clarify anything with the client.'
                      : 'Have a question about this task? Post it below and your admin will be notified.'
                  }
                />
              ) : (
                <div className="divide-y divide-line">
                  {comments.map((comment) => {
                    const authorId = comment.author?._id || comment.author;
                    const isOwn = authorId === user.id;
                    return (
                      <div key={comment._id} className="flex gap-3 py-4 first:pt-0">
                        <Avatar name={comment.author?.name} size="md" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-bold text-ink">
                              {comment.author?.name || 'Unknown user'}
                            </p>
                            <span
                              className={cn(
                                'rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em]',
                                comment.author?.role === 'admin'
                                  ? 'border-[#FCD9C4] bg-primary-soft text-primary'
                                  : 'border-[#E7E5E4] bg-[#F5F5F4] text-[#57534E]'
                              )}
                            >
                              {comment.author?.role === 'admin' ? 'Admin' : 'Client'}
                            </span>
                            {isOwn ? <span className="text-[10px] font-semibold text-muted">You</span> : null}
                            <span className="text-[11px] text-muted">
                              {formatRelative(comment.createdAt)}
                            </span>
                          </div>
                          <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-ink/90">
                            {comment.message}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <form
              onSubmit={submitComment}
              className="mt-5 rounded-xl border border-line bg-primary-softer/60 p-3.5"
            >
              <label htmlFor="comment-message" className="sr-only">
                {isAdmin ? 'Reply to this task' : 'Ask a question about this task'}
              </label>
              <textarea
                id="comment-message"
                className="input min-h-[96px] resize-y bg-white"
                value={newComment}
                onChange={(event) => {
                  setNewComment(event.target.value);
                  setCommentError('');
                }}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                    submitComment(event);
                  }
                }}
                placeholder={
                  isAdmin
                    ? 'Write a reply to the client…'
                    : 'Ask a question or add a note for your admin…'
                }
                maxLength={2000}
              />
              {commentError ? (
                <p className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-danger">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {commentError}
                </p>
              ) : null}
              <div className="mt-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-[11px] text-muted">
                  {newComment.length}/2000 · Ctrl/⌘ + Enter to send
                </span>
                <button
                  type="submit"
                  className="btn-primary btn-sm w-full sm:w-auto"
                  disabled={!newComment.trim() || commentSubmitting}
                >
                  {commentSubmitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  {isAdmin ? 'Post Reply' : 'Post Query'}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => {
          if (!deleting) setDeleteOpen(false);
        }}
        onConfirm={handleDelete}
        title="Delete this task?"
        description={
          deleteError ||
          `“${task.title}” and all of its comments will be permanently deleted. This cannot be undone.`
        }
        confirmLabel="Delete Task"
        loading={deleting}
        danger
      />
    </div>
  );
}
