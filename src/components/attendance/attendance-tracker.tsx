"use client";

import { useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  HelpCircle,
  RotateCcw,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import {
  attendanceStatuses,
  type AttendanceRecord,
  type AttendanceStatus,
  type DayName,
  type ScheduleEntry,
} from "@/lib/types";
import { formatTime } from "@/lib/utils";
import { getEntryAccentColor } from "@/lib/wallpaper-renderer";
import { Panel } from "@/components/ui/form-controls";

const statusIcons: Record<AttendanceStatus, typeof CheckCircle2> = {
  Present: CheckCircle2,
  Late: Clock,
  Absent: XCircle,
  Excused: HelpCircle,
  Suspended: AlertTriangle,
};

const statusColors: Record<AttendanceStatus, { bg: string; text: string; border: string }> = {
  Present: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-500/40",
  },
  Late: {
    bg: "bg-amber-500/15",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-500/40",
  },
  Absent: {
    bg: "bg-rose-500/15",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-500/40",
  },
  Excused: {
    bg: "bg-sky-500/15",
    text: "text-sky-700 dark:text-sky-300",
    border: "border-sky-500/40",
  },
  Suspended: {
    bg: "bg-purple-500/15",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-500/40",
  },
};

export function AttendanceTracker({
  entries,
  records,
  todayName,
  todayDateKey,
  onRecordAttendance,
  onClearAttendance,
}: {
  entries: ScheduleEntry[];
  records: AttendanceRecord[];
  todayName: DayName;
  todayDateKey: string;
  onRecordAttendance: (entryId: string, status: AttendanceStatus) => void;
  onClearAttendance: () => void;
}) {
  const todayEntries = useMemo(
    () => entries.filter((e) => e.days.includes(todayName)),
    [entries, todayName],
  );

  // Group attendance records by entry
  const statsByEntry = useMemo(() => {
    return entries.map((entry) => {
      const entryRecords = records.filter((r) => r.entryId === entry.id);
      const presents = entryRecords.filter((r) => r.status === "Present").length;
      const lates = entryRecords.filter((r) => r.status === "Late").length;
      const absences = entryRecords.filter((r) => r.status === "Absent").length;
      const excused = entryRecords.filter((r) => r.status === "Excused").length;
      const suspended = entryRecords.filter((r) => r.status === "Suspended").length;
      const totalLogged = entryRecords.length;

      // Academic standard: 3 lates count as 1 absence
      const cutsUsed = absences + Math.floor(lates / 3);
      const maxCuts = entry.maxAbsences || 3;
      const cutsRemaining = Math.max(0, maxCuts - cutsUsed);
      const isCritical = cutsRemaining <= 1 && totalLogged > 0;
      const isExceeded = cutsUsed >= maxCuts && totalLogged > 0;

      const rate = totalLogged > 0
        ? Math.round(((presents + excused + lates * 0.7) / totalLogged) * 100)
        : 100;

      return {
        entry,
        presents,
        lates,
        absences,
        excused,
        suspended,
        cutsUsed,
        maxCuts,
        cutsRemaining,
        isCritical,
        isExceeded,
        rate,
        totalLogged,
      };
    });
  }, [entries, records]);

  // Overall attendance rate
  const overallRate = useMemo(() => {
    if (records.length === 0) return 100;
    const good = records.filter(
      (r) => r.status === "Present" || r.status === "Excused" || r.status === "Late",
    ).length;
    return Math.round((good / records.length) * 100);
  }, [records]);

  return (
    <div className="grid gap-4 sm:gap-5">
      {/* Today's Check-In Panel */}
      <Panel
        title={`Today's Attendance Check-in (${todayName})`}
        action={
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
              {overallRate}% Overall
            </span>
            {records.length > 0 ? (
              <button
                type="button"
                className="text-xs font-semibold text-muted hover:text-danger flex items-center gap-1"
                onClick={onClearAttendance}
                title="Reset all attendance history"
              >
                <RotateCcw aria-hidden="true" className="size-3.5" />
                Reset
              </button>
            ) : null}
          </div>
        }
      >
        {todayEntries.length === 0 ? (
          <div className="neo-inset p-5 text-center text-sm text-muted">
            No classes scheduled for today ({todayName}). Enjoy your free day!
          </div>
        ) : (
          <div className="grid gap-3">
            {todayEntries.map((entry) => {
              const todayRecord = records.find(
                (r) => r.entryId === entry.id && r.date === todayDateKey,
              );
              const accent = getEntryAccentColor(entry);

              return (
                <div
                  key={entry.id}
                  className="rounded-xl border border-border bg-surface p-3 sm:p-4 shadow-sm"
                  style={{ borderLeftWidth: "5px", borderLeftColor: accent }}
                >
                  <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted">
                          {formatTime(entry.start)} – {formatTime(entry.end)}
                        </span>
                        {entry.code ? (
                          <span className="rounded-sm bg-surface-2 px-1.5 py-0.5 text-xs font-semibold text-foreground">
                            {entry.code}
                          </span>
                        ) : null}
                      </div>
                      <h4 className="mt-0.5 text-base font-semibold text-foreground">
                        {entry.title}
                      </h4>
                      {entry.room ? (
                        <p className="text-xs text-muted">{entry.room}</p>
                      ) : null}
                    </div>

                    {/* Quick status selector */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {attendanceStatuses.map((status) => {
                        const isSelected = todayRecord?.status === status;
                        const colors = statusColors[status];
                        const Icon = statusIcons[status];

                        return (
                          <button
                            key={status}
                            type="button"
                            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                              isSelected
                                ? `${colors.bg} ${colors.text} ${colors.border} ring-2 ring-primary/20 font-bold`
                                : "border-border/80 bg-surface-2 text-muted hover:border-primary/50"
                            }`}
                            onClick={() => onRecordAttendance(entry.id, status)}
                          >
                            <Icon aria-hidden="true" className="size-3.5" />
                            {status}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {/* Absence & Cut Monitor */}
      <Panel title="Subject Absence & Cut Counter">
        <div className="grid gap-3 sm:grid-cols-2">
          {statsByEntry.map((stat) => (
            <div
              key={stat.entry.id}
              className={`rounded-xl border p-3.5 shadow-sm ${
                stat.isExceeded
                  ? "border-rose-500/60 bg-rose-50/25 dark:bg-rose-950/20"
                  : stat.isCritical
                    ? "border-amber-500/60 bg-amber-50/25 dark:bg-amber-950/20"
                    : "border-border bg-surface"
              }`}
            >
              <div className="flex min-w-0 flex-col items-start gap-2 sm:flex-row sm:justify-between">
                <div className="min-w-0 max-w-full">
                  <h4 className="break-words text-sm font-semibold leading-snug text-foreground sm:text-base">
                    {stat.entry.title}
                  </h4>
                  <p className="text-xs text-muted">
                    {[stat.entry.code, stat.entry.room].filter(Boolean).join(" • ") || stat.entry.type}
                  </p>
                </div>
                {stat.isExceeded ? (
                  <span className="inline-flex max-w-full shrink-0 items-center gap-1 rounded-md bg-rose-500/20 px-2 py-0.5 text-xs font-bold text-rose-700 dark:text-rose-300">
                    <ShieldAlert aria-hidden="true" className="size-3.5" />
                    Cuts Exceeded
                  </span>
                ) : stat.isCritical ? (
                  <span className="inline-flex max-w-full shrink-0 items-center gap-1 rounded-md bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                    <AlertTriangle aria-hidden="true" className="size-3.5" />
                    {stat.cutsRemaining} Cut Left
                  </span>
                ) : (
                  <span className="max-w-full shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {stat.cutsRemaining} Cuts Left
                  </span>
                )}
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted">
                  <span>Absences: {stat.cutsUsed} / {stat.maxCuts}</span>
                  <span>{stat.rate}% Attended</span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-2 border border-border/50">
                  <div
                    className={`h-full transition-all duration-300 ${
                      stat.isExceeded
                        ? "bg-rose-500"
                        : stat.isCritical
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                    }`}
                    style={{
                      width: `${Math.min(100, Math.max(8, (stat.cutsUsed / stat.maxCuts) * 100))}%`,
                    }}
                  />
                </div>
              </div>

              {/* Attendance breakdown pills */}
              <div className="mt-2.5 flex flex-wrap gap-1.5 text-[11px] text-muted">
                <span className="rounded px-1.5 py-0.5 bg-surface-2">
                  Present: {stat.presents}
                </span>
                <span className="rounded px-1.5 py-0.5 bg-surface-2">
                  Late: {stat.lates}
                </span>
                <span className="rounded px-1.5 py-0.5 bg-surface-2">
                  Absent: {stat.absences}
                </span>
                {stat.excused > 0 ? (
                  <span className="rounded px-1.5 py-0.5 bg-surface-2">
                    Excused: {stat.excused}
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
