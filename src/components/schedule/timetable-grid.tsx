"use client";

import { useMemo } from "react";
import type { DayName, ScheduleEntry } from "@/lib/types";
import { formatTime, timeToMinutes } from "@/lib/utils";
import { getEntryAccentColor } from "@/lib/wallpaper-renderer";

const START_HOUR = 7; // 7:00 AM
const END_HOUR = 20; // 8:00 PM
const HOUR_HEIGHT = 64; // pixels per hour
const TOTAL_GRID_HEIGHT = (END_HOUR - START_HOUR) * HOUR_HEIGHT;

export function TimetableGrid({
  entries,
  visibleDays,
  onEditEntry,
}: {
  entries: ScheduleEntry[];
  visibleDays: DayName[];
  onEditEntry: (entry: ScheduleEntry) => void;
}) {
  const hours = useMemo(() => {
    const list: { label: string; hour: number }[] = [];
    for (let h = START_HOUR; h <= END_HOUR; h += 1) {
      const period = h >= 12 ? "PM" : "AM";
      const h12 = h % 12 || 12;
      list.push({ label: `${h12} ${period}`, hour: h });
    }
    return list;
  }, []);

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-border bg-surface p-2 sm:p-4 shadow-sm">
      <div className="min-w-[620px] select-none">
        {/* Header row with day names */}
        <div className="grid grid-cols-[60px_repeat(var(--col-count),minmax(0,1fr))] border-b border-border/80 pb-3" style={{ "--col-count": visibleDays.length } as React.CSSProperties}>
          <div className="text-center text-xs font-bold uppercase tracking-wider text-muted">Time</div>
          {visibleDays.map((day) => (
            <div key={day} className="px-2 text-center text-xs font-bold text-foreground sm:text-sm">
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{day.slice(0, 3)}</span>
            </div>
          ))}
        </div>

        {/* Timetable Body */}
        <div
          className="relative grid grid-cols-[60px_repeat(var(--col-count),minmax(0,1fr))]"
          style={
            {
              "--col-count": visibleDays.length,
              height: `${TOTAL_GRID_HEIGHT}px`,
            } as React.CSSProperties
          }
        >
          {/* Time markers column */}
          <div className="relative border-r border-border/60">
            {hours.map((item, idx) => (
              <div
                key={item.hour}
                className="absolute right-2 -translate-y-2 text-[11px] font-semibold text-muted"
                style={{ top: `${idx * HOUR_HEIGHT}px` }}
              >
                {item.label}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {visibleDays.map((day) => {
            const dayEntries = entries.filter((e) => e.days.includes(day));

            return (
              <div
                key={day}
                className="relative border-r border-border/40 last:border-r-0"
              >
                {/* Horizontal hour guide lines */}
                {hours.map((item, idx) => (
                  <div
                    key={item.hour}
                    className="absolute inset-x-0 border-t border-border/30"
                    style={{ top: `${idx * HOUR_HEIGHT}px` }}
                  />
                ))}

                {/* Scheduled class blocks */}
                {dayEntries.map((entry) => {
                  const startMins = timeToMinutes(entry.start);
                  const endMins = timeToMinutes(entry.end);
                  const clampedStart = Math.max(START_HOUR * 60, startMins);
                  const clampedEnd = Math.min(END_HOUR * 60, Math.max(clampedStart + 20, endMins));
                  const topPx = ((clampedStart - START_HOUR * 60) / 60) * HOUR_HEIGHT;
                  const heightPx = Math.max(34, ((clampedEnd - clampedStart) / 60) * HOUR_HEIGHT);
                  const accent = getEntryAccentColor(entry);

                  return (
                    <button
                      key={`${entry.id}-${day}`}
                      type="button"
                      className="group absolute inset-x-1 z-10 flex flex-col justify-between overflow-hidden rounded-xl border border-white/20 p-1.5 text-left text-white shadow-sm transition hover:z-20 hover:scale-[1.02] hover:shadow-md sm:p-2"
                      style={{
                        top: `${topPx}px`,
                        height: `${heightPx}px`,
                        backgroundColor: accent,
                      }}
                      onClick={() => onEditEntry(entry)}
                      title={`${entry.title} (${formatTime(entry.start)} - ${formatTime(entry.end)})\n${[entry.code, entry.room].filter(Boolean).join(" - ")}`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center justify-between gap-1 text-[10px] font-bold opacity-90 sm:text-[11px]">
                          <span className="truncate">{entry.code || entry.type}</span>
                          <span className="shrink-0">{formatTime(entry.start)}</span>
                        </div>
                        <div className="truncate text-xs font-semibold sm:text-sm">
                          {entry.title}
                        </div>
                      </div>
                      {heightPx > 50 ? (
                        <div className="truncate text-[10px] opacity-85 sm:text-[11px]">
                          {entry.room || formatTime(entry.end)}
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
