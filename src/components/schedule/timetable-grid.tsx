"use client";

import { useMemo } from "react";
import type { DayName, ScheduleEntry } from "@/lib/types";
import { formatTime, formatTimeRange, timeToMinutes } from "@/lib/utils";
import { getEntryAccentColor } from "@/lib/wallpaper-renderer";
import { tintAccent } from "@/components/schedule/schedule-row";

const HOUR_HEIGHT = 72; // pixels per hour
const TIME_COLUMN = 56;
const MIN_DAY_COLUMN = 118;

type PlacedEntry = {
  entry: ScheduleEntry;
  start: number;
  end: number;
  lane: number;
  lanes: number;
};

/** Splits overlapping classes into side-by-side lanes so none hide behind another. */
function layoutDay(entries: ScheduleEntry[]): PlacedEntry[] {
  const sorted = entries
    .map((entry) => {
      const start = timeToMinutes(entry.start);
      return { entry, start, end: Math.max(timeToMinutes(entry.end), start + 15) };
    })
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const placed: PlacedEntry[] = [];
  let cluster: PlacedEntry[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -1;

  const flush = () => {
    cluster.forEach((item) => {
      item.lanes = laneEnds.length;
    });
    placed.push(...cluster);
    cluster = [];
    laneEnds = [];
    clusterEnd = -1;
  };

  for (const item of sorted) {
    if (cluster.length > 0 && item.start >= clusterEnd) flush();
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= item.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(item.end);
    } else {
      laneEnds[lane] = item.end;
    }
    cluster.push({ ...item, lane, lanes: 1 });
    clusterEnd = Math.max(clusterEnd, item.end);
  }
  flush();

  return placed;
}

function hourLabel(hour: number) {
  const period = hour >= 12 && hour < 24 ? "PM" : "AM";
  return `${hour % 12 || 12} ${period}`;
}

export function TimetableGrid({
  entries,
  visibleDays,
  todayName,
  nowMinutes,
  onEditEntry,
}: {
  entries: ScheduleEntry[];
  visibleDays: DayName[];
  todayName?: DayName;
  nowMinutes?: number;
  onEditEntry: (entry: ScheduleEntry) => void;
}) {
  // Fit the grid to the actual schedule instead of a fixed 7 AM–8 PM window.
  const { startHour, endHour } = useMemo(() => {
    if (entries.length === 0) return { startHour: 7, endHour: 17 };
    const earliest = Math.min(...entries.map((e) => timeToMinutes(e.start)));
    const latest = Math.max(...entries.map((e) => timeToMinutes(e.end)));
    const start = Math.max(0, Math.floor(earliest / 60));
    const end = Math.min(24, Math.max(start + 4, Math.ceil(latest / 60)));
    return { startHour: start, endHour: end };
  }, [entries]);

  const hours = useMemo(
    () => Array.from({ length: endHour - startHour + 1 }, (_, index) => startHour + index),
    [startHour, endHour],
  );

  const layouts = useMemo(
    () =>
      new Map(
        visibleDays.map((day) => [day, layoutDay(entries.filter((e) => e.days.includes(day)))]),
      ),
    [entries, visibleDays],
  );

  const totalHeight = (endHour - startHour) * HOUR_HEIGHT;
  const columns = `${TIME_COLUMN}px repeat(${visibleDays.length}, minmax(${MIN_DAY_COLUMN}px, 1fr))`;
  const nowTop =
    nowMinutes !== undefined && nowMinutes >= startHour * 60 && nowMinutes <= endHour * 60
      ? ((nowMinutes - startHour * 60) / 60) * HOUR_HEIGHT + 8
      : null;

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-border bg-surface">
      <div style={{ minWidth: TIME_COLUMN + visibleDays.length * MIN_DAY_COLUMN }}>
        {/* Header */}
        <div
          className="grid border-b border-border bg-surface"
          style={{ gridTemplateColumns: columns }}
        >
          <div className="sticky left-0 z-10 bg-surface" />
          {visibleDays.map((day) => {
            const isToday = day === todayName;
            return (
              <div key={day} className="px-2 py-3 text-center">
                <span
                  className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-sm font-semibold ${
                    isToday ? "bg-primary-fill text-white" : "text-foreground"
                  }`}
                >
                  <span className="hidden md:inline">{day}</span>
                  <span className="md:hidden">{day.slice(0, 3)}</span>
                </span>
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div className="relative grid" style={{ gridTemplateColumns: columns, height: totalHeight + 16 }}>
          {/* Time labels */}
          <div className="sticky left-0 z-20 border-r border-border bg-surface">
            {hours.map((hour, index) => (
              <div
                key={hour}
                className="absolute right-2 -translate-y-1/2 text-[11px] font-semibold tabular-nums text-muted"
                style={{ top: index * HOUR_HEIGHT + 8 }}
              >
                {hourLabel(hour)}
              </div>
            ))}
          </div>

          {visibleDays.map((day) => {
            const isToday = day === todayName;
            return (
              <div
                key={day}
                className={`relative border-r border-border/60 last:border-r-0 ${
                  isToday ? "bg-primary/[0.04]" : ""
                }`}
              >
                {hours.map((hour, index) => (
                  <div key={hour}>
                    <div
                      className="absolute inset-x-0 border-t border-border/70"
                      style={{ top: index * HOUR_HEIGHT + 8 }}
                    />
                    {index < hours.length - 1 ? (
                      <div
                        className="absolute inset-x-0 border-t border-dashed border-border/40"
                        style={{ top: index * HOUR_HEIGHT + HOUR_HEIGHT / 2 + 8 }}
                      />
                    ) : null}
                  </div>
                ))}

                {(layouts.get(day) ?? []).map(({ entry, start, end, lane, lanes }) => {
                  const top = ((start - startHour * 60) / 60) * HOUR_HEIGHT + 8;
                  const height = Math.max(30, ((end - start) / 60) * HOUR_HEIGHT - 3);
                  const accent = getEntryAccentColor(entry);
                  const width = 100 / lanes;

                  return (
                    <button
                      key={`${entry.id}-${day}`}
                      type="button"
                      className="absolute z-10 flex flex-col overflow-hidden rounded-xl border-l-4 px-2 py-1.5 text-left shadow-[var(--shadow-sm)] transition hover:z-20 hover:shadow-[var(--shadow-md)]"
                      style={{
                        top,
                        height,
                        left: `calc(${lane * width}% + 3px)`,
                        width: `calc(${width}% - 6px)`,
                        background: tintAccent(accent, 18),
                        borderLeftColor: accent,
                      }}
                      onClick={() => onEditEntry(entry)}
                      title={`${entry.title}\n${formatTimeRange(entry.start, entry.end)}${
                        entry.room ? `\n${entry.room}` : ""
                      }`}
                    >
                      <span className="text-[11px] font-semibold tabular-nums text-muted">
                        {formatTime(entry.start)}
                      </span>
                      <span
                        className={`text-[13px] font-semibold leading-tight text-foreground ${
                          height > 64 ? "line-clamp-2" : "line-clamp-1"
                        }`}
                      >
                        {entry.title}
                      </span>
                      {height > 80 && (entry.room || entry.code) ? (
                        <span className="mt-auto truncate text-[11px] font-medium text-muted">
                          {entry.room || entry.code}
                        </span>
                      ) : null}
                    </button>
                  );
                })}

                {isToday && nowTop !== null ? (
                  <div
                    className="pointer-events-none absolute inset-x-0 z-20 flex -translate-y-1/2 items-center"
                    style={{ top: nowTop }}
                  >
                    <span className="-ml-1 size-2.5 rounded-full bg-danger" />
                    <span className="h-0.5 flex-1 bg-danger" />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
