"use client";

import { AlertTriangle, Copy, Pencil, Trash2 } from "lucide-react";
import type { ScheduleEntry } from "@/lib/types";
import { formatTime, timeToMinutes } from "@/lib/utils";
import { getEntryAccentColor } from "@/lib/wallpaper-renderer";

export function ScheduleRow({
  entry,
  allEntries,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  entry: ScheduleEntry;
  allEntries: ScheduleEntry[];
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const accent = getEntryAccentColor(entry);
  const startMins = timeToMinutes(entry.start);
  const endMins = timeToMinutes(entry.end);

  // Find exact conflicting entries
  const conflictingEntries = allEntries.filter((other) => {
    if (other.id === entry.id) return false;
    const sharesDay = entry.days.some((day) => other.days.includes(day));
    if (!sharesDay) return false;
    const otherStart = timeToMinutes(other.start);
    const otherEnd = timeToMinutes(other.end);
    return startMins < otherEnd && endMins > otherStart;
  });

  const hasConflict = conflictingEntries.length > 0;

  return (
    <article
      className={`group relative grid gap-3 rounded-2xl border p-3.5 shadow-sm transition hover:-translate-y-0.5 sm:p-4 ${
        hasConflict
          ? "border-amber-400/80 bg-amber-50/20 dark:border-amber-500/50 dark:bg-amber-950/10"
          : "border-border bg-surface"
      }`}
      style={{
        borderLeftWidth: "6px",
        borderLeftColor: accent,
      }}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <button
          type="button"
          className="min-w-0 flex-1 text-left focus-visible:outline-none"
          onClick={onEdit}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded-md px-2 py-0.5 text-xs font-bold text-white shadow-xs"
              style={{ backgroundColor: accent }}
            >
              {entry.type}
            </span>
            <span className="text-xs font-semibold text-muted">
              {formatTime(entry.start)} – {formatTime(entry.end)}
            </span>
            {hasConflict ? (
              <span
                className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400"
                title={`Overlaps with: ${conflictingEntries.map((c) => c.title).join(", ")}`}
              >
                <AlertTriangle aria-hidden="true" className="size-3" />
                Time conflict
              </span>
            ) : null}
          </div>

          <h3 className="mt-1.5 break-words text-base font-semibold text-foreground sm:text-lg">
            {entry.title}
          </h3>

          <p className="mt-1 text-xs leading-5 text-muted sm:text-sm">
            {[
              entry.days.map((day) => day.slice(0, 3)).join("/"),
              entry.code,
              entry.room,
              entry.maxAbsences ? `Max cuts: ${entry.maxAbsences}` : null,
            ]
              .filter(Boolean)
              .join(" • ")}
          </p>
        </button>

        <div className="flex items-center gap-1.5 self-end sm:self-start">
          <button
            type="button"
            aria-label={`Duplicate ${entry.title}`}
            title="Duplicate to another slot"
            className="flex size-9 items-center justify-center rounded-xl border border-border bg-surface text-muted transition hover:border-primary hover:text-primary"
            onClick={onDuplicate}
          >
            <Copy aria-hidden="true" className="size-4" />
          </button>
          <button
            type="button"
            aria-label={`Edit ${entry.title}`}
            title="Edit item"
            className="flex size-9 items-center justify-center rounded-xl border border-border bg-surface text-muted transition hover:border-primary hover:text-primary"
            onClick={onEdit}
          >
            <Pencil aria-hidden="true" className="size-4" />
          </button>
          <button
            type="button"
            aria-label={`Delete ${entry.title}`}
            title="Delete item"
            className="flex size-9 items-center justify-center rounded-xl border border-border bg-surface text-danger transition hover:border-danger/60 hover:bg-danger/5"
            onClick={onDelete}
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>
    </article>
  );
}
