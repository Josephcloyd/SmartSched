import { days, type DayName, type ScheduleEntry } from "@/lib/types";

export function uid() {
  return crypto.randomUUID();
}

export function timeToMinutes(value: string) {
  const [hour = "0", minute = "0"] = value.split(":");
  return Number(hour) * 60 + Number(minute);
}

export function formatTime(value: string) {
  const [hourText = "0", minute = "00"] = value.split(":");
  const hour = Number(hourText);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute} ${period}`;
}

export function sortEntries(entries: ScheduleEntry[]) {
  return [...entries].sort((a, b) => {
    const dayDiff = days.indexOf(a.day) - days.indexOf(b.day);
    return dayDiff || timeToMinutes(a.start) - timeToMinutes(b.start);
  });
}

export function entriesForDay(entries: ScheduleEntry[], day: DayName) {
  return sortEntries(entries).filter((entry) => entry.day === day);
}

export function hasTimeConflict(
  candidate: ScheduleEntry,
  entries: ScheduleEntry[],
) {
  const start = timeToMinutes(candidate.start);
  const end = timeToMinutes(candidate.end);

  return entries.some((entry) => {
    if (entry.id === candidate.id || entry.day !== candidate.day) {
      return false;
    }

    return start < timeToMinutes(entry.end) && end > timeToMinutes(entry.start);
  });
}

export function nextDateForDay(day: DayName, from = new Date()) {
  const jsTargetDay = days.indexOf(day) + 1;
  const date = new Date(from);
  const distance = (jsTargetDay - date.getDay() + 7) % 7;
  date.setDate(date.getDate() + distance);
  date.setHours(0, 0, 0, 0);
  return date;
}
