import {
  days,
  scheduleTypes,
  type DayName,
  type HolidayCalendar,
  type ScheduleEntry,
  type ScheduleSettings,
  type ScheduleType,
} from "@/lib/types";
import { detectDeviceType, deviceForSizeId, isWallpaperDevice } from "@/lib/wallpaper-devices";
import { normalizeHolidayCalendar } from "@/lib/holidays";
import { typeStyle } from "@/lib/wallpaper-renderer";
import { uid } from "@/lib/utils";

export const storageKeys = {
  schedule: "smartsched.local.schedule.v1",
  notified: "smartsched.local.notified.v1",
  theme: "smartsched.local.theme.v1",
  privacyNote: "smartsched.local.privacy-note-dismissed.v1",
  splashSeen: "smartsched.local.splash-seen.v1",
} as const;

export const defaultSettings: ScheduleSettings = {
  schoolPaletteId: "university-of-cebu",
  wallpaperTitle: "Class Schedule",
  wallpaperStyle: "School Palette",
  wallpaperSizeId: "device-auto",
  wallpaperCustomWidth: 1080,
  wallpaperCustomHeight: 1920,
  wallpaperLayoutMode: "Balanced",
  wallpaperTitleSize: 58,
  wallpaperDayLabelSize: 52,
  wallpaperCardTextSize: 28,
  wallpaperAutoFit: true,
  wallpaperShowEmptyWeekdays: true,
  wallpaperExportFormat: "PNG",
  wallpaperClockSafetyZone: true,
};

const DEFAULT_ACCENT = "#256f53";
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
const MAX_TEXT_LENGTH = 120;
const MAX_REMINDER_MINUTES = 24 * 60;
/** Upper bound on entries accepted from a backup or share link, so bad input can't hang the UI. */
export const MAX_ENTRIES = 300;

export type StoredSchedule = {
  settings: ScheduleSettings;
  entries: ScheduleEntry[];
  holidayCalendar: HolidayCalendar;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function cleanText(value: unknown, fallback: string) {
  return typeof value === "string" ? value.slice(0, MAX_TEXT_LENGTH) : fallback;
}

function cleanTime(value: unknown, fallback: string) {
  return typeof value === "string" && TIME_PATTERN.test(value) ? value : fallback;
}

export function normalizeSettings(settings?: Partial<ScheduleSettings>): ScheduleSettings {
  const merged = {
    ...defaultSettings,
    ...settings,
    wallpaperClockSafetyZone: settings?.wallpaperClockSafetyZone ?? true,
  };
  return {
    ...merged,
    wallpaperDevice: isWallpaperDevice(merged.wallpaperDevice)
      ? merged.wallpaperDevice
      : deviceForSizeId(
          merged.wallpaperSizeId,
          detectDeviceType(),
          merged.wallpaperCustomWidth,
          merged.wallpaperCustomHeight,
        ),
  };
}

/** Turns anything (old saves, backups, share links) into a valid entry, filling safe defaults. */
export function normalizeEntry(raw: unknown): ScheduleEntry {
  const entry = asRecord(raw);
  // Saves from before multi-day classes stored a single `day`.
  const legacyDay = typeof entry.day === "string" ? entry.day : undefined;
  const entryDays = Array.isArray(entry.days) ? entry.days : legacyDay ? [legacyDay] : ["Monday"];
  const validDays = [
    ...new Set(
      entryDays.filter(
        (day): day is DayName => typeof day === "string" && days.includes(day as DayName),
      ),
    ),
  ];
  const type =
    typeof entry.type === "string" && scheduleTypes.includes(entry.type as ScheduleType)
      ? (entry.type as ScheduleType)
      : "Class";
  const reminder =
    typeof entry.reminderMinutes === "number" && Number.isFinite(entry.reminderMinutes)
      ? Math.min(MAX_REMINDER_MINUTES, Math.max(0, Math.round(entry.reminderMinutes)))
      : 15;

  return {
    id: typeof entry.id === "string" && entry.id ? entry.id.slice(0, 64) : uid(),
    title: cleanText(entry.title, "Untitled"),
    code: cleanText(entry.code, ""),
    room: cleanText(entry.room, ""),
    days: validDays.length > 0 ? validDays : ["Monday"],
    start: cleanTime(entry.start, "08:00"),
    end: cleanTime(entry.end, "09:00"),
    type,
    reminderMinutes: reminder,
    accentColor:
      typeof entry.accentColor === "string" && HEX_COLOR_PATTERN.test(entry.accentColor)
        ? entry.accentColor
        : typeStyle[type] || DEFAULT_ACCENT,
  };
}

export function normalizeEntries(raw: unknown): ScheduleEntry[] {
  return Array.isArray(raw) ? raw.slice(0, MAX_ENTRIES).map(normalizeEntry) : [];
}

/**
 * Parses saved or backed-up JSON into a full schedule.
 * Returns null when the data isn't a SmartSched schedule (no `entries` array).
 */
export function parseScheduleData(raw: unknown): StoredSchedule | null {
  const data = asRecord(raw);
  if (!Array.isArray(data.entries)) {
    return null;
  }
  return {
    settings: normalizeSettings(asRecord(data.settings) as Partial<ScheduleSettings>),
    entries: normalizeEntries(data.entries),
    holidayCalendar: normalizeHolidayCalendar(
      asRecord(data.holidayCalendar) as Partial<HolidayCalendar>,
    ),
  };
}

export function serializeSchedule(schedule: StoredSchedule, pretty = false) {
  return JSON.stringify(schedule, null, pretty ? 2 : undefined);
}

export function readStoredSchedule(): StoredSchedule | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = localStorage.getItem(storageKeys.schedule);
    return raw ? parseScheduleData(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

/** Returns false when the browser refused to save (storage full, private mode, blocked). */
export function writeStoredSchedule(schedule: StoredSchedule): boolean {
  try {
    localStorage.setItem(storageKeys.schedule, serializeSchedule(schedule));
    return true;
  } catch {
    return false;
  }
}
