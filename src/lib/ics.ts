import type { HolidayCalendar, ScheduleEntry } from "@/lib/types";
import { holidayForDate } from "@/lib/holidays";
import { nextDateForDay } from "@/lib/utils";

/** Each class repeats weekly for one school term's worth of weeks. */
export const ICS_WEEKS = 24;

type BuildIcsOptions = {
  calendarName: string;
  entries: ScheduleEntry[];
  holidayCalendar: HolidayCalendar;
  /** Reference "now"; injectable for tests. */
  now?: Date;
};

export function buildIcs({ calendarName, entries, holidayCalendar, now = new Date() }: BuildIcsOptions) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SmartSched Local//Schedule Reminders//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcs(calendarName)}`,
  ];
  const stamp = toIcsDate(now);

  for (const entry of entries) {
    for (const day of entry.days) {
      lines.push(...buildEvent(entry, day, holidayCalendar, now, stamp));
    }
  }

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}

function buildEvent(
  entry: ScheduleEntry,
  day: ScheduleEntry["days"][number],
  holidayCalendar: HolidayCalendar,
  now: Date,
  stamp: string,
) {
  const startDate = nextDateForDay(day, now);
  const [startHour, startMinute] = entry.start.split(":").map(Number);
  const [endHour, endMinute] = entry.end.split(":").map(Number);
  startDate.setHours(startHour, startMinute, 0, 0);
  const endDate = new Date(startDate);
  endDate.setHours(endHour, endMinute, 0, 0);
  const exclusions = getHolidayExclusions(startDate, holidayCalendar, ICS_WEEKS);

  return [
    "BEGIN:VEVENT",
    `UID:${entry.id}-${day}@smartsched.local`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${toIcsDate(startDate)}`,
    `DTEND:${toIcsDate(endDate)}`,
    `RRULE:FREQ=WEEKLY;COUNT=${ICS_WEEKS}`,
    ...(exclusions.length > 0 ? [`EXDATE:${exclusions.map(toIcsDate).join(",")}`] : []),
    `SUMMARY:${escapeIcs([entry.code, entry.title].filter(Boolean).join(" "))}`,
    `LOCATION:${escapeIcs(entry.room)}`,
    `DESCRIPTION:${escapeIcs(day)}`,
    "BEGIN:VALARM",
    `TRIGGER:-PT${Math.max(0, entry.reminderMinutes)}M`,
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeIcs(`${entry.title} starts soon`)}`,
    "END:VALARM",
    "END:VEVENT",
  ];
}

/** Weekly occurrences (starting at `firstOccurrence`) that fall on a holiday or school break. */
export function getHolidayExclusions(
  firstOccurrence: Date,
  holidayCalendar: HolidayCalendar,
  occurrenceCount: number,
) {
  if (!holidayCalendar.enabled) {
    return [];
  }
  const exclusions: Date[] = [];
  for (let index = 0; index < occurrenceCount; index += 1) {
    const occurrence = new Date(firstOccurrence);
    occurrence.setDate(firstOccurrence.getDate() + index * 7);
    if (holidayForDate(holidayCalendar, occurrence)) {
      exclusions.push(occurrence);
    }
  }
  return exclusions;
}

export function toIcsDate(date: Date) {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

/** Escapes text per RFC 5545 (backslash, newline, comma, semicolon). */
export function escapeIcs(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}
