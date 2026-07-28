"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  BatteryMedium,
  Bell,
  CalendarClock,
  Camera,
  FileDown,
  Flashlight,
  ImageDown,
  MoonStar,
  Plus,
  Save,
  SignalHigh,
  Sun,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  days,
  scheduleTypes,
  wallpaperStyles,
  type DayName,
  type ScheduleEntry,
  type ScheduleSettings,
  type ScheduleType,
  type WallpaperStyle,
} from "@/lib/types";
import {
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
  wallpaperStyle: "Dark",
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

const wallpaperTypeStyle: Record<ScheduleType, string> = {
  Class: "#cbd5e1",
  Laboratory: "#94a3b8",
  Quiz: "#d1d5db",
  Exam: "#e5e7eb",
  Assignment: "#a3a3a3",
  Event: "#b6beca",
};

type StoredSchedule = {
  settings: ScheduleSettings;
  entries: ScheduleEntry[];
};

type LegacyScheduleEntry = Omit<ScheduleEntry, "days"> & {
  day?: DayName;
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

  return normalized;
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
    ...entry,
    days: validDays.length > 0 ? validDays : ["Monday"],
  };
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
        setSettings({ ...defaultSettings, ...parsed.settings });
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

  async function downloadWallpaper() {
    const canvas = document.createElement("canvas");
    canvas.width = 1440;
    canvas.height = 2560;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    drawWallpaper(ctx, canvas.width, canvas.height, settings, sortedEntries);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png", 1),
    );
    if (!blob) {
      return;
    }

    downloadBlob("smartsched-wallpaper-1440x2560.png", blob);
    setMessage("HD wallpaper downloaded. Save it to photos, then set it as your wallpaper.");
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
            <button className="tool-button" onClick={downloadWallpaper}>
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
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <p className="text-sm font-semibold text-foreground">1. Add your classes</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Enter subjects, rooms, times, and reminders. Save locally in your browser.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <p className="text-sm font-semibold text-foreground">2. Download wallpaper</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Create a lock screen background sized for phones. Choose a style and keep the top area visible.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
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
              <Field label="Wallpaper style">
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
                      updateForm("type", event.target.value as ScheduleType)
                    }
                  >
                    {scheduleTypes.map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Days">
                <div className="grid grid-cols-5 gap-2">
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
            <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-foreground shadow-sm">
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
            <Metric label="Wallpaper" value="1440x2560" />
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
                <div className="rounded-2xl border border-dashed border-border bg-surface-2/70 p-6 text-center text-sm text-muted">
                  No schedule items for {selectedDay}.
                </div>
              )}
            </div>
          </Panel>

          <div className="grid gap-4 xl:grid-cols-5">
            {days.map((day) => (
              <div
                key={day}
                className="rounded-2xl border border-border bg-surface/90 p-4 shadow-sm"
              >
                <h3 className="text-sm font-semibold text-foreground">{day}</h3>
                <div className="mt-3 space-y-3">
                  {entriesForDay(entries, day).map((entry) => (
                    <button
                      key={entry.id}
                      className="w-full rounded-xl border-l-4 bg-surface-2/70 p-3 text-left transition hover:-translate-y-0.5"
                      style={{ borderLeftColor: typeStyle[entry.type] }}
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
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {previewOpen ? (
        <PhonePreviewDialog
          title={settings.wallpaperTitle}
          schoolName={settings.schoolName}
          styleName={settings.wallpaperStyle}
          entries={previewEntries}
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
    <section className="rounded-2xl border border-border bg-surface/90 p-5 shadow-[0_20px_45px_-28px_rgba(0,0,0,0.35)] backdrop-blur">
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-gradient-to-br from-surface to-surface-2 p-4 shadow-sm">
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
    <article className="grid gap-3 rounded-2xl border border-border bg-surface-2/70 p-4 shadow-sm sm:grid-cols-[1fr_auto] sm:items-center">
      <button className="text-left" onClick={onEdit}>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="rounded px-2 py-1 text-xs font-semibold text-white"
            style={{ backgroundColor: typeStyle[entry.type] }}
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
  const today = days[now.getDay() - 1];
  if (!today) {
    return;
  }

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

function drawWallpaper(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: ScheduleSettings,
  entries: ScheduleEntry[],
) {
  const headerHeight = 720;

  let pageStart = "#111318";
  let pageMid = "#22252b";
  let pageEnd = "#0d0f13";
  let headerStart = "#30333a";
  let headerMid = "#24272d";
  let headerEnd = "#191b20";
  let silver = "#d9dde4";
  let muted = "#8f98a6";
  let soft = "#f1f3f6";
  let panel = "#2d3037";
  let panelAlt = "#343840";
  let line = "#555c68";

  if (settings.wallpaperStyle === "Light") {
    pageStart = "#f8fafb";
    pageMid = "#eaedf0";
    pageEnd = "#dde2e7";
    headerStart = "#ffffff";
    headerMid = "#f8fafc";
    headerEnd = "#e8ecef";
    silver = "#475569";
    muted = "#64748b";
    soft = "#0f172a";
    panel = "#f8fafc";
    panelAlt = "#eef2f7";
    line = "#cbd5e1";
  } else if (settings.wallpaperStyle === "Minimal") {
    pageStart = "#f9fafb";
    pageMid = "#f9fafb";
    pageEnd = "#f9fafb";
    headerStart = "#ffffff";
    headerMid = "#f4f5f6";
    headerEnd = "#eef0f2";
    silver = "#334155";
    muted = "#64748b";
    soft = "#0f172a";
    panel = "#f3f4f6";
    panelAlt = "#e2e8f0";
    line = "#cbd5e1";
  }

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

  ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
  for (let x = 0; x < width; x += 64) {
    ctx.fillRect(x, 0, 1, height);
  }
  for (let y = 0; y < height; y += 64) {
    ctx.fillRect(0, y, width, 1);
  }

  const left = 58;
  const top = headerHeight + 16;
  const tableWidth = width - left * 2;
  const bottom = height - 286;
  const tableHeight = bottom - top;
  const rowGap = 16;
  const rowHeight = (tableHeight - rowGap * (days.length - 1)) / days.length;
  const title = settings.wallpaperTitle || "Class Schedule";

  ctx.fillStyle = soft;
  ctx.font = "700 58px Arial";
  drawFittedText(ctx, title, left + 18, top - 92, 800, 58, 38);
  ctx.fillStyle = muted;
  ctx.font = "400 30px Arial";
  drawFittedText(ctx, settings.schoolName || "University of Cebu", left + 20, top - 46, 820, 30, 22);

  roundedRect(ctx, width - 430, top - 92, 300, 62, 31, "rgba(255, 255, 255, 0.08)");
  ctx.fillStyle = silver;
  ctx.font = "700 24px Arial";
  ctx.fillText("1440 x 2560", width - 390, top - 53);
  ctx.fillStyle = muted;
  ctx.font = "400 20px Arial";
  ctx.fillText("PHONE WALLPAPER", width - 245, top - 53);

  ctx.shadowColor = "rgba(0, 0, 0, 0.38)";
  ctx.shadowBlur = 38;
  ctx.shadowOffsetY = 18;
  roundedRect(ctx, left - 14, top - 18, tableWidth + 28, tableHeight + 36, 36, "#111318");
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  days.forEach((day, index) => {
    const y = top + index * (rowHeight + rowGap);
    const dayEntries = entriesForDay(entries, day);
    const rowColor = index % 2 === 0 ? panel : panelAlt;
    roundedRect(ctx, left, y, tableWidth, rowHeight, 28, rowColor);

    ctx.fillStyle = line;
    ctx.fillRect(left + 166, y + 26, 2, rowHeight - 52);

    ctx.fillStyle = index % 2 === 0 ? silver : "#c1c7d0";
    ctx.font = "700 52px Arial";
    ctx.fillText(day.slice(0, 3).toUpperCase(), left + 34, y + 78);
    ctx.fillStyle = muted;
    ctx.font = "700 22px Arial";
    ctx.fillText(day.toUpperCase(), left + 38, y + 114);

    roundedRect(ctx, left + 34, y + rowHeight - 72, 106, 40, 20, "rgba(255, 255, 255, 0.1)");
    ctx.fillStyle = silver;
    ctx.font = "700 20px Arial";
    ctx.fillText(`${dayEntries.length} ITEM${dayEntries.length === 1 ? "" : "S"}`, left + 52, y + rowHeight - 45);

    const scheduleX = left + 198;
    const scheduleY = y + 22;
    const scheduleWidth = tableWidth - 228;
    const scheduleHeight = rowHeight - 44;

    if (dayEntries.length === 0) {
      roundedRect(ctx, scheduleX, scheduleY, scheduleWidth, scheduleHeight, 22, "rgba(255, 255, 255, 0.065)");
      ctx.fillStyle = muted;
      ctx.font = "700 30px Arial";
      ctx.fillText("No scheduled class", scheduleX + 34, scheduleY + scheduleHeight / 2 + 10);
      return;
    }

    const visibleEntries = dayEntries.slice(0, 3);
    const itemGap = 12;
    const itemHeight = Math.min(
      112,
      (scheduleHeight - itemGap * (visibleEntries.length - 1)) /
        visibleEntries.length,
    );
    const itemGroupHeight =
      itemHeight * visibleEntries.length + itemGap * (visibleEntries.length - 1);
    const itemStartY = scheduleY + (scheduleHeight - itemGroupHeight) / 2;

    visibleEntries.forEach((entry, entryIndex) => {
      const itemY = itemStartY + entryIndex * (itemHeight + itemGap);
      drawScheduleCard(ctx, entry, scheduleX, itemY, scheduleWidth, itemHeight);
    });

    if (dayEntries.length > visibleEntries.length) {
      ctx.fillStyle = muted;
      ctx.font = "700 20px Arial";
      ctx.fillText(
        `+${dayEntries.length - visibleEntries.length} more`,
        scheduleX + scheduleWidth - 108,
        scheduleY + scheduleHeight - 18,
      );
    }
  });

  ctx.fillStyle = muted;
  ctx.font = "400 24px Arial";
  ctx.fillText("Generated by SmartSched Local", 76, height - 232);
  ctx.fillStyle = "#9ca3af";
  ctx.fillRect(width - 272, height - 248, 196, 8);
}

function drawScheduleCard(
  ctx: CanvasRenderingContext2D,
  entry: ScheduleEntry,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const accent = wallpaperTypeStyle[entry.type];
  const card = "#252932";
  const compact = height < 92;
  const timeWidth = compact ? 168 : 202;
  const contentX = x + (compact ? 218 : 260);
  const typeWidth = compact ? 0 : 138;

  ctx.shadowColor = "rgba(0, 0, 0, 0.18)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  roundedRect(ctx, x, y, width, height, 18, card);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.fillStyle = accent;
  ctx.fillRect(x, y, 10, height);

  roundedRect(ctx, x + 30, y + (compact ? 10 : 16), timeWidth, height - (compact ? 20 : 32), 18, "#323741");
  ctx.fillStyle = "#f1f3f6";
  ctx.font = `700 ${compact ? 18 : 22}px Arial`;
  drawFittedText(
    ctx,
    formatTime(entry.start),
    x + 54,
    y + height / 2 - (compact ? 8 : 10),
    timeWidth - 44,
    compact ? 18 : 22,
    compact ? 14 : 17,
  );
  ctx.font = `700 ${compact ? 15 : 18}px Arial`;
  ctx.fillStyle = "#c3c8d0";
  drawFittedText(
    ctx,
    formatTime(entry.end),
    x + 54,
    y + height / 2 + (compact ? 18 : 20),
    timeWidth - 44,
    compact ? 15 : 18,
    12,
  );

  ctx.fillStyle = "#f4f6f8";
  ctx.font = `700 ${compact ? 22 : 28}px Arial`;
  drawWrappedText(
    ctx,
    entry.title.toUpperCase(),
    contentX,
    y + (compact ? 28 : 34),
    width - (contentX - x) - typeWidth - 38,
    compact ? 22 : 27,
    compact ? 1 : 2,
  );

  const detailY = y + height - (compact ? 30 : 34);
  drawDetailChip(ctx, "CODE", entry.code || "-", contentX, detailY, compact ? 180 : 200);
  drawDetailChip(ctx, "ROOM", entry.room || "-", contentX + (compact ? 194 : 216), detailY, compact ? 170 : 190);

  if (!compact) {
    roundedRect(ctx, x + width - 138, y + 18, 100, 34, 17, "#3a3f49");
    ctx.fillStyle = "#e5e7eb";
    ctx.font = "700 17px Arial";
    drawFittedText(ctx, entry.type.toUpperCase(), x + width - 120, y + 41, 68, 17, 12);
  }
}

function drawDetailChip(
  ctx: CanvasRenderingContext2D,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
) {
  roundedRect(ctx, x, y, width, 28, 14, "#343943");
  ctx.fillStyle = "#aeb5bf";
  ctx.font = "700 12px Arial";
  ctx.fillText(label, x + 14, y + 18);
  ctx.fillStyle = "#f1f3f6";
  ctx.font = "700 16px Arial";
  drawFittedText(ctx, value, x + 68, y + 19, width - 82, 16, 12);
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
  title,
  schoolName,
  styleName,
  entries,
  onClose,
  onDownload,
}: {
  title: string;
  schoolName: string;
  styleName: WallpaperStyle;
  entries: ScheduleEntry[];
  onClose: () => void;
  onDownload: () => void | Promise<void>;
}) {
  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/72 px-4 py-5 backdrop-blur-sm sm:px-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="phone-preview-title"
    >
      <div className="mx-auto flex min-h-full w-full max-w-5xl items-center justify-center">
        <div className="w-full rounded-2xl border border-white/10 bg-surface p-4 shadow-[0_32px_110px_-30px_rgba(0,0,0,0.7)] sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2
                id="phone-preview-title"
                className="text-lg font-semibold text-foreground"
              >
                Phone Preview
              </h2>
              <p className="mt-1 text-sm text-muted">
                Check the iPhone safe areas before downloading.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="primary-button" onClick={onDownload}>
                <ImageDown aria-hidden="true" className="size-4" />
                Download
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
          <PhonePreview
            title={title}
            schoolName={schoolName}
            styleName={styleName}
            entries={entries}
          />
        </div>
      </div>
    </div>
  );
}

function PhonePreview({
  title,
  schoolName,
  styleName,
  entries,
}: {
  title: string;
  schoolName: string;
  styleName: WallpaperStyle;
  entries: ScheduleEntry[];
}) {
  const styleMap: Record<
    WallpaperStyle,
    {
      screen: string;
      header: string;
      row: string;
      item: string;
      chip: string;
      divider: string;
      text: string;
      muted: string;
      system: string;
      systemSoft: string;
    }
  > = {
    Dark: {
      screen: "bg-[#08090b]",
      header: "bg-black/24",
      row: "border-white/10 bg-white/[0.075]",
      item: "bg-black/34",
      chip: "bg-white/10",
      divider: "bg-white/45",
      text: "text-white",
      muted: "text-slate-300/78",
      system: "text-white",
      systemSoft: "text-white/82",
    },
    Light: {
      screen: "bg-[#eef2f5]",
      header: "bg-white/60",
      row: "border-slate-300/70 bg-white/72",
      item: "bg-slate-950/[0.055]",
      chip: "bg-slate-900/10",
      divider: "bg-slate-700/45",
      text: "text-slate-950",
      muted: "text-slate-600",
      system: "text-slate-950",
      systemSoft: "text-slate-900/72",
    },
    Minimal: {
      screen: "bg-[#f7f8f6]",
      header: "bg-white/40",
      row: "border-slate-200 bg-white/62",
      item: "bg-slate-900/[0.045]",
      chip: "bg-slate-900/10",
      divider: "bg-slate-500/40",
      text: "text-slate-950",
      muted: "text-slate-500",
      system: "text-slate-950",
      systemSoft: "text-slate-900/68",
    },
  };
  const style = styleMap[styleName];
  const visibleDays = days.map((day) => ({
    day,
    entries: entriesForDay(entries, day),
  }));

  return (
    <div className="mx-auto w-full max-w-[430px]">
      <div className="relative mx-auto rounded-[58px] bg-[#08080a] p-3 shadow-[0_38px_90px_-36px_rgba(0,0,0,0.62)] ring-1 ring-white/10">
        <div className="pointer-events-none absolute inset-x-12 top-1 h-2 rounded-b-full bg-white/10" />
        <div
          className={`relative h-[760px] overflow-hidden rounded-[46px] ring-1 ring-white/10 ${style.screen}`}
        >
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:28px_28px] opacity-50" />
          <div className="absolute inset-x-0 top-0 z-30 flex h-12 items-center justify-between px-7 text-[13px] font-bold">
            <span className={style.system}>9:41</span>
            <div className={`flex items-center gap-1.5 ${style.system}`}>
              <SignalHigh aria-hidden="true" className="size-4" />
              <span className="text-[11px] font-extrabold">LTE</span>
              <BatteryMedium aria-hidden="true" className="size-[18px]" />
            </div>
          </div>
          <div className="absolute left-1/2 top-[13px] z-40 h-7 w-[118px] -translate-x-1/2 rounded-full bg-black shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]" />
          <div
            className={`pointer-events-none absolute inset-x-0 top-[124px] z-20 text-center ${style.systemSoft}`}
          >
            <p className="text-[19px] font-extrabold">Mon Jul 27</p>
            <p className="mt-1 text-[68px] font-semibold leading-none tracking-normal">
              5:22
            </p>
          </div>

          <div className={`absolute inset-x-5 top-[204px] z-10 ${style.header} rounded-2xl px-3 py-2.5`}>
            <h3 className={`truncate text-lg font-extrabold leading-5 ${style.text}`}>
              {title || "Class Schedule"}
            </h3>
            <p className={`truncate text-[11px] font-semibold leading-4 ${style.muted}`}>
              {schoolName || "University of Cebu"}
            </p>
          </div>

          <div className={`absolute inset-x-5 top-[272px] z-10 h-1 rounded-full ${style.divider}`} />

          <div className="absolute inset-x-3 bottom-[112px] top-[284px] z-10 grid grid-rows-5 gap-2">
            {visibleDays.map(({ day, entries: dayEntries }) => (
              <section
                key={day}
                className={`grid min-h-0 grid-cols-[54px_1fr] gap-2 rounded-2xl border px-2 py-2 shadow-[0_14px_34px_-28px_rgba(0,0,0,0.65)] ${style.row}`}
              >
                <div className="flex min-h-0 flex-col justify-between border-r border-current/[0.18] pr-1.5">
                  <div>
                    <p className={`text-lg font-extrabold leading-none ${style.text}`}>
                      {day.slice(0, 3).toUpperCase()}
                    </p>
                    <p className={`mt-0.5 text-[8px] font-extrabold uppercase leading-none ${style.muted}`}>
                      {day}
                    </p>
                  </div>
                  <span className={`w-fit rounded-full px-1.5 py-0.5 text-[8px] font-extrabold leading-none ${style.chip} ${style.text}`}>
                    {dayEntries.length}
                  </span>
                </div>

                <div className="grid min-h-0 content-center gap-1">
                  {dayEntries.length === 0 ? (
                    <div className={`rounded-xl px-2 py-2 text-[10px] font-bold ${style.item} ${style.muted}`}>
                      No scheduled class
                    </div>
                  ) : (
                    dayEntries.slice(0, 3).map((entry) => (
                      <article
                        key={`${day}-${entry.id}`}
                        className={`grid min-h-0 grid-cols-[58px_1fr] items-center gap-1.5 rounded-xl px-1.5 py-1 ${style.item}`}
                      >
                        <div className={`rounded-lg px-1.5 py-0.5 text-[8px] font-extrabold leading-[11px] ${style.chip} ${style.text}`}>
                          <p>{formatTime(entry.start)}</p>
                          <p className={style.muted}>{formatTime(entry.end)}</p>
                        </div>
                        <div className="min-w-0">
                          <p className={`truncate text-[9px] font-extrabold uppercase leading-[11px] ${style.text}`}>
                            {entry.title || "Untitled"}
                          </p>
                          <p className={`truncate text-[8px] font-bold leading-[10px] ${style.muted}`}>
                            {[entry.code, entry.room].filter(Boolean).join(" - ") || entry.type}
                          </p>
                        </div>
                      </article>
                    ))
                  )}
                  {dayEntries.length > 3 ? (
                    <p className={`px-1.5 text-[8px] font-bold leading-none ${style.muted}`}>
                      +{dayEntries.length - 3} more
                    </p>
                  ) : null}
                </div>
              </section>
            ))}
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-7 pb-3 pt-14 text-white">
            <div className="mb-4 flex items-center justify-between">
              <span className="flex size-14 items-center justify-center rounded-full bg-black/60 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)] backdrop-blur">
                <Flashlight aria-hidden="true" className="size-6" />
              </span>
              <span className="rounded-full bg-black/30 px-3 py-1.5 text-sm font-bold backdrop-blur">
                Do Not Disturb
              </span>
              <span className="flex size-14 items-center justify-center rounded-full bg-black/60 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)] backdrop-blur">
                <Camera aria-hidden="true" className="size-6" />
              </span>
            </div>
            <div className="mx-auto h-1.5 w-36 rounded-full bg-white" />
          </div>
        </div>
      </div>
      <div className="mt-3 rounded-2xl border border-border bg-surface p-4 text-sm leading-6 text-muted">
        Preview uses fixed wallpaper safe areas: schedule rows are fitted
        between the iPhone clock and home indicator.
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
