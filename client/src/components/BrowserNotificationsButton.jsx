import { useState } from 'react';
import { Bell, BellOff, BellRing, CheckCircle2, Loader2 } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationsContext.jsx';
import { DESKTOP_HINT_DENIED } from '../lib/browserNotifications.js';
import { cn } from '../lib/utils.js';

// "Enable Browser Notifications" button (Part B).
// - Shown next to the notification bell and on the Client dashboard.
// - Permission is requested ONLY when this button is clicked.
// - Nothing about permission is stored: the live state is read each time.
export default function BrowserNotificationsButton({ className, withHint = false }) {
  const { browserSupported, browserPermission, enableBrowserNotifications } =
    useNotifications();
  const [busy, setBusy] = useState(false);

  if (!browserSupported) return null;

  // Granted: small, non-interactive "Browser notifications on" state.
  if (browserPermission === 'granted') {
    return (
      <span
        className={cn(
          'inline-flex whitespace-nowrap items-center gap-1.5 rounded-full border border-line bg-success-soft px-2.5 py-1 text-[11px] font-bold text-success',
          className
        )}
        title="Browser notifications on"
      >
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden sm:inline">Browser notifications on</span>
      </span>
    );
  }

  const denied = browserPermission === 'denied';
  const label = denied ? 'Browser notifications blocked' : 'Enable Browser Notifications';

  const handleClick = async () => {
    if (busy || denied) return;
    setBusy(true);
    try {
      await enableBrowserNotifications();
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className={cn('inline-flex flex-col items-start gap-1', className)}>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy || denied}
        className="btn-secondary h-9 px-3 text-xs"
        title={denied ? DESKTOP_HINT_DENIED : label}
        aria-label={denied ? DESKTOP_HINT_DENIED : label}
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : denied ? (
          <BellOff className="h-3.5 w-3.5" />
        ) : (
          <Bell className="h-3.5 w-3.5" />
        )}
        <span className="hidden md:inline">{label}</span>
      </button>
      {denied && withHint ? (
        <span className="max-w-xs text-[11px] font-medium leading-snug text-muted">
          {DESKTOP_HINT_DENIED}
        </span>
      ) : null}
    </span>
  );
}
