import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Flag,
  Info,
  Loader2,
  Save,
  Users,
} from 'lucide-react';
import ClientSelect from '../components/ClientSelect.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import ResourceEditor from '../components/ResourceEditor.jsx';
import { PageLoader } from '../components/LoadingState.jsx';
import api, { getApiErrorMessage } from '../lib/api.js';
import { cn, formatDuration, isHttpUrl, toDateTimeLocal } from '../lib/utils.js';

const priorities = [
  { value: 'Low', label: 'Low', helper: 'Can wait' },
  { value: 'Medium', label: 'Medium', helper: 'Normal' },
  { value: 'High', label: 'High', helper: 'Urgent' },
];

function emptyForm(preselectedClient = '') {
  return {
    title: '',
    description: '',
    assignedTo: preselectedClient,
    deadline: '',
    estimatedDuration: '',
    priority: 'Medium',
    resources: [],
  };
}

export default function TaskFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [searchParams] = useSearchParams();
  const preselectedClient = searchParams.get('client') || '';
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyForm(preselectedClient));
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [clientsError, setClientsError] = useState('');
  const [clientsReload, setClientsReload] = useState(0);
  const [taskLoading, setTaskLoading] = useState(isEdit);
  const [taskError, setTaskError] = useState('');
  const [taskReload, setTaskReload] = useState(0);

  useEffect(() => {
    document.title = isEdit ? 'Edit Task · TaskPulse' : 'Create Task · TaskPulse';
  }, [isEdit]);

  useEffect(() => {
    let active = true;
    setClientsLoading(true);
    setClientsError('');
    api
      .get('/users', { params: { limit: 100, status: 'all' } })
      .then(({ data }) => {
        if (active) setClients(data.clients);
      })
      .catch((err) => {
        if (active) setClientsError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (active) setClientsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [clientsReload]);

  useEffect(() => {
    if (!isEdit) {
      setTaskLoading(false);
      return undefined;
    }

    let active = true;
    setTaskLoading(true);
    setTaskError('');
    api
      .get(`/tasks/${id}`)
      .then(({ data }) => {
        if (!active) return;
        const task = data.task;
        setForm({
          title: task.title,
          description: task.description,
          assignedTo: task.assignedTo?._id || task.assignedTo,
          deadline: toDateTimeLocal(task.deadline),
          estimatedDuration: String(task.estimatedDuration),
          priority: task.priority,
          resources: (task.resources || []).map((resource, index) => ({
            key: `existing-${index}-${resource.url}`,
            label: resource.label,
            url: resource.url,
            type: resource.type,
          })),
        });
      })
      .catch((err) => {
        if (active) setTaskError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (active) setTaskLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, isEdit, taskReload]);

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const handleResourcesChange = (resources) => {
    setForm((current) => ({ ...current, resources }));
    setErrors((current) => {
      const next = { ...current };
      Object.keys(next).forEach((key) => {
        if (key.startsWith('resource-')) delete next[key];
      });
      return next;
    });
  };

  const validate = () => {
    const next = {};

    if (!form.title.trim()) next.title = 'Task title is required.';
    if (!form.description.trim()) next.description = 'Description is required.';
    if (!form.assignedTo) next.assignedTo = 'Select a client for this task.';

    if (!form.deadline) next.deadline = 'Deadline date and time is required.';
    else if (Number.isNaN(new Date(form.deadline).getTime())) {
      next.deadline = 'Enter a valid deadline.';
    }

    const duration = Number(form.estimatedDuration);
    if (!form.estimatedDuration) next.estimatedDuration = 'Estimated duration is required.';
    else if (!Number.isInteger(duration) || duration < 1) {
      next.estimatedDuration = 'Enter a whole number of minutes (at least 1).';
    }

    form.resources.forEach((resource, index) => {
      if (!resource.label.trim()) {
        next[`resource-${index}-label`] = 'Label is required.';
      }
      if (!resource.url.trim()) {
        next[`resource-${index}-url`] = 'URL is required.';
      } else if (!isHttpUrl(resource.url.trim())) {
        next[`resource-${index}-url`] = 'Enter a valid http or https URL.';
      }
    });

    setErrors(next);
    if (Object.keys(next).length) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return false;
    }
    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        assignedTo: form.assignedTo,
        deadline: new Date(form.deadline).toISOString(),
        estimatedDuration: Number(form.estimatedDuration),
        priority: form.priority,
        resources: form.resources.map((resource) => ({
          label: resource.label.trim(),
          url: resource.url.trim(),
          type: resource.type,
        })),
      };

      const { data } = isEdit
        ? await api.put(`/tasks/${id}`, payload)
        : await api.post('/tasks', payload);

      navigate(`/admin/tasks/${data.task._id}`, {
        state: { flash: isEdit ? 'Task updated successfully.' : 'Task created and assigned.' },
      });
    } catch (err) {
      setSubmitError(getApiErrorMessage(err));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  const loading = clientsLoading || (isEdit && taskLoading);
  if (loading) return <PageLoader label={isEdit ? 'Loading task…' : 'Loading clients…'} />;

  if (clientsError) {
    return (
      <div className="space-y-6">
        <Link to="/admin/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-primary">
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <ErrorState
          message={clientsError}
          onRetry={() => setClientsReload((key) => key + 1)}
          title="Could not load clients"
        />
      </div>
    );
  }

  if (isEdit && taskError) {
    return (
      <div className="space-y-6">
        <Link to="/admin/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-primary">
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <ErrorState
          message={taskError}
          onRetry={() => setTaskReload((key) => key + 1)}
          title="Could not load this task"
        />
      </div>
    );
  }

  const activeClients = clients.filter((client) => client.isActive);
  if (!isEdit && activeClients.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">Assign work</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.035em] text-ink sm:text-3xl">
            Create Task
          </h1>
        </div>
        <div className="card p-4 sm:p-5">
          <EmptyState
            icon={Users}
            title="Add a client before creating a task"
            description="Every task must be assigned to an active client. Create a client account first, then come back here."
            action={
              <Link to="/admin/clients" className="btn-primary btn-sm">
                <Users className="h-3.5 w-3.5" />
                Manage Clients
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const durationPreview = Number(form.estimatedDuration) > 0 ? formatDuration(Number(form.estimatedDuration)) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <Link
          to={isEdit ? `/admin/tasks/${id}` : '/admin/dashboard'}
          className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-muted transition hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          {isEdit ? 'Back to task' : 'Back to dashboard'}
        </Link>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
              {isEdit ? 'Update assignment' : 'Assign work'}
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.035em] text-ink sm:text-3xl">
              {isEdit ? 'Edit Task' : 'Create Task'}
            </h1>
            <p className="mt-1.5 text-sm text-muted">
              {isEdit
                ? 'Update the brief, schedule, resources or assigned client.'
                : 'Give the client a clear brief, a deadline and any helpful resources.'}
            </p>
          </div>
        </div>
      </div>

      {submitError ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-[#FECACA] bg-dangerSoft px-4 py-3 text-sm font-medium text-danger"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {submitError}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-6">
            <section className="card p-5 sm:p-6">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <ClipboardList className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold tracking-tight text-ink">Task details</h2>
                  <p className="text-xs text-muted">What needs to be done?</p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label htmlFor="task-title" className="label">
                    Task title
                  </label>
                  <input
                    id="task-title"
                    className={cn('input', errors.title && 'border-danger')}
                    value={form.title}
                    onChange={(event) => updateField('title', event.target.value)}
                    placeholder="e.g. Prepare the October campaign brief"
                    maxLength={160}
                    autoFocus
                  />
                  {errors.title ? <p className="field-error">{errors.title}</p> : null}
                </div>

                <div>
                  <label htmlFor="task-description" className="label">
                    Description
                  </label>
                  <textarea
                    id="task-description"
                    className={cn('input min-h-[160px] resize-y', errors.description && 'border-danger')}
                    value={form.description}
                    onChange={(event) => updateField('description', event.target.value)}
                    placeholder="Describe the work, expected outcome and any important details…"
                    maxLength={5000}
                  />
                  <div className="mt-1.5 flex items-start justify-between gap-3">
                    {errors.description ? (
                      <p className="field-error mt-0">{errors.description}</p>
                    ) : (
                      <span />
                    )}
                    <span className="text-[11px] text-muted">{form.description.length}/5000</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="card p-5 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <Flag className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold tracking-tight text-ink">Resources</h2>
                    <p className="text-xs text-muted">Links and image previews for context.</p>
                  </div>
                </div>
                <span className="chip w-fit">{form.resources.length}/10</span>
              </div>

              <div className="mt-5">
                <ResourceEditor
                  resources={form.resources}
                  onChange={handleResourcesChange}
                  errors={errors}
                />
              </div>
            </section>
          </div>

          <div className="space-y-5 xl:sticky xl:top-24 xl:self-start">
            <section className="card p-5 sm:p-6">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold tracking-tight text-ink">
                    Assignment & schedule
                  </h2>
                  <p className="text-xs text-muted">Who, when and how urgent.</p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <span className="label">Client</span>
                  <ClientSelect
                    clients={clients}
                    value={form.assignedTo}
                    onChange={(value) => updateField('assignedTo', value)}
                    error={errors.assignedTo}
                  />
                </div>

                <div>
                  <label htmlFor="task-deadline" className="label">
                    Deadline
                  </label>
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                      id="task-deadline"
                      type="datetime-local"
                      className={cn('input pl-10', errors.deadline && 'border-danger')}
                      value={form.deadline}
                      onChange={(event) => updateField('deadline', event.target.value)}
                    />
                  </div>
                  {errors.deadline ? <p className="field-error">{errors.deadline}</p> : null}
                </div>

                <div>
                  <label htmlFor="task-duration" className="label">
                    Estimated duration
                  </label>
                  <div className="relative">
                    <Clock3 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                      id="task-duration"
                      type="number"
                      min="1"
                      step="1"
                      className={cn('input pl-10 pr-20', errors.estimatedDuration && 'border-danger')}
                      value={form.estimatedDuration}
                      onChange={(event) => updateField('estimatedDuration', event.target.value)}
                      placeholder="180"
                    />
                    <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-muted">
                      minutes
                    </span>
                  </div>
                  {errors.estimatedDuration ? (
                    <p className="field-error">{errors.estimatedDuration}</p>
                  ) : (
                    <p className="mt-1.5 text-xs text-muted">
                      {durationPreview ? `Shown as ${durationPreview}` : 'Use minutes, e.g. 180 for 3 hours.'}
                    </p>
                  )}
                </div>

                <div>
                  <span className="label">Priority</span>
                  <div className="grid grid-cols-3 gap-2">
                    {priorities.map((priority) => {
                      const selected = form.priority === priority.value;
                      return (
                        <button
                          key={priority.value}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => updateField('priority', priority.value)}
                          className={cn(
                            'rounded-xl border px-2 py-2.5 text-center transition',
                            selected
                              ? 'border-primary bg-primary-soft text-primary shadow-sm'
                              : 'border-line bg-white text-muted hover:border-accent/40 hover:bg-primary-softer'
                          )}
                        >
                          <span className="block text-xs font-bold">{priority.label}</span>
                          <span className="mt-0.5 block text-[10px] opacity-75">{priority.helper}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            <section className="card p-5 sm:p-6">
              <div className="flex items-start gap-2.5 rounded-xl bg-primary-softer p-3">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-xs leading-relaxed text-muted">
                  The assigned client is notified as soon as this task is saved. You can edit or delete it later.
                </p>
              </div>

              <div className="mt-4 space-y-2">
                <button type="submit" className="btn-primary w-full" disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create & Assign Task'}
                </button>
                <Link
                  to={isEdit ? `/admin/tasks/${id}` : '/admin/dashboard'}
                  className="btn-secondary w-full"
                >
                  Cancel
                </Link>
              </div>

              <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted">
                <CheckCircle2 className="h-3 w-3 text-success" />
                Changes are saved to the server
              </p>
            </section>
          </div>
        </div>
      </form>
    </div>
  );
}
