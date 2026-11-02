import {
  wallpaperDevices,
  wallpaperSizePresets,
  type WallpaperDevice,
  type WallpaperSizeGroup,
  type WallpaperSizeId,
} from "@/lib/types";

/** Size preset groups offered for each kind of screen. */
export const deviceSizeGroups: Record<WallpaperDevice, WallpaperSizeGroup[]> = {
  Phone: ["iPhone", "Android"],
  Tablet: ["Tablet"],
  Laptop: ["Desktop"],
};

/** Used when the wallpaper is for a different kind of screen than the one in hand. */
export const defaultSizeForDevice: Record<WallpaperDevice, WallpaperSizeId> = {
  Phone: "android-most-common",
  Tablet: "tablet-ipad",
  Laptop: "desktop-fhd",
};

export const deviceDescriptions: Record<WallpaperDevice, string> = {
  Phone: "Tall lock-screen layout with room for the clock",
  Tablet: "Tall layout sized for iPad and Android tablets",
  Laptop: "Wide layout for a laptop or desktop background",
};

const TABLET_USER_AGENT = /iPad|Tablet|PlayBook|Silk|Android(?!.*Mobile)/i;

/** Best guess at what kind of screen this browser is running on. */
export function detectDeviceType(): WallpaperDevice {
  if (typeof window === "undefined") return "Phone";
  const shortSide = Math.min(window.screen.width, window.screen.height);
  if (shortSide < 600) return "Phone";
  const isTouch = navigator.maxTouchPoints > 1;
  // iPadOS reports a Mac user agent, so a touch-capable "Mac" is an iPad.
  const isIpadAsMac = /Macintosh/.test(navigator.userAgent) && isTouch;
  if (isTouch && (TABLET_USER_AGENT.test(navigator.userAgent) || isIpadAsMac)) return "Tablet";
  return "Laptop";
}

export function isWallpaperDevice(value: unknown): value is WallpaperDevice {
  return typeof value === "string" && (wallpaperDevices as readonly string[]).includes(value);
}

/** Infers the target device for settings saved before the device choice existed. */
export function deviceForSizeId(
  sizeId: WallpaperSizeId,
  detected: WallpaperDevice,
  customWidth: number,
  customHeight: number,
): WallpaperDevice {
  if (sizeId === "device-auto") return detected;
  if (sizeId === "custom") return customHeight > customWidth ? "Phone" : "Laptop";
  const group = wallpaperSizePresets.find((preset) => preset.id === sizeId)?.group;
  const match = wallpaperDevices.find((device) =>
    deviceSizeGroups[device].some((deviceGroup) => deviceGroup === group),
  );
  return match ?? detected;
}

/** The size to use when the student switches to `device`. */
export function sizeIdForDevice(device: WallpaperDevice, detected: WallpaperDevice): WallpaperSizeId {
  return device === detected ? "device-auto" : defaultSizeForDevice[device];
}
