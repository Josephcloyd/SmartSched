"use client";

import { AlertTriangle, Copy, MapPin, Trash2 } from "lucide-react";
import type { ScheduleEntry } from "@/lib/types";
import {
  conflictingEntries,
  formatDuration,
  formatTime,
  timeToMinutes,
} from "@/lib/utils";
import { getEntryAccentColor } from "@/lib/wallpaper-renderer";

export function tintAccent(accent: string, percent: number) {
  return `color-mix(in srgb, ${accent} ${percent}%, var(--surface))`;
}

export function ScheduleRow({
  entry,
  allEntries,
  isNow = false,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  entry: ScheduleEntry;
  allEntries: ScheduleEntry[];
  isNow?: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const accent = getEntryAccentColor(entry);
  const conflicts = conflictingEntries(entry, allEntries);
  const duration = timeToMinutes(entry.end) - timeToMinutes(entry.start);

  return (
    <div className="grid grid-cols-[64px_minmax(0,1fr)] gap-3 sm:grid-cols-[76px_minmax(0,1fr)]">
      {/* Time rail */}
      <div className="pt-3.5 text-right">
        <p className="text-sm font-bold tabular-nums text-foreground">{formatTime(entry.start)}</p>
        <p className="text-xs tabular-nums text-muted">{formatTime(entry.end)}</p>
      </div>

      <article
        className={`group relative flex min-w-0 items-stretch overflow-hidden rounded-2xl border transition hover:shadow-[var(--shadow-md)] ${
          conflicts.length > 0
            ? "border-amber-400/70 dark:border-amber-500/50"
            : isNow
              ? "border-primary/60 ring-2 ring-primary/20"
              : "border-border"
        }`}
        style={{ background: tintAccent(accent, 9) }}
      >
        <span aria-hidden="true" className="w-1.5 shrink-0" style={{ backgroundColor: accent }} />

        <button
          type="button"
          className="min-w-0 flex-1 px-3.5 py-3 text-left transition-opacity focus-visible:outline-none active:opacity-70 sm:px-4"
          onClick={onEdit}
          aria-label={`Edit ${entry.title}`}
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide"
              style={{ backgroundColor: tintAccent(accent, 22), color: "var(--foreground)" }}
            >
              {entry.type}
            </span>
            {isNow ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-fill px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                <span className="size-1.5 animate-pulse rounded-full bg-white" />
                Now
              </span>
            ) : null}
            {conflicts.length > 0 ? (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300"
                title={`Overlaps with: ${conflicts.map((c) => c.title).join(", ")}`}
              >
                <AlertTriangle aria-hidden="true" className="size-3" />
                Overlaps {conflicts[0].title}
                {conflicts.length > 1 ? ` +${conflicts.length - 1}` : ""}
              </span>
            ) : null}
          </div>

          <h3 className="mt-1.5 break-words text-base font-semibold leading-snug text-foreground sm:text-[17px]">
            {entry.title}
          </h3>

          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-muted">
            {entry.room ? (
              <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
                <MapPin aria-hidden="true" className="size-3.5" />
                {entry.room}
              </span>
            ) : null}
            {entry.code ? <span>{entry.code}</span> : null}
            <span>{formatDuration(duration)}</span>
          </p>
        </button>

        <div className="flex shrink-0 flex-col justify-center gap-0.5 pr-1.5">
          <button
            type="button"
            aria-label={`Duplicate ${entry.title}`}
            title="Duplicate"
            className="icon-button size-9"
            onClick={onDuplicate}
          >
            <Copy aria-hidden="true" className="size-4" />
          </button>
          <button
            type="button"
            aria-label={`Delete ${entry.title}`}
            title="Delete"
            className="icon-button size-9 hover:!text-danger"
            onClick={onDelete}
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </button>
        </div>
      </article>
    </div>
  );
}

export function FreeGap({ minutes, label = "Free time" }: { minutes: number; label?: string }) {
  return (
    <div className="grid grid-cols-[64px_minmax(0,1fr)] gap-3 sm:grid-cols-[76px_minmax(0,1fr)]">
      <span />
      <div className="flex items-center gap-2 py-0.5 text-xs font-medium text-muted">
        <span className="h-px flex-1 border-t border-dashed border-border" />
        {label} · {formatDuration(minutes)}
        <span className="h-px flex-1 border-t border-dashed border-border" />
      </div>
    </div>
  );
}
