"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { MoonStar, Plus, Sun } from "lucide-react";
import type {
  AppTab,
  DayName,
  HolidayCalendar,
  ScheduleEntry,
  ScheduleSettings,
  ScheduleViewMode,
  WallpaperDevice,
} from "@/lib/types";
import { detectDeviceType } from "@/lib/wallpaper-devices";
import {
  defaultHolidayCalendar,
  detectHolidayLocation,
  fetchPublicHolidays,
  holidayCalendarNeedsRefresh,
  holidayForDate,
  popularCountries,
  upcomingHolidays,
} from "@/lib/holidays";
import { dayNameForDate, hasTimeConflict, sortEntries, uid } from "@/lib/utils";
import { getSchoolPalette } from "@/lib/school-palettes";
import { formatWallpaperSize } from "@/lib/wallpaper-renderer";
import {
  defaultSettings,
  parseScheduleData,
  readStoredSchedule,
  serializeSchedule,
  storageKeys,
  writeStoredSchedule,
} from "@/lib/schedule-storage";
import { buildIcs } from "@/lib/ics";
import { checkDueNotifications, getNotificationPermission } from "@/lib/reminders";
import { downloadBlob, downloadText } from "@/lib/download";
import {
  detectDeviceWallpaperSize,
  getWallpaperSizePreset,
  renderWallpaperBlob,
  type ScreenSize,
} from "@/lib/wallpaper-export";
import { clearShareHash, decodeSharedSchedule, readShareHash, type SharedSchedule } from "@/lib/share-link";
import { PhonePreviewDialog } from "@/components/wallpaper/wallpaper-modal";
import { EntryFormSheet, type EntryFormValues } from "@/components/schedule/entry-form-sheet";
import { ScheduleView } from "@/components/schedule/schedule-view";
import { TodayView } from "@/components/today/today-view";
import { MoreView } from "@/components/more/more-view";
import { FeedbackWidget } from "@/components/feedback-widget";
import { BrandLockup } from "@/components/brand/brand";
import { SplashGate } from "@/components/brand/splash-gate";
import { SupportButton, SupportSheet } from "@/components/brand/support";
import { PrivacyBanner } from "@/components/brand/privacy-notice";
import { ShareScheduleSheet } from "@/components/share/share-schedule-sheet";
import { ImportSharedSheet } from "@/components/share/import-shared-sheet";
import {
  AppToast,
  BottomTabBar,
  DesktopTabs,
  FeedbackBubble,
  ShareButton,
  type Toast,
} from "@/components/app-shell/app-navigation";
import { brand } from "@/lib/brand";

const NOW_REFRESH_MS = 30_000;
const REMINDER_CHECK_MS = 30_000;
const TOAST_MS = 3_500;
const TOAST_WITH_ACTION_MS = 6_000;
const THEME_COLORS = { dark: "#141414", light: "#f4f4f1" } as const;

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
};

type FormState = {
  initial: EntryFormValues;
  editingId: string | null;
};

export function ScheduleApp() {
  const [settings, setSettings] = useState<ScheduleSettings>(defaultSettings);
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [tab, setTab] = useState<AppTab>("today");
  const [viewMode, setViewMode] = useState<ScheduleViewMode>("day");
  const [holidayCalendar, setHolidayCalendar] = useState<HolidayCalendar>(defaultHolidayCalendar);
  const [holidayLoading, setHolidayLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DayName>("Monday");
  const [formState, setFormState] = useState<FormState | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [notificationState, setNotificationState] =
    useState<NotificationPermission | "unsupported">("unsupported");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [storageReady, setStorageReady] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [privacyNoteDismissed, setPrivacyNoteDismissed] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  // A schedule someone sent via a `#share=…` link, waiting for the student to accept.
  const [incomingShare, setIncomingShare] = useState<SharedSchedule | null>(null);
  const [canShare, setCanShare] = useState(false);
  const [detectedDeviceSize, setDetectedDeviceSize] = useState<ScreenSize>({
    width: 1080,
    height: 1920,
  });
  const [detectedDevice, setDetectedDevice] = useState<WallpaperDevice>("Phone");

  const holidayRefreshAttemptedRef = useRef(false);
  const saveWarningShownRef = useRef(false);

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
        setPrivacyNoteDismissed(localStorage.getItem(storageKeys.privacyNote) === "1");
        // Dark by default to match the GetLaunchPH tools; light only if the student chose it.
        const storedTheme = localStorage.getItem(storageKeys.theme);
        if (storedTheme === "dark" || storedTheme === "light") {
          setTheme(storedTheme);
        }
      } catch {
        // Storage blocked (private mode): show the privacy note and keep the default theme.
        setPrivacyNoteDismissed(false);
      }

      const current = new Date();
      setNow(current);
      setSelectedDay(dayNameForDate(current));
      setNotificationState(getNotificationPermission());
      setDetectedDeviceSize(detectDeviceWallpaperSize());
      setDetectedDevice(detectDeviceType());
      setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
      setStorageReady(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  // Opened from a classmate's share link? Decode it and ask before touching the schedule.
  // Also listens for hash changes: pasting a link into an already-open tab doesn't reload.
  useEffect(() => {
    let cancelled = false;
    function handleShareHash() {
      const encoded = readShareHash(window.location.hash);
      if (!encoded) return;
      void decodeSharedSchedule(encoded).then((shared) => {
        if (cancelled) return;
        clearShareHash();
        if (shared && shared.entries.length > 0) {
          setIncomingShare(shared);
        } else {
          setToast({
            id: Date.now(),
            text: "That share link is broken or incomplete. Ask your classmate to send it again.",
          });
        }
      });
    }
    handleShareHash();
    window.addEventListener("hashchange", handleShareHash);
    return () => {
      cancelled = true;
      window.removeEventListener("hashchange", handleShareHash);
    };
  }, []);

  // Keep "now" fresh so the Today view's countdowns stay accurate.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), NOW_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, []);

  // Update detected device size on resize
  useEffect(() => {
    function updateDetectedSize() {
      setDetectedDeviceSize(detectDeviceWallpaperSize());
      setDetectedDevice(detectDeviceType());
    }
    window.addEventListener("resize", updateDetectedSize);
    window.addEventListener("orientationchange", updateDetectedSize);
    return () => {
      window.removeEventListener("resize", updateDetectedSize);
      window.removeEventListener("orientationchange", updateDetectedSize);
    };
  }, []);

  // Sync to localStorage. If the browser refuses (full / private mode), warn once.
  useEffect(() => {
    if (!storageReady) return;
    const saved = writeStoredSchedule({ settings, entries, holidayCalendar });
    if (!saved && !saveWarningShownRef.current) {
      saveWarningShownRef.current = true;
      setToast({
        id: Date.now(),
        text: "This browser isn't saving your schedule (private mode or storage full). Save a backup.",
      });
    }
  }, [settings, entries, holidayCalendar, storageReady]);

  // Sync theme
  useEffect(() => {
    if (!storageReady) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    // Match the mobile browser / installed-app status bar to the page background.
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", THEME_COLORS[theme]);
    try {
      localStorage.setItem(storageKeys.theme, theme);
    } catch {
      // Can't remember the theme; it resets to dark next visit.
    }
  }, [theme, storageReady]);

  // Notification loop
  useEffect(() => {
    if (notificationState !== "granted") return;
    const timer = window.setInterval(() => {
      checkDueNotifications(entries, holidayCalendar);
    }, REMINDER_CHECK_MS);
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
    const timer = window.setTimeout(() => setToast(null), toast.action ? TOAST_WITH_ACTION_MS : TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const sortedEntries = useMemo(() => sortEntries(entries), [entries]);
  const selectedWallpaperSize = useMemo(
    () => getWallpaperSizePreset(settings, detectedDeviceSize, detectedDevice),
    [detectedDevice, detectedDeviceSize, settings],
  );
  const nextHolidays = useMemo(
    () => upcomingHolidays(holidayCalendar),
    [holidayCalendar],
  );

  const todayName = now ? dayNameForDate(now) : "Monday";
  const nowMinutes = now ? now.getHours() * 60 + now.getMinutes() : undefined;
  const holidayToday = useMemo(
    () => (now ? holidayForDate(holidayCalendar, now) : undefined),
    [holidayCalendar, now],
  );

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
      // After adding a class, offer the next step: designing the wallpaper.
      editingId ? undefined : { label: "Design wallpaper", onClick: openWallpaperStep },
    );
  }

  function openShare() {
    if (entries.length === 0) {
      setMessage("Add a class first, then you can share your schedule.");
      return;
    }
    setShareOpen(true);
  }

  function openWallpaperStep() {
    setToast(null);
    setPreviewOpen(true);
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
      serializeSchedule({ settings, entries, holidayCalendar }, true),
      "application/json",
    );
    setMessage("Backup saved to your downloads.");
  }

  function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const restored = parseScheduleData(JSON.parse(String(reader.result)));
        if (!restored) {
          throw new Error("Not a SmartSched backup");
        }
        setSettings(restored.settings);
        setEntries(restored.entries);
        setHolidayCalendar(restored.holidayCalendar);
        setMessage("Backup restored on this device.");
      } catch {
        setMessage("That file isn't a valid SmartSched backup.");
      } finally {
        input.value = "";
      }
    };
    reader.onerror = () => {
      setMessage("Couldn't read that file. Try saving the backup again.");
      input.value = "";
    };
    reader.readAsText(file);
  }

  /** Accepts a classmate's shared schedule, either added to or replacing the current one. */
  function acceptIncomingShare(mode: "add" | "replace") {
    if (!incomingShare) return;
    const previous = entries;
    const incoming = incomingShare.entries;
    setEntries(mode === "replace" ? incoming : [...previous, ...incoming]);
    setIncomingShare(null);
    goToTab("schedule");
    setMessage(
      `${mode === "replace" ? "Replaced your schedule with" : "Added"} ${incoming.length} shared ${
        incoming.length === 1 ? "class" : "classes"
      }.`,
      {
        label: "Undo",
        onClick: () => {
          setEntries(previous);
          setToast(null);
        },
      },
    );
  }

  function exportCalendar() {
    const ics = buildIcs({
      calendarName: `${getSchoolPalette(settings.schoolPaletteId).name} Schedule`,
      entries: sortedEntries,
      holidayCalendar,
    });
    downloadText("smartsched-reminders.ics", ics, "text/calendar");
    setMessage(
      holidayCalendar.enabled &&
        (holidayCalendar.holidays.length > 0 || (holidayCalendar.customBreaks?.length ?? 0) > 0)
        ? "Calendar downloaded. Holidays and breaks are skipped."
        : "Calendar downloaded. Open it on your phone to add the alarms.",
    );
  }

  async function downloadWallpaper(format = settings.wallpaperExportFormat) {
    const blob = await renderWallpaperBlob(settings, sortedEntries, selectedWallpaperSize, format);
    if (!blob) {
      setMessage("Couldn't create the wallpaper on this browser. Try a smaller size.");
      return;
    }

    const { id, width, height } = selectedWallpaperSize;
    const layoutSlug = settings.wallpaperLayoutMode.toLowerCase();
    const extension = format === "JPG" ? "jpg" : "png";
    downloadBlob(`smartsched-wallpaper-${id}-${width}x${height}-${layoutSlug}.${extension}`, blob);
    // Last step of the flow: reminders, so students don't miss class.
    setMessage(`Wallpaper downloaded (${formatWallpaperSize(width, height)} ${format}).`, {
      label: "Set reminders",
      onClick: () => {
        setToast(null);
        setPreviewOpen(false);
        goToTab("more", "reminders");
      },
    });
  }

  async function shareWallpaper() {
    if (typeof navigator === "undefined" || !navigator.share) {
      await downloadWallpaper();
      return;
    }
    const blob = await renderWallpaperBlob(settings, sortedEntries, selectedWallpaperSize, "PNG");
    if (!blob) {
      setMessage("Couldn't create the wallpaper on this browser. Try a smaller size.");
      return;
    }
    const file = new File([blob], "smartsched-schedule-wallpaper.png", { type: "image/png" });

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

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-background text-foreground">
      <SplashGate isAppReady={now !== null} />

      {/* App bar */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 pt-[env(safe-area-inset-top)] backdrop-blur-lg">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 md:h-16">
          <button
            type="button"
            className="min-w-0 text-left"
            onClick={() => goToTab("today")}
            aria-label={`${brand.appName} by ${brand.company}, go to Today`}
          >
            <BrandLockup />
          </button>

          <DesktopTabs activeTab={tab} onSelect={(next) => goToTab(next)} />

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="icon-button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? (
                <Sun aria-hidden="true" className="size-5" />
              ) : (
                <MoonStar aria-hidden="true" className="size-5" />
              )}
            </button>
            <ShareButton onClick={openShare} />
            <SupportButton onClick={() => setSupportOpen(true)} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-56 pt-5 sm:px-6 sm:pt-8 md:pb-24">
        {!now ? null : (
          <div key={tab} className="animate-fade-up">
            {tab === "today" ? (
              <div className="grid gap-5">
                {!privacyNoteDismissed ? (
                  <PrivacyBanner
                    onDismiss={() => {
                      setPrivacyNoteDismissed(true);
                      try {
                        localStorage.setItem(storageKeys.privacyNote, "1");
                      } catch {
                        // Can't remember the dismissal; the note just shows again next visit.
                      }
                    }}
                  />
                ) : null}
                <TodayView
                  entries={entries}
                  now={now}
                  todayName={todayName}
                  holidayToday={holidayToday}
                  onEditClass={openEditForm}
                  onAddClass={() => openAddForm(todayName)}
                  onOpenSchedule={() => goToTab("schedule")}
                  onOpenWallpaper={() => setPreviewOpen(true)}
                  onOpenReminders={() => goToTab("more", "reminders")}
                />
              </div>
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
                onPreview={() => setPreviewOpen(true)}
                onNext={openWallpaperStep}
                onSupport={() => setSupportOpen(true)}
              />
            ) : (
              <MoreView
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

      <FeedbackBubble onClick={() => setFeedbackOpen(true)} isAboveFab={showFab} />

      <BottomTabBar activeTab={tab} onSelect={(next) => goToTab(next)} />

      {toast ? <AppToast toast={toast} isAboveFab={showFab} /> : null}

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
          detectedDevice={detectedDevice}
          onClose={() => setPreviewOpen(false)}
          onDownload={downloadWallpaper}
          onShare={shareWallpaper}
        />
      ) : null}

      {supportOpen ? <SupportSheet onClose={() => setSupportOpen(false)} /> : null}

      {shareOpen ? (
        <ShareScheduleSheet
          entries={sortedEntries}
          title={settings.wallpaperTitle || "Class Schedule"}
          schoolPaletteId={settings.schoolPaletteId}
          canShare={canShare}
          onMessage={setMessage}
          onClose={() => setShareOpen(false)}
        />
      ) : null}

      {/* Wait for local data to load so "Add" vs "Replace" reflects the real schedule. */}
      {incomingShare && storageReady ? (
        <ImportSharedSheet
          shared={incomingShare}
          existingCount={entries.length}
          onAdd={() => acceptIncomingShare("add")}
          onReplace={() => acceptIncomingShare("replace")}
          onClose={() => setIncomingShare(null)}
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
