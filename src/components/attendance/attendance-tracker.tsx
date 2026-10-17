"use client";

import { useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ClipboardCheck,
  HelpCircle,
  MapPin,
  RotateCcw,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import {
  attendanceStatuses,
  type AttendanceRecord,
  type AttendanceStatus,
  type ScheduleEntry,
} from "@/lib/types";
import { formatTimeRange } from "@/lib/utils";
import { getEntryAccentColor } from "@/lib/wallpaper-renderer";
import { EmptyState, Metric } from "@/components/ui/form-controls";
import { tintAccent } from "@/components/schedule/schedule-row";

const statusIcons: Record<AttendanceStatus, typeof CheckCircle2> = {
  Present: CheckCircle2,
  Late: Clock,
  Absent: XCircle,
  Excused: HelpCircle,
  Suspended: AlertTriangle,
};

// Shorter labels for the 5-across check-in row on narrow phones.
const compactStatusLabels: Partial<Record<AttendanceStatus, string>> = {
  Suspended: "No class",
};

const statusColors: Record<AttendanceStatus, string> = {
  Present: "border-emerald-500/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  Late: "border-amber-500/50 bg-amber-500/15 text-amber-700 dark:text-amber-300",
  Absent: "border-rose-500/50 bg-rose-500/15 text-rose-700 dark:text-rose-300",
  Excused: "border-sky-500/50 bg-sky-500/15 text-sky-700 dark:text-sky-300",
  Suspended: "border-purple-500/50 bg-purple-500/15 text-purple-700 dark:text-purple-300",
};

export type AttendanceStat = {
  entry: ScheduleEntry;
  presents: number;
  lates: number;
  absences: number;
  excused: number;
  cutsUsed: number;
  maxCuts: number;
  cutsRemaining: number;
  isCritical: boolean;
  isExceeded: boolean;
  rate: number;
  totalLogged: number;
};

export function computeAttendanceStats(
  entries: ScheduleEntry[],
  records: AttendanceRecord[],
): AttendanceStat[] {
  return entries.map((entry) => {
    const entryRecords = records.filter((r) => r.entryId === entry.id);
    const count = (status: AttendanceStatus) =>
      entryRecords.filter((r) => r.status === status).length;
    const presents = count("Present");
    const lates = count("Late");
    const absences = count("Absent");
    const excused = count("Excused");
    // Suspended classes didn't happen, so they don't count for or against the student.
    const totalLogged = entryRecords.length - count("Suspended");

    // Common school rule: 3 lates count as 1 absence.
    const cutsUsed = absences + Math.floor(lates / 3);
    const maxCuts = entry.maxAbsences || 3;
    const cutsRemaining = Math.max(0, maxCuts - cutsUsed);

    return {
      entry,
      presents,
      lates,
      absences,
      excused,
      cutsUsed,
      maxCuts,
      cutsRemaining,
      isCritical: cutsUsed > 0 && cutsRemaining <= 1,
      isExceeded: cutsUsed >= maxCuts,
      rate:
        totalLogged > 0
          ? Math.round(((presents + excused + lates * 0.7) / totalLogged) * 100)
          : 100,
      totalLogged,
    };
  });
}

export function CheckInButtons({
  entry,
  current,
  onRecord,
}: {
  entry: ScheduleEntry;
  current?: AttendanceStatus;
  onRecord: (entryId: string, status: AttendanceStatus) => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-1.5" role="group" aria-label={`Attendance for ${entry.title}`}>
      {attendanceStatuses.map((status) => {
        const selected = current === status;
        const Icon = statusIcons[status];
        return (
          <button
            key={status}
            type="button"
            aria-pressed={selected}
            className={`flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-xl border px-0.5 text-[11px] font-semibold transition active:scale-95 sm:min-h-14 sm:text-xs ${
              selected
                ? statusColors[status]
                : "border-border bg-surface text-muted hover:border-primary/40 hover:text-foreground"
            }`}
            aria-label={status}
            onClick={() => {
              if ("vibrate" in navigator) navigator.vibrate(12);
              onRecord(entry.id, status);
            }}
          >
            <Icon aria-hidden="true" className="size-5 sm:size-[18px]" />
            <span className="leading-tight sm:hidden">{compactStatusLabels[status] ?? status}</span>
            <span className="hidden leading-tight sm:inline">{status}</span>
          </button>
        );
      })}
    </div>
  );
}

export function CheckInCard({
  entry,
  current,
  status,
  onRecord,
}: {
  entry: ScheduleEntry;
  current?: AttendanceStatus;
  status?: "now" | "done" | "upcoming";
  onRecord: (entryId: string, status: AttendanceStatus) => void;
}) {
  const accent = getEntryAccentColor(entry);

  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-surface ${
        status === "now" ? "border-primary/60 ring-2 ring-primary/15" : "border-border"
      }`}
    >
      <div className="flex items-stretch" style={{ background: tintAccent(accent, 8) }}>
        <span className="w-1.5 shrink-0" style={{ backgroundColor: accent }} aria-hidden="true" />
        <div className="min-w-0 flex-1 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted">
            <span className="tabular-nums">{formatTimeRange(entry.start, entry.end)}</span>
            {status === "now" ? (
              <span className="rounded-full bg-primary-fill px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                Now
              </span>
            ) : status === "done" ? (
              <span className="text-muted/80">· Done</span>
            ) : null}
          </div>
          <h3 className="mt-0.5 break-words text-base font-semibold text-foreground">{entry.title}</h3>
          {entry.room || entry.code ? (
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[13px] text-muted">
              {entry.room ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin aria-hidden="true" className="size-3.5" />
                  {entry.room}
                </span>
              ) : null}
              {entry.code ? <span>{entry.code}</span> : null}
            </p>
          ) : null}
        </div>
      </div>
      <div className="border-t border-border/70 p-2.5">
        <CheckInButtons entry={entry} current={current} onRecord={onRecord} />
      </div>
    </article>
  );
}

export function AttendanceOverview({
  entries,
  records,
  onClearAttendance,
  onAddClass,
}: {
  entries: ScheduleEntry[];
  records: AttendanceRecord[];
  onClearAttendance: () => void;
  onAddClass: () => void;
}) {
  const stats = useMemo(() => computeAttendanceStats(entries, records), [entries, records]);
  const counted = records.filter((r) => r.status !== "Suspended");
  const overallRate =
    counted.length === 0
      ? 100
      : Math.round(
          (counted.filter((r) => r.status !== "Absent").length / counted.length) * 100,
        );
  const atRisk = stats.filter((s) => s.isCritical || s.isExceeded).length;
  // Show subjects that need attention first.
  const sorted = [...stats].sort(
    (a, b) => Number(b.isExceeded) - Number(a.isExceeded) || Number(b.isCritical) - Number(a.isCritical),
  );

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Attendance</h1>
        <p className="mt-0.5 text-sm text-muted">
          Track your absences per subject. 3 lates count as 1 absence.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <Metric
          label="Overall"
          value={`${overallRate}%`}
          tone={overallRate >= 90 ? "good" : overallRate >= 75 ? "warn" : "bad"}
        />
        <Metric label="Check-ins" value={String(records.length)} />
        <Metric label="At risk" value={String(atRisk)} tone={atRisk > 0 ? "bad" : "default"} />
      </div>

      {entries.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck aria-hidden="true" className="size-6" />}
          title="No subjects yet"
          description="Add your classes first, then check in from the Today tab."
          action={
            <button type="button" className="primary-button" onClick={onAddClass}>
              Add a class
            </button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {sorted.map((stat) => (
            <SubjectAttendanceCard key={stat.entry.id} stat={stat} />
          ))}
        </div>
      )}

      {records.length > 0 ? (
        <button
          type="button"
          className="secondary-button justify-self-start text-danger hover:!border-danger/50"
          onClick={onClearAttendance}
        >
          <RotateCcw aria-hidden="true" className="size-4" />
          Reset attendance history
        </button>
      ) : null}
    </div>
  );
}

function SubjectAttendanceCard({ stat }: { stat: AttendanceStat }) {
  const accent = getEntryAccentColor(stat.entry);
  const barColor = stat.isExceeded ? "bg-rose-500" : stat.isCritical ? "bg-amber-500" : "bg-emerald-500";

  return (
    <article
      className={`neo-card p-4 ${
        stat.isExceeded
          ? "!border-rose-400/70 dark:!border-rose-500/50"
          : stat.isCritical
            ? "!border-amber-400/70 dark:!border-amber-500/50"
            : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
          <div className="min-w-0">
            <h3 className="break-words text-base font-semibold leading-snug text-foreground">
              {stat.entry.title}
            </h3>
            <p className="text-xs text-muted">
              {[stat.entry.code, stat.entry.room].filter(Boolean).join(" · ") || stat.entry.type}
            </p>
          </div>
        </div>
        {stat.isExceeded ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-500/15 px-2.5 py-1 text-xs font-bold text-rose-700 dark:text-rose-300">
            <ShieldAlert aria-hidden="true" className="size-3.5" />
            Limit reached
          </span>
        ) : stat.isCritical ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-300">
            <AlertTriangle aria-hidden="true" className="size-3.5" />
            {stat.cutsRemaining} left
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-emerald-500/12 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
            {stat.cutsRemaining} left
          </span>
        )}
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-semibold text-foreground">
            {stat.cutsUsed} <span className="font-normal text-muted">of {stat.maxCuts} absences used</span>
          </span>
          <span className="text-xs font-semibold text-muted">{stat.rate}% attended</span>
        </div>
        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${Math.min(100, (stat.cutsUsed / stat.maxCuts) * 100)}%` }}
          />
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-4 gap-1.5 text-center">
        {(
          [
            ["Present", stat.presents],
            ["Late", stat.lates],
            ["Absent", stat.absences],
            ["Excused", stat.excused],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="rounded-lg bg-surface-2 py-1.5">
            <dt className="text-[11px] text-muted">{label}</dt>
            <dd className="text-sm font-bold tabular-nums text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
