"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  CalendarClock,
  Camera,
  FileDown,
  ImageDown,
  MoonStar,
  Plus,
  Save,
  Sun,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  days,
  wallpaperExportFormats,
  wallpaperLayoutModes,
  scheduleTypes,
  wallpaperSizePresets,
  wallpaperStyles,
  type DayName,
  type ScheduleEntry,
  type ScheduleSettings,
  type ScheduleType,
  type WallpaperExportFormat,
  type WallpaperLayoutMode,
  type WallpaperSizeGroup,
  type WallpaperSizeId,
  type WallpaperStyle,
} from "@/lib/types";
import {
  dayNameForDate,
  entriesForDay,
  formatTime,
  hasTimeConflict,
  nextDateForDay,
  sortEntries,
  timeToMinutes,
  uid,
} from "@/lib/utils";

const storageKey = "smartsched.local.schedule.v1";
const notifiedKey = "smartsched.local.notified.v1";
const themeKey = "smartsched.local.theme.v1";

const defaultSettings: ScheduleSettings = {
  ownerName: "My Schedule",
  schoolName: "University of Cebu",
  wallpaperTitle: "Class Schedule",
  wallpaperStyle: "Soft Charcoal",
  wallpaperSizeId: "android-qhd",
  wallpaperCustomWidth: 1080,
  wallpaperCustomHeight: 1920,
  wallpaperLayoutMode: "Balanced",
  wallpaperTitleSize: 58,
  wallpaperDayLabelSize: 52,
  wallpaperCardTextSize: 28,
  wallpaperAutoFit: true,
  wallpaperShowEmptyWeekdays: true,
  wallpaperExportFormat: "PNG",
};

const wallpaperSizeGroups: WallpaperSizeGroup[] = ["Custom", "Desktop", "iPhone", "Android"];
type WallpaperSizePreset = (typeof wallpaperSizePresets)[number];
type SelectedWallpaperSize = Omit<WallpaperSizePreset, "width" | "height"> & {
  width: number;
  height: number;
};
type WallpaperCardColors = {
  card: string;
  time: string;
  title: string;
  detail: string;
};
type WallpaperPalette = {
  pageStart: string;
  pageMid: string;
  pageEnd: string;
  headerStart: string;
  headerMid: string;
  headerEnd: string;
  text: string;
  muted: string;
  soft: string;
  panel: string;
  panelAlt: string;
  line: string;
  emptyPanel: string;
  card: string;
  time: string;
  grid: string;
};
type WallpaperLayoutProfile = {
  spacingScale: number;
  paddingScale: number;
  fontScale: number;
  maxPhoneItems: number;
  maxDesktopItems: number;
};

const blankEntry: Omit<ScheduleEntry, "id"> = {
  title: "",
  code: "",
  room: "",
  days: ["Monday"],
  start: "08:00",
  end: "09:00",
  type: "Class",
  reminderMinutes: 15,
  accentColor: "#256f53",
};

const sampleEntries: ScheduleEntry[] = [
  {
    id: uid(),
    title: "Mathematics",
    code: "MATH 101",
    room: "Room 204",
    days: ["Monday", "Wednesday", "Friday"],
    start: "08:00",
    end: "09:00",
    type: "Class",
    reminderMinutes: 15,
    accentColor: "#256f53",
  },
  {
    id: uid(),
    title: "Science Lab",
    code: "SCI 102",
    room: "Lab 2",
    days: ["Wednesday"],
    start: "10:00",
    end: "11:30",
    type: "Laboratory",
    reminderMinutes: 30,
    accentColor: "#26727f",
  },
  {
    id: uid(),
    title: "English Quiz",
    code: "ENG 101",
    room: "Room 101",
    days: ["Friday"],
    start: "13:00",
    end: "14:00",
    type: "Quiz",
    reminderMinutes: 60,
    accentColor: "#7b5aa6",
  },
];

const typeStyle: Record<ScheduleType, string> = {
  Class: "#256f53",
  Laboratory: "#26727f",
  Quiz: "#7b5aa6",
  Exam: "#b42318",
  Assignment: "#b55d2c",
  Event: "#3f5f9e",
};

const accentPresets = [
  "#256f53",
  "#26727f",
  "#7b5aa6",
  "#b42318",
  "#b55d2c",
  "#3f5f9e",
  "#64748b",
  "#a16207",
] as const;

type StoredSchedule = {
  settings: ScheduleSettings;
  entries: ScheduleEntry[];
};

type LegacyScheduleEntry = Omit<ScheduleEntry, "days" | "accentColor"> & {
  day?: DayName;
  days?: DayName[];
  accentColor?: string;
};

type RawStoredSchedule = {
  settings?: Partial<ScheduleSettings>;
  entries?: Array<ScheduleEntry | LegacyScheduleEntry>;
};

function readStoredSchedule(): StoredSchedule | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as RawStoredSchedule;
    return {
      settings: normalizeSettings(parsed.settings),
      entries: Array.isArray(parsed.entries)
        ? parsed.entries.map(normalizeEntry)
        : sampleEntries,
    };
  } catch {
    return null;
  }
}

function normalizeSettings(settings?: Partial<ScheduleSettings>): ScheduleSettings {
  const normalized = { ...defaultSettings, ...settings };

  if (normalized.wallpaperTitle === "Weekly Class Schedule") {
    normalized.wallpaperTitle = "Class Schedule";
  }

  if (normalized.schoolName === "SmartSched Local") {
    normalized.schoolName = "University of Cebu";
  }

  if (!wallpaperSizePresets.some((preset) => preset.id === normalized.wallpaperSizeId)) {
    normalized.wallpaperSizeId = defaultSettings.wallpaperSizeId;
  }

  if (!isWallpaperStyle(normalized.wallpaperStyle)) {
    normalized.wallpaperStyle = normalizeLegacyWallpaperStyle(
      String(normalized.wallpaperStyle),
    );
  }

  if (!isWallpaperLayoutMode(normalized.wallpaperLayoutMode)) {
    normalized.wallpaperLayoutMode = defaultSettings.wallpaperLayoutMode;
  }

  if (!isWallpaperExportFormat(normalized.wallpaperExportFormat)) {
    normalized.wallpaperExportFormat = defaultSettings.wallpaperExportFormat;
  }

  normalized.wallpaperCustomWidth = clampWallpaperDimension(
    normalized.wallpaperCustomWidth,
  );
  normalized.wallpaperCustomHeight = clampWallpaperDimension(
    normalized.wallpaperCustomHeight,
  );
  normalized.wallpaperTitleSize = clampNumber(
    normalized.wallpaperTitleSize,
    34,
    86,
    defaultSettings.wallpaperTitleSize,
  );
  normalized.wallpaperDayLabelSize = clampNumber(
    normalized.wallpaperDayLabelSize,
    28,
    76,
    defaultSettings.wallpaperDayLabelSize,
  );
  normalized.wallpaperCardTextSize = clampNumber(
    normalized.wallpaperCardTextSize,
    18,
    42,
    defaultSettings.wallpaperCardTextSize,
  );
  normalized.wallpaperAutoFit = Boolean(normalized.wallpaperAutoFit);
  normalized.wallpaperShowEmptyWeekdays = Boolean(
    normalized.wallpaperShowEmptyWeekdays,
  );

  return normalized;
}

function isWallpaperStyle(value: unknown): value is WallpaperStyle {
  return wallpaperStyles.includes(value as WallpaperStyle);
}

function isWallpaperLayoutMode(value: unknown): value is WallpaperLayoutMode {
  return wallpaperLayoutModes.includes(value as WallpaperLayoutMode);
}

function isWallpaperExportFormat(value: unknown): value is WallpaperExportFormat {
  return wallpaperExportFormats.includes(value as WallpaperExportFormat);
}

function normalizeLegacyWallpaperStyle(value: string): WallpaperStyle {
  if (value === "Light") {
    return "Paper";
  }

  if (value === "Minimal") {
    return "Sage";
  }

  return "Soft Charcoal";
}

function clampNumber(
  value: number,
  min: number,
  max: number,
  fallback: number,
) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(value)));
}

function clampWallpaperDimension(value: number) {
  if (!Number.isFinite(value)) {
    return 1080;
  }

  return Math.min(8000, Math.max(320, Math.round(value)));
}

function getWallpaperSizePreset(settings: ScheduleSettings): SelectedWallpaperSize {
  const preset =
    wallpaperSizePresets.find((preset) => preset.id === settings.wallpaperSizeId) ??
    wallpaperSizePresets.find((preset) => preset.id === defaultSettings.wallpaperSizeId) ??
    wallpaperSizePresets[0];

  if (settings.wallpaperSizeId !== "custom") {
    return preset;
  }

  return {
    ...preset,
    width: settings.wallpaperCustomWidth,
    height: settings.wallpaperCustomHeight,
  };
}

function formatWallpaperSize(width: number, height: number) {
  return `${width} x ${height}`;
}

function getWallpaperDays(entries: ScheduleEntry[], settings: ScheduleSettings) {
  return days.filter((day) => {
    const isWeekend = day === "Saturday" || day === "Sunday";
    const isEmpty = entriesForDay(entries, day).length === 0;

    if (isWeekend) {
      return !isEmpty;
    }

    return settings.wallpaperShowEmptyWeekdays || !isEmpty;
  });
}

function normalizeEntry(entry: ScheduleEntry | LegacyScheduleEntry): ScheduleEntry {
  const legacyDay = "day" in entry ? entry.day : undefined;
  const entryDays = "days" in entry && Array.isArray(entry.days)
    ? entry.days
    : legacyDay
      ? [legacyDay]
      : ["Monday"];
  const validDays = entryDays.filter((day): day is DayName =>
    (days as readonly string[]).includes(day),
  );

  return {
    id: entry.id,
    title: entry.title,
    code: entry.code,
    room: entry.room,
    days: validDays.length > 0 ? validDays : ["Monday"],
    start: entry.start,
    end: entry.end,
    type: entry.type,
    reminderMinutes: entry.reminderMinutes,
    accentColor: normalizeAccentColor(entry.accentColor, entry.type),
  };
}

function normalizeAccentColor(value: string | undefined, type: ScheduleType) {
  if (value && /^#[0-9a-fA-F]{6}$/.test(value)) {
    return value;
  }

  return typeStyle[type];
}

function getEntryAccentColor(entry: ScheduleEntry) {
  return normalizeAccentColor(entry.accentColor, entry.type);
}

function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  return Notification.permission;
}

export function ScheduleApp() {
  const [settings, setSettings] = useState<ScheduleSettings>(defaultSettings);
  const [entries, setEntries] = useState<ScheduleEntry[]>(sampleEntries);
  const [selectedDay, setSelectedDay] = useState<DayName>("Monday");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<ScheduleEntry, "id">>(blankEntry);
  const [message, setMessage] = useState("");
  const [notificationState, setNotificationState] =
    useState<NotificationPermission | "unsupported">("unsupported");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [storageReady, setStorageReady] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const timer = window.setTimeout(() => {
      const storedSchedule = readStoredSchedule();
      if (storedSchedule) {
        setSettings(storedSchedule.settings);
        setEntries(storedSchedule.entries);
      }

      const storedTheme = window.localStorage.getItem(themeKey);
      if (storedTheme === "dark" || storedTheme === "light") {
        setTheme(storedTheme);
      } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        setTheme("dark");
      }

      setNotificationState(getNotificationPermission());
      setStorageReady(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!storageReady) {
      return;
    }

    localStorage.setItem(storageKey, JSON.stringify({ settings, entries }));
  }, [settings, entries, storageReady]);

  useEffect(() => {
    if (!storageReady) {
      return;
    }

    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(themeKey, theme);
  }, [theme, storageReady]);

  useEffect(() => {
    if (notificationState !== "granted") {
      return;
    }

    const timer = window.setInterval(() => {
      checkDueNotifications(entries);
    }, 30000);

    checkDueNotifications(entries);
    return () => window.clearInterval(timer);
  }, [entries, notificationState]);

  const sortedEntries = useMemo(() => sortEntries(entries), [entries]);
  const selectedEntries = useMemo(
    () => entriesForDay(entries, selectedDay),
    [entries, selectedDay],
  );
  const previewEntries = useMemo(
    () => sortedEntries,
    [sortedEntries],
  );
  const selectedWallpaperSize = useMemo(
    () => getWallpaperSizePreset(settings),
    [settings],
  );
  const visibleOverviewDays = useMemo(
    () => getWallpaperDays(entries, settings),
    [entries, settings],
  );
  const candidate = useMemo<ScheduleEntry>(
    () => ({ id: editingId ?? "new", ...form }),
    [editingId, form],
  );
  const conflict = hasTimeConflict(candidate, entries);

  function updateForm<K extends keyof Omit<ScheduleEntry, "id">>(
    key: K,
    value: Omit<ScheduleEntry, "id">[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateFormType(type: ScheduleType) {
    setForm((current) => ({
      ...current,
      type,
      accentColor:
        current.accentColor === typeStyle[current.type]
          ? typeStyle[type]
          : current.accentColor,
    }));
  }

  function resetForm(day: DayName = selectedDay) {
    setEditingId(null);
    setForm({ ...blankEntry, days: [day] });
  }

  function toggleFormDay(day: DayName) {
    setForm((current) => {
      const exists = current.days.includes(day);
      const nextDays = exists
        ? current.days.filter((item) => item !== day)
        : [...current.days, day];

      return {
        ...current,
        days: nextDays.length > 0 ? nextDays : [day],
      };
    });
  }

  function saveEntry() {
    if (!form.title.trim()) {
      setMessage("Enter a subject or activity title before saving.");
      return;
    }

    if (timeToMinutes(form.start) >= timeToMinutes(form.end)) {
      setMessage("Start time must be earlier than end time.");
      return;
    }

    if (form.days.length === 0) {
      setMessage("Select at least one day.");
      return;
    }

    const saved: ScheduleEntry = {
      id: editingId ?? uid(),
      ...form,
      title: form.title.trim(),
      code: form.code.trim(),
      room: form.room.trim(),
    };

    setEntries((current) =>
      editingId
        ? current.map((entry) => (entry.id === editingId ? saved : entry))
        : [...current, saved],
    );
    setSelectedDay(saved.days[0] ?? selectedDay);
    resetForm(saved.days[0] ?? selectedDay);
    setMessage(
      conflict
        ? "Saved with a time conflict warning."
        : "Schedule saved on the selected days.",
    );
  }

  function editEntry(entry: ScheduleEntry) {
    const { id, ...rest } = entry;
    setEditingId(id);
    setForm(rest);
    setSelectedDay(entry.days[0] ?? selectedDay);
    setMessage("");
  }

  function deleteEntry(id: string) {
    setEntries((current) => current.filter((entry) => entry.id !== id));
    if (editingId === id) {
      resetForm();
    }
    setMessage("Schedule item removed.");
  }

  async function enableNotifications() {
    if (!("Notification" in window)) {
      setNotificationState("unsupported");
      setMessage("This browser does not support local notifications.");
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationState(permission);
    setMessage(
      permission === "granted"
        ? "Local reminders are on while SmartSched is open or installed."
        : "Notifications were not enabled.",
    );
  }

  function exportBackup() {
    downloadText(
      "smartsched-backup.json",
      JSON.stringify({ settings, entries }, null, 2),
      "application/json",
    );
  }

  function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as RawStoredSchedule;
        if (!Array.isArray(parsed.entries)) {
          throw new Error("Missing entries");
        }
        setSettings(normalizeSettings(parsed.settings));
        setEntries(parsed.entries.map(normalizeEntry));
        setMessage("Backup imported and saved on this device.");
      } catch {
        setMessage("That backup file is not valid SmartSched data.");
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  }

  function exportCalendar() {
    const ics = buildIcs(settings, sortedEntries);
    downloadText("smartsched-reminders.ics", ics, "text/calendar");
    setMessage("Calendar file downloaded. Open it on your phone to add alarms.");
  }

  async function downloadWallpaper(format = settings.wallpaperExportFormat) {
    const canvas = document.createElement("canvas");
    canvas.width = selectedWallpaperSize.width;
    canvas.height = selectedWallpaperSize.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    drawWallpaper(ctx, canvas.width, canvas.height, settings, sortedEntries);

    const mimeType = format === "JPG" ? "image/jpeg" : "image/png";
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, mimeType, format === "JPG" ? 0.92 : 1),
    );
    if (!blob) {
      return;
    }

    const sizeLabel = formatWallpaperSize(
      selectedWallpaperSize.width,
      selectedWallpaperSize.height,
    );
    const layoutSlug = settings.wallpaperLayoutMode.toLowerCase();
    const extension = format.toLowerCase() === "jpg" ? "jpg" : "png";
    downloadBlob(
      `smartsched-wallpaper-${selectedWallpaperSize.id}-${selectedWallpaperSize.width}x${selectedWallpaperSize.height}-${layoutSlug}.${extension}`,
      blob,
    );
    setMessage(
      `${selectedWallpaperSize.label} ${format} wallpaper (${sizeLabel}, ${settings.wallpaperLayoutMode}) downloaded.`,
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <section className="border-b border-border/80 bg-gradient-to-br from-surface via-surface to-surface-2/80">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-5 py-8 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              <span className="h-2 w-2 rounded-full bg-primary" />
              SmartSched Local
            </div>
            <h1 className="mt-4 text-3xl font-semibold text-foreground sm:text-4xl">
              Schedule, wallpaper, and reminders on this device.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
              No Supabase and no online account. Your data is saved in this
              browser, then exported as a phone wallpaper, calendar alarms, or a
              backup file.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="tool-button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? (
                <Sun aria-hidden="true" className="size-4" />
              ) : (
                <MoonStar aria-hidden="true" className="size-4" />
              )}
              {theme === "dark" ? "Light" : "Dark"}
            </button>
            <button className="tool-button" onClick={() => downloadWallpaper()}>
              <ImageDown aria-hidden="true" className="size-4" />
              Wallpaper
            </button>
            <button className="tool-button" onClick={() => setPreviewOpen(true)}>
              <Camera aria-hidden="true" className="size-4" />
              Preview
            </button>
            <button className="tool-button" onClick={exportCalendar}>
              <CalendarClock aria-hidden="true" className="size-4" />
              Alarms
            </button>
            <button className="tool-button" onClick={enableNotifications}>
              <Bell aria-hidden="true" className="size-4" />
              Notify
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="neo-card p-5">
            <p className="text-sm font-semibold text-foreground">1. Add your classes</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Enter subjects, rooms, times, and reminders. Save locally in your browser.
            </p>
          </div>
          <div className="neo-card p-5">
            <p className="text-sm font-semibold text-foreground">2. Download wallpaper</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Create a wallpaper sized for desktops, iPhones, and Android phones.
            </p>
          </div>
          <div className="neo-card p-5">
            <p className="text-sm font-semibold text-foreground">3. Import alarms</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Download the `.ics` file and open it on your phone to add calendar reminders.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[390px_1fr] lg:px-8">
        <div className="space-y-5">
          <Panel title="Schedule Details">
            <div className="grid gap-3">
              <TextInput
                label="Owner name"
                value={settings.ownerName}
                onChange={(value) =>
                  setSettings((current) => ({ ...current, ownerName: value }))
                }
              />
              <TextInput
                label="School name"
                value={settings.schoolName}
                onChange={(value) =>
                  setSettings((current) => ({ ...current, schoolName: value }))
                }
              />
              <TextInput
                label="Wallpaper title"
                value={settings.wallpaperTitle}
                onChange={(value) =>
                  setSettings((current) => ({ ...current, wallpaperTitle: value }))
                }
              />
              <button
                className="secondary-button"
                type="button"
                onClick={() => setPreviewOpen(true)}
              >
                <Camera aria-hidden="true" className="size-4" />
                Customize wallpaper
              </button>
            </div>
          </Panel>

          <Panel title={editingId ? "Edit Item" : "Add Item"}>
            <div className="grid gap-3">
              <TextInput
                label="Subject or activity"
                value={form.title}
                onChange={(value) => updateForm("title", value)}
                placeholder="Mathematics"
              />
              <div className="grid grid-cols-2 gap-3">
                <TextInput
                  label="Code"
                  value={form.code}
                  onChange={(value) => updateForm("code", value)}
                  placeholder="MATH 101"
                />
                <Field label="Type">
                  <select
                    className="field"
                    value={form.type}
                    onChange={(event) =>
                      updateFormType(event.target.value as ScheduleType)
                    }
                  >
                    {scheduleTypes.map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Accent color">
                <div className="flex items-center gap-3">
                  <input
                    aria-label="Subject accent color"
                    className="h-11 w-14 rounded-xl border border-border bg-surface p-1 shadow-[inset_5px_5px_10px_var(--neo-soft-shadow),inset_-5px_-5px_10px_var(--neo-highlight)]"
                    type="color"
                    value={form.accentColor}
                    onChange={(event) =>
                      updateForm("accentColor", event.target.value)
                    }
                  />
                  <div className="flex flex-wrap gap-2">
                    {accentPresets.map((color) => (
                      <button
                        key={color}
                        type="button"
                        aria-label={`Use accent ${color}`}
                        className="size-8 rounded-full border border-white/70 shadow-[4px_4px_10px_var(--neo-shadow),-4px_-4px_10px_var(--neo-highlight)] ring-offset-2 ring-offset-surface"
                        style={{
                          backgroundColor: color,
                          boxShadow:
                            form.accentColor === color
                              ? `0 0 0 3px ${color}55`
                              : undefined,
                        }}
                        onClick={() => updateForm("accentColor", color)}
                      />
                    ))}
                  </div>
                </div>
              </Field>
              <Field label="Days">
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                  {days.map((day) => {
                    const selected = form.days.includes(day);

                    return (
                      <button
                        key={day}
                        type="button"
                        className={
                          selected
                            ? "min-h-11 rounded-xl bg-primary px-2 text-sm font-semibold text-white shadow-sm"
                            : "min-h-11 rounded-xl border border-border bg-surface px-2 text-sm font-semibold text-muted"
                        }
                        aria-pressed={selected}
                        onClick={() => toggleFormDay(day)}
                      >
                        {day.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <TextInput
                  label="Start"
                  type="time"
                  value={form.start}
                  onChange={(value) => updateForm("start", value)}
                />
                <TextInput
                  label="End"
                  type="time"
                  value={form.end}
                  onChange={(value) => updateForm("end", value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <TextInput
                  label="Room"
                  value={form.room}
                  onChange={(value) => updateForm("room", value)}
                  placeholder="Room 204"
                />
                <TextInput
                  label="Reminder"
                  type="number"
                  value={String(form.reminderMinutes)}
                  onChange={(value) =>
                    updateForm("reminderMinutes", Math.max(0, Number(value)))
                  }
                />
              </div>

              {conflict ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">
                  Time conflict on one of the selected days. You can still save
                  it, but the wallpaper and calendar will show both items.
                </p>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <button className="primary-button" onClick={saveEntry}>
                  <Save aria-hidden="true" className="size-4" />
                  Save
                </button>
                <button className="secondary-button" onClick={() => resetForm()}>
                  <Plus aria-hidden="true" className="size-4" />
                  New
                </button>
              </div>
            </div>
          </Panel>

          <Panel title="Local Files">
            <div className="grid gap-3">
              <button className="secondary-button" onClick={exportBackup}>
                <FileDown aria-hidden="true" className="size-4" />
                Backup JSON
              </button>
              <button
                className="secondary-button"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload aria-hidden="true" className="size-4" />
                Import backup
              </button>
              <input
                ref={fileInputRef}
                className="hidden"
                type="file"
                accept="application/json"
                onChange={importBackup}
              />
              <p className="text-xs leading-5 text-muted">
                Data stays in this browser. Use backup JSON before clearing
                browser data or changing phones.
              </p>
            </div>
          </Panel>
        </div>

        <div className="space-y-5">
          {message ? (
            <div className="neo-card px-4 py-3 text-sm text-foreground">
              {message}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-3">
            <Metric label="Items" value={String(entries.length)} />
            <Metric
              label="Notification"
              value={
                notificationState === "unsupported"
                  ? "No"
                  : notificationState === "granted"
                    ? "On"
                    : "Off"
              }
            />
            <Metric
              label="Wallpaper"
              value={formatWallpaperSize(
                selectedWallpaperSize.width,
                selectedWallpaperSize.height,
              )}
            />
          </div>

          <Panel title="Weekly Schedule">
            <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
              {days.map((day) => (
                <button
                  key={day}
                  className={
                    selectedDay === day
                      ? "min-h-10 rounded-full bg-primary px-4 text-sm font-semibold text-white shadow-sm"
                      : "min-h-10 rounded-full border border-border bg-surface px-4 text-sm font-semibold text-muted"
                  }
                  onClick={() => {
                    setSelectedDay(day);
                    if (form.days.length === 1) {
                      updateForm("days", [day]);
                    }
                  }}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>

            <div className="grid gap-3">
              {selectedEntries.length > 0 ? (
                selectedEntries.map((entry) => (
                  <ScheduleRow
                    key={entry.id}
                    entry={entry}
                    onDelete={() => deleteEntry(entry.id)}
                    onEdit={() => editEntry(entry)}
                  />
                ))
              ) : (
                <div className="neo-inset p-6 text-center text-sm text-muted">
                  No schedule items for {selectedDay}.
                </div>
              )}
            </div>
          </Panel>

          <div className="grid gap-4">
            {visibleOverviewDays.map((day) => {
              const dayEntries = entriesForDay(entries, day);

              return (
                <div
                key={day}
                className="neo-card grid gap-4 p-4 md:grid-cols-[130px_1fr] md:items-center"
              >
                <div className="flex items-center justify-between gap-3 md:block">
                  <h3 className="text-base font-semibold text-foreground">{day}</h3>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary md:mt-2 md:inline-flex">
                    {dayEntries.length} item{dayEntries.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {dayEntries.length > 0 ? (
                    dayEntries.map((entry) => (
                    <button
                      key={entry.id}
                      className="neo-inset min-h-[110px] w-full border-l-4 p-3 text-left transition hover:-translate-y-0.5"
                      style={{ borderLeftColor: getEntryAccentColor(entry) }}
                      onClick={() => editEntry(entry)}
                    >
                      <p className="text-xs font-semibold text-muted">
                        {formatTime(entry.start)} - {formatTime(entry.end)}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {entry.title}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {[entry.code, entry.room].filter(Boolean).join(" - ")}
                      </p>
                    </button>
                    ))
                  ) : (
                    <div className="neo-inset p-4 text-sm text-muted">
                      No schedule items.
                    </div>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        </div>
      </section>

      {previewOpen ? (
        <PhonePreviewDialog
          settings={settings}
          setSettings={setSettings}
          entries={previewEntries}
          sizePreset={selectedWallpaperSize}
          onClose={() => setPreviewOpen(false)}
          onDownload={downloadWallpaper}
        />
      ) : null}
    </main>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="neo-card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <div className="h-2 w-16 rounded-full bg-gradient-to-r from-primary to-accent" />
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-foreground">
      {label}
      {children}
    </label>
  );
}

function TextInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <Field label={label}>
      <input
        className="field"
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

function WallpaperControls({
  settings,
  setSettings,
  sizePreset,
}: {
  settings: ScheduleSettings;
  setSettings: (updater: (current: ScheduleSettings) => ScheduleSettings) => void;
  sizePreset: SelectedWallpaperSize;
}) {
  return (
    <div className="grid gap-3">
      <Field label="Theme">
        <select
          className="field"
          value={settings.wallpaperStyle}
          onChange={(event) =>
            setSettings((current) => ({
              ...current,
              wallpaperStyle: event.target.value as WallpaperStyle,
            }))
          }
        >
          {wallpaperStyles.map((style) => (
            <option key={style} value={style}>
              {style}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Layout">
        <select
          className="field"
          value={settings.wallpaperLayoutMode}
          onChange={(event) =>
            setSettings((current) => ({
              ...current,
              wallpaperLayoutMode: event.target.value as WallpaperLayoutMode,
            }))
          }
        >
          {wallpaperLayoutModes.map((layout) => (
            <option key={layout} value={layout}>
              {layout}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Wallpaper size">
        <select
          className="field"
          value={settings.wallpaperSizeId}
          onChange={(event) =>
            setSettings((current) => ({
              ...current,
              wallpaperSizeId: event.target.value as WallpaperSizeId,
            }))
          }
        >
          {wallpaperSizeGroups.map((group) => (
            <optgroup key={group} label={group}>
              {wallpaperSizePresets
                .filter((preset) => preset.group === group)
                .map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label} - {formatWallpaperSize(preset.width, preset.height)}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
        {settings.wallpaperSizeId === "custom" ? (
          <div className="grid grid-cols-2 gap-3 text-sm font-medium text-foreground">
            <div className="grid gap-2">
              <span>Width</span>
              <input
                aria-label="Custom wallpaper width"
                className="field"
                type="number"
                min="320"
                max="8000"
                step="1"
                value={String(settings.wallpaperCustomWidth)}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    wallpaperCustomWidth: clampWallpaperDimension(
                      Number(event.target.value),
                    ),
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <span>Height</span>
              <input
                aria-label="Custom wallpaper height"
                className="field"
                type="number"
                min="320"
                max="8000"
                step="1"
                value={String(settings.wallpaperCustomHeight)}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    wallpaperCustomHeight: clampWallpaperDimension(
                      Number(event.target.value),
                    ),
                  }))
                }
              />
            </div>
          </div>
        ) : null}
        <span className="text-xs leading-5 text-muted">
          {sizePreset.group} / {formatWallpaperSize(sizePreset.width, sizePreset.height)}
        </span>
      </Field>
      <Field label="Export format">
        <select
          className="field"
          value={settings.wallpaperExportFormat}
          onChange={(event) =>
            setSettings((current) => ({
              ...current,
              wallpaperExportFormat: event.target.value as WallpaperExportFormat,
            }))
          }
        >
          {wallpaperExportFormats.map((format) => (
            <option key={format} value={format}>
              {format}
            </option>
          ))}
        </select>
      </Field>
      <RangeControl
        label="Title size"
        min={34}
        max={86}
        value={settings.wallpaperTitleSize}
        onChange={(value) =>
          setSettings((current) => ({
            ...current,
            wallpaperTitleSize: value,
          }))
        }
      />
      <RangeControl
        label="Day label size"
        min={28}
        max={76}
        value={settings.wallpaperDayLabelSize}
        onChange={(value) =>
          setSettings((current) => ({
            ...current,
            wallpaperDayLabelSize: value,
          }))
        }
      />
      <RangeControl
        label="Class card text"
        min={18}
        max={42}
        value={settings.wallpaperCardTextSize}
        onChange={(value) =>
          setSettings((current) => ({
            ...current,
            wallpaperCardTextSize: value,
          }))
        }
      />
      <ToggleControl
        label="Auto-fit wallpaper"
        checked={settings.wallpaperAutoFit}
        onChange={(checked) =>
          setSettings((current) => ({
            ...current,
            wallpaperAutoFit: checked,
          }))
        }
      />
      <ToggleControl
        label="Show empty weekdays"
        checked={settings.wallpaperShowEmptyWeekdays}
        onChange={(checked) =>
          setSettings((current) => ({
            ...current,
            wallpaperShowEmptyWeekdays: checked,
          }))
        }
      />
    </div>
  );
}

function RangeControl({
  label,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={label}>
      <div className="grid grid-cols-[1fr_64px] items-center gap-3">
        <input
          className="accent-primary"
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <input
          aria-label={`${label} value`}
          className="field px-2 text-center"
          type="number"
          min={min}
          max={max}
          value={String(value)}
          onChange={(event) =>
            onChange(clampNumber(Number(event.target.value), min, max, value))
          }
        />
      </div>
    </Field>
  );
}

function ToggleControl({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-border/70 bg-surface px-3 text-sm font-semibold text-foreground shadow-[inset_4px_4px_9px_var(--neo-soft-shadow),inset_-4px_-4px_9px_var(--neo-highlight)]">
      <span>{label}</span>
      <input
        className="size-5 accent-primary"
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="neo-card p-4">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function ScheduleRow({
  entry,
  onEdit,
  onDelete,
}: {
  entry: ScheduleEntry;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="neo-card grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <button className="text-left" onClick={onEdit}>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="rounded px-2 py-1 text-xs font-semibold text-white"
            style={{ backgroundColor: getEntryAccentColor(entry) }}
          >
            {entry.type}
          </span>
          <p className="text-sm font-semibold text-foreground">
            {formatTime(entry.start)} - {formatTime(entry.end)}
          </p>
        </div>
        <h3 className="mt-2 text-lg font-semibold text-foreground">
          {entry.title}
        </h3>
        <p className="mt-1 text-sm leading-6 text-muted">
          {[entry.days.map((day) => day.slice(0, 3)).join("/"), entry.code, entry.room]
            .filter(Boolean)
            .join(" - ")}
        </p>
      </button>
      <button
        aria-label={`Delete ${entry.title}`}
        className="flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-danger"
        onClick={onDelete}
      >
        <Trash2 aria-hidden="true" className="size-4" />
        Delete
      </button>
    </article>
  );
}

function checkDueNotifications(entries: ScheduleEntry[]) {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  const now = new Date();
  const today = dayNameForDate(now);

  const notified = new Set(
    JSON.parse(localStorage.getItem(notifiedKey) || "[]") as string[],
  );

  entries
    .filter((entry) => entry.days.includes(today))
    .forEach((entry) => {
      const [hour, minute] = entry.start.split(":").map(Number);
      const reminder = new Date(now);
      reminder.setHours(hour, minute - entry.reminderMinutes, 0, 0);
      const diff = reminder.getTime() - now.getTime();
      const key = `${now.toDateString()}-${entry.id}-${entry.reminderMinutes}`;

      if (diff <= 30000 && diff >= -60000 && !notified.has(key)) {
        new Notification(`${entry.title} starts at ${formatTime(entry.start)}`, {
          body: [entry.code, entry.room].filter(Boolean).join(" - "),
          icon: "/icon.svg",
        });
        notified.add(key);
      }
    });

  localStorage.setItem(notifiedKey, JSON.stringify([...notified].slice(-100)));
}

function buildIcs(settings: ScheduleSettings, entries: ScheduleEntry[]) {
  const nowStamp = toIcsDate(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SmartSched Local//Schedule Reminders//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcs(settings.ownerName || "SmartSched")}`,
  ];

  entries.forEach((entry) => {
    entry.days.forEach((day) => {
      const startDate = nextDateForDay(day);
      const [startHour, startMinute] = entry.start.split(":").map(Number);
      const [endHour, endMinute] = entry.end.split(":").map(Number);
      startDate.setHours(startHour, startMinute, 0, 0);
      const endDate = new Date(startDate);
      endDate.setHours(endHour, endMinute, 0, 0);

      lines.push(
        "BEGIN:VEVENT",
        `UID:${entry.id}-${day}@smartsched.local`,
        `DTSTAMP:${nowStamp}`,
        `DTSTART:${toIcsDate(startDate)}`,
        `DTEND:${toIcsDate(endDate)}`,
        "RRULE:FREQ=WEEKLY;COUNT=24",
        `SUMMARY:${escapeIcs([entry.code, entry.title].filter(Boolean).join(" "))}`,
        `LOCATION:${escapeIcs(entry.room)}`,
        `DESCRIPTION:${escapeIcs(day)}`,
        "BEGIN:VALARM",
        `TRIGGER:-PT${Math.max(0, entry.reminderMinutes)}M`,
        "ACTION:DISPLAY",
        `DESCRIPTION:${escapeIcs(`${entry.title} starts soon`)}`,
        "END:VALARM",
        "END:VEVENT",
      );
    });
  });

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}

function toIcsDate(date: Date) {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function escapeIcs(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function downloadText(filename: string, text: string, type: string) {
  downloadBlob(filename, new Blob([text], { type }));
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function getWallpaperPalette(style: WallpaperStyle): WallpaperPalette {
  const palettes: Record<WallpaperStyle, WallpaperPalette> = {
    "Soft Charcoal": {
      pageStart: "#20252c",
      pageMid: "#1f2630",
      pageEnd: "#171d24",
      headerStart: "#2b323b",
      headerMid: "#252d36",
      headerEnd: "#1d242c",
      text: "#eef3f7",
      muted: "#b8c3ce",
      soft: "#f7fbff",
      panel: "#353c46",
      panelAlt: "#303842",
      line: "#8fa1b3",
      emptyPanel: "rgba(226, 235, 244, 0.12)",
      card: "#222934",
      time: "#3b4654",
      grid: "rgba(226, 235, 244, 0.045)",
    },
    Sage: {
      pageStart: "#eef4ef",
      pageMid: "#e4ede6",
      pageEnd: "#d7e4dd",
      headerStart: "#fbfdfc",
      headerMid: "#f0f6f2",
      headerEnd: "#e5eee9",
      text: "#14241b",
      muted: "#4f675b",
      soft: "#102018",
      panel: "#f8faf8",
      panelAlt: "#edf4ef",
      line: "#91a79d",
      emptyPanel: "rgba(39, 58, 50, 0.08)",
      card: "#ffffff",
      time: "#e5eee9",
      grid: "rgba(83, 108, 96, 0.07)",
    },
    "Warm Gray": {
      pageStart: "#eeece8",
      pageMid: "#e3e0da",
      pageEnd: "#d8d3cc",
      headerStart: "#fbfaf7",
      headerMid: "#f1eee8",
      headerEnd: "#e6e1d8",
      text: "#251f1a",
      muted: "#665d53",
      soft: "#1d1815",
      panel: "#f8f6f2",
      panelAlt: "#eeeae3",
      line: "#a69b8e",
      emptyPanel: "rgba(64, 55, 47, 0.08)",
      card: "#fffdfa",
      time: "#e9e4dc",
      grid: "rgba(86, 74, 64, 0.07)",
    },
    Paper: {
      pageStart: "#f7f6ef",
      pageMid: "#efede4",
      pageEnd: "#e5e1d7",
      headerStart: "#fffefa",
      headerMid: "#f5f2e9",
      headerEnd: "#ebe5da",
      text: "#1f2521",
      muted: "#5f665f",
      soft: "#161d18",
      panel: "#fffefa",
      panelAlt: "#f2efe6",
      line: "#a1a89e",
      emptyPanel: "rgba(47, 55, 49, 0.08)",
      card: "#ffffff",
      time: "#ece9df",
      grid: "rgba(70, 78, 72, 0.065)",
    },
    "High Contrast": {
      pageStart: "#121417",
      pageMid: "#171a1e",
      pageEnd: "#0f1115",
      headerStart: "#22262c",
      headerMid: "#1c2026",
      headerEnd: "#15191e",
      text: "#fbf8ee",
      muted: "#d7d1c3",
      soft: "#fffaf0",
      panel: "#242931",
      panelAlt: "#1f242b",
      line: "#d6cfc0",
      emptyPanel: "rgba(255, 250, 240, 0.12)",
      card: "#11151a",
      time: "#30363f",
      grid: "rgba(255, 250, 240, 0.055)",
    },
  };

  return palettes[style];
}

function getWallpaperLayoutProfile(
  layoutMode: WallpaperLayoutMode,
): WallpaperLayoutProfile {
  const profiles: Record<WallpaperLayoutMode, WallpaperLayoutProfile> = {
    Compact: {
      spacingScale: 0.78,
      paddingScale: 0.84,
      fontScale: 0.92,
      maxPhoneItems: 5,
      maxDesktopItems: 6,
    },
    Balanced: {
      spacingScale: 1,
      paddingScale: 1,
      fontScale: 1,
      maxPhoneItems: 4,
      maxDesktopItems: 4,
    },
    Spacious: {
      spacingScale: 1.24,
      paddingScale: 1.18,
      fontScale: 1.1,
      maxPhoneItems: 3,
      maxDesktopItems: 3,
    },
  };

  return profiles[layoutMode];
}

function getAutoFitScale(
  width: number,
  height: number,
  enabled: boolean,
  isDesktop: boolean,
) {
  if (!enabled) {
    return 1;
  }

  const shortSide = Math.min(width, height);
  const longSide = Math.max(width, height);
  const base = isDesktop ? shortSide / 1080 : shortSide / 1080;
  const tallBonus = !isDesktop && longSide / shortSide > 1.9 ? 1.04 : 1;

  return clampNumber(base * 100 * tallBonus, 78, 112, 100) / 100;
}

function getVisibleCardCount(
  availableHeight: number,
  itemGap: number,
  minItemHeight: number,
  maxItems: number,
) {
  return Math.max(
    1,
    Math.min(maxItems, Math.floor((availableHeight + itemGap) / (minItemHeight + itemGap))),
  );
}

function drawWallpaper(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: ScheduleSettings,
  entries: ScheduleEntry[],
) {
  if (width >= height) {
    drawDesktopWallpaper(ctx, width, height, settings, entries);
    return;
  }

  const baseScale = width / 1440;
  const profile = getWallpaperLayoutProfile(settings.wallpaperLayoutMode);
  const autoScale = getAutoFitScale(width, height, settings.wallpaperAutoFit, false);
  const scale = baseScale * autoScale;
  const spacingScale = scale * profile.spacingScale;
  const paddingScale = scale * profile.paddingScale;
  const fontScale = scale * profile.fontScale;
  const s = (value: number) => value * scale;
  const sp = (value: number) => value * spacingScale;
  const pad = (value: number) => value * paddingScale;
  const fs = (value: number) => value * fontScale;
  const title = settings.wallpaperTitle || "Class Schedule";
  const titleSize = Math.max(23, fs(settings.wallpaperTitleSize));
  const schoolSize = Math.max(13, fs(Math.round(settings.wallpaperTitleSize * 0.52)));
  const phoneClockSafeHeight = Math.round(
    Math.min(height * 0.32, Math.max(height * 0.2, s(560))),
  );
  const titleBandHeight = Math.max(sp(150), titleSize + schoolSize + sp(54));
  const headerHeight = Math.round(
    Math.min(height * 0.46, phoneClockSafeHeight + titleBandHeight),
  );
  const palette = getWallpaperPalette(settings.wallpaperStyle);
  const {
    pageStart,
    pageMid,
    pageEnd,
    headerStart,
    headerMid,
    headerEnd,
    text: silver,
    muted,
    soft,
    panel,
    panelAlt,
    line,
    emptyPanel,
  } = palette;
  const cardColors: WallpaperCardColors = {
    card: palette.card,
    time: palette.time,
    title: palette.soft,
    detail: palette.muted,
  };

  const pageGradient = ctx.createLinearGradient(0, 0, width, height);
  pageGradient.addColorStop(0, pageStart);
  pageGradient.addColorStop(0.52, pageMid);
  pageGradient.addColorStop(1, pageEnd);
  ctx.fillStyle = pageGradient;
  ctx.fillRect(0, 0, width, height);

  const headerGradient = ctx.createLinearGradient(0, 0, width, headerHeight);
  headerGradient.addColorStop(0, headerStart);
  headerGradient.addColorStop(0.55, headerMid);
  headerGradient.addColorStop(1, headerEnd);
  ctx.fillStyle = headerGradient;
  ctx.fillRect(0, 0, width, headerHeight);

  ctx.fillStyle = "#9ca3af";
  ctx.fillRect(0, headerHeight - 18, width, 10);
  ctx.fillStyle = "#4b5563";
  ctx.fillRect(0, headerHeight - 8, width, 8);

  ctx.fillStyle = palette.grid;
  for (let x = 0; x < width; x += Math.max(44, s(76))) {
    ctx.fillRect(x, 0, 1, height);
  }
  for (let y = 0; y < height; y += Math.max(44, s(76))) {
    ctx.fillRect(0, y, width, 1);
  }

  const left = Math.max(20, pad(58));
  const top = headerHeight + sp(16);
  const tableWidth = width - left * 2;
  const bottom = height - Math.max(sp(120), 76);
  const tableHeight = bottom - top;
  const rowGap = Math.max(6, sp(16));
  const wallpaperDays = getWallpaperDays(entries, settings);
  const rowHeight =
    (tableHeight - rowGap * (wallpaperDays.length - 1)) /
    Math.max(1, wallpaperDays.length);
  const titleBaseline = Math.min(
    headerHeight - sp(76),
    phoneClockSafeHeight + titleSize + sp(24),
  );
  const schoolBaseline = Math.min(
    headerHeight - sp(36),
    titleBaseline + schoolSize * 1.4,
  );

  ctx.fillStyle = soft;
  ctx.font = `700 ${titleSize}px Arial`;
  drawFittedText(ctx, title, left + pad(18), titleBaseline, s(800), titleSize, 20);
  ctx.fillStyle = muted;
  ctx.font = `400 ${schoolSize}px Arial`;
  drawFittedText(
    ctx,
    settings.schoolName || "University of Cebu",
    left + pad(20),
    schoolBaseline,
    s(820),
    schoolSize,
    12,
  );

  roundedRect(
    ctx,
    width - s(430),
    titleBaseline - titleSize * 0.95,
    s(300),
    sp(62),
    sp(31),
    "rgba(255, 255, 255, 0.12)",
  );
  ctx.fillStyle = silver;
  ctx.font = `700 ${Math.max(11, fs(24))}px Arial`;
  drawFittedText(
    ctx,
    formatWallpaperSize(width, height),
    width - s(390),
    titleBaseline - titleSize * 0.95 + sp(39),
    s(150),
    Math.max(11, fs(24)),
    9,
  );
  ctx.fillStyle = muted;
  ctx.font = `400 ${Math.max(9, fs(20))}px Arial`;
  drawFittedText(
    ctx,
    "PHONE WALLPAPER",
    width - s(245),
    titleBaseline - titleSize * 0.95 + sp(39),
    s(130),
    Math.max(9, fs(20)),
    8,
  );

  ctx.shadowColor = "rgba(0, 0, 0, 0.38)";
  ctx.shadowBlur = sp(38);
  ctx.shadowOffsetY = sp(18);
  roundedRect(ctx, left - pad(14), top - sp(18), tableWidth + pad(28), tableHeight + sp(36), sp(36), "rgba(11, 16, 22, 0.45)");
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  wallpaperDays.forEach((day, index) => {
    const y = top + index * (rowHeight + rowGap);
    const dayEntries = entriesForDay(entries, day);
    const rowColor = index % 2 === 0 ? panel : panelAlt;
    roundedRect(ctx, left, y, tableWidth, rowHeight, sp(28), rowColor);

    ctx.fillStyle = line;
    ctx.fillRect(left + pad(166), y + sp(26), Math.max(1, s(2)), rowHeight - sp(52));

    ctx.fillStyle = silver;
    ctx.font = `700 ${Math.max(18, fs(settings.wallpaperDayLabelSize))}px Arial`;
    ctx.fillText(day.slice(0, 3).toUpperCase(), left + pad(34), y + sp(78));
    ctx.fillStyle = muted;
    const fullDaySize = Math.max(9, fs(Math.round(settings.wallpaperDayLabelSize * 0.42)));
    ctx.font = `700 ${fullDaySize}px Arial`;
    drawFittedText(ctx, day.toUpperCase(), left + pad(38), y + sp(114), pad(96), fullDaySize, 8);

    roundedRect(ctx, left + pad(34), y + rowHeight - sp(72), pad(106), sp(40), sp(20), "rgba(255, 255, 255, 0.1)");
    ctx.fillStyle = silver;
    ctx.font = `700 ${Math.max(8, fs(20))}px Arial`;
    drawFittedText(
      ctx,
      `${dayEntries.length} ITEM${dayEntries.length === 1 ? "" : "S"}`,
      left + pad(52),
      y + rowHeight - sp(45),
      pad(74),
      Math.max(8, fs(20)),
      7,
    );

    const scheduleX = left + pad(198);
    const scheduleY = y + sp(22);
    const scheduleWidth = tableWidth - pad(228);
    const scheduleHeight = rowHeight - sp(44);

    if (dayEntries.length === 0) {
      roundedRect(ctx, scheduleX, scheduleY, scheduleWidth, scheduleHeight, sp(22), emptyPanel);
      ctx.fillStyle = muted;
      ctx.font = `700 ${Math.max(12, fs(30))}px Arial`;
      drawFittedText(
        ctx,
        "No scheduled class",
        scheduleX + pad(34),
        scheduleY + scheduleHeight / 2 + sp(10),
        scheduleWidth - pad(68),
        Math.max(12, fs(30)),
        10,
      );
      return;
    }

    const itemGap = Math.max(5, sp(14));
    const cardTextSize = Math.max(10, fs(settings.wallpaperCardTextSize));
    const minItemHeight = Math.max(sp(54), cardTextSize * 2.25);
    const fittingVisibleEntries = getVisibleCardCount(
      scheduleHeight,
      itemGap,
      minItemHeight,
      profile.maxPhoneItems,
    );
    const maxVisibleEntries = settings.wallpaperAutoFit
      ? fittingVisibleEntries
      : Math.min(profile.maxPhoneItems, fittingVisibleEntries);
    const visibleEntries = dayEntries.slice(0, maxVisibleEntries);
    const availableItemHeight =
      (scheduleHeight - itemGap * (visibleEntries.length - 1)) /
      visibleEntries.length;
    const itemHeight = Math.max(minItemHeight, availableItemHeight);
    const itemGroupHeight =
      itemHeight * visibleEntries.length + itemGap * (visibleEntries.length - 1);
    const itemStartY = scheduleY + (scheduleHeight - itemGroupHeight) / 2;

    visibleEntries.forEach((entry, entryIndex) => {
      const itemY = itemStartY + entryIndex * (itemHeight + itemGap);
      drawReadableScheduleCard(
        ctx,
        entry,
        scheduleX,
        itemY,
        scheduleWidth,
        itemHeight,
        scale,
        cardColors,
        settings.wallpaperCardTextSize,
        profile,
      );
    });

    if (dayEntries.length > visibleEntries.length) {
      ctx.fillStyle = muted;
      ctx.font = `700 ${Math.max(8, fs(20))}px Arial`;
      ctx.fillText(
        `+${dayEntries.length - visibleEntries.length} more`,
        scheduleX + scheduleWidth - s(108),
        scheduleY + scheduleHeight - sp(18),
      );
    }
  });

  ctx.fillStyle = muted;
  ctx.font = `400 ${Math.max(10, fs(24))}px Arial`;
  ctx.fillText("Generated by SmartSched Local", s(76), height - Math.max(30, sp(56)));
  ctx.fillStyle = "#9ca3af";
  ctx.fillRect(width - s(272), height - Math.max(28, sp(52)), s(196), Math.max(3, s(8)));
}

function drawDesktopWallpaper(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: ScheduleSettings,
  entries: ScheduleEntry[],
) {
  const palette = getWallpaperPalette(settings.wallpaperStyle);
  const profile = getWallpaperLayoutProfile(settings.wallpaperLayoutMode);
  const autoScale = getAutoFitScale(width, height, settings.wallpaperAutoFit, true);
  const scale = (width / 1920) * autoScale;
  const spacingScale = scale * profile.spacingScale;
  const paddingScale = scale * profile.paddingScale;
  const fontScale = scale * profile.fontScale;
  const s = (value: number) => value * scale;
  const sp = (value: number) => value * spacingScale;
  const pad = (value: number) => value * paddingScale;
  const fs = (value: number) => value * fontScale;
  const {
    pageStart,
    pageMid,
    pageEnd,
    text: silver,
    muted,
    soft,
    panel,
    panelAlt,
    card,
    line,
  } = palette;
  const pageGradient = ctx.createLinearGradient(0, 0, width, height);
  pageGradient.addColorStop(0, pageStart);
  pageGradient.addColorStop(0.54, pageMid);
  pageGradient.addColorStop(1, pageEnd);
  ctx.fillStyle = pageGradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = palette.grid;
  for (let x = 0; x < width; x += Math.max(44, s(82))) {
    ctx.fillRect(x, 0, 1, height);
  }
  for (let y = 0; y < height; y += Math.max(44, s(82))) {
    ctx.fillRect(0, y, width, 1);
  }

  const margin = Math.max(42, pad(72));
  const title = settings.wallpaperTitle || "Class Schedule";
  const titleSize = Math.max(28, fs(settings.wallpaperTitleSize));
  const schoolSize = Math.max(15, fs(Math.round(settings.wallpaperTitleSize * 0.52)));

  ctx.fillStyle = soft;
  ctx.font = `700 ${titleSize}px Arial`;
  drawFittedText(ctx, title, margin, sp(108), width * 0.5, titleSize, 24);
  ctx.fillStyle = muted;
  ctx.font = `400 ${schoolSize}px Arial`;
  drawFittedText(
    ctx,
    settings.schoolName || "University of Cebu",
    margin + pad(2),
    sp(154),
    width * 0.48,
    schoolSize,
    13,
  );

  roundedRect(ctx, width - margin - s(320), sp(76), s(320), sp(62), sp(31), "rgba(255, 255, 255, 0.08)");
  ctx.fillStyle = silver;
  ctx.font = `700 ${Math.max(15, fs(24))}px Arial`;
  drawFittedText(
    ctx,
    formatWallpaperSize(width, height),
    width - margin - s(284),
    sp(115),
    s(148),
    Math.max(15, fs(24)),
    12,
  );
  ctx.fillStyle = muted;
  ctx.font = `400 ${Math.max(12, fs(18))}px Arial`;
  drawFittedText(ctx, "DESKTOP", width - margin - s(124), sp(115), s(96), Math.max(12, fs(18)), 10);

  const boardTop = Math.max(sp(196), height * 0.22);
  const boardBottom = height - Math.max(42, sp(72));
  const boardHeight = boardBottom - boardTop;
  const wallpaperDays = getWallpaperDays(entries, settings);
  const rowGap = Math.max(8, sp(14));
  const rowHeight =
    (boardHeight - rowGap * (wallpaperDays.length - 1)) /
    Math.max(1, wallpaperDays.length);

  wallpaperDays.forEach((day, index) => {
    const x = margin;
    const y = boardTop + index * (rowHeight + rowGap);
    const rowWidth = width - margin * 2;
    const dayEntries = entriesForDay(entries, day);
    const rowColor = index % 2 === 0 ? panel : panelAlt;

    ctx.shadowColor = "rgba(0, 0, 0, 0.24)";
    ctx.shadowBlur = sp(24);
    ctx.shadowOffsetY = sp(10);
    roundedRect(ctx, x, y, rowWidth, rowHeight, sp(24), rowColor);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    const dayWidth = Math.max(pad(142), rowWidth * 0.11);
    ctx.fillStyle = silver;
    ctx.font = `700 ${Math.max(18, fs(settings.wallpaperDayLabelSize * 0.72))}px Arial`;
    drawFittedText(
      ctx,
      day.slice(0, 3).toUpperCase(),
      x + pad(24),
      y + sp(48),
      dayWidth - pad(40),
      Math.max(18, fs(settings.wallpaperDayLabelSize * 0.72)),
      14,
    );
    ctx.fillStyle = muted;
    ctx.font = `700 ${Math.max(9, fs(14))}px Arial`;
    drawFittedText(
      ctx,
      `${dayEntries.length} ITEM${dayEntries.length === 1 ? "" : "S"}`,
      x + pad(26),
      y + sp(76),
      dayWidth - pad(44),
      Math.max(9, fs(14)),
      8,
    );
    ctx.fillStyle = line;
    ctx.fillRect(x + dayWidth, y + sp(24), Math.max(1, s(2)), rowHeight - sp(48));

    const scheduleX = x + dayWidth + pad(24);
    const scheduleY = y + sp(18);
    const scheduleWidth = rowWidth - dayWidth - pad(48);
    const scheduleHeight = rowHeight - sp(36);
    const itemGap = Math.max(8, sp(14));
    const maxVisible = Math.max(
      1,
      Math.min(
        profile.maxDesktopItems,
        Math.floor((scheduleWidth + itemGap) / (s(300) + itemGap)),
      ),
    );
    const visibleEntries = dayEntries.slice(0, maxVisible);
    const itemWidth =
      (scheduleWidth - itemGap * Math.max(0, visibleEntries.length - 1)) /
      Math.max(1, visibleEntries.length);
    const itemHeight = Math.min(sp(112), scheduleHeight);
    const itemY = scheduleY + (scheduleHeight - itemHeight) / 2;

    if (dayEntries.length === 0) {
      roundedRect(ctx, scheduleX, itemY, scheduleWidth, Math.max(sp(64), itemHeight), sp(16), palette.emptyPanel);
      ctx.fillStyle = muted;
      ctx.font = `700 ${Math.max(11, fs(18))}px Arial`;
      drawFittedText(ctx, "No scheduled class", scheduleX + pad(18), itemY + itemHeight / 2 + sp(6), scheduleWidth - pad(36), Math.max(11, fs(18)), 9);
      return;
    }

    visibleEntries.forEach((entry, entryIndex) => {
      const itemX = scheduleX + entryIndex * (itemWidth + itemGap);
      roundedRect(ctx, itemX, itemY, itemWidth, itemHeight, sp(16), card);
      ctx.fillStyle = getEntryAccentColor(entry);
      ctx.fillRect(itemX, itemY, Math.max(4, pad(7)), itemHeight);
      ctx.fillStyle = soft;
      const cardTitleSize = Math.max(10, fs(settings.wallpaperCardTextSize * 0.62));
      ctx.font = `700 ${cardTitleSize}px Arial`;
      drawWrappedText(
        ctx,
        entry.title.toUpperCase(),
        itemX + pad(18),
        itemY + sp(30),
        itemWidth - pad(36),
        Math.max(13, cardTitleSize * 1.25),
        2,
      );
      ctx.fillStyle = muted;
      ctx.font = `700 ${Math.max(8, fs(settings.wallpaperCardTextSize * 0.46))}px Arial`;
      drawFittedText(
        ctx,
        `${formatTime(entry.start)} - ${formatTime(entry.end)}`,
        itemX + pad(18),
        itemY + itemHeight - sp(18),
        itemWidth - pad(36),
        Math.max(8, fs(settings.wallpaperCardTextSize * 0.46)),
        8,
      );
    });

    if (dayEntries.length > visibleEntries.length) {
      ctx.fillStyle = muted;
      ctx.font = `700 ${Math.max(9, fs(14))}px Arial`;
      ctx.fillText(
        `+${dayEntries.length - visibleEntries.length} more`,
        scheduleX + scheduleWidth - s(104),
        y + rowHeight - sp(18),
      );
    }
  });
}

function drawReadableScheduleCard(
  ctx: CanvasRenderingContext2D,
  entry: ScheduleEntry,
  x: number,
  y: number,
  width: number,
  height: number,
  scale = 1,
  colors: WallpaperCardColors = {
    card: "#222934",
    time: "#3b4654",
    title: "#fbfdff",
    detail: "#c6d1dc",
  },
  cardTextSize = 28,
  profile: WallpaperLayoutProfile = getWallpaperLayoutProfile("Balanced"),
) {
  const accent = getEntryAccentColor(entry);
  const padScale = scale * profile.paddingScale;
  const fontScale = scale * profile.fontScale;
  const pad = (value: number) => value * padScale;
  const fs = (value: number) => value * fontScale;
  const timeWidth = Math.max(pad(116), width * 0.25);
  const contentX = x + timeWidth + pad(22);
  const titleSize = Math.max(10, fs(cardTextSize));
  const detailSize = Math.max(8, fs(Math.round(cardTextSize * 0.58)));
  const timeSize = Math.max(8, fs(Math.round(cardTextSize * 0.62)));
  const endTimeSize = Math.max(7, fs(Math.round(cardTextSize * 0.48)));

  ctx.shadowColor = "rgba(0, 0, 0, 0.22)";
  ctx.shadowBlur = pad(10);
  ctx.shadowOffsetY = pad(3);
  roundedRect(ctx, x, y, width, height, pad(16), colors.card);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.fillStyle = accent;
  ctx.fillRect(x, y, Math.max(4, pad(8)), height);

  roundedRect(
    ctx,
    x + pad(18),
    y + pad(7),
    timeWidth - pad(30),
    height - pad(14),
    pad(12),
    colors.time,
  );
  ctx.fillStyle = colors.title;
  ctx.font = `700 ${timeSize}px Arial`;
  drawFittedText(
    ctx,
    formatTime(entry.start),
    x + pad(30),
    y + height / 2 - endTimeSize * 0.25,
    timeWidth - pad(54),
    timeSize,
    8,
  );
  ctx.fillStyle = colors.detail;
  ctx.font = `700 ${endTimeSize}px Arial`;
  drawFittedText(
    ctx,
    formatTime(entry.end),
    x + pad(30),
    y + height / 2 + endTimeSize * 1.25,
    timeWidth - pad(54),
    endTimeSize,
    7,
  );

  ctx.fillStyle = colors.title;
  ctx.font = `700 ${titleSize}px Arial`;
  drawFittedText(
    ctx,
    entry.title.toUpperCase(),
    contentX,
    y + height / 2 - detailSize * 0.35,
    width - (contentX - x) - pad(18),
    titleSize,
    9,
  );

  ctx.fillStyle = colors.detail;
  ctx.font = `700 ${detailSize}px Arial`;
  drawFittedText(
    ctx,
    [entry.code, entry.room].filter(Boolean).join(" - ") || entry.type,
    contentX,
    y + height / 2 + detailSize * 1.05,
    width - (contentX - x) - pad(18),
    detailSize,
    8,
  );
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fill();
}

function drawFittedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  minSize: number,
) {
  let size = fontSize;
  while (ctx.measureText(text).width > maxWidth && size > minSize) {
    size -= 1;
    ctx.font = ctx.font.replace(/\d+px/, `${size}px`);
  }
  ctx.fillText(text || "-", x, y);
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const words = text.split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";

  words.forEach((word) => {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width <= maxWidth || !line) {
      line = testLine;
      return;
    }

    lines.push(line);
    line = word;
  });

  if (line) {
    lines.push(line);
  }

  lines.slice(0, maxLines).forEach((lineText, index) => {
    const isLast = index === maxLines - 1 && lines.length > maxLines;
    const finalText = isLast ? trimToWidth(ctx, `${lineText}...`, maxWidth) : lineText;
    ctx.fillText(finalText, x, y + index * lineHeight);
  });
}

function PhonePreviewDialog({
  settings,
  setSettings,
  entries,
  sizePreset,
  onClose,
  onDownload,
}: {
  settings: ScheduleSettings;
  setSettings: (updater: (current: ScheduleSettings) => ScheduleSettings) => void;
  entries: ScheduleEntry[];
  sizePreset: SelectedWallpaperSize;
  onClose: () => void;
  onDownload: (format?: WallpaperExportFormat) => void | Promise<void>;
}) {
  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/72 px-4 py-5 backdrop-blur-sm sm:px-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="phone-preview-title"
    >
      <div className="mx-auto flex min-h-full w-full max-w-7xl items-center justify-center">
        <div className="w-full rounded-2xl border border-white/10 bg-surface p-4 shadow-[0_32px_110px_-30px_rgba(0,0,0,0.7)] sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2
                id="phone-preview-title"
                className="text-lg font-semibold text-foreground"
              >
                Wallpaper Preview
              </h2>
              <p className="mt-1 text-sm text-muted">
                {sizePreset.label} -{" "}
                {formatWallpaperSize(sizePreset.width, sizePreset.height)} -{" "}
                {settings.wallpaperLayoutMode}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="primary-button"
                onClick={() => onDownload(settings.wallpaperExportFormat)}
              >
                <ImageDown aria-hidden="true" className="size-4" />
                Download {settings.wallpaperExportFormat}
              </button>
              <button
                className="secondary-button"
                onClick={() =>
                  onDownload(settings.wallpaperExportFormat === "PNG" ? "JPG" : "PNG")
                }
              >
                <ImageDown aria-hidden="true" className="size-4" />
                {settings.wallpaperExportFormat === "PNG" ? "JPG" : "PNG"}
              </button>
              <button
                className="secondary-button"
                aria-label="Close phone preview"
                onClick={onClose}
              >
                <X aria-hidden="true" className="size-4" />
                Close
              </button>
            </div>
          </div>
          <div className="grid gap-5 lg:grid-cols-[320px_1fr] lg:items-start">
            <div className="neo-inset max-h-[78vh] overflow-y-auto p-4">
              <WallpaperControls
                settings={settings}
                setSettings={setSettings}
                sizePreset={sizePreset}
              />
            </div>
            <WallpaperCanvasPreview
              settings={settings}
              entries={entries}
              sizePreset={sizePreset}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function WallpaperCanvasPreview({
  settings,
  entries,
  sizePreset,
}: {
  settings: ScheduleSettings;
  entries: ScheduleEntry[];
  sizePreset: SelectedWallpaperSize;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isPortrait = sizePreset.height >= sizePreset.width;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    canvas.width = sizePreset.width;
    canvas.height = sizePreset.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    drawWallpaper(ctx, canvas.width, canvas.height, settings, entries);
  }, [entries, settings, sizePreset]);

  return (
    <div className="mx-auto w-full" style={{ maxWidth: isPortrait ? 430 : 920 }}>
      <div
        className={
          isPortrait
            ? "rounded-[42px] bg-[#08080a] p-3 shadow-[0_38px_90px_-36px_rgba(0,0,0,0.62)] ring-1 ring-white/10"
            : "rounded-[28px] bg-[#121316] p-3 shadow-[0_38px_90px_-36px_rgba(0,0,0,0.62)] ring-1 ring-white/10"
        }
      >
        <canvas
          ref={canvasRef}
          className={
            isPortrait
              ? "block h-auto w-full rounded-[32px]"
              : "block h-auto w-full rounded-[18px]"
          }
          style={{ aspectRatio: `${sizePreset.width} / ${sizePreset.height}` }}
        />
      </div>
      <div className="neo-card mt-3 p-4 text-sm leading-6 text-muted">
        This canvas uses the exact wallpaper renderer that creates the downloaded file.
      </div>
    </div>
  );
}

function trimToWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  let trimmed = text;
  while (ctx.measureText(trimmed).width > maxWidth && trimmed.length > 4) {
    trimmed = `${trimmed.slice(0, -4)}...`;
  }
  return trimmed;
}
