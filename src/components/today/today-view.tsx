"use client";

import { useMemo } from "react";
import {
  ArrowRight,
  BellRing,
  CalendarDays,
  CalendarPlus,
  Coffee,
  ImageDown,
  MapPin,
  PartyPopper,
} from "lucide-react";
import type { DayName, PublicHoliday, ScheduleEntry } from "@/lib/types";
import {
  dayNameForDate,
  entriesForDay,
  formatDuration,
  formatTime,
  formatTimeRange,
  timeToMinutes,
} from "@/lib/utils";
import { getEntryAccentColor } from "@/lib/wallpaper-renderer";
import { tintAccent } from "@/components/schedule/schedule-row";

function greetingFor(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function findNextSchoolDay(entries: ScheduleEntry[], now: Date) {
  for (let offset = 1; offset <= 7; offset += 1) {
    const date = new Date(now);
    date.setDate(now.getDate() + offset);
    const day = dayNameForDate(date);
    const first = entriesForDay(entries, day)[0];
    if (first) return { day, entry: first, offset };
  }
  return null;
}

export function TodayView({
  entries,
  now,
  todayName,
  holidayToday,
  onEditClass,
  onAddClass,
  onOpenSchedule,
  onOpenWallpaper,
  onOpenReminders,
}: {
  entries: ScheduleEntry[];
  now: Date;
  todayName: DayName;
  holidayToday?: PublicHoliday;
  onEditClass: (entry: ScheduleEntry) => void;
  onAddClass: () => void;
  onOpenSchedule: () => void;
  onOpenWallpaper: () => void;
  onOpenReminders: () => void;
}) {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const todayEntries = useMemo(() => entriesForDay(entries, todayName), [entries, todayName]);
  const current = todayEntries.find(
    (e) => nowMinutes >= timeToMinutes(e.start) && nowMinutes < timeToMinutes(e.end),
  );
  const next = todayEntries.find((e) => timeToMinutes(e.start) > nowMinutes);
  const nextSchoolDay = useMemo(() => findNextSchoolDay(entries, now), [entries, now]);

  const dateLabel = now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  if (entries.length === 0) {
    return (
      <div className="grid gap-5">
        <Greeting title="Welcome to SmartSched" subtitle={dateLabel} />
        <section className="neo-card overflow-hidden">
          <div className="bg-gradient-to-br from-primary-fill to-primary-strong px-5 py-6 text-white sm:px-6">
            <p className="text-sm font-semibold text-white/80">Get set up in 3 quick steps</p>
            <h2 className="mt-1 text-xl font-bold sm:text-2xl">Your whole class week, in one place.</h2>
          </div>
          <ol className="grid divide-y divide-border">
            <StepItem
              step={1}
              icon={<CalendarPlus aria-hidden="true" className="size-5" />}
              title="Add your classes"
              description="Subject, days, time and room. Use MWF or TTh to fill days fast."
              onClick={onAddClass}
              primary
            />
            <StepItem
              step={2}
              icon={<ImageDown aria-hidden="true" className="size-5" />}
              title="Make a lock-screen wallpaper"
              description="Pick your school colors and download a wallpaper of your schedule."
              onClick={onOpenWallpaper}
            />
            <StepItem
              step={3}
              icon={<BellRing aria-hidden="true" className="size-5" />}
              title="Turn on reminders"
              description="Get alerts before class, with holidays skipped automatically."
              onClick={onOpenReminders}
            />
          </ol>
        </section>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <Greeting title={greetingFor(now.getHours())} subtitle={dateLabel} />

      {holidayToday ? (
        <div
          className="flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3"
          role="status"
        >
          <PartyPopper aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{holidayToday.name}</p>
            <p className="mt-0.5 text-sm text-muted">No school today. Reminders are paused.</p>
          </div>
        </div>
      ) : null}

      <HeroCard
        current={current}
        next={next}
        nowMinutes={nowMinutes}
        hasClassesToday={todayEntries.length > 0}
        nextSchoolDay={nextSchoolDay}
      />

      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">Today&apos;s classes</h2>
          {todayEntries.length > 0 ? (
            <span className="text-sm text-muted">
              {todayEntries.length} class{todayEntries.length === 1 ? "" : "es"}
            </span>
          ) : null}
        </div>

        {todayEntries.length === 0 ? (
          <div className="neo-inset flex items-center gap-3 px-4 py-5">
            <Coffee aria-hidden="true" className="size-6 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">No classes on {todayName}</p>
              <p className="text-sm text-muted">Rest up, or catch up on assignments.</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-2.5 lg:grid-cols-2">
            {todayEntries.map((entry) => {
              const start = timeToMinutes(entry.start);
              const end = timeToMinutes(entry.end);
              const status =
                nowMinutes >= end ? "done" : nowMinutes >= start ? "now" : "upcoming";
              return (
                <TodayClassCard
                  key={entry.id}
                  entry={entry}
                  status={status}
                  onClick={() => onEditClass(entry)}
                />
              );
            })}
          </div>
        )}
      </section>

      <button
        type="button"
        className="neo-card flex items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:border-primary/40"
        onClick={onOpenSchedule}
      >
        <span className="flex items-center gap-3">
          <CalendarDays aria-hidden="true" className="size-5 text-primary" />
          <span className="text-sm font-semibold text-foreground">See your full week</span>
        </span>
        <ArrowRight aria-hidden="true" className="size-4 text-muted" />
      </button>
    </div>
  );
}

function TodayClassCard({
  entry,
  status,
  onClick,
}: {
  entry: ScheduleEntry;
  status: "now" | "done" | "upcoming";
  onClick: () => void;
}) {
  const accent = getEntryAccentColor(entry);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Edit ${entry.title}`}
      className={`flex w-full items-stretch overflow-hidden rounded-2xl border text-left transition active:opacity-70 ${
        status === "now" ? "border-primary/60 ring-2 ring-primary/15" : "border-border"
      } ${status === "done" ? "opacity-60" : ""}`}
      style={{ background: tintAccent(accent, 8) }}
    >
      <span className="w-1.5 shrink-0" style={{ backgroundColor: accent }} aria-hidden="true" />
      <span className="min-w-0 flex-1 px-4 py-3">
        <span className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted">
          <span className="tabular-nums">{formatTimeRange(entry.start, entry.end)}</span>
          {status === "now" ? (
            <span className="rounded-full bg-primary-fill px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
              Now
            </span>
          ) : status === "done" ? (
            <span>· Done</span>
          ) : null}
        </span>
        <span className="mt-0.5 block break-words text-base font-semibold text-foreground">
          {entry.title}
        </span>
        {entry.room || entry.code ? (
          <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[13px] text-muted">
            {entry.room ? (
              <span className="inline-flex items-center gap-1">
                <MapPin aria-hidden="true" className="size-3.5" />
                {entry.room}
              </span>
            ) : null}
            {entry.code ? <span>{entry.code}</span> : null}
          </span>
        ) : null}
      </span>
    </button>
  );
}

function Greeting({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-muted">{subtitle}</p>
      <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h1>
    </div>
  );
}

function HeroCard({
  current,
  next,
  nowMinutes,
  hasClassesToday,
  nextSchoolDay,
}: {
  current?: ScheduleEntry;
  next?: ScheduleEntry;
  nowMinutes: number;
  hasClassesToday: boolean;
  nextSchoolDay: ReturnType<typeof findNextSchoolDay>;
}) {
  const shell =
    "relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-fill to-primary-strong px-5 py-5 text-white shadow-[var(--shadow-md)] sm:px-6 sm:py-6";

  if (current) {
    const start = timeToMinutes(current.start);
    const end = timeToMinutes(current.end);
    const progress = Math.min(100, Math.max(0, ((nowMinutes - start) / (end - start)) * 100));
    return (
      <section className={shell} aria-live="polite">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-white/80">
          <span className="size-2 animate-pulse rounded-full bg-white" />
          Happening now
        </p>
        <h2 className="mt-2 break-words text-2xl font-bold leading-tight sm:text-3xl">{current.title}</h2>
        <HeroMeta entry={current} />
        <div className="mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-white/25">
            <div className="h-full rounded-full bg-white" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1.5 text-sm font-medium text-white/85">
            Ends in {formatDuration(end - nowMinutes)} · {formatTime(current.end)}
          </p>
        </div>
      </section>
    );
  }

  if (next) {
    return (
      <section className={shell}>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/80">Up next</p>
        <h2 className="mt-2 break-words text-2xl font-bold leading-tight sm:text-3xl">{next.title}</h2>
        <HeroMeta entry={next} />
        <p className="mt-4 inline-flex rounded-full bg-white/20 px-3 py-1 text-sm font-semibold">
          Starts in {formatDuration(timeToMinutes(next.start) - nowMinutes)}
        </p>
      </section>
    );
  }

  return (
    <section className={shell}>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/80">
        {hasClassesToday ? "All done for today" : "Free day"}
      </p>
      <h2 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">
        {hasClassesToday ? "Nice work. You're finished!" : "No classes today"}
      </h2>
      {nextSchoolDay ? (
        <p className="mt-3 text-sm leading-6 text-white/85">
          Next up: <strong className="text-white">{nextSchoolDay.entry.title}</strong>{" "}
          {nextSchoolDay.offset === 1 ? "tomorrow" : `on ${nextSchoolDay.day}`} at{" "}
          {formatTime(nextSchoolDay.entry.start)}
          {nextSchoolDay.entry.room ? ` · ${nextSchoolDay.entry.room}` : ""}
        </p>
      ) : null}
    </section>
  );
}

function HeroMeta({ entry }: { entry: ScheduleEntry }) {
  return (
    <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium text-white/90">
      <span className="tabular-nums">{formatTimeRange(entry.start, entry.end)}</span>
      {entry.room ? (
        <span className="inline-flex items-center gap-1">
          <MapPin aria-hidden="true" className="size-4" />
          {entry.room}
        </span>
      ) : null}
      {entry.code ? <span>{entry.code}</span> : null}
    </p>
  );
}

function StepItem({
  step,
  icon,
  title,
  description,
  onClick,
  primary = false,
}: {
  step: number;
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <li>
      <button
        type="button"
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-surface-2 sm:px-6"
        onClick={onClick}
      >
        <span
          className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${
            primary ? "bg-primary-fill text-white" : "bg-primary/10 text-primary"
          }`}
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-bold uppercase tracking-wider text-muted">Step {step}</span>
          <span className="block font-semibold text-foreground">{title}</span>
          <span className="mt-0.5 block text-sm leading-6 text-muted">{description}</span>
        </span>
        <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-muted" />
      </button>
    </li>
  );
}
