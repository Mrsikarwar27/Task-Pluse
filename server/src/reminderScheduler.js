import { Task } from './models/Task.js';
import { notifyUsers } from './utils/notifications.js';

// ─────────────────────────────────────────────────────────────────────────────
// Reminder schedule constants (Part C).
// Change these numbers here to retune the reminder behaviour; nothing else
// needs to be touched.
// ─────────────────────────────────────────────────────────────────────────────
export const REMINDER_FIRST_LEAD_MINUTES = 30; // First reminder: 30 minutes before startAt.
export const REMINDER_AT_START = true; // Second reminder exactly at startAt.
export const REMINDER_REPEAT_MINUTES = 10; // Then repeat every 10 minutes.
export const REMINDER_MAX_COUNT = 4; // Maximum of 4 reminders in total.
export const REMINDER_TICK_MS = 60 * 1000; // Scheduler checks every 60 seconds.

// Reminders repeat from startAt every REMINDER_REPEAT_MINUTES after the
// at-start slot: [-30, 0, +10, +20] with the defaults.
export function reminderSlotOffsets() {
  const offsets = [-REMINDER_FIRST_LEAD_MINUTES];
  if (REMINDER_AT_START) offsets.push(0);
  for (let sent = offsets.length; sent < REMINDER_MAX_COUNT; sent += 1) {
    offsets.push((sent - (REMINDER_AT_START ? 1 : 0)) * REMINDER_REPEAT_MINUTES);
  }
  return offsets.slice(0, Math.max(0, REMINDER_MAX_COUNT));
}

// Absolute reminder slots (Dates) for a given startAt.
export function reminderSlots(startAt) {
  const base = new Date(startAt).getTime();
  return reminderSlotOffsets().map((offsetMinutes) => new Date(base + offsetMinutes * 60 * 1000));
}

// nextReminderAt is set to startAt minus 30 minutes whenever a task is created
// or its startAt changes. reminderAckAt/remindersSent are reset at that time.
export function scheduleReminders(task) {
  if (!task || !task.startAt) {
    task.nextReminderAt = null;
    return;
  }
  task.nextReminderAt = reminderSlots(task.startAt)[0];
  task.remindersSent = 0;
  task.reminderAckAt = null;
}

// Reminders stop immediately when the task is reassigned or leaves
// "Not Started" (In Progress, Blocked, Completed), and when acknowledged.
export function cancelReminders(task) {
  if (!task) return;
  task.nextReminderAt = null;
}

function assertReminderEligible(task) {
  return (
    task &&
    task.startAt &&
    task.status === 'Not Started' &&
    task.assignedTo &&
    !task.reminderAckAt &&
    task.nextReminderAt
  );
}

export function reminderMessage(task, startAt) {
  const time = new Date(startAt).toLocaleString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
  return `Reminder: "${task.title}" starts at ${time}. Open the task and tap "Got It - Stop Reminders" to acknowledge.`;
}

// One scheduler pass: find due reminders, send them through the existing
// notification path, and advance the schedule stored on the task document.
async function runReminderTick(now = new Date()) {
  const dueTasks = await Task.find({
    startAt: { $ne: null },
    status: 'Not Started',
    nextReminderAt: { $ne: null, $lte: now },
  })
    .populate('assignedTo', '_id name role isActive')
    .limit(25);

  for (const task of dueTasks) {
    if (!assertReminderEligible(task) || task.assignedTo?.isActive === false) {
      // Something changed between the query and now (status, ack, delete…).
      if (task && (task.status !== 'Not Started' || task.reminderAckAt)) {
        await Task.updateOne({ _id: task._id }, { $set: { nextReminderAt: null } });
      }
      continue;
    }

    const slots = reminderSlots(task.startAt);
    const sentIndex = Math.max(0, Number.isInteger(task.remindersSent) ? task.remindersSent : 0);
    // The next slot AFTER this one; null once the schedule is done.
    const nextSlot = slots[sentIndex + 1] || null;

    // Atomic claim: advancing remindersSent, lastReminderAt and nextReminderAt
    // happens in ONE update that only wins if nextReminderAt is still the due
    // slot, so a restart or overlapping tick can never send the same reminder
    // twice. The notification is created only after the claim succeeded.
    const claimed = await Task.findOneAndUpdate(
      { _id: task._id, nextReminderAt: task.nextReminderAt },
      {
        $set: {
          lastReminderAt: now,
          remindersSent: sentIndex + 1,
          nextReminderAt: nextSlot,
        },
      },
      { new: true }
    );
    if (!claimed) continue;

    await notifyUsers([task.assignedTo._id || task.assignedTo], {
      task,
      type: 'task_reminder',
      message: reminderMessage(task, task.startAt),
    });
  }
}

let timer = null;

export function startReminderScheduler() {
  if (timer) return;
  timer = setInterval(() => {
    runReminderTick().catch((error) => {
      console.error('[TaskPulse] Reminder scheduler tick failed:', error.message);
    });
  }, REMINDER_TICK_MS);
  console.log('[TaskPulse] Reminder scheduler started (checks every 60 seconds).');
}

export function stopReminderScheduler() {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
}

export { cancelReminders as cancelReminderSchedule, scheduleReminders as scheduleReminderCycle };
