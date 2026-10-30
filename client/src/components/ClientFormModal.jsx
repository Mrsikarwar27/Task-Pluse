import { useEffect, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import Modal from './Modal.jsx';
import api, { getApiErrorMessage } from '../lib/api.js';

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
  isActive: true,
};

export default function ClientFormModal({ open, onClose, client, onSaved }) {
  const isEdit = Boolean(client);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      client
        ? {
            name: client.name || '',
            email: client.email || '',
            phone: client.phone || '',
            password: '',
            isActive: client.isActive !== false,
          }
        : emptyForm
    );
    setErrors({});
    setSubmitError('');
    setSaving(false);
  }, [open, client]);

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Name is required.';
    if (!form.email.trim()) next.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = 'Enter a valid email address.';
    }
    if (!form.phone.trim()) next.phone = 'Phone is required.';
    if (!isEdit && !form.password) next.password = 'Password is required.';
    else if (form.password && form.password.length < 8) {
      next.password = 'Password must be at least 8 characters.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      };
      if (form.password) payload.password = form.password;
      if (isEdit) payload.isActive = form.isActive;

      const { data } = isEdit
        ? await api.put(`/users/${client.id}`, payload)
        : await api.post('/users', payload);

      onSaved(data.client, isEdit);
      onClose();
    } catch (err) {
      setSubmitError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={saving ? () => {} : onClose}
      title={isEdit ? 'Edit Client' : 'Add Client'}
      description={
        isEdit
          ? 'Update this client’s account details or access.'
          : 'Create a client account. They can log in with this email and password.'
      }
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="client-form" className="btn-primary" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isEdit ? 'Save Changes' : 'Add Client'}
          </button>
        </>
      }
    >
      {submitError ? (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2.5 rounded-xl border border-[#FCD9C4] bg-primary-soft px-3.5 py-3 text-sm font-medium text-primary"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {submitError}
        </div>
      ) : null}

      <form id="client-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="client-name" className="label">
            Full name
          </label>
          <input
            id="client-name"
            className="input"
            value={form.name}
            onChange={(event) => update('name', event.target.value)}
            placeholder="e.g. Jordan Lee"
            autoFocus
          />
          {errors.name ? <p className="field-error">{errors.name}</p> : null}
        </div>

        <div>
          <label htmlFor="client-email" className="label">
            Email address
          </label>
          <input
            id="client-email"
            type="email"
            className="input"
            value={form.email}
            onChange={(event) => update('email', event.target.value)}
            placeholder="jordan@example.com"
            autoComplete="off"
          />
          {errors.email ? <p className="field-error">{errors.email}</p> : null}
        </div>

        <div>
          <label htmlFor="client-phone" className="label">
            Phone
          </label>
          <input
            id="client-phone"
            type="tel"
            className="input"
            value={form.phone}
            onChange={(event) => update('phone', event.target.value)}
            placeholder="+1 555 0100"
          />
          {errors.phone ? <p className="field-error">{errors.phone}</p> : null}
        </div>

        <div>
          <label htmlFor="client-password" className="label">
            {isEdit ? 'New password (optional)' : 'Password'}
          </label>
          <input
            id="client-password"
            type="password"
            className="input"
            value={form.password}
            onChange={(event) => update('password', event.target.value)}
            placeholder={isEdit ? 'Leave blank to keep current password' : 'At least 8 characters'}
            autoComplete="new-password"
          />
          {errors.password ? <p className="field-error">{errors.password}</p> : null}
          <p className="mt-1.5 text-xs text-muted">
            {isEdit
              ? 'Only enter a password if you want to replace the current one.'
              : 'Share this password with the client after creating the account.'}
          </p>
        </div>

        {isEdit ? (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-primary-softer p-3.5">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => update('isActive', event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-line accent-primary"
            />
            <span>
              <span className="block text-sm font-semibold text-ink">Account is active</span>
              <span className="mt-0.5 block text-xs text-muted">
                Inactive clients cannot log in, but their tasks remain intact.
              </span>
            </span>
          </label>
        ) : null}
      </form>
    </Modal>
  );
}
