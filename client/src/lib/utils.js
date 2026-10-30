export function cn(...values) {
  return values.filter(Boolean).join(' ');
}

export function dashboardPath(role) {
  return role === 'admin' ? '/admin/dashboard' : '/client/dashboard';
}

export function taskPath(role, taskId) {
  return role === 'admin' ? `/admin/tasks/${taskId}` : `/client/tasks/${taskId}`;
}

export function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return dateFormatter.format(date);
}

export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return dateTimeFormatter.format(date);
}

export function formatRelative(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diff = Date.now() - date.getTime();

  if (diff < 45 * 1000) return 'Just now';
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.max(1, Math.floor(diff / 60000));
    return `${minutes} min ago`;
  }
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  }
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    const days = Math.floor(diff / 86400000);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }
  return formatDate(value);
}

export function formatDuration(minutes) {
  const value = Number(minutes);
  if (!Number.isFinite(value) || value < 1) return '—';
  if (value < 60) return `${value} min`;
  const hours = Math.floor(value / 60);
  const remainder = value % 60;
  if (!remainder) return `${hours} hr${hours === 1 ? '' : 's'}`;
  return `${hours}h ${remainder}m`;
}

function plural(value, unit) {
  return `${value} ${unit}${value === 1 ? '' : 's'}`;
}

export function dueInfo(deadline, status) {
  if (status === 'Completed') {
    return { label: 'Completed', tone: 'success' };
  }
  if (!deadline) {
    return { label: 'No deadline', tone: 'neutral' };
  }
  const diff = new Date(deadline).getTime() - Date.now();
  if (Number.isNaN(diff)) return { label: 'No deadline', tone: 'neutral' };
  if (diff < 0) return { label: 'Overdue', tone: 'danger' };

  const hours = diff / 3600000;
  if (hours < 1) {
    return { label: 'Due in under 1 hour', tone: 'danger' };
  }
  if (hours < 24) {
    const rounded = Math.ceil(hours);
    return { label: `Due in ${plural(rounded, 'hour')}`, tone: hours <= 6 ? 'danger' : 'warning' };
  }

  const days = Math.ceil(hours / 24);
  return { label: `Due in ${plural(days, 'day')}`, tone: days <= 2 ? 'warning' : 'neutral' };
}

function spanLabel(ms) {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function countdownLabel(deadline, status) {
  if (status === 'Completed') return 'Completed';
  if (!deadline) return 'No deadline';
  const diff = new Date(deadline).getTime() - Date.now();
  if (Number.isNaN(diff)) return 'No deadline';
  if (diff <= 0) return `Overdue by ${spanLabel(Math.abs(diff))}`;
  return `${spanLabel(diff)} remaining`;
}

export function toDateTimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function truncate(value = '', length = 140) {
  if (value.length <= length) return value;
  return `${value.slice(0, length).trimEnd()}…`;
}
