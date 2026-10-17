"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarCheck2,
  CalendarDays,
  ClipboardCheck,
  Ellipsis,
  MoonStar,
  Plus,
  Sun,
  type LucideIcon,
} from "lucide-react";
import {
  days,
  scheduleTypes,
  wallpaperSizePresets,
  type AppTab,
  type AttendanceRecord,
  type AttendanceStatus,
  type DayName,
  type HolidayCalendar,
  type ScheduleEntry,
  type ScheduleSettings,
  type ScheduleType,
  type ScheduleViewMode,
} from "@/lib/types";
import {
  defaultHolidayCalendar,
  detectHolidayLocation,
  fetchPublicHolidays,
  formatLocalDateKey,
  holidayCalendarNeedsRefresh,
  holidayForDate,
  normalizeHolidayCalendar,
  popularCountries,
  upcomingHolidays,
} from "@/lib/holidays";
import {
  dayNameForDate,
  formatTime,
  hasTimeConflict,
  nextDateForDay,
  sortEntries,
  uid,
} from "@/lib/utils";
import {
  getSchoolPalette,
} from "@/lib/school-palettes";
import {
  drawWallpaper,
  formatWallpaperSize,
  typeStyle,
} from "@/lib/wallpaper-renderer";
import {
  PhonePreviewDialog,
  type SelectedWallpaperSize,
} from "@/components/wallpaper/wallpaper-modal";
import { EntryFormSheet, type EntryFormValues } from "@/components/schedule/entry-form-sheet";
import { ScheduleView } from "@/components/schedule/schedule-view";
import {
  AttendanceOverview,
  computeAttendanceStats,
} from "@/components/attendance/attendance-tracker";
import { TodayView } from "@/components/today/today-view";
import { MoreView } from "@/components/more/more-view";
import { FeedbackWidget } from "@/components/feedback-widget";

const storageKey = "smartsched.local.schedule.v1";
const attendanceStorageKey = "smartsched.local.attendance.v1";
const notifiedKey = "smartsched.local.notified.v1";
const themeKey = "smartsched.local.theme.v1";

const defaultSettings: ScheduleSettings = {
  schoolPaletteId: "university-of-cebu",
  wallpaperTitle: "Class Schedule",
  wallpaperStyle: "School Palette",
  wallpaperSizeId: "device-auto",
  wallpaperCustomWidth: 1080,
  wallpaperCustomHeight: 1920,
  wallpaperLayoutMode: "Balanced",
  wallpaperTitleSize: 58,
  wallpaperDayLabelSize: 52,
  wallpaperCardTextSize: 28,
  wallpaperAutoFit: true,
  wallpaperShowEmptyWeekdays: true,
  wallpaperExportFormat: "PNG",
  wallpaperClockSafetyZone: true,
};

const blankEntry: EntryFormValues = {
  title: "",
  code: "",
  room: "",
  days: ["Monday"],
  start: "08:00",
  end: "09:00",
  type: "Class",
  reminderMinutes: 15,
  accentColor: "#256f53",
  maxAbsences: 3,
};

const tabs: { id: AppTab; label: string; icon: LucideIcon }[] = [
  { id: "today", label: "Today", icon: CalendarCheck2 },
  { id: "schedule", label: "Schedule", icon: CalendarDays },
  { id: "attendance", label: "Attendance", icon: ClipboardCheck },
  { id: "more", label: "More", icon: Ellipsis },
];

type Toast = {
  id: number;
  text: string;
  action?: { label: string; onClick: () => void };
};

type FormState = {
  initial: EntryFormValues;
  editingId: string | null;
};

type StoredSchedule = {
  settings: ScheduleSettings;
  entries: ScheduleEntry[];
  holidayCalendar: HolidayCalendar;
};

type RawStoredSchedule = {
  settings?: Partial<ScheduleSettings>;
  entries?: (ScheduleEntry | { day?: DayName; days?: DayName[] })[];
  holidayCalendar?: Partial<HolidayCalendar>;
  attendanceRecords?: AttendanceRecord[];
};

function readStoredSchedule(): StoredSchedule | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as RawStoredSchedule;
    return {
      settings: normalizeSettings(parsed.settings),
      entries: Array.isArray(parsed.entries)
        ? parsed.entries.map(normalizeEntry)
        : [],
      holidayCalendar: normalizeHolidayCalendar(parsed.holidayCalendar),
    };
  } catch {
    return null;
  }
}

function normalizeSettings(settings?: Partial<ScheduleSettings>): ScheduleSettings {
  return {
    ...defaultSettings,
    ...settings,
    wallpaperClockSafetyZone: settings?.wallpaperClockSafetyZone ?? true,
  };
}

function normalizeEntry(raw: unknown): ScheduleEntry {
  const entry = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const legacyDay = typeof entry.day === "string" ? entry.day : undefined;
  const entryDays = Array.isArray(entry.days)
    ? entry.days
    : legacyDay
      ? [legacyDay]
      : ["Monday"];

  const validDays = entryDays.filter((day): day is DayName =>
    typeof day === "string" && days.includes(day as DayName),
  );

  return {
    id: typeof entry.id === "string" ? entry.id : uid(),
    title: typeof entry.title === "string" ? entry.title : "Untitled",
    code: typeof entry.code === "string" ? entry.code : "",
    room: typeof entry.room === "string" ? entry.room : "",
    days: validDays.length > 0 ? validDays : ["Monday"],
    start: typeof entry.start === "string" ? entry.start : "08:00",
    end: typeof entry.end === "string" ? entry.end : "09:00",
    type: typeof entry.type === "string" && scheduleTypes.includes(entry.type as ScheduleType) ? (entry.type as ScheduleType) : "Class",
    reminderMinutes:
      typeof entry.reminderMinutes === "number" ? entry.reminderMinutes : 15,
    accentColor:
      typeof entry.accentColor === "string"
        ? entry.accentColor
        : typeStyle[entry.type as ScheduleType] || "#256f53",
    maxAbsences:
      typeof entry.maxAbsences === "number" ? Math.max(1, entry.maxAbsences) : 3,
  };
}

function detectDeviceWallpaperSize() {
  if (typeof window === "undefined") {
    return { width: 1080, height: 1920 };
  }
  const pixelRatio = Math.max(1, window.devicePixelRatio || 1);
  return {
    width: Math.round(window.screen.width * pixelRatio) || 1080,
    height: Math.round(window.screen.height * pixelRatio) || 1920,
  };
}

function getWallpaperSizePreset(
  settings: ScheduleSettings,
  detectedDeviceSize: { width: number; height: number },
): SelectedWallpaperSize {
  if (settings.wallpaperSizeId === "device-auto") {
    return {
      id: "device-auto",
      group: "Device",
      label: "This device (automatic)",
      width: detectedDeviceSize.width,
      height: detectedDeviceSize.height,
    };
  }
  if (settings.wallpaperSizeId === "custom") {
    return {
      id: "custom",
      group: "Custom",
      label: "Custom size",
      width: settings.wallpaperCustomWidth,
      height: settings.wallpaperCustomHeight,
    };
  }
  const preset = wallpaperSizePresets.find((item) => item.id === settings.wallpaperSizeId);
  return preset ?? wallpaperSizePresets[2];
}

function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

export function ScheduleApp() {
  const [settings, setSettings] = useState<ScheduleSettings>(defaultSettings);
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [tab, setTab] = useState<AppTab>("today");
  const [viewMode, setViewMode] = useState<ScheduleViewMode>("day");
  const [holidayCalendar, setHolidayCalendar] = useState<HolidayCalendar>(defaultHolidayCalendar);
  const [holidayLoading, setHolidayLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DayName>("Monday");
  const [formState, setFormState] = useState<FormState | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [notificationState, setNotificationState] =
    useState<NotificationPermission | "unsupported">("unsupported");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [storageReady, setStorageReady] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [detectedDeviceSize, setDetectedDeviceSize] = useState({
    width: 1080,
    height: 1920,
  });

  const holidayRefreshAttemptedRef = useRef(false);

  // Initialize from localStorage
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const timer = window.setTimeout(() => {
      const storedSchedule = readStoredSchedule();
      if (storedSchedule) {
        setSettings(storedSchedule.settings);
        setEntries(storedSchedule.entries);
        setHolidayCalendar(storedSchedule.holidayCalendar);
      }

      try {
        const storedAttendance = localStorage.getItem(attendanceStorageKey);
        if (storedAttendance) {
          const parsed = JSON.parse(storedAttendance) as AttendanceRecord[];
          if (Array.isArray(parsed)) {
            setAttendanceRecords(parsed);
          }
        }
      } catch {
        // ignore
      }

      const storedTheme = window.localStorage.getItem(themeKey);
      if (storedTheme === "dark" || storedTheme === "light") {
        setTheme(storedTheme);
      } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        setTheme("dark");
      }

      const current = new Date();
      setNow(current);
      setSelectedDay(dayNameForDate(current));
      setNotificationState(getNotificationPermission());
      setDetectedDeviceSize(detectDeviceWallpaperSize());
      setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
      setStorageReady(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  // Keep "now" fresh so the Today view's countdowns stay accurate.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  // Update detected device size on resize
  useEffect(() => {
    function updateDetectedSize() {
      setDetectedDeviceSize(detectDeviceWallpaperSize());
    }
    window.addEventListener("resize", updateDetectedSize);
    window.addEventListener("orientationchange", updateDetectedSize);
    return () => {
      window.removeEventListener("resize", updateDetectedSize);
      window.removeEventListener("orientationchange", updateDetectedSize);
    };
  }, []);

  // Sync to localStorage
  useEffect(() => {
    if (!storageReady) return;
    localStorage.setItem(
      storageKey,
      JSON.stringify({ settings, entries, holidayCalendar }),
    );
  }, [settings, entries, holidayCalendar, storageReady]);

  // Sync attendance to localStorage
  useEffect(() => {
    if (!storageReady) return;
    localStorage.setItem(attendanceStorageKey, JSON.stringify(attendanceRecords));
  }, [attendanceRecords, storageReady]);

  // Sync theme
  useEffect(() => {
    if (!storageReady) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    // Match the mobile browser / installed-app status bar to the page background.
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#0c1210" : "#f3f5f7");
    window.localStorage.setItem(themeKey, theme);
  }, [theme, storageReady]);

  // Notification loop
  useEffect(() => {
    if (notificationState !== "granted") return;
    const timer = window.setInterval(() => {
      checkDueNotifications(entries, holidayCalendar);
    }, 30000);
    checkDueNotifications(entries, holidayCalendar);
    return () => window.clearInterval(timer);
  }, [entries, holidayCalendar, notificationState]);

  // Holiday refresh check
  useEffect(() => {
    if (
      !storageReady ||
      holidayRefreshAttemptedRef.current ||
      !holidayCalendarNeedsRefresh(holidayCalendar)
    ) {
      return;
    }

    holidayRefreshAttemptedRef.current = true;
    void fetchPublicHolidays(
      holidayCalendar.countryCode,
      holidayCalendar.subdivisionCode,
    )
      .then((holidays) => {
        setHolidayCalendar((current) => ({
          ...current,
          holidays,
          lastUpdated: new Date().toISOString(),
        }));
      })
      .catch(() => undefined);
  }, [holidayCalendar, storageReady]);

  // Auto-dismiss toasts
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), toast.action ? 6000 : 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const sortedEntries = useMemo(() => sortEntries(entries), [entries]);
  const selectedWallpaperSize = useMemo(
    () => getWallpaperSizePreset(settings, detectedDeviceSize),
    [detectedDeviceSize, settings],
  );
  const nextHolidays = useMemo(
    () => upcomingHolidays(holidayCalendar),
    [holidayCalendar],
  );
  const attendanceRisk = useMemo(
    () =>
      computeAttendanceStats(entries, attendanceRecords).filter(
        (stat) => stat.isCritical || stat.isExceeded,
      ).length,
    [entries, attendanceRecords],
  );

  const todayName = now ? dayNameForDate(now) : "Monday";
  const todayDateKey = now ? formatLocalDateKey(now) : "";
  const nowMinutes = now ? now.getHours() * 60 + now.getMinutes() : undefined;
  const holidayToday = useMemo(
    () => (now ? holidayForDate(holidayCalendar, now) : undefined),
    [holidayCalendar, now],
  );
  const schoolPalette = getSchoolPalette(settings.schoolPaletteId);

  // Set brand colors on <html>: --primary is derived there (lightened in dark mode),
  // so overriding --brand on a child element would not reach it.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--brand", schoolPalette.uiPrimary);
    root.style.setProperty("--brand-strong", schoolPalette.uiPrimaryStrong);
    root.style.setProperty("--accent", schoolPalette.uiAccent);
  }, [schoolPalette.uiPrimary, schoolPalette.uiPrimaryStrong, schoolPalette.uiAccent]);

  function setMessage(text: string, action?: Toast["action"]) {
    setToast({ id: Date.now(), text, action });
  }

  function goToTab(next: AppTab, anchor?: string) {
    setTab(next);
    window.setTimeout(() => {
      if (anchor) {
        document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 60);
  }

  function openAddForm(day?: DayName) {
    setFormState({
      initial: { ...blankEntry, days: [day ?? (tab === "schedule" ? selectedDay : todayName)] },
      editingId: null,
    });
  }

  function openEditForm(entry: ScheduleEntry) {
    const { id, ...rest } = entry;
    setFormState({ initial: rest, editingId: id });
  }

  function saveEntry(values: EntryFormValues) {
    const editingId = formState?.editingId ?? null;
    const saved: ScheduleEntry = {
      id: editingId ?? uid(),
      ...values,
      title: values.title.trim(),
      code: values.code.trim(),
      room: values.room.trim(),
      maxAbsences: Math.max(1, values.maxAbsences || 3),
    };
    const conflict = hasTimeConflict(saved, entries);

    setEntries((current) =>
      editingId
        ? current.map((entry) => (entry.id === editingId ? saved : entry))
        : [...current, saved],
    );
    if (!saved.days.includes(selectedDay)) {
      setSelectedDay(saved.days[0] ?? selectedDay);
    }
    setFormState(null);
    setMessage(
      conflict
        ? `Saved ${saved.title}, but it overlaps another class.`
        : editingId
          ? `Saved changes to ${saved.title}.`
          : `Added ${saved.title}.`,
    );
  }

  function duplicateEntry(entry: ScheduleEntry) {
    const clone: ScheduleEntry = {
      ...entry,
      id: uid(),
      title: `${entry.title} (Copy)`,
    };
    setEntries((current) => [...current, clone]);
    setMessage(`Duplicated ${entry.title}. Tap the copy to change its time.`);
  }

  function deleteEntry(entry: ScheduleEntry) {
    setEntries((current) => current.filter((item) => item.id !== entry.id));
    if (formState?.editingId === entry.id) {
      setFormState(null);
    }
    setMessage(`Deleted ${entry.title}.`, {
      label: "Undo",
      onClick: () => {
        setEntries((current) =>
          current.some((item) => item.id === entry.id) ? current : [...current, entry],
        );
        setToast(null);
      },
    });
  }

  function clearAllEntries() {
    if (entries.length === 0) return;
    if (window.confirm("Delete all your classes? This can't be undone unless you have a backup.")) {
      setEntries([]);
      setFormState(null);
      setMessage("All classes deleted.");
    }
  }

  function handleRecordAttendance(entryId: string, status: AttendanceStatus) {
    setAttendanceRecords((current) => {
      const existingIdx = current.findIndex(
        (r) => r.entryId === entryId && r.date === todayDateKey,
      );
      if (existingIdx >= 0) {
        const next = [...current];
        next[existingIdx] = { ...next[existingIdx], status };
        return next;
      }
      return [
        ...current,
        {
          id: uid(),
          entryId,
          date: todayDateKey,
          status,
        },
      ];
    });
    const title = entries.find((entry) => entry.id === entryId)?.title ?? "this class";
    setMessage(`Marked ${status.toLowerCase()} for ${title}.`);
  }

  function handleClearAttendance() {
    if (window.confirm("Reset all attendance history? This can't be undone.")) {
      setAttendanceRecords([]);
      setMessage("Attendance history reset.");
    }
  }

  // Holiday location detection (GPS)
  async function detectAndRecordHolidays() {
    setHolidayLoading(true);
    setMessage("Detecting your country and loading public holidays...");

    try {
      const location = await detectHolidayLocation();
      const holidays = await fetchPublicHolidays(
        location.countryCode,
        location.subdivisionCode,
      );
      setHolidayCalendar({
        enabled: true,
        ...location,
        lastUpdated: new Date().toISOString(),
        holidays,
        customBreaks: holidayCalendar.customBreaks || [],
      });
      setMessage(
        `${holidays.length} public holidays loaded for ${location.countryName}.`,
      );
    } catch (error) {
      const detail =
        typeof error === "object" && error && "message" in error
          ? String((error as { message: unknown }).message)
          : "Allow location access or choose your country instead.";
      setMessage(`Couldn't detect your location. ${detail}`);
    } finally {
      setHolidayLoading(false);
    }
  }

  async function handleSelectCountry(countryCode: string) {
    if (!countryCode) return;
    const found = popularCountries.find((c) => c.code === countryCode);
    if (!found) return;

    setHolidayLoading(true);
    setMessage(`Loading holidays for ${found.name}...`);
    try {
      const holidays = await fetchPublicHolidays(countryCode);
      setHolidayCalendar((current) => ({
        ...current,
        enabled: true,
        countryCode,
        countryName: found.name,
        subdivisionCode: "",
        subdivisionName: "",
        lastUpdated: new Date().toISOString(),
        holidays,
      }));
      setMessage(`Loaded ${holidays.length} public holidays for ${found.name}.`);
    } catch {
      setMessage(`Couldn't load holidays for ${found.name}. Check your internet connection.`);
    } finally {
      setHolidayLoading(false);
    }
  }

  async function enableNotifications() {
    if (!("Notification" in window)) {
      setNotificationState("unsupported");
      setMessage("This browser doesn't support notifications.");
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationState(permission);
    setMessage(
      permission === "granted"
        ? "Reminders are on while SmartSched is open or installed."
        : "Notifications weren't turned on.",
    );
  }

  function exportBackup() {
    downloadText(
      "smartsched-backup.json",
      JSON.stringify(
        { settings, entries, holidayCalendar, attendanceRecords },
        null,
        2,
      ),
      "application/json",
    );
    setMessage("Backup saved to your downloads.");
  }

  function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as RawStoredSchedule;
        if (!Array.isArray(parsed.entries)) {
          throw new Error("Missing entries");
        }
        setSettings(normalizeSettings(parsed.settings));
        setEntries(parsed.entries.map(normalizeEntry));
        setHolidayCalendar(normalizeHolidayCalendar(parsed.holidayCalendar));
        if (Array.isArray(parsed.attendanceRecords)) {
          setAttendanceRecords(parsed.attendanceRecords);
        }
        setMessage("Backup restored on this device.");
      } catch {
        setMessage("That file isn't a valid SmartSched backup.");
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  }

  function exportCalendar() {
    const ics = buildIcs(settings, sortedEntries, holidayCalendar);
    downloadText("smartsched-reminders.ics", ics, "text/calendar");
    setMessage(
      holidayCalendar.enabled &&
        (holidayCalendar.holidays.length > 0 || (holidayCalendar.customBreaks?.length ?? 0) > 0)
        ? "Calendar downloaded. Holidays and breaks are skipped."
        : "Calendar downloaded. Open it on your phone to add the alarms.",
    );
  }

  async function downloadWallpaper(format = settings.wallpaperExportFormat) {
    const canvas = document.createElement("canvas");
    canvas.width = selectedWallpaperSize.width;
    canvas.height = selectedWallpaperSize.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    drawWallpaper(ctx, canvas.width, canvas.height, settings, sortedEntries);

    const mimeType = format === "JPG" ? "image/jpeg" : "image/png";
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, mimeType, format === "JPG" ? 0.92 : 1),
    );
    if (!blob) return;

    const sizeLabel = formatWallpaperSize(
      selectedWallpaperSize.width,
      selectedWallpaperSize.height,
    );
    const layoutSlug = settings.wallpaperLayoutMode.toLowerCase();
    const extension = format.toLowerCase() === "jpg" ? "jpg" : "png";
    downloadBlob(
      `smartsched-wallpaper-${selectedWallpaperSize.id}-${selectedWallpaperSize.width}x${selectedWallpaperSize.height}-${layoutSlug}.${extension}`,
      blob,
    );
    setMessage(`Wallpaper downloaded (${sizeLabel} ${format}).`);
  }

  async function shareWallpaper() {
    if (typeof navigator === "undefined" || !navigator.share) {
      await downloadWallpaper();
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = selectedWallpaperSize.width;
    canvas.height = selectedWallpaperSize.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    drawWallpaper(ctx, canvas.width, canvas.height, settings, sortedEntries);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!blob) return;

    const file = new File([blob], "smartsched-schedule-wallpaper.png", {
      type: "image/png",
    });

    try {
      await navigator.share({
        title: settings.wallpaperTitle || "SmartSched Wallpaper",
        files: [file],
      });
      setMessage("Wallpaper shared.");
    } catch {
      // User canceled share dialog or browser lacks file share support
    }
  }

  const showFab = (tab === "today" || tab === "schedule") && entries.length > 0;
  const hasAttendanceRisk = attendanceRisk > 0;

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-background text-foreground">
      {/* App bar */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 pt-[env(safe-area-inset-top)] backdrop-blur-lg">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 md:h-16">
          <button
            type="button"
            className="flex min-w-0 items-center gap-2.5 text-left"
            onClick={() => goToTab("today")}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-fill text-white shadow-[var(--shadow-sm)]">
              <CalendarDays aria-hidden="true" className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-base font-bold leading-tight text-foreground">SmartSched</span>
              <span className="block truncate text-xs text-muted">{schoolPalette.name}</span>
            </span>
          </button>

          <nav className="hidden items-center gap-1 rounded-2xl border border-border bg-surface p-1 md:flex" aria-label="Main">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                aria-current={tab === id ? "page" : undefined}
                onClick={() => goToTab(id)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  tab === id
                    ? "bg-primary-fill text-white shadow-[var(--shadow-sm)]"
                    : "text-muted hover:bg-surface-2 hover:text-foreground"
                }`}
              >
                <Icon aria-hidden="true" className="size-4" />
                {label}
                {id === "attendance" && hasAttendanceRisk ? (
                  <span className="size-2 rounded-full bg-danger" aria-label="Subjects at risk" />
                ) : null}
              </button>
            ))}
          </nav>

          <button
            type="button"
            className="icon-button border-border bg-surface"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? (
              <Sun aria-hidden="true" className="size-5" />
            ) : (
              <MoonStar aria-hidden="true" className="size-5" />
            )}
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-36 pt-5 sm:px-6 sm:pt-8 md:pb-16">
        {!now ? (
          <div className="grid gap-4" aria-busy="true">
            <div className="h-8 w-48 animate-pulse rounded-lg bg-surface-2" />
            <div className="h-40 animate-pulse rounded-3xl bg-surface-2" />
            <div className="h-28 animate-pulse rounded-2xl bg-surface-2" />
          </div>
        ) : (
          <div key={tab} className="animate-fade-up">
            {tab === "today" ? (
              <TodayView
                entries={entries}
                records={attendanceRecords}
                now={now}
                todayName={todayName}
                todayDateKey={todayDateKey}
                holidayToday={holidayToday}
                onRecordAttendance={handleRecordAttendance}
                onAddClass={() => openAddForm(todayName)}
                onOpenSchedule={() => goToTab("schedule")}
                onOpenWallpaper={() => setPreviewOpen(true)}
                onOpenReminders={() => goToTab("more", "reminders")}
              />
            ) : tab === "schedule" ? (
              <ScheduleView
                entries={entries}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
                todayName={todayName}
                nowMinutes={nowMinutes}
                onAdd={openAddForm}
                onEdit={openEditForm}
                onDuplicate={duplicateEntry}
                onDelete={deleteEntry}
              />
            ) : tab === "attendance" ? (
              <AttendanceOverview
                entries={sortedEntries}
                records={attendanceRecords}
                onClearAttendance={handleClearAttendance}
                onAddClass={() => openAddForm()}
              />
            ) : (
              <MoreView
                settings={settings}
                setSettings={setSettings}
                theme={theme}
                onThemeChange={setTheme}
                notificationState={notificationState}
                onEnableNotifications={enableNotifications}
                onExportCalendar={exportCalendar}
                onOpenWallpaper={() => setPreviewOpen(true)}
                onDownloadWallpaper={() => downloadWallpaper()}
                onShareWallpaper={shareWallpaper}
                canShare={canShare}
                holidayCalendar={holidayCalendar}
                setHolidayCalendar={setHolidayCalendar}
                holidayLoading={holidayLoading}
                nextHolidays={nextHolidays}
                onDetectHolidays={detectAndRecordHolidays}
                onSelectCountry={handleSelectCountry}
                onExportBackup={exportBackup}
                onImportBackup={importBackup}
                onClearAll={clearAllEntries}
                entryCount={entries.length}
                onOpenFeedback={() => setFeedbackOpen(true)}
                onMessage={setMessage}
              />
            )}
          </div>
        )}
      </main>

      {/* Add-class button (phones) */}
      {showFab ? (
        <button
          type="button"
          className="fixed right-4 bottom-[calc(84px+env(safe-area-inset-bottom))] z-30 flex size-14 items-center justify-center rounded-2xl bg-primary-fill text-white shadow-[var(--shadow-lg)] transition active:scale-95 md:hidden"
          onClick={() => openAddForm()}
          aria-label="Add class"
        >
          <Plus aria-hidden="true" className="size-6" />
        </button>
      ) : null}

      {/* Bottom tab bar (phones and small tablets) */}
      <nav
        className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/90 backdrop-blur-lg md:hidden"
        aria-label="Main"
      >
        <div className="mx-auto grid max-w-md grid-cols-4 px-2 pt-1.5">
          {tabs.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => goToTab(id)}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl py-1 text-[11px] font-semibold transition active:scale-95 ${
                  active ? "text-primary" : "text-muted"
                }`}
              >
                <span
                  className={`relative flex h-8 w-14 items-center justify-center rounded-full transition ${
                    active ? "bg-primary/15" : ""
                  }`}
                >
                  <Icon aria-hidden="true" className="size-5" strokeWidth={active ? 2.4 : 2} />
                  {id === "attendance" && hasAttendanceRisk ? (
                    <span
                      className="absolute right-3 top-0.5 size-2 rounded-full bg-danger ring-2 ring-surface"
                      aria-label="Subjects at risk"
                    />
                  ) : null}
                </span>
                {label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Toast */}
      {toast ? (
        <div
          className={`pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-4 md:bottom-6 ${
            // Sit above the add-class button on phones so the two never overlap.
            showFab
              ? "bottom-[calc(152px+env(safe-area-inset-bottom))]"
              : "bottom-[calc(84px+env(safe-area-inset-bottom))]"
          }`}
        >
          <div
            key={toast.id}
            role="status"
            className="animate-fade-up pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl bg-foreground px-4 py-3 text-sm font-medium text-background shadow-[var(--shadow-lg)]"
          >
            <span className="min-w-0">{toast.text}</span>
            {toast.action ? (
              <button
                type="button"
                className="shrink-0 rounded-lg px-2 py-1 font-bold text-background underline-offset-2 hover:underline"
                onClick={toast.action.onClick}
              >
                {toast.action.label}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {formState ? (
        <EntryFormSheet
          initial={formState.initial}
          editingId={formState.editingId}
          entries={entries}
          onSave={saveEntry}
          onDelete={
            formState.editingId
              ? () => {
                  const entry = entries.find((item) => item.id === formState.editingId);
                  if (entry) deleteEntry(entry);
                }
              : undefined
          }
          onClose={() => setFormState(null)}
        />
      ) : null}

      {previewOpen ? (
        <PhonePreviewDialog
          settings={settings}
          setSettings={setSettings}
          entries={sortedEntries}
          sizePreset={selectedWallpaperSize}
          onClose={() => setPreviewOpen(false)}
          onDownload={downloadWallpaper}
          onShare={shareWallpaper}
        />
      ) : null}

      {feedbackOpen ? (
        <FeedbackWidget
          schoolPaletteId={settings.schoolPaletteId}
          deviceSize={selectedWallpaperSize}
          onEmailOpened={() =>
            setMessage("Opening your email app with the report ready to send.")
          }
          onClose={() => setFeedbackOpen(false)}
        />
      ) : null}
    </div>
  );
}

// ICS Calendar & Notification Utilities
function checkDueNotifications(
  entries: ScheduleEntry[],
  holidayCalendar: HolidayCalendar,
) {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  const now = new Date();
  if (holidayForDate(holidayCalendar, now)) {
    return;
  }

  const today = dayNameForDate(now);
  const notified = new Set(
    JSON.parse(localStorage.getItem(notifiedKey) || "[]") as string[],
  );

  entries
    .filter((entry) => entry.days.includes(today))
    .forEach((entry) => {
      const [hour, minute] = entry.start.split(":").map(Number);
      const reminder = new Date(now);
      reminder.setHours(hour, minute - entry.reminderMinutes, 0, 0);
      const diff = reminder.getTime() - now.getTime();
      const key = `${now.toDateString()}-${entry.id}-${entry.reminderMinutes}`;

      if (diff <= 30000 && diff >= -60000 && !notified.has(key)) {
        new Notification(`${entry.title} starts at ${formatTime(entry.start)}`, {
          body: [entry.code, entry.room].filter(Boolean).join(" - "),
          icon: "/icon.svg",
        });
        notified.add(key);
      }
    });

  localStorage.setItem(notifiedKey, JSON.stringify([...notified].slice(-100)));
}

function buildIcs(
  settings: ScheduleSettings,
  entries: ScheduleEntry[],
  holidayCalendar: HolidayCalendar,
) {
  const nowStamp = toIcsDate(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SmartSched Local//Schedule Reminders//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcs(`${getSchoolPalette(settings.schoolPaletteId).name} Schedule`)}`,
  ];

  entries.forEach((entry) => {
    entry.days.forEach((day) => {
      const startDate = nextDateForDay(day);
      const [startHour, startMinute] = entry.start.split(":").map(Number);
      const [endHour, endMinute] = entry.end.split(":").map(Number);
      startDate.setHours(startHour, startMinute, 0, 0);
      const endDate = new Date(startDate);
      endDate.setHours(endHour, endMinute, 0, 0);
      const holidayExclusions = getHolidayExclusions(
        startDate,
        holidayCalendar,
        24,
      );

      lines.push(
        "BEGIN:VEVENT",
        `UID:${entry.id}-${day}@smartsched.local`,
        `DTSTAMP:${nowStamp}`,
        `DTSTART:${toIcsDate(startDate)}`,
        `DTEND:${toIcsDate(endDate)}`,
        "RRULE:FREQ=WEEKLY;COUNT=24",
        ...(holidayExclusions.length > 0
          ? [`EXDATE:${holidayExclusions.map(toIcsDate).join(",")}`]
          : []),
        `SUMMARY:${escapeIcs([entry.code, entry.title].filter(Boolean).join(" "))}`,
        `LOCATION:${escapeIcs(entry.room)}`,
        `DESCRIPTION:${escapeIcs(day)}`,
        "BEGIN:VALARM",
        `TRIGGER:-PT${Math.max(0, entry.reminderMinutes)}M`,
        "ACTION:DISPLAY",
        `DESCRIPTION:${escapeIcs(`${entry.title} starts soon`)}`,
        "END:VALARM",
        "END:VEVENT",
      );
    });
  });

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}

function getHolidayExclusions(
  firstOccurrence: Date,
  holidayCalendar: HolidayCalendar,
  occurrenceCount: number,
) {
  if (!holidayCalendar.enabled) {
    return [];
  }

  const exclusions: Date[] = [];
  for (let index = 0; index < occurrenceCount; index += 1) {
    const occurrence = new Date(firstOccurrence);
    occurrence.setDate(firstOccurrence.getDate() + index * 7);
    if (holidayForDate(holidayCalendar, occurrence)) {
      exclusions.push(occurrence);
    }
  }

  return exclusions;
}

function toIcsDate(date: Date) {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function escapeIcs(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function downloadText(filename: string, text: string, type: string) {
  downloadBlob(filename, new Blob([text], { type }));
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
