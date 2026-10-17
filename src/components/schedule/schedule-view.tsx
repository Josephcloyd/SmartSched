"use client";

import { Fragment, useMemo, useRef } from "react";
import { CalendarPlus, CalendarRange, LayoutGrid, List, MapPin, Plus } from "lucide-react";
import { days, type DayName, type ScheduleEntry, type ScheduleViewMode } from "@/lib/types";
import { entriesForDay, formatTime, formatTimeRange, timeToMinutes } from "@/lib/utils";
import { getEntryAccentColor } from "@/lib/wallpaper-renderer";
import { EmptyState } from "@/components/ui/form-controls";
import { FreeGap, ScheduleRow, tintAccent } from "@/components/schedule/schedule-row";
import { TimetableGrid } from "@/components/schedule/timetable-grid";

const viewOptions: { id: ScheduleViewMode; label: string; icon: typeof List }[] = [
  { id: "day", label: "Day", icon: List },
  { id: "week", label: "Week", icon: CalendarRange },
  { id: "grid", label: "Grid", icon: LayoutGrid },
];

export function ScheduleView({
  entries,
  viewMode,
  onViewModeChange,
  selectedDay,
  onSelectDay,
  todayName,
  nowMinutes,
  onAdd,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  entries: ScheduleEntry[];
  viewMode: ScheduleViewMode;
  onViewModeChange: (mode: ScheduleViewMode) => void;
  selectedDay: DayName;
  onSelectDay: (day: DayName) => void;
  todayName?: DayName;
  nowMinutes?: number;
  onAdd: (day?: DayName) => void;
  onEdit: (entry: ScheduleEntry) => void;
  onDuplicate: (entry: ScheduleEntry) => void;
  onDelete: (entry: ScheduleEntry) => void;
}) {
  // Weekends stay available, but only show up in week/grid views when they have classes.
  const weekDays = useMemo(
    () =>
      days.filter(
        (day) =>
          (day !== "Saturday" && day !== "Sunday") || entriesForDay(entries, day).length > 0,
      ),
    [entries],
  );

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">My schedule</h1>
          <p className="mt-0.5 text-sm text-muted">
            {entries.length === 0
              ? "Add your classes to build your week."
              : `${entries.length} class${entries.length === 1 ? "" : "es"} · tap any class to edit`}
          </p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <div className="segmented w-full sm:w-auto" role="group" aria-label="Schedule view">
            {viewOptions.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className="flex-1 justify-center sm:flex-none"
                aria-pressed={viewMode === id}
                onClick={() => onViewModeChange(id)}
              >
                <Icon aria-hidden="true" className="size-4" />
                {label}
              </button>
            ))}
          </div>
          <button type="button" className="primary-button hidden md:inline-flex" onClick={() => onAdd()}>
            <Plus aria-hidden="true" className="size-4" />
            Add class
          </button>
        </div>
      </div>

      {viewMode === "day" ? (
        <DayView
          entries={entries}
          selectedDay={selectedDay}
          onSelectDay={onSelectDay}
          todayName={todayName}
          nowMinutes={nowMinutes}
          onAdd={onAdd}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />
      ) : viewMode === "week" ? (
        <WeekView entries={entries} weekDays={weekDays} todayName={todayName} onAdd={onAdd} onEdit={onEdit} />
      ) : (
        <>
          <TimetableGrid
            entries={entries}
            visibleDays={weekDays}
            todayName={todayName}
            nowMinutes={nowMinutes}
            onEditEntry={onEdit}
          />
          <p className="text-center text-xs text-muted sm:hidden">Swipe sideways to see the whole week.</p>
        </>
      )}
    </div>
  );
}

function DayView({
  entries,
  selectedDay,
  onSelectDay,
  todayName,
  nowMinutes,
  onAdd,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  entries: ScheduleEntry[];
  selectedDay: DayName;
  onSelectDay: (day: DayName) => void;
  todayName?: DayName;
  nowMinutes?: number;
  onAdd: (day?: DayName) => void;
  onEdit: (entry: ScheduleEntry) => void;
  onDuplicate: (entry: ScheduleEntry) => void;
  onDelete: (entry: ScheduleEntry) => void;
}) {
  const dayEntries = useMemo(() => entriesForDay(entries, selectedDay), [entries, selectedDay]);
  const isToday = selectedDay === todayName;
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  function shiftDay(delta: number) {
    const index = days.indexOf(selectedDay);
    onSelectDay(days[(index + delta + days.length) % days.length]);
  }

  // Horizontal swipe on the card flips to the previous/next day; vertical scrolling is left alone.
  function handleTouchEnd(event: React.TouchEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      shiftDay(dx < 0 ? 1 : -1);
    }
  }

  return (
    <div
      className="neo-card p-3 sm:p-5"
      onTouchStart={(event) => {
        const touch = event.touches[0];
        touchStart.current = { x: touch.clientX, y: touch.clientY };
      }}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="sticky top-14 z-10 -mx-3 -mt-3 grid grid-cols-7 gap-1 rounded-t-[18px] bg-surface/95 px-3 pb-2 pt-3 backdrop-blur sm:-mx-5 sm:-mt-5 sm:gap-2 sm:rounded-t-[20px] sm:px-5 sm:pt-5 md:top-16"
        role="tablist"
        aria-label="Choose a day"
      >
        {days.map((day) => {
          const count = entriesForDay(entries, day).length;
          const selected = day === selectedDay;
          return (
            <button
              key={day}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-label={`${day}, ${count} class${count === 1 ? "" : "es"}`}
              onClick={() => onSelectDay(day)}
              className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-sm font-semibold transition ${
                selected
                  ? "bg-primary-fill text-white shadow-[var(--shadow-md)]"
                  : "text-muted hover:bg-surface-2 hover:text-foreground"
              }`}
            >
              <span>{day.slice(0, 3)}</span>
              <span
                className={`text-[11px] font-bold tabular-nums ${
                  selected ? "text-white/85" : count > 0 ? "text-primary" : "text-muted/50"
                }`}
              >
                {count > 0 ? count : "–"}
              </span>
              {day === todayName ? (
                <span
                  className={`absolute top-1.5 right-1.5 size-1.5 rounded-full ${
                    selected ? "bg-white" : "bg-primary"
                  }`}
                  aria-hidden="true"
                />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2 px-1 sm:mt-4">
        <h2 className="text-lg font-semibold text-foreground">
          {selectedDay}
          {isToday ? <span className="ml-2 text-sm font-medium text-primary">Today</span> : null}
        </h2>
        {dayEntries.length > 0 ? (
          <p className="text-sm text-muted">
            {dayEntries.length} class{dayEntries.length === 1 ? "" : "es"} ·{" "}
            {formatTime(dayEntries[0].start)} – {formatTime(dayEntries[dayEntries.length - 1].end)}
          </p>
        ) : null}
      </div>

      <div key={selectedDay} className="animate-fade-in mt-3 grid gap-2.5">
        {dayEntries.length === 0 ? (
          <EmptyState
            icon={<CalendarPlus aria-hidden="true" className="size-6" />}
            title={`Nothing on ${selectedDay}`}
            description="Free day! Or add a class if you have one."
            action={
              <button type="button" className="secondary-button" onClick={() => onAdd(selectedDay)}>
                <Plus aria-hidden="true" className="size-4" />
                Add class on {selectedDay.slice(0, 3)}
              </button>
            }
          />
        ) : (
          dayEntries.map((entry, index) => {
            const previous = dayEntries[index - 1];
            const gap = previous ? timeToMinutes(entry.start) - timeToMinutes(previous.end) : 0;
            const isNow =
              isToday &&
              nowMinutes !== undefined &&
              nowMinutes >= timeToMinutes(entry.start) &&
              nowMinutes < timeToMinutes(entry.end);

            return (
              <Fragment key={entry.id}>
                {gap >= 15 ? <FreeGap minutes={gap} label={gap >= 45 ? "Break" : "Free time"} /> : null}
                <ScheduleRow
                  entry={entry}
                  allEntries={entries}
                  isNow={isNow}
                  onEdit={() => onEdit(entry)}
                  onDuplicate={() => onDuplicate(entry)}
                  onDelete={() => onDelete(entry)}
                />
              </Fragment>
            );
          })
        )}
      </div>

      <p className="mt-4 text-center text-xs text-muted md:hidden">
        Swipe left or right to switch days
      </p>
    </div>
  );
}

function WeekView({
  entries,
  weekDays,
  todayName,
  onAdd,
  onEdit,
}: {
  entries: ScheduleEntry[];
  weekDays: DayName[];
  todayName?: DayName;
  onAdd: (day?: DayName) => void;
  onEdit: (entry: ScheduleEntry) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {weekDays.map((day) => {
        const dayEntries = entriesForDay(entries, day);
        const isToday = day === todayName;
        return (
          <section
            key={day}
            className={`neo-card p-4 ${isToday ? "ring-2 ring-primary/30" : ""}`}
            aria-label={day}
          >
            <header className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-foreground">
                {day}
                {isToday ? (
                  <span className="ml-2 rounded-full bg-primary-fill px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                    Today
                  </span>
                ) : null}
              </h2>
              <span className="text-xs font-semibold text-muted">
                {dayEntries.length} class{dayEntries.length === 1 ? "" : "es"}
              </span>
            </header>
            {dayEntries.length === 0 ? (
              <button
                type="button"
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-4 text-sm font-medium text-muted transition hover:border-primary/50 hover:text-primary"
                onClick={() => onAdd(day)}
              >
                <Plus aria-hidden="true" className="size-4" />
                Add class
              </button>
            ) : (
              <ul className="grid gap-2">
                {dayEntries.map((entry) => {
                  const accent = getEntryAccentColor(entry);
                  return (
                    <li key={entry.id}>
                      <button
                        type="button"
                        className="flex w-full items-stretch gap-3 overflow-hidden rounded-xl text-left transition hover:brightness-[0.98]"
                        style={{ background: tintAccent(accent, 10) }}
                        onClick={() => onEdit(entry)}
                      >
                        <span className="w-1 shrink-0" style={{ backgroundColor: accent }} />
                        <span className="min-w-0 flex-1 py-2 pr-3">
                          <span className="block text-xs font-semibold tabular-nums text-muted">
                            {formatTimeRange(entry.start, entry.end)}
                          </span>
                          <span className="block break-words text-sm font-semibold leading-snug text-foreground">
                            {entry.title}
                          </span>
                          {entry.room ? (
                            <span className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                              <MapPin aria-hidden="true" className="size-3" />
                              {entry.room}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
