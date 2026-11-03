import type { HolidayCalendar, ScheduleEntry } from "@/lib/types";
import { holidayForDate } from "@/lib/holidays";
import { storageKeys } from "@/lib/schedule-storage";
import { dayNameForDate, formatTime } from "@/lib/utils";

/** The reminder check runs every 30s, so a reminder fires if it's due within that window... */
const DUE_AHEAD_MS = 30_000;
/** ...or became due in the last minute (covers a check that ran slightly late). */
const DUE_BEHIND_MS = 60_000;
/** Keep only the most recent keys so storage doesn't grow forever. */
const MAX_REMEMBERED_KEYS = 100;

export type DueReminder = {
  key: string;
  title: string;
  body: string;
};

/**
 * Pure: which reminders are due at `now` and haven't been shown yet.
 * No reminders on public holidays or school breaks.
 */
export function findDueReminders(
  entries: ScheduleEntry[],
  holidayCalendar: HolidayCalendar,
  now: Date,
  alreadyNotified: ReadonlySet<string>,
): DueReminder[] {
  if (holidayForDate(holidayCalendar, now)) {
    return [];
  }
  const today = dayNameForDate(now);

  return entries
    .filter((entry) => entry.days.includes(today))
    .flatMap((entry) => {
      const [hour, minute] = entry.start.split(":").map(Number);
      const reminderAt = new Date(now);
      reminderAt.setHours(hour, minute - entry.reminderMinutes, 0, 0);
      const diff = reminderAt.getTime() - now.getTime();
      const key = `${now.toDateString()}-${entry.id}-${entry.reminderMinutes}`;
      const isDue = diff <= DUE_AHEAD_MS && diff >= -DUE_BEHIND_MS;
      if (!isDue || alreadyNotified.has(key)) {
        return [];
      }
      return [
        {
          key,
          title: `${entry.title} starts at ${formatTime(entry.start)}`,
          body: [entry.code, entry.room].filter(Boolean).join(" - "),
        },
      ];
    });
}

function readNotifiedKeys(): Set<string> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(storageKeys.notified) || "[]");
    return new Set(
      Array.isArray(parsed) ? parsed.filter((key): key is string => typeof key === "string") : [],
    );
  } catch {
    return new Set();
  }
}

function saveNotifiedKeys(keys: Set<string>) {
  try {
    localStorage.setItem(storageKeys.notified, JSON.stringify([...keys].slice(-MAX_REMEMBERED_KEYS)));
  } catch {
    // Storage full or blocked: worst case a reminder may show twice.
  }
}

/**
 * Shows a reminder without ever throwing. Android Chrome rejects `new Notification()`
 * ("Illegal constructor") and only allows notifications through the service worker,
 * so prefer `registration.showNotification` and fall back to the constructor
 * (desktop browsers, or dev mode where no service worker is registered).
 */
async function showReminder(title: string, options: NotificationOptions) {
  try {
    const registration =
      "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (registration) {
      await registration.showNotification(title, options);
      return;
    }
    new Notification(title, options);
  } catch {
    // Notifications unsupported in this context; the .ics calendar alarms remain the backup.
  }
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

/** Shows any reminders due right now. Safe to call every 30s. */
export function checkDueNotifications(entries: ScheduleEntry[], holidayCalendar: HolidayCalendar) {
  if (getNotificationPermission() !== "granted") {
    return;
  }
  const notified = readNotifiedKeys();
  const due = findDueReminders(entries, holidayCalendar, new Date(), notified);
  if (due.length === 0) {
    return;
  }
  // Record first so a failed display can't make the reminder repeat every 30s.
  saveNotifiedKeys(new Set([...notified, ...due.map((reminder) => reminder.key)]));
  for (const reminder of due) {
    void showReminder(reminder.title, { body: reminder.body, icon: "/icon-192.png", tag: reminder.key });
  }
}
