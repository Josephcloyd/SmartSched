"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CalendarDays,
  Camera,
  FileDown,
  ImageDown,
  LayoutGrid,
  List,
  MapPin,
  MoonStar,
  Plus,
  Save,
  Share2,
  Sun,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  days,
  scheduleTypes,
  wallpaperSizePresets,
  type AttendanceRecord,
  type AttendanceStatus,
  type CustomBreak,
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
  entriesForDay,
  formatTime,
  hasTimeConflict,
  nextDateForDay,
  sortEntries,
  timeToMinutes,
  uid,
} from "@/lib/utils";
import {
  getSchoolPalette,
} from "@/lib/school-palettes";
import {
  drawWallpaper,
  formatWallpaperSize,
  getWallpaperDays,
  typeStyle,
} from "@/lib/wallpaper-renderer";
import {
  Field,
  Metric,
  Panel,
  TextInput,
  ToggleControl,
} from "@/components/ui/form-controls";
import {
  PhonePreviewDialog,
  SchoolPalettePicker,
  type SelectedWallpaperSize,
} from "@/components/wallpaper/wallpaper-modal";
import { ScheduleRow } from "@/components/schedule/schedule-row";
import { TimetableGrid } from "@/components/schedule/timetable-grid";
import { AttendanceTracker } from "@/components/attendance/attendance-tracker";
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

const blankEntry: Omit<ScheduleEntry, "id"> = {
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

const accentPresets = [
  "#256f53",
  "#165c8d",
  "#7b1113",
  "#9d2235",
  "#00703c",
  "#003a70",
  "#7a1731",
  "#b55d2c",
  "#b42318",
  "#4f46e5",
  "#0284c7",
  "#d97706",
];

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
  const [viewMode, setViewMode] = useState<ScheduleViewMode>("day");
  const [holidayCalendar, setHolidayCalendar] = useState<HolidayCalendar>(defaultHolidayCalendar);
  const [holidayLoading, setHolidayLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DayName>("Monday");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<ScheduleEntry, "id">>(blankEntry);
  const [message, setMessage] = useState("");
  const [notificationState, setNotificationState] =
    useState<NotificationPermission | "unsupported">("unsupported");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [storageReady, setStorageReady] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [customBreakName, setCustomBreakName] = useState("");
  const [customBreakStart, setCustomBreakStart] = useState("");
  const [customBreakEnd, setCustomBreakEnd] = useState("");
  const [showAddBreak, setShowAddBreak] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [detectedDeviceSize, setDetectedDeviceSize] = useState({
    width: 1080,
    height: 1920,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const addItemPanelRef = useRef<HTMLElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const startInputRef = useRef<HTMLInputElement>(null);
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

      setNotificationState(getNotificationPermission());
      setDetectedDeviceSize(detectDeviceWallpaperSize());
      setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
      setStorageReady(true);
    }, 0);

    return () => window.clearTimeout(timer);
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

  const sortedEntries = useMemo(() => sortEntries(entries), [entries]);
  const selectedEntries = useMemo(
    () => entriesForDay(entries, selectedDay),
    [entries, selectedDay],
  );
  const selectedWallpaperSize = useMemo(
    () => getWallpaperSizePreset(settings, detectedDeviceSize),
    [detectedDeviceSize, settings],
  );
  const visibleOverviewDays = useMemo(
    () => getWallpaperDays(entries, settings),
    [entries, settings],
  );
  const holidayToday = useMemo(
    () => holidayForDate(holidayCalendar, new Date()),
    [holidayCalendar],
  );
  const nextHolidays = useMemo(
    () => upcomingHolidays(holidayCalendar),
    [holidayCalendar],
  );

  const candidate = useMemo<ScheduleEntry>(
    () => ({ id: editingId ?? "new", ...form }),
    [editingId, form],
  );
  const conflict = hasTimeConflict(candidate, entries);
  const schoolPalette = getSchoolPalette(settings.schoolPaletteId);
  const todayName = useMemo(() => dayNameForDate(new Date()), []);
  const todayDateKey = useMemo(() => formatLocalDateKey(new Date()), []);

  const brandStyle = {
    "--primary": schoolPalette.uiPrimary,
    "--primary-strong": schoolPalette.uiPrimaryStrong,
    "--accent": schoolPalette.uiAccent,
  } as React.CSSProperties;

  function goToAddItem(field?: "title" | "start") {
    addItemPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      if (field === "title") {
        titleInputRef.current?.focus();
      } else if (field === "start") {
        startInputRef.current?.focus();
      }
    }, 260);
  }

  function updateForm<K extends keyof Omit<ScheduleEntry, "id">>(
    key: K,
    value: Omit<ScheduleEntry, "id">[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateFormType(type: ScheduleType) {
    setForm((current) => ({
      ...current,
      type,
      accentColor:
        current.accentColor === typeStyle[current.type]
          ? typeStyle[type]
          : current.accentColor,
    }));
  }

  function resetForm(day: DayName = selectedDay) {
    setEditingId(null);
    setForm({ ...blankEntry, days: [day] });
  }

  function toggleFormDay(day: DayName) {
    setForm((current) => {
      const exists = current.days.includes(day);
      const nextDays = exists
        ? current.days.filter((item) => item !== day)
        : [...current.days, day];
      return {
        ...current,
        days: nextDays.length > 0 ? nextDays : [day],
      };
    });
  }

  // Quick Day Presets (Phase 3)
  function applyDayPreset(preset: "MWF" | "TTH" | "Weekdays" | "All") {
    if (preset === "MWF") {
      setForm((c) => ({ ...c, days: ["Monday", "Wednesday", "Friday"] }));
    } else if (preset === "TTH") {
      setForm((c) => ({ ...c, days: ["Tuesday", "Thursday"] }));
    } else if (preset === "Weekdays") {
      setForm((c) => ({
        ...c,
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      }));
    } else if (preset === "All") {
      setForm((c) => ({ ...c, days: [...days] }));
    }
  }

  function saveEntry() {
    if (!form.title.trim()) {
      setMessage("Enter a subject or activity title before saving.");
      goToAddItem("title");
      return;
    }

    if (timeToMinutes(form.start) >= timeToMinutes(form.end)) {
      setMessage("Start time must be earlier than end time.");
      goToAddItem("start");
      return;
    }

    if (form.days.length === 0) {
      setMessage("Select at least one day.");
      return;
    }

    const saved: ScheduleEntry = {
      id: editingId ?? uid(),
      ...form,
      title: form.title.trim(),
      code: form.code.trim(),
      room: form.room.trim(),
      maxAbsences: Math.max(1, form.maxAbsences || 3),
    };

    setEntries((current) =>
      editingId
        ? current.map((entry) => (entry.id === editingId ? saved : entry))
        : [...current, saved],
    );
    setSelectedDay(saved.days[0] ?? selectedDay);
    resetForm(saved.days[0] ?? selectedDay);
    setMessage(
      conflict
        ? "Saved with a time conflict warning."
        : "Schedule saved on the selected days.",
    );
  }

  function editEntry(entry: ScheduleEntry) {
    const { id, ...rest } = entry;
    setEditingId(id);
    setForm(rest);
    setSelectedDay(entry.days[0] ?? selectedDay);
    setMessage("");
    goToAddItem("title");
  }

  // Duplicate / Clone Class (Phase 3)
  function duplicateEntry(entry: ScheduleEntry) {
    const clone: ScheduleEntry = {
      ...entry,
      id: uid(),
      title: `${entry.title} (Copy)`,
    };
    setEntries((current) => [...current, clone]);
    setMessage(`Duplicated ${entry.title}.`);
  }

  function deleteEntry(id: string) {
    setEntries((current) => current.filter((entry) => entry.id !== id));
    if (editingId === id) {
      resetForm();
    }
    setMessage("Schedule item removed.");
  }

  function clearAllEntries() {
    if (entries.length === 0) return;
    if (window.confirm("Are you sure you want to clear all schedule items?")) {
      setEntries([]);
      resetForm();
      setMessage("All schedule items cleared.");
    }
  }

  // Attendance Handlers (Phase 5)
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
    setMessage(`Recorded "${status}" for today's class.`);
  }

  function handleClearAttendance() {
    if (window.confirm("Are you sure you want to reset all attendance logs?")) {
      setAttendanceRecords([]);
      setMessage("Attendance logs reset.");
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
        `${holidays.length} public holidays recorded for ${location.countryName}.`,
      );
    } catch (error) {
      const detail =
        typeof error === "object" && error && "message" in error
          ? String((error as { message: unknown }).message)
          : "Allow location access or select your country manually below.";
      setMessage(`Holiday detection not completed. ${detail}`);
    } finally {
      setHolidayLoading(false);
    }
  }

  // Manual Country Selection (Phase 7)
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
      setMessage(`Could not load holidays for ${found.name}. Please check internet connection.`);
    } finally {
      setHolidayLoading(false);
    }
  }

  // Custom School Breaks (Phase 7)
  function handleAddCustomBreak(e: React.FormEvent) {
    e.preventDefault();
    if (!customBreakName.trim() || !customBreakStart || !customBreakEnd) {
      setMessage("Please fill in break name, start date, and end date.");
      return;
    }
    const newBreak: CustomBreak = {
      id: uid(),
      name: customBreakName.trim(),
      startDate: customBreakStart,
      endDate: customBreakEnd,
    };
    setHolidayCalendar((current) => ({
      ...current,
      customBreaks: [...(current.customBreaks || []), newBreak],
    }));
    setCustomBreakName("");
    setCustomBreakStart("");
    setCustomBreakEnd("");
    setShowAddBreak(false);
    setMessage(`Added school break: "${newBreak.name}". Alarms are paused during this period.`);
  }

  function handleRemoveCustomBreak(id: string) {
    setHolidayCalendar((current) => ({
      ...current,
      customBreaks: (current.customBreaks || []).filter((b) => b.id !== id),
    }));
    setMessage("Removed school break.");
  }

  async function enableNotifications() {
    if (!("Notification" in window)) {
      setNotificationState("unsupported");
      setMessage("This browser does not support local notifications.");
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationState(permission);
    setMessage(
      permission === "granted"
        ? "Local reminders are on while SmartSched is open or installed."
        : "Notifications were not enabled.",
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
        setMessage("Backup imported and saved on this device.");
      } catch {
        setMessage("That backup file is not valid SmartSched data.");
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
        ? "Calendar downloaded. Recorded holidays and breaks are excluded from alarms."
        : "Calendar file downloaded. Open it on your phone to add alarms.",
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
    setMessage(
      `${selectedWallpaperSize.label} ${format} wallpaper (${sizeLabel}) downloaded.`,
    );
  }

  // Web Share API support (Phase 6)
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
      setMessage("Wallpaper shared successfully.");
    } catch {
      // User canceled share dialog or browser lacks file share support; fallback
    }
  }

  return (
    <main
      className="min-h-screen w-full max-w-full overflow-x-hidden bg-background pb-28 text-foreground transition-colors duration-200"
      style={brandStyle}
    >
      {/* Top Header */}
      <section className="border-b border-border/80 bg-gradient-to-br from-surface via-surface to-surface-2/80">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-3.5 py-6 sm:px-5 sm:py-8 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              <span className="h-2 w-2 rounded-full bg-primary" />
              SmartSched Local
            </div>
            <h1 className="mt-4 text-2xl font-semibold text-foreground sm:text-3xl lg:text-4xl">
              Schedule, Attendance & Wallpaper Planner
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
              Local-first student scheduler with Philippine school palettes, daily attendance check-in, absence warnings, phone wallpaper exports, and calendar alarms.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            <button
              type="button"
              className="tool-button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? (
                <Sun aria-hidden="true" className="size-4" />
              ) : (
                <MoonStar aria-hidden="true" className="size-4" />
              )}
              {theme === "dark" ? "Light" : "Dark"}
            </button>
            <button
              type="button"
              className="tool-button"
              onClick={() => downloadWallpaper()}
            >
              <ImageDown aria-hidden="true" className="size-4" />
              Wallpaper
            </button>
            <button
              type="button"
              className="tool-button"
              onClick={() => setPreviewOpen(true)}
            >
              <Camera aria-hidden="true" className="size-4" />
              Preview
            </button>
            {canShare ? (
              <button
                type="button"
                className="tool-button"
                onClick={shareWallpaper}
                title="Share wallpaper to lock screen or gallery"
              >
                <Share2 aria-hidden="true" className="size-4" />
                Share
              </button>
            ) : null}
            <button
              type="button"
              className="tool-button"
              onClick={exportCalendar}
            >
              <CalendarClock aria-hidden="true" className="size-4" />
              Alarms
            </button>
            <button
              type="button"
              className="tool-button"
              onClick={enableNotifications}
            >
              <Bell aria-hidden="true" className="size-4" />
              Notify
            </button>
          </div>
        </div>
      </section>

      {/* Quick Action Cards */}
      <section className="mx-auto w-full min-w-0 max-w-7xl px-3.5 py-4 sm:px-5 sm:py-6 lg:px-8">
        <div className="grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            className="neo-card p-4 text-left transition hover:-translate-y-0.5 sm:p-5"
            onClick={() => goToAddItem("title")}
          >
            <p className="text-sm font-semibold text-foreground">1. Add your classes</p>
            <p className="mt-1.5 text-xs leading-5 text-muted sm:text-sm sm:leading-6">
              Use MWF/TTH presets and set maximum allowed cuts per subject.
            </p>
          </button>
          <button
            type="button"
            className="neo-card p-4 text-left transition hover:-translate-y-0.5 sm:p-5"
            onClick={() => setPreviewOpen(true)}
          >
            <p className="text-sm font-semibold text-foreground">2. Download wallpaper</p>
            <p className="mt-1.5 text-xs leading-5 text-muted sm:text-sm sm:leading-6">
              Pick your school palette, customize clock safe margin, and export HD wallpaper.
            </p>
          </button>
          <button
            type="button"
            className="neo-card p-4 text-left transition hover:-translate-y-0.5 sm:p-5"
            onClick={exportCalendar}
          >
            <p className="text-sm font-semibold text-foreground">3. Import alarms</p>
            <p className="mt-1.5 text-xs leading-5 text-muted sm:text-sm sm:leading-6">
              Download the `.ics` file with automatic public holiday & break exclusions.
            </p>
          </button>
        </div>
      </section>

      {/* Main Grid Body */}
      <section className="mx-auto grid w-full min-w-0 max-w-7xl gap-4 px-3.5 py-4 sm:gap-5 sm:px-5 sm:py-6 lg:grid-cols-[390px_minmax(0,1fr)] lg:px-8">
        {/* Left Column: Form & Settings */}
        <div className="order-2 w-full min-w-0 space-y-4 sm:space-y-5 lg:order-1">
          {/* Schedule & School Palette Panel */}
          <Panel title="Schedule & Palette">
            <div className="grid gap-3">
              <TextInput
                label="Wallpaper title"
                value={settings.wallpaperTitle}
                onChange={(value) =>
                  setSettings((current) => ({ ...current, wallpaperTitle: value }))
                }
              />
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
              <button
                className="secondary-button"
                type="button"
                onClick={() => setPreviewOpen(true)}
              >
                <Camera aria-hidden="true" className="size-4" />
                Customize wallpaper
              </button>
            </div>
          </Panel>

          {/* Add / Edit Item Form */}
          <Panel
            title={editingId ? "Edit Class / Activity" : "Add Class / Activity"}
            sectionRef={addItemPanelRef}
          >
            <div className="grid gap-3">
              <TextInput
                label="Subject or activity"
                value={form.title}
                onChange={(value) => updateForm("title", value)}
                placeholder="e.g. Data Structures"
                inputRef={titleInputRef}
                required
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <TextInput
                  label="Code"
                  value={form.code}
                  onChange={(value) => updateForm("code", value)}
                  placeholder="e.g. CS 201"
                />
                <Field label="Type">
                  <select
                    className="field"
                    value={form.type}
                    onChange={(event) =>
                      updateFormType(event.target.value as ScheduleType)
                    }
                  >
                    {scheduleTypes.map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                </Field>
              </div>

              {/* Day Selection with Quick Presets */}
              <Field label="Days">
                <div className="flex flex-wrap gap-1.5 pb-1 text-xs">
                  <span className="self-center font-semibold text-muted">Presets:</span>
                  <button
                    type="button"
                    className="rounded-md border border-border bg-surface-2 px-2 py-0.5 font-semibold text-foreground hover:border-primary"
                    onClick={() => applyDayPreset("MWF")}
                  >
                    MWF
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-border bg-surface-2 px-2 py-0.5 font-semibold text-foreground hover:border-primary"
                    onClick={() => applyDayPreset("TTH")}
                  >
                    TTH
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-border bg-surface-2 px-2 py-0.5 font-semibold text-foreground hover:border-primary"
                    onClick={() => applyDayPreset("Weekdays")}
                  >
                    Mon–Fri
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-border bg-surface-2 px-2 py-0.5 font-semibold text-foreground hover:border-primary"
                    onClick={() => applyDayPreset("All")}
                  >
                    All Days
                  </button>
                </div>

                <div className="grid w-full grid-cols-7 gap-1 sm:gap-2">
                  {days.map((day) => {
                    const selected = form.days.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        className={
                          selected
                            ? "flex min-h-9 items-center justify-center rounded-lg bg-primary px-0.5 py-1.5 text-xs font-semibold text-white shadow-sm sm:min-h-11 sm:rounded-xl sm:px-2 sm:text-sm"
                            : "flex min-h-9 items-center justify-center rounded-lg border border-border bg-surface px-0.5 py-1.5 text-xs font-semibold text-muted hover:border-primary/50 sm:min-h-11 sm:rounded-xl sm:px-2 sm:text-sm"
                        }
                        aria-pressed={selected}
                        onClick={() => toggleFormDay(day)}
                      >
                        {day.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </Field>

              {/* Time Pickers */}
              <div className="grid gap-3 sm:grid-cols-2">
                <TextInput
                  label="Start"
                  type="time"
                  value={form.start}
                  onChange={(value) => updateForm("start", value)}
                  inputRef={startInputRef}
                  required
                />
                <TextInput
                  label="End"
                  type="time"
                  value={form.end}
                  onChange={(value) => updateForm("end", value)}
                  required
                />
              </div>

              {/* Room, Reminder & Max Cuts */}
              <div className="grid gap-3 sm:grid-cols-3">
                <TextInput
                  label="Room"
                  value={form.room}
                  onChange={(value) => updateForm("room", value)}
                  placeholder="Room 302"
                />
                <TextInput
                  label="Alarm (mins)"
                  type="number"
                  value={String(form.reminderMinutes)}
                  onChange={(value) =>
                    updateForm("reminderMinutes", Math.max(0, Number(value)))
                  }
                />
                <TextInput
                  label="Max Cuts"
                  type="number"
                  placeholder="3"
                  value={String(form.maxAbsences ?? 3)}
                  onChange={(value) =>
                    updateForm("maxAbsences", Math.max(1, Number(value) || 3))
                  }
                />
              </div>

              {/* Accent color picker */}
              <Field label="Accent color">
                <div className="flex items-center gap-3">
                  <input
                    aria-label="Subject accent color"
                    className="h-11 w-14 rounded-xl border border-border bg-surface p-1"
                    type="color"
                    value={form.accentColor}
                    onChange={(event) =>
                      updateForm("accentColor", event.target.value)
                    }
                  />
                  <div className="flex flex-wrap gap-2">
                    {accentPresets.map((color) => (
                      <button
                        key={color}
                        type="button"
                        aria-label={`Use accent ${color}`}
                        className="size-8 rounded-full border border-white/70 shadow-sm"
                        style={{
                          backgroundColor: color,
                          boxShadow:
                            form.accentColor === color
                              ? `0 0 0 3px ${color}55`
                              : undefined,
                        }}
                        onClick={() => updateForm("accentColor", color)}
                      />
                    ))}
                  </div>
                </div>
              </Field>

              {conflict ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                  <AlertTriangle aria-hidden="true" className="mr-1.5 inline size-4 text-amber-600 dark:text-amber-400" />
                  Time conflict detected on selected day(s). Both items will still be saved and exported.
                </p>
              ) : null}

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button className="primary-button" onClick={saveEntry}>
                  <Save aria-hidden="true" className="size-4" />
                  {editingId ? "Update" : "Save"}
                </button>
                <button className="secondary-button" onClick={() => resetForm()}>
                  <Plus aria-hidden="true" className="size-4" />
                  New
                </button>
              </div>
            </div>
          </Panel>

          {/* Holiday & Break Protection */}
          <Panel title="Holidays & School Breaks">
            <div className="grid gap-3">
              <div className="neo-inset p-4">
                <div className="flex items-start gap-3">
                  <span className="rounded-xl bg-primary/12 p-2 text-primary">
                    <MapPin aria-hidden="true" className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground">
                      {holidayCalendar.countryName || "Location / country not selected"}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      {holidayCalendar.countryCode
                        ? `${holidayCalendar.holidays.length} public holidays recorded`
                        : "Select country or detect location to pause alarms on holidays."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Country dropdown selector (Phase 7) */}
              <Field label="Select country manually (No GPS required)">
                <select
                  className="field"
                  value={holidayCalendar.countryCode}
                  onChange={(e) => handleSelectCountry(e.target.value)}
                  disabled={holidayLoading}
                >
                  <option value="">-- Choose Country --</option>
                  {popularCountries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </Field>

              <button
                className="secondary-button"
                type="button"
                disabled={holidayLoading}
                onClick={detectAndRecordHolidays}
              >
                <MapPin aria-hidden="true" className="size-4" />
                {holidayLoading ? "Detecting location..." : "Auto-detect location"}
              </button>

              <ToggleControl
                label="Pause reminders on holidays & breaks"
                checked={holidayCalendar.enabled}
                onChange={(enabled) =>
                  setHolidayCalendar((current) => ({ ...current, enabled }))
                }
              />

              {/* Custom School Breaks Section (Phase 7) */}
              <div className="border-t border-border/80 pt-3">
                <div className="flex items-center justify-between pb-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">
                    Custom School Breaks
                  </p>
                  <button
                    type="button"
                    className="text-xs font-semibold text-primary hover:underline"
                    onClick={() => setShowAddBreak(!showAddBreak)}
                  >
                    {showAddBreak ? "Cancel" : "+ Add break"}
                  </button>
                </div>

                {showAddBreak ? (
                  <form
                    onSubmit={handleAddCustomBreak}
                    className="grid gap-2 rounded-xl border border-border bg-surface-2 p-3 mb-2"
                  >
                    <input
                      className="field text-xs py-1"
                      placeholder="Break name (e.g. Sem Break, Intrams)"
                      value={customBreakName}
                      onChange={(e) => setCustomBreakName(e.target.value)}
                      required
                    />
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[11px] text-muted">Start</span>
                        <input
                          type="date"
                          className="field text-xs py-1"
                          value={customBreakStart}
                          onChange={(e) => setCustomBreakStart(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <span className="text-[11px] text-muted">End</span>
                        <input
                          type="date"
                          className="field text-xs py-1"
                          value={customBreakEnd}
                          onChange={(e) => setCustomBreakEnd(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <button type="submit" className="primary-button min-h-9 text-xs">
                      Save Break
                    </button>
                  </form>
                ) : null}

                {(holidayCalendar.customBreaks || []).length > 0 ? (
                  <div className="grid gap-1.5">
                    {holidayCalendar.customBreaks?.map((b) => (
                      <div
                        key={b.id}
                        className="flex items-center justify-between rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs"
                      >
                        <div>
                          <p className="font-semibold text-foreground">{b.name}</p>
                          <p className="text-[11px] text-muted">
                            {b.startDate} to {b.endDate}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="text-danger hover:opacity-80"
                          onClick={() => handleRemoveCustomBreak(b.id)}
                          aria-label={`Remove break ${b.name}`}
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              {nextHolidays.length > 0 ? (
                <div className="grid gap-2 pt-2">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                    Upcoming holidays
                  </p>
                  {nextHolidays.map((holiday) => (
                    <div
                      key={`${holiday.date}-${holiday.name}`}
                      className="rounded-xl border border-border bg-surface-2 px-3 py-2"
                    >
                      <p className="text-sm font-semibold text-foreground">
                        {holiday.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {holiday.date}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </Panel>

          {/* Local Backup Files */}
          <Panel title="Local Backup & Transfer">
            <div className="grid gap-3">
              <button className="secondary-button" onClick={exportBackup}>
                <FileDown aria-hidden="true" className="size-4" />
                Backup JSON
              </button>
              <button
                className="secondary-button"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload aria-hidden="true" className="size-4" />
                Import backup
              </button>
              {entries.length > 0 ? (
                <button
                  type="button"
                  className="secondary-button text-danger hover:border-danger/60"
                  onClick={clearAllEntries}
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                  Clear all classes
                </button>
              ) : null}
              <input
                ref={fileInputRef}
                className="hidden"
                type="file"
                accept="application/json"
                onChange={importBackup}
              />
              <p className="text-xs leading-5 text-muted">
                Stores your schedule, attendance logs, and custom breaks. Use before switching browsers or phones.
              </p>
            </div>
          </Panel>
        </div>

        {/* Right Column: Attendance, Weekly Matrix, Overview */}
        <div className="order-1 w-full min-w-0 space-y-4 sm:space-y-5 lg:order-2">
          {holidayToday ? (
            <div className="neo-card border-primary/40 px-3.5 py-3 sm:px-4" role="status">
              <div className="flex items-start gap-3">
                <CalendarDays aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {holidayToday.name}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    Today is an observed holiday or break. Alarms and notifications are paused.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {message ? (
            <div className="neo-card px-3.5 py-3 text-sm text-foreground sm:px-4" role="status">
              {message}
            </div>
          ) : null}

          {/* Key Metrics Bar */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4">
            <Metric label="Classes" value={String(entries.length)} />
            <Metric
              label="Notification"
              value={
                notificationState === "unsupported"
                  ? "No"
                  : notificationState === "granted"
                    ? "On"
                    : "Off"
              }
            />
            <Metric
              label="Attendance Logs"
              value={String(attendanceRecords.length)}
            />
            <Metric
              label="Wallpaper"
              value={formatWallpaperSize(
                selectedWallpaperSize.width,
                selectedWallpaperSize.height,
              )}
            />
          </div>

          {/* Attendance Tracker (Phase 5) */}
          <AttendanceTracker
            entries={entries}
            records={attendanceRecords}
            todayName={todayName}
            todayDateKey={todayDateKey}
            onRecordAttendance={handleRecordAttendance}
            onClearAttendance={handleClearAttendance}
          />

          {/* Schedule View (Toggleable Day View / Timetable Grid View) */}
          <Panel
            title="Class Schedule"
            action={
              <div className="flex items-center gap-1 rounded-xl border border-border/70 bg-surface-2 p-1">
                <button
                  type="button"
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    viewMode === "day"
                      ? "bg-surface text-foreground shadow-xs font-bold"
                      : "text-muted hover:text-foreground"
                  }`}
                  onClick={() => setViewMode("day")}
                >
                  <List className="size-3.5" />
                  Day List
                </button>
                <button
                  type="button"
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    viewMode === "grid"
                      ? "bg-surface text-foreground shadow-xs font-bold"
                      : "text-muted hover:text-foreground"
                  }`}
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="size-3.5" />
                  Timetable Grid
                </button>
              </div>
            }
          >
            {viewMode === "grid" ? (
              <TimetableGrid
                entries={entries}
                visibleDays={visibleOverviewDays}
                onEditEntry={editEntry}
              />
            ) : (
              <div>
                {/* Day selector tabs */}
                <div className="mb-4 grid w-full grid-cols-7 gap-1 sm:gap-2">
                  {days.map((day) => (
                    <button
                      key={day}
                      type="button"
                      className={
                        selectedDay === day
                          ? "flex min-h-9 items-center justify-center rounded-lg bg-primary px-0.5 py-1.5 text-xs font-semibold text-white shadow-sm sm:min-h-10 sm:rounded-xl sm:px-3 sm:text-sm"
                          : "flex min-h-9 items-center justify-center rounded-lg border border-border bg-surface px-0.5 py-1.5 text-xs font-semibold text-muted hover:border-primary/50 sm:min-h-10 sm:rounded-xl sm:px-3 sm:text-sm"
                      }
                      onClick={() => {
                        setSelectedDay(day);
                        if (form.days.length === 1) {
                          updateForm("days", [day]);
                        }
                      }}
                    >
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {selectedEntries.length > 0 ? (
                    selectedEntries.map((entry) => (
                      <ScheduleRow
                        key={entry.id}
                        entry={entry}
                        allEntries={entries}
                        onEdit={() => editEntry(entry)}
                        onDuplicate={() => duplicateEntry(entry)}
                        onDelete={() => deleteEntry(entry.id)}
                      />
                    ))
                  ) : (
                    <div className="neo-inset p-5 text-center text-sm text-muted sm:p-6 sm:col-span-2">
                      No schedule items for {selectedDay}.
                    </div>
                  )}
                </div>
              </div>
            )}
          </Panel>

          {/* Full Week Overview Cards */}
          <div className="grid gap-3 sm:gap-4">
            {visibleOverviewDays.map((day) => {
              const dayEntries = entriesForDay(entries, day);

              return (
                <div
                  key={day}
                  className="neo-card grid min-w-0 max-w-full gap-3 p-3.5 sm:gap-4 sm:p-4 md:grid-cols-[130px_1fr] md:items-center"
                >
                  <div className="flex items-center justify-between gap-3 md:block">
                    <h3 className="text-sm font-semibold text-foreground sm:text-base">
                      {day}
                    </h3>
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary md:mt-2 md:inline-flex">
                      {dayEntries.length} item{dayEntries.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="grid min-w-0 max-w-full gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {dayEntries.length > 0 ? (
                      dayEntries.map((entry) => (
                        <div
                          key={entry.id}
                          className="rounded-xl border border-border/80 bg-surface-2 p-3 text-xs"
                          style={{
                            borderLeftWidth: "4px",
                            borderLeftColor: entry.accentColor,
                          }}
                        >
                          <div className="flex items-center justify-between gap-1 font-semibold text-muted">
                            <span>{formatTime(entry.start)} – {formatTime(entry.end)}</span>
                            <span>{entry.type}</span>
                          </div>
                          <p className="mt-1 font-semibold text-foreground text-sm truncate">
                            {entry.title}
                          </p>
                          <p className="text-muted truncate">
                            {[entry.code, entry.room].filter(Boolean).join(" - ")}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted">No classes scheduled.</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Wallpaper Preview Dialog */}
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

      {/* Feedback Widget */}
      <FeedbackWidget
        schoolPaletteId={settings.schoolPaletteId}
        deviceSize={selectedWallpaperSize}
        onEmailOpened={() =>
          setMessage("Draft opened in your email app addressed to the developer.")
        }
      />
    </main>
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
