"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  CalendarClock,
  FileDown,
  ImageDown,
  MoonStar,
  Plus,
  Save,
  Sun,
  Trash2,
  Upload,
} from "lucide-react";
import {
  days,
  scheduleTypes,
  type DayName,
  type ScheduleEntry,
  type ScheduleSettings,
  type ScheduleType,
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
  schoolName: "SmartSched Local",
  wallpaperTitle: "Weekly Class Schedule",
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
      settings: { ...defaultSettings, ...parsed.settings },
      entries: Array.isArray(parsed.entries)
        ? parsed.entries.map(normalizeEntry)
        : sampleEntries,
    };
  } catch {
    return null;
  }
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
  const storedSchedule = useMemo(() => readStoredSchedule(), []);
  const [settings, setSettings] = useState<ScheduleSettings>(
    () => storedSchedule?.settings ?? defaultSettings,
  );
  const [entries, setEntries] = useState<ScheduleEntry[]>(
    () => storedSchedule?.entries ?? sampleEntries,
  );
  const [selectedDay, setSelectedDay] = useState<DayName>("Monday");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<ScheduleEntry, "id">>(blankEntry);
  const [message, setMessage] = useState("");
  const [notificationState, setNotificationState] =
    useState<NotificationPermission | "unsupported">(getNotificationPermission);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") {
      return "light";
    }

    const storedTheme = window.localStorage.getItem(themeKey);
    if (storedTheme === "dark" || storedTheme === "light") {
      return storedTheme;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ settings, entries }));
  }, [settings, entries]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(themeKey, theme);
  }, [theme]);

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
  const silver = "#d9dde4";
  const muted = "#8f98a6";
  const soft = "#f1f3f6";
  const panel = "#2d3037";
  const panelAlt = "#343840";
  const line = "#555c68";

  const pageGradient = ctx.createLinearGradient(0, 0, width, height);
  pageGradient.addColorStop(0, "#111318");
  pageGradient.addColorStop(0.52, "#22252b");
  pageGradient.addColorStop(1, "#0d0f13");
  ctx.fillStyle = pageGradient;
  ctx.fillRect(0, 0, width, height);

  const headerGradient = ctx.createLinearGradient(0, 0, width, 360);
  headerGradient.addColorStop(0, "#30333a");
  headerGradient.addColorStop(0.55, "#24272d");
  headerGradient.addColorStop(1, "#191b20");
  ctx.fillStyle = headerGradient;
  ctx.fillRect(0, 0, width, 360);

  ctx.fillStyle = "#9ca3af";
  ctx.fillRect(0, 342, width, 10);
  ctx.fillStyle = "#4b5563";
  ctx.fillRect(0, 352, width, 8);

  ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
  for (let x = 0; x < width; x += 64) {
    ctx.fillRect(x, 0, 1, height);
  }
  for (let y = 0; y < height; y += 64) {
    ctx.fillRect(0, y, width, 1);
  }

  const title = settings.wallpaperTitle || "Weekly Class Schedule";
  ctx.fillStyle = soft;
  ctx.font = "700 70px Arial";
  drawFittedText(ctx, title, 76, 104, width - 152, 70, 44);
  ctx.font = "400 38px Arial";
  drawFittedText(ctx, settings.ownerName || "My Schedule", 80, 178, 760, 38, 26);
  ctx.fillStyle = muted;
  ctx.font = "400 30px Arial";
  drawFittedText(ctx, settings.schoolName || "SmartSched Local", 80, 232, 850, 30, 22);

  roundedRect(ctx, width - 430, 188, 300, 62, 31, "rgba(255, 255, 255, 0.08)");
  ctx.fillStyle = silver;
  ctx.font = "700 24px Arial";
  ctx.fillText("1440 x 2560", width - 390, 227);
  ctx.fillStyle = muted;
  ctx.font = "400 20px Arial";
  ctx.fillText("PHONE WALLPAPER", width - 245, 227);

  const left = 58;
  const top = 404;
  const tableWidth = width - left * 2;
  const bottom = height - 86;
  const tableHeight = bottom - top;
  const rowGap = 16;
  const rowHeight = (tableHeight - rowGap * (days.length - 1)) / days.length;

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
  ctx.fillText("Generated by SmartSched Local", 76, height - 34);
  ctx.fillStyle = "#9ca3af";
  ctx.fillRect(width - 272, height - 50, 196, 8);
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

  ctx.shadowColor = "rgba(0, 0, 0, 0.18)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  roundedRect(ctx, x, y, width, height, 18, card);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.fillStyle = accent;
  ctx.fillRect(x, y, 10, height);

  roundedRect(ctx, x + 30, y + 16, 202, height - 32, 18, "#323741");
  ctx.fillStyle = "#f1f3f6";
  ctx.font = "700 22px Arial";
  drawFittedText(
    ctx,
    formatTime(entry.start),
    x + 54,
    y + height / 2 - 10,
    158,
    22,
    17,
  );
  ctx.font = "700 18px Arial";
  ctx.fillStyle = "#c3c8d0";
  drawFittedText(ctx, formatTime(entry.end), x + 54, y + height / 2 + 20, 158, 18, 14);

  ctx.fillStyle = "#f4f6f8";
  ctx.font = "700 28px Arial";
  drawWrappedText(
    ctx,
    entry.title.toUpperCase(),
    x + 260,
    y + 34,
    width - 450,
    27,
    2,
  );

  const detailY = y + height - 34;
  drawDetailChip(ctx, "CODE", entry.code || "-", x + 260, detailY, 200);
  drawDetailChip(ctx, "ROOM", entry.room || "-", x + 476, detailY, 190);

  roundedRect(ctx, x + width - 138, y + 18, 100, 34, 17, "#3a3f49");
  ctx.fillStyle = "#e5e7eb";
  ctx.font = "700 17px Arial";
  drawFittedText(ctx, entry.type.toUpperCase(), x + width - 120, y + 41, 68, 17, 12);
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
