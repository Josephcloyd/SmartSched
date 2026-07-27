"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  CalendarClock,
  FileDown,
  ImageDown,
  Plus,
  Save,
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

const defaultSettings: ScheduleSettings = {
  ownerName: "My Schedule",
  schoolName: "SmartSched Local",
  wallpaperTitle: "Weekly Class Schedule",
};

const blankEntry: Omit<ScheduleEntry, "id"> = {
  title: "",
  code: "",
  teacher: "",
  room: "",
  section: "",
  day: "Monday",
  start: "08:00",
  end: "09:00",
  type: "Class",
  reminderMinutes: 15,
  notes: "",
};

const sampleEntries: ScheduleEntry[] = [
  {
    id: uid(),
    title: "Mathematics",
    code: "MATH 101",
    teacher: "Ms. Reyes",
    room: "Room 204",
    section: "Grade 10 - A",
    day: "Monday",
    start: "08:00",
    end: "09:00",
    type: "Class",
    reminderMinutes: 15,
    notes: "Bring graphing notebook.",
  },
  {
    id: uid(),
    title: "Science Lab",
    code: "SCI 102",
    teacher: "Mr. Santos",
    room: "Lab 2",
    section: "Grade 10 - A",
    day: "Wednesday",
    start: "10:00",
    end: "11:30",
    type: "Laboratory",
    reminderMinutes: 30,
    notes: "Lab coat required.",
  },
  {
    id: uid(),
    title: "English Quiz",
    code: "ENG 101",
    teacher: "Ms. Cruz",
    room: "Room 101",
    section: "Grade 10 - A",
    day: "Friday",
    start: "13:00",
    end: "14:00",
    type: "Quiz",
    reminderMinutes: 60,
    notes: "Review chapters 4 and 5.",
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

type StoredSchedule = {
  settings: ScheduleSettings;
  entries: ScheduleEntry[];
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

    const parsed = JSON.parse(raw) as StoredSchedule;
    return {
      settings: { ...defaultSettings, ...parsed.settings },
      entries: Array.isArray(parsed.entries) ? parsed.entries : sampleEntries,
    };
  } catch {
    return null;
  }
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ settings, entries }));
  }, [settings, entries]);

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
    setForm({ ...blankEntry, day });
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

    const saved: ScheduleEntry = {
      id: editingId ?? uid(),
      ...form,
      title: form.title.trim(),
      code: form.code.trim(),
      teacher: form.teacher.trim(),
      room: form.room.trim(),
      section: form.section.trim(),
      notes: form.notes.trim(),
    };

    setEntries((current) =>
      editingId
        ? current.map((entry) => (entry.id === editingId ? saved : entry))
        : [...current, saved],
    );
    setSelectedDay(saved.day);
    resetForm(saved.day);
    setMessage(conflict ? "Saved with a time conflict warning." : "Schedule saved on this device.");
  }

  function editEntry(entry: ScheduleEntry) {
    const { id, ...rest } = entry;
    setEditingId(id);
    setForm(rest);
    setSelectedDay(entry.day);
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
        const parsed = JSON.parse(String(reader.result)) as StoredSchedule;
        if (!Array.isArray(parsed.entries)) {
          throw new Error("Missing entries");
        }
        setSettings({ ...defaultSettings, ...parsed.settings });
        setEntries(parsed.entries);
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
    <main className="min-h-screen bg-background">
      <section className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-5 py-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              SmartSched Local
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-foreground sm:text-4xl">
              Schedule, wallpaper, and reminders on this device.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
              No Supabase and no online account. Your data is saved in this
              browser, then exported as a phone wallpaper, calendar alarms, or a
              backup file.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
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
              <div className="grid grid-cols-2 gap-3">
                <Field label="Day">
                  <select
                    className="field"
                    value={form.day}
                    onChange={(event) =>
                      updateForm("day", event.target.value as DayName)
                    }
                  >
                    {days.map((day) => (
                      <option key={day}>{day}</option>
                    ))}
                  </select>
                </Field>
                <TextInput
                  label="Reminder"
                  type="number"
                  value={String(form.reminderMinutes)}
                  onChange={(value) =>
                    updateForm("reminderMinutes", Math.max(0, Number(value)))
                  }
                />
              </div>
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
              <TextInput
                label="Teacher"
                value={form.teacher}
                onChange={(value) => updateForm("teacher", value)}
                placeholder="Ms. Reyes"
              />
              <div className="grid grid-cols-2 gap-3">
                <TextInput
                  label="Room"
                  value={form.room}
                  onChange={(value) => updateForm("room", value)}
                  placeholder="Room 204"
                />
                <TextInput
                  label="Section"
                  value={form.section}
                  onChange={(value) => updateForm("section", value)}
                  placeholder="Grade 10 - A"
                />
              </div>
              <TextInput
                label="Notes"
                value={form.notes}
                onChange={(value) => updateForm("notes", value)}
                placeholder="Bring notebook"
              />

              {conflict ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">
                  Time conflict on {form.day}. You can still save it, but the
                  wallpaper and calendar will show both items.
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
            <div className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-foreground shadow-sm">
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
                      ? "min-h-10 rounded-md bg-primary px-4 text-sm font-semibold text-white"
                      : "min-h-10 rounded-md border border-border bg-white px-4 text-sm font-semibold text-muted"
                  }
                  onClick={() => {
                    setSelectedDay(day);
                    updateForm("day", day);
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
                <div className="rounded-lg border border-dashed border-border bg-background p-6 text-center text-sm text-muted">
                  No schedule items for {selectedDay}.
                </div>
              )}
            </div>
          </Panel>

          <div className="grid gap-4 xl:grid-cols-5">
            {days.map((day) => (
              <div
                key={day}
                className="rounded-lg border border-border bg-surface p-4 shadow-sm"
              >
                <h3 className="text-sm font-semibold text-foreground">{day}</h3>
                <div className="mt-3 space-y-3">
                  {entriesForDay(entries, day).map((entry) => (
                    <button
                      key={entry.id}
                      className="w-full rounded-md border-l-4 bg-background p-3 text-left"
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
                        {[entry.room, entry.teacher].filter(Boolean).join(" - ")}
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
    <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-foreground">{title}</h2>
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
    <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
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
    <article className="grid gap-3 rounded-lg border border-border bg-background p-4 sm:grid-cols-[1fr_auto] sm:items-center">
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
          {[entry.code, entry.teacher, entry.room, entry.section]
            .filter(Boolean)
            .join(" - ")}
        </p>
        {entry.notes ? (
          <p className="mt-2 text-sm leading-6 text-muted">{entry.notes}</p>
        ) : null}
      </button>
      <button
        aria-label={`Delete ${entry.title}`}
        className="flex min-h-10 items-center justify-center gap-2 rounded-md border border-border bg-white px-3 text-sm font-semibold text-danger"
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
    .filter((entry) => entry.day === today)
    .forEach((entry) => {
      const [hour, minute] = entry.start.split(":").map(Number);
      const reminder = new Date(now);
      reminder.setHours(hour, minute - entry.reminderMinutes, 0, 0);
      const diff = reminder.getTime() - now.getTime();
      const key = `${now.toDateString()}-${entry.id}-${entry.reminderMinutes}`;

      if (diff <= 30000 && diff >= -60000 && !notified.has(key)) {
        new Notification(`${entry.title} starts at ${formatTime(entry.start)}`, {
          body: [entry.room, entry.teacher].filter(Boolean).join(" - "),
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
    const startDate = nextDateForDay(entry.day);
    const [startHour, startMinute] = entry.start.split(":").map(Number);
    const [endHour, endMinute] = entry.end.split(":").map(Number);
    startDate.setHours(startHour, startMinute, 0, 0);
    const endDate = new Date(startDate);
    endDate.setHours(endHour, endMinute, 0, 0);

    lines.push(
      "BEGIN:VEVENT",
      `UID:${entry.id}@smartsched.local`,
      `DTSTAMP:${nowStamp}`,
      `DTSTART:${toIcsDate(startDate)}`,
      `DTEND:${toIcsDate(endDate)}`,
      "RRULE:FREQ=WEEKLY;COUNT=24",
      `SUMMARY:${escapeIcs([entry.code, entry.title].filter(Boolean).join(" "))}`,
      `LOCATION:${escapeIcs(entry.room)}`,
      `DESCRIPTION:${escapeIcs([entry.teacher, entry.section, entry.notes].filter(Boolean).join("\\n"))}`,
      "BEGIN:VALARM",
      `TRIGGER:-PT${Math.max(0, entry.reminderMinutes)}M`,
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeIcs(`${entry.title} starts soon`)}`,
      "END:VALARM",
      "END:VEVENT",
    );
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
  ctx.fillStyle = "#f7f8f5";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#256f53";
  ctx.fillRect(0, 0, width, 310);

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 72px Arial";
  ctx.fillText(settings.wallpaperTitle || "Weekly Class Schedule", 90, 125);
  ctx.font = "400 38px Arial";
  ctx.fillText(settings.ownerName || "My Schedule", 92, 190);
  ctx.fillStyle = "#d9f2e5";
  ctx.font = "400 30px Arial";
  ctx.fillText(settings.schoolName || "SmartSched Local", 92, 240);

  const left = 70;
  const top = 380;
  const dayWidth = (width - left * 2 - 32) / 5;
  const cardHeight = height - top - 100;

  days.forEach((day, index) => {
    const x = left + index * (dayWidth + 8);
    roundedRect(ctx, x, top, dayWidth, cardHeight, 28, "#ffffff");
    ctx.fillStyle = "#172018";
    ctx.font = "700 34px Arial";
    ctx.fillText(day.slice(0, 3), x + 26, top + 62);

    let y = top + 108;
    entriesForDay(entries, day).forEach((entry) => {
      const itemHeight = 168;
      if (y + itemHeight > top + cardHeight - 24) {
        return;
      }

      roundedRect(ctx, x + 18, y, dayWidth - 36, itemHeight, 18, "#eef4ef");
      ctx.fillStyle = typeStyle[entry.type];
      ctx.fillRect(x + 18, y, 8, itemHeight);
      ctx.fillStyle = "#526058";
      ctx.font = "700 22px Arial";
      ctx.fillText(
        `${formatTime(entry.start)} - ${formatTime(entry.end)}`,
        x + 42,
        y + 36,
      );
      ctx.fillStyle = "#172018";
      ctx.font = "700 28px Arial";
      fitText(ctx, entry.title, x + 42, y + 76, dayWidth - 76, 28);
      ctx.fillStyle = "#526058";
      ctx.font = "400 21px Arial";
      fitText(ctx, entry.room || entry.teacher || entry.code, x + 42, y + 112, dayWidth - 76, 21);
      fitText(ctx, entry.teacher || entry.section, x + 42, y + 142, dayWidth - 76, 21);
      y += itemHeight + 18;
    });
  });

  ctx.fillStyle = "#647067";
  ctx.font = "400 24px Arial";
  ctx.fillText("Generated by SmartSched Local", 90, height - 48);
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

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
) {
  let size = fontSize;
  while (ctx.measureText(text).width > maxWidth && size > 15) {
    size -= 1;
    ctx.font = ctx.font.replace(/\d+px/, `${size}px`);
  }
  ctx.fillText(text || "-", x, y);
}
