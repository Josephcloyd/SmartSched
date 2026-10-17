"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Trash2 } from "lucide-react";
import { days, scheduleTypes, type DayName, type ScheduleEntry, type ScheduleType } from "@/lib/types";
import { conflictingEntries, formatDuration, formatTimeRange, timeToMinutes } from "@/lib/utils";
import { typeStyle } from "@/lib/wallpaper-renderer";
import { Field, Sheet, TextInput } from "@/components/ui/form-controls";

export type EntryFormValues = Omit<ScheduleEntry, "id">;

export const accentPresets = [
  "#256f53",
  "#165c8d",
  "#7b1113",
  "#9d2235",
  "#00703c",
  "#003a70",
  "#7a1731",
  "#b55d2c",
  "#b42318",
  "#4f46e5",
  "#0284c7",
  "#d97706",
];

const dayPresets: { label: string; days: DayName[] }[] = [
  { label: "MWF", days: ["Monday", "Wednesday", "Friday"] },
  { label: "TTh", days: ["Tuesday", "Thursday"] },
  { label: "Mon–Fri", days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] },
  { label: "Every day", days: [...days] },
];

const reminderOptions = [0, 5, 10, 15, 30, 60];

function sameDays(a: DayName[], b: DayName[]) {
  return a.length === b.length && a.every((day) => b.includes(day));
}

export function EntryFormSheet({
  initial,
  editingId,
  entries,
  onSave,
  onDelete,
  onClose,
}: {
  initial: EntryFormValues;
  editingId: string | null;
  entries: ScheduleEntry[];
  onSave: (values: EntryFormValues) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<EntryFormValues>(initial);
  const [error, setError] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);
  const startRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Skip auto-focus on touch screens so the keyboard doesn't cover the sheet as it opens.
    if (!editingId && window.matchMedia("(pointer: fine)").matches) {
      titleRef.current?.focus();
    }
  }, [editingId]);

  function update<K extends keyof EntryFormValues>(key: K, value: EntryFormValues[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  }

  function updateType(type: ScheduleType) {
    setForm((current) => ({
      ...current,
      type,
      // Follow the type color unless the student picked a custom one.
      accentColor:
        current.accentColor === typeStyle[current.type] ? typeStyle[type] : current.accentColor,
    }));
  }

  function toggleDay(day: DayName) {
    setForm((current) => {
      const nextDays = current.days.includes(day)
        ? current.days.filter((item) => item !== day)
        : [...current.days, day];
      return { ...current, days: nextDays.length > 0 ? nextDays : [day] };
    });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim()) {
      setError("Give this class a name first.");
      titleRef.current?.focus();
      return;
    }
    if (timeToMinutes(form.start) >= timeToMinutes(form.end)) {
      setError("The end time needs to be later than the start time.");
      startRef.current?.focus();
      return;
    }
    onSave(form);
  }

  const duration = timeToMinutes(form.end) - timeToMinutes(form.start);
  const conflicts = conflictingEntries({ id: editingId ?? "new", ...form }, entries);
  const reminderChoices = reminderOptions.includes(form.reminderMinutes)
    ? reminderOptions
    : [...reminderOptions, form.reminderMinutes].sort((a, b) => a - b);

  return (
    <Sheet
      title={editingId ? "Edit class" : "Add a class"}
      description={editingId ? "Changes save to this device." : "Fill in what you know. You can edit it later."}
      onClose={onClose}
      footer={
        <div className="flex items-center gap-2">
          {onDelete ? (
            <button
              type="button"
              className="secondary-button px-3 text-danger hover:!border-danger/50"
              onClick={onDelete}
              aria-label="Delete this class"
            >
              <Trash2 aria-hidden="true" className="size-4" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          ) : null}
          <button type="button" className="secondary-button ml-auto" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="entry-form" className="primary-button min-w-32">
            <Check aria-hidden="true" className="size-4" />
            {editingId ? "Save changes" : "Add class"}
          </button>
        </div>
      }
    >
      <form id="entry-form" className="grid gap-5" onSubmit={submit} noValidate>
        <TextInput
          label="Subject name"
          value={form.title}
          onChange={(value) => update("title", value)}
          placeholder="e.g. Data Structures"
          inputRef={titleRef}
          required
        />

        <Field label="What kind?">
          <div className="flex flex-wrap gap-2">
            {scheduleTypes.map((type) => (
              <button
                key={type}
                type="button"
                className="chip"
                aria-pressed={form.type === type}
                onClick={() => updateType(type)}
              >
                {type}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Which days?">
          <div className="grid grid-cols-7 gap-1.5">
            {days.map((day) => (
              <button
                key={day}
                type="button"
                className="chip px-0"
                aria-pressed={form.days.includes(day)}
                aria-label={day}
                onClick={() => toggleDay(day)}
              >
                {day.slice(0, 3)}
              </button>
            ))}
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {dayPresets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  sameDays(form.days, preset.days)
                    ? "bg-primary/15 text-primary"
                    : "bg-surface-2 text-muted hover:text-foreground"
                }`}
                onClick={() => setForm((current) => ({ ...current, days: preset.days }))}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid gap-1.5">
          <div className="grid grid-cols-2 gap-3">
            <TextInput
              label="Starts"
              type="time"
              value={form.start}
              onChange={(value) => update("start", value)}
              inputRef={startRef}
              required
            />
            <TextInput
              label="Ends"
              type="time"
              value={form.end}
              onChange={(value) => update("end", value)}
              required
            />
          </div>
          <p className={`text-xs ${duration > 0 ? "text-muted" : "font-semibold text-danger"}`}>
            {duration > 0
              ? `${formatTimeRange(form.start, form.end)} · ${formatDuration(duration)}`
              : "End time must be after the start time."}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <TextInput
            label="Room"
            value={form.room}
            onChange={(value) => update("room", value)}
            placeholder="e.g. Room 302"
          />
          <TextInput
            label="Subject code"
            value={form.code}
            onChange={(value) => update("code", value)}
            placeholder="e.g. CS 201"
          />
        </div>

        <Field label="Color">
          <div className="flex flex-wrap items-center gap-2">
            {accentPresets.map((color) => {
              const selected = form.accentColor.toLowerCase() === color;
              return (
                <button
                  key={color}
                  type="button"
                  aria-label={`Use color ${color}`}
                  aria-pressed={selected}
                  className="flex size-9 items-center justify-center rounded-full transition hover:scale-110"
                  style={{
                    backgroundColor: color,
                    boxShadow: selected ? `0 0 0 3px var(--surface), 0 0 0 5px ${color}` : undefined,
                  }}
                  onClick={() => update("accentColor", color)}
                >
                  {selected ? <Check aria-hidden="true" className="size-4 text-white" /> : null}
                </button>
              );
            })}
            <label
              className="relative flex size-9 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed border-border text-xs font-bold text-muted"
              title="Pick a custom color"
            >
              +
              <input
                aria-label="Custom color"
                className="absolute inset-0 cursor-pointer opacity-0"
                type="color"
                value={form.accentColor}
                onChange={(event) => update("accentColor", event.target.value)}
              />
            </label>
          </div>
        </Field>

        <Field label="Remind me">
          <select
            className="field"
            value={form.reminderMinutes}
            onChange={(event) => update("reminderMinutes", Number(event.target.value))}
          >
            {reminderChoices.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes === 0 ? "When it starts" : `${minutes} min before`}
              </option>
            ))}
          </select>
        </Field>

        {conflicts.length > 0 ? (
          <p className="flex gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm leading-6 text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-200">
            <AlertTriangle aria-hidden="true" className="mt-1 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              Overlaps with <strong>{conflicts.map((c) => c.title).join(", ")}</strong>. You can still
              save it.
            </span>
          </p>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm font-medium text-danger"
          >
            {error}
          </p>
        ) : null}
      </form>
    </Sheet>
  );
}
