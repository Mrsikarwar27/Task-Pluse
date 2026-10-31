// Browser (desktop) notifications - Part B.
// Only the browser's built-in Notification API is used. Permission is never
// requested automatically; the "Enable Browser Notifications" button requests
// it on click. Nothing is persisted - permission is read live each time.

export function isBrowserNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

// Read the live permission state: "default" | "granted" | "denied" | null.
export function getBrowserPermission() {
  if (!isBrowserNotificationSupported()) return null;
  return Notification.permission;
}

export async function requestBrowserPermission() {
  if (!isBrowserNotificationSupported()) return null;
  try {
    return (await Notification.requestPermission()) || Notification.permission;
  } catch {
    return getBrowserPermission();
  }
}

// A module-level click listener so a plain browser Notification (which cannot
// import React or the router) can still focus the tab and navigate.
let notificationClickListener = null;

export function setBrowserNotificationClickListener(listener) {
  notificationClickListener = typeof listener === 'function' ? listener : null;
}

const appTitle = 'TaskPulse';

// Fire a real browser notification. Returns the instance or null when it
// could not be shown (permission missing / user on a browser without support).
export function showBrowserNotification({ title, body, taskId, isReminder }) {
  if (!isBrowserNotificationSupported() || Notification.permission !== 'granted') return null;

  const options = {
    body: body || '',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
  };

  let notification;
  try {
    notification = new Notification(title || appTitle, options);
  } catch {
    // Some browsers only expose the legacy constructor.
    try {
      notification = new Notification(appTitle, options);
    } catch {
      return null;
    }
  }

  notification.onclick = () => {
    // Bring the TaskPulse tab to the front, open the task, and count as the
    // acknowledgement for repeating reminders.
    window.focus();
    notificationClickListener?.({ taskId, isReminder });
    notification.close();
  };

  return notification;
}

export const DESKTOP_HINT_DENIED =
  'Browser notifications are blocked for this site. You can allow them later in your browser’s site settings.';
