"use client";

import { ChangeEvent, useRef, useState } from "react";
import {
  Bell,
  BellRing,
  CalendarClock,
  Check,
  FileDown,
  ImageDown,
  MapPin,
  MessageCircle,
  MoonStar,
  Palmtree,
  Plus,
  Share2,
  Smartphone,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type {
  CustomBreak,
  HolidayCalendar,
  PublicHoliday,
  ScheduleSettings,
} from "@/lib/types";
import { popularCountries } from "@/lib/holidays";
import { uid } from "@/lib/utils";
import { Field, Panel, ToggleControl } from "@/components/ui/form-controls";
import { SchoolPalettePicker } from "@/components/wallpaper/wallpaper-modal";

function formatShortDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return dateKey;
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function MoreView({
  settings,
  setSettings,
  theme,
  onThemeChange,
  notificationState,
  onEnableNotifications,
  onExportCalendar,
  onOpenWallpaper,
  onDownloadWallpaper,
  onShareWallpaper,
  canShare,
  holidayCalendar,
  setHolidayCalendar,
  holidayLoading,
  nextHolidays,
  onDetectHolidays,
  onSelectCountry,
  onExportBackup,
  onImportBackup,
  onClearAll,
  entryCount,
  onOpenFeedback,
  onMessage,
}: {
  settings: ScheduleSettings;
  setSettings: (updater: (current: ScheduleSettings) => ScheduleSettings) => void;
  theme: "light" | "dark";
  onThemeChange: (theme: "light" | "dark") => void;
  notificationState: NotificationPermission | "unsupported";
  onEnableNotifications: () => void;
  onExportCalendar: () => void;
  onOpenWallpaper: () => void;
  onDownloadWallpaper: () => void;
  onShareWallpaper: () => void;
  canShare: boolean;
  holidayCalendar: HolidayCalendar;
  setHolidayCalendar: (updater: (current: HolidayCalendar) => HolidayCalendar) => void;
  holidayLoading: boolean;
  nextHolidays: PublicHoliday[];
  onDetectHolidays: () => void;
  onSelectCountry: (countryCode: string) => void;
  onExportBackup: () => void;
  onImportBackup: (event: ChangeEvent<HTMLInputElement>) => void;
  onClearAll: () => void;
  entryCount: number;
  onOpenFeedback: () => void;
  onMessage: (text: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">More</h1>
        <p className="mt-0.5 text-sm text-muted">Wallpaper, reminders, holidays and your data.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <div className="grid gap-4">
          <Panel
            title="Lock-screen wallpaper"
            description="Turn your schedule into a phone or desktop wallpaper."
            icon={<Smartphone aria-hidden="true" className="size-5" />}
          >
            <div className="grid gap-4">
              <SchoolPalettePicker
                selectedId={settings.schoolPaletteId}
                onChange={(palette) =>
                  setSettings((current) => ({
                    ...current,
                    schoolPaletteId: palette.id,
                    wallpaperStyle: "School Palette",
                  }))
                }
              />
              <div className="grid gap-2">
                <button type="button" className="primary-button" onClick={onOpenWallpaper}>
                  <ImageDown aria-hidden="true" className="size-4" />
                  Preview & customize
                </button>
                <div className="flex gap-2">
                  <button type="button" className="secondary-button flex-1" onClick={onDownloadWallpaper}>
                    <FileDown aria-hidden="true" className="size-4" />
                    Quick download
                  </button>
                  {canShare ? (
                    <button type="button" className="secondary-button flex-1" onClick={onShareWallpaper}>
                      <Share2 aria-hidden="true" className="size-4" />
                      Share
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </Panel>

          <section id="reminders" className="scroll-mt-24">
            <Panel
              title="Class reminders"
              description="Never miss the start of class."
              icon={<BellRing aria-hidden="true" className="size-5" />}
            >
              <div className="grid gap-3">
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface-2/60 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">In-app notifications</p>
                    <p className="text-xs leading-5 text-muted">
                      Works while SmartSched is open or installed.
                    </p>
                  </div>
                  {notificationState === "granted" ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      <Check aria-hidden="true" className="size-3.5" />
                      On
                    </span>
                  ) : notificationState === "unsupported" ? (
                    <span className="shrink-0 text-xs font-semibold text-muted">Not supported</span>
                  ) : (
                    <button
                      type="button"
                      className="secondary-button min-h-10 shrink-0"
                      onClick={onEnableNotifications}
                    >
                      <Bell aria-hidden="true" className="size-4" />
                      Turn on
                    </button>
                  )}
                </div>
                <div className="rounded-2xl border border-border bg-surface-2/60 px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">Phone calendar alarms</p>
                  <p className="text-xs leading-5 text-muted">
                    Download a calendar file and open it on your phone. Alarms work even when the
                    app is closed, and holidays and breaks are skipped.
                  </p>
                  <button type="button" className="secondary-button mt-3 w-full" onClick={onExportCalendar}>
                    <CalendarClock aria-hidden="true" className="size-4" />
                    Download alarms (.ics)
                  </button>
                </div>
              </div>
            </Panel>
          </section>

          <Panel title="Appearance" icon={<MoonStar aria-hidden="true" className="size-5" />}>
            <ToggleControl
              label="Dark mode"
              description="Easier on the eyes at night."
              checked={theme === "dark"}
              onChange={(checked) => onThemeChange(checked ? "dark" : "light")}
            />
          </Panel>
        </div>

        <div className="grid gap-4">
          <HolidaysPanel
            holidayCalendar={holidayCalendar}
            setHolidayCalendar={setHolidayCalendar}
            holidayLoading={holidayLoading}
            nextHolidays={nextHolidays}
            onDetectHolidays={onDetectHolidays}
            onSelectCountry={onSelectCountry}
            onMessage={onMessage}
          />

          <Panel
            title="Backup & transfer"
            description="Moving to a new phone or browser? Save a backup first."
            icon={<FileDown aria-hidden="true" className="size-5" />}
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <button type="button" className="secondary-button" onClick={onExportBackup}>
                <FileDown aria-hidden="true" className="size-4" />
                Save backup
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload aria-hidden="true" className="size-4" />
                Restore backup
              </button>
              {entryCount > 0 ? (
                <button
                  type="button"
                  className="secondary-button text-danger hover:!border-danger/50 sm:col-span-2"
                  onClick={onClearAll}
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                  Delete all classes
                </button>
              ) : null}
              <input
                ref={fileInputRef}
                className="hidden"
                type="file"
                accept="application/json"
                onChange={onImportBackup}
              />
            </div>
            <p className="mt-3 text-xs leading-5 text-muted">
              Everything is stored only on this device. Backups include your classes, settings
              and school breaks.
            </p>
          </Panel>

          <button
            type="button"
            className="neo-card flex items-center gap-3 px-4 py-4 text-left transition hover:border-primary/40"
            onClick={onOpenFeedback}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MessageCircle aria-hidden="true" className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold text-foreground">Report a problem or suggest an idea</span>
              <span className="block text-sm text-muted">Missing your school? Let us know.</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function HolidaysPanel({
  holidayCalendar,
  setHolidayCalendar,
  holidayLoading,
  nextHolidays,
  onDetectHolidays,
  onSelectCountry,
  onMessage,
}: {
  holidayCalendar: HolidayCalendar;
  setHolidayCalendar: (updater: (current: HolidayCalendar) => HolidayCalendar) => void;
  holidayLoading: boolean;
  nextHolidays: PublicHoliday[];
  onDetectHolidays: () => void;
  onSelectCountry: (countryCode: string) => void;
  onMessage: (text: string) => void;
}) {
  const [showAddBreak, setShowAddBreak] = useState(false);
  const [breakName, setBreakName] = useState("");
  const [breakStart, setBreakStart] = useState("");
  const [breakEnd, setBreakEnd] = useState("");
  const customBreaks = holidayCalendar.customBreaks ?? [];

  function addBreak(event: React.FormEvent) {
    event.preventDefault();
    if (!breakName.trim() || !breakStart || !breakEnd) {
      onMessage("Fill in the break name, start date and end date.");
      return;
    }
    if (breakEnd < breakStart) {
      onMessage("The break can't end before it starts.");
      return;
    }
    const newBreak: CustomBreak = {
      id: uid(),
      name: breakName.trim(),
      startDate: breakStart,
      endDate: breakEnd,
    };
    setHolidayCalendar((current) => ({
      ...current,
      customBreaks: [...(current.customBreaks ?? []), newBreak],
    }));
    setBreakName("");
    setBreakStart("");
    setBreakEnd("");
    setShowAddBreak(false);
    onMessage(`Added "${newBreak.name}". Reminders pause during this break.`);
  }

  function removeBreak(id: string) {
    setHolidayCalendar((current) => ({
      ...current,
      customBreaks: (current.customBreaks ?? []).filter((b) => b.id !== id),
    }));
    onMessage("School break removed.");
  }

  return (
    <Panel
      title="Holidays & school breaks"
      description="Reminders pause automatically on these days."
      icon={<Palmtree aria-hidden="true" className="size-5" />}
    >
      <div className="grid gap-4">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field label="Country">
            <select
              className="field"
              value={holidayCalendar.countryCode}
              onChange={(e) => onSelectCountry(e.target.value)}
              disabled={holidayLoading}
            >
              <option value="">Choose your country</option>
              {popularCountries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <button
            className="secondary-button"
            type="button"
            disabled={holidayLoading}
            onClick={onDetectHolidays}
          >
            <MapPin aria-hidden="true" className="size-4" />
            {holidayLoading ? "Detecting…" : "Detect"}
          </button>
        </div>
        {holidayCalendar.countryCode ? (
          <p className="-mt-2 text-xs text-muted">
            {holidayCalendar.holidays.length} public holidays loaded for {holidayCalendar.countryName}
            {holidayCalendar.subdivisionName ? ` (${holidayCalendar.subdivisionName})` : ""}.
          </p>
        ) : null}

        <ToggleControl
          label="Pause reminders on holidays & breaks"
          checked={holidayCalendar.enabled}
          onChange={(enabled) => setHolidayCalendar((current) => ({ ...current, enabled }))}
        />

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">School breaks</p>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-primary hover:bg-primary/10"
              onClick={() => setShowAddBreak(!showAddBreak)}
            >
              {showAddBreak ? (
                "Cancel"
              ) : (
                <>
                  <Plus aria-hidden="true" className="size-4" />
                  Add break
                </>
              )}
            </button>
          </div>

          {showAddBreak ? (
            <form onSubmit={addBreak} className="neo-inset mb-2 grid gap-3 p-3">
              <input
                className="field"
                placeholder="e.g. Sem break, Intramurals"
                value={breakName}
                onChange={(e) => setBreakName(e.target.value)}
                aria-label="Break name"
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <Field label="From">
                  <input
                    type="date"
                    className="field"
                    value={breakStart}
                    onChange={(e) => setBreakStart(e.target.value)}
                    required
                  />
                </Field>
                <Field label="To">
                  <input
                    type="date"
                    className="field"
                    value={breakEnd}
                    min={breakStart || undefined}
                    onChange={(e) => setBreakEnd(e.target.value)}
                    required
                  />
                </Field>
              </div>
              <button type="submit" className="primary-button">
                Save break
              </button>
            </form>
          ) : null}

          {customBreaks.length > 0 ? (
            <ul className="grid gap-1.5">
              {customBreaks.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{b.name}</p>
                    <p className="text-xs text-muted">
                      {formatShortDate(b.startDate)} – {formatShortDate(b.endDate)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="icon-button hover:!text-danger"
                    onClick={() => removeBreak(b.id)}
                    aria-label={`Remove break ${b.name}`}
                  >
                    <X aria-hidden="true" className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : !showAddBreak ? (
            <p className="text-xs text-muted">No breaks added yet.</p>
          ) : null}
        </div>

        {nextHolidays.length > 0 ? (
          <div>
            <p className="mb-2 text-sm font-semibold text-foreground">Coming up</p>
            <ul className="grid gap-1.5">
              {nextHolidays.map((holiday) => (
                <li
                  key={`${holiday.date}-${holiday.name}`}
                  className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2"
                >
                  <span className="min-w-0 truncate text-sm font-medium text-foreground">
                    {holiday.name}
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-muted">
                    {formatShortDate(holiday.date)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Panel>
  );
}
