import { days, type DayName, type ScheduleEntry } from "@/lib/types";

const jsDayByName: Record<DayName, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

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

export function formatTimeRange(start: string, end: string) {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

export function formatDuration(totalMinutes: number) {
  const minutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}

export function sortEntries(entries: ScheduleEntry[]) {
  return [...entries].sort((a, b) => {
    const firstDayA = a.days[0] ?? "Monday";
    const firstDayB = b.days[0] ?? "Monday";
    const dayDiff = days.indexOf(firstDayA) - days.indexOf(firstDayB);
    return dayDiff || timeToMinutes(a.start) - timeToMinutes(b.start);
  });
}

export function entriesForDay(entries: ScheduleEntry[], day: DayName) {
  return sortEntries(entries).filter((entry) => entry.days.includes(day));
}

export function conflictingEntries(
  candidate: ScheduleEntry,
  entries: ScheduleEntry[],
) {
  const start = timeToMinutes(candidate.start);
  const end = timeToMinutes(candidate.end);

  return entries.filter((entry) => {
    if (entry.id === candidate.id) return false;
    const sharesDay = candidate.days.some((day) => entry.days.includes(day));
    return sharesDay && start < timeToMinutes(entry.end) && end > timeToMinutes(entry.start);
  });
}

export function hasTimeConflict(
  candidate: ScheduleEntry,
  entries: ScheduleEntry[],
) {
  return conflictingEntries(candidate, entries).length > 0;
}

export function nextDateForDay(day: DayName, from = new Date()) {
  const jsTargetDay = jsDayByName[day];
  const date = new Date(from);
  const distance = (jsTargetDay - date.getDay() + 7) % 7;
  date.setDate(date.getDate() + distance);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function dayNameForDate(date: Date): DayName {
  const found = days.find((day) => jsDayByName[day] === date.getDay());
  return found ?? "Monday";
}
