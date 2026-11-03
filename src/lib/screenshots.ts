/**
 * App screenshots in public/screenshots, used by the PWA manifest (richer install sheet on
 * Android/Chrome) and the Software App structured data. Regenerate them at these exact sizes:
 * phone 1080x2337 (390x844 @ 2.77x), desktop 1920x1080 (1280x720 @ 1.5x).
 */
export type AppScreenshot = {
  src: string;
  width: number;
  height: number;
  formFactor: "narrow" | "wide";
  label: string;
};

const PHONE = { width: 1080, height: 2337, formFactor: "narrow" } as const;
const DESKTOP = { width: 1920, height: 1080, formFactor: "wide" } as const;

export const appScreenshots: AppScreenshot[] = [
  { src: "/screenshots/phone-today.webp", ...PHONE, label: "Today: your next class and a countdown" },
  { src: "/screenshots/phone-schedule.webp", ...PHONE, label: "Day view with breaks between classes" },
  { src: "/screenshots/phone-week.webp", ...PHONE, label: "Your whole week at a glance" },
  { src: "/screenshots/phone-wallpaper.webp", ...PHONE, label: "Lock-screen wallpaper in your school colors" },
  { src: "/screenshots/phone-share.webp", ...PHONE, label: "Share your schedule with classmates by QR code" },
  { src: "/screenshots/desktop-today.webp", ...DESKTOP, label: "SmartSched on a laptop" },
  { src: "/screenshots/desktop-grid.webp", ...DESKTOP, label: "Timetable grid of your whole week" },
];
