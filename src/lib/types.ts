export const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export const scheduleTypes = [
  "Class",
  "Laboratory",
  "Quiz",
  "Exam",
  "Assignment",
  "Event",
] as const;

export const wallpaperStyles = [
  "Soft Charcoal",
  "Sage",
  "Warm Gray",
  "Paper",
  "High Contrast",
] as const;

export const wallpaperLayoutModes = ["Compact", "Balanced", "Spacious"] as const;

export const wallpaperExportFormats = ["PNG", "JPG"] as const;

export const wallpaperSizePresets = [
  { id: "custom", group: "Custom", label: "Custom size", width: 1080, height: 1920 },
  { id: "desktop-hd", group: "Desktop", label: "Desktop HD", width: 1366, height: 768 },
  { id: "desktop-fhd", group: "Desktop", label: "Desktop Full HD", width: 1920, height: 1080 },
  { id: "desktop-qhd", group: "Desktop", label: "Desktop QHD", width: 2560, height: 1440 },
  { id: "desktop-4k", group: "Desktop", label: "Desktop 4K UHD", width: 3840, height: 2160 },
  { id: "desktop-16-10", group: "Desktop", label: "Desktop 16:10", width: 2560, height: 1600 },
  { id: "iphone-se", group: "iPhone", label: "iPhone SE 2nd/3rd generation", width: 750, height: 1334 },
  { id: "iphone-xr-11", group: "iPhone", label: "iPhone XR / iPhone 11", width: 828, height: 1792 },
  { id: "iphone-mini", group: "iPhone", label: "iPhone 12 mini / 13 mini", width: 1080, height: 2340 },
  { id: "iphone-x-pro", group: "iPhone", label: "iPhone X / XS / 11 Pro", width: 1125, height: 2436 },
  { id: "iphone-12-16e", group: "iPhone", label: "iPhone 12 / 13 / 14 / 16e", width: 1170, height: 2532 },
  { id: "iphone-14-16", group: "iPhone", label: "iPhone 14 Pro / 15 / 16", width: 1179, height: 2556 },
  { id: "iphone-16-17-pro", group: "iPhone", label: "iPhone 16 Pro / 17 Pro", width: 1206, height: 2622 },
  { id: "iphone-12-pro-max", group: "iPhone", label: "iPhone 12 Pro Max", width: 1284, height: 2778 },
  { id: "iphone-14-15-pro-max", group: "iPhone", label: "iPhone 14 / 15 Pro Max", width: 1290, height: 2796 },
  { id: "iphone-16-pro-max", group: "iPhone", label: "iPhone 16 Pro Max-class", width: 1320, height: 2868 },
  { id: "android-small", group: "Android", label: "Older or small Android", width: 720, height: 1280 },
  { id: "android-budget", group: "Android", label: "Budget Android", width: 720, height: 1600 },
  { id: "android-fhd", group: "Android", label: "Standard Full HD", width: 1080, height: 1920 },
  { id: "android-tall-fhd", group: "Android", label: "Tall Full HD", width: 1080, height: 2160 },
  { id: "android-modern-fhd", group: "Android", label: "Modern Full HD+", width: 1080, height: 2280 },
  { id: "android-common-modern", group: "Android", label: "Common modern Android", width: 1080, height: 2340 },
  { id: "android-most-common", group: "Android", label: "Most common modern Android", width: 1080, height: 2400 },
  { id: "android-tall-variants", group: "Android", label: "Tall Android variants", width: 1080, height: 2460 },
  { id: "android-1-5k", group: "Android", label: "1.5K Android displays", width: 1220, height: 2712 },
  { id: "android-qhd", group: "Android", label: "Older QHD", width: 1440, height: 2560 },
  { id: "android-qhd-samsung", group: "Android", label: "QHD+ Samsung / flagship", width: 1440, height: 2960 },
  { id: "android-modern-qhd", group: "Android", label: "Modern QHD+ flagship", width: 1440, height: 3200 },
] as const;

export type DayName = (typeof days)[number];
export type ScheduleType = (typeof scheduleTypes)[number];
export type WallpaperStyle = (typeof wallpaperStyles)[number];
export type WallpaperLayoutMode = (typeof wallpaperLayoutModes)[number];
export type WallpaperExportFormat = (typeof wallpaperExportFormats)[number];
export type WallpaperSizeGroup = (typeof wallpaperSizePresets)[number]["group"];
export type WallpaperSizeId = (typeof wallpaperSizePresets)[number]["id"];

export type ScheduleEntry = {
  id: string;
  title: string;
  code: string;
  room: string;
  days: DayName[];
  start: string;
  end: string;
  type: ScheduleType;
  reminderMinutes: number;
  accentColor: string;
};

export type ScheduleSettings = {
  ownerName: string;
  schoolName: string;
  wallpaperTitle: string;
  wallpaperStyle: WallpaperStyle;
  wallpaperSizeId: WallpaperSizeId;
  wallpaperCustomWidth: number;
  wallpaperCustomHeight: number;
  wallpaperLayoutMode: WallpaperLayoutMode;
  wallpaperTitleSize: number;
  wallpaperDayLabelSize: number;
  wallpaperCardTextSize: number;
  wallpaperAutoFit: boolean;
  wallpaperShowEmptyWeekdays: boolean;
  wallpaperExportFormat: WallpaperExportFormat;
};
