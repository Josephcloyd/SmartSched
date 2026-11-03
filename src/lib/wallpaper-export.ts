import { wallpaperSizePresets, type ScheduleEntry, type ScheduleSettings, type WallpaperDevice } from "@/lib/types";
import { defaultSizeForDevice } from "@/lib/wallpaper-devices";
import { drawWallpaper } from "@/lib/wallpaper-renderer";
import type { SelectedWallpaperSize } from "@/components/wallpaper/wallpaper-modal";

export type ScreenSize = { width: number; height: number };

const FALLBACK_SCREEN: ScreenSize = { width: 1080, height: 1920 };
const JPG_QUALITY = 0.92;

/** This screen's size in physical pixels (what a wallpaper needs). */
export function detectDeviceWallpaperSize(): ScreenSize {
  if (typeof window === "undefined") {
    return FALLBACK_SCREEN;
  }
  const pixelRatio = Math.max(1, window.devicePixelRatio || 1);
  return {
    width: Math.round(window.screen.width * pixelRatio) || FALLBACK_SCREEN.width,
    height: Math.round(window.screen.height * pixelRatio) || FALLBACK_SCREEN.height,
  };
}

export function getWallpaperSizePreset(
  settings: ScheduleSettings,
  detectedDeviceSize: ScreenSize,
  detectedDevice: WallpaperDevice,
): SelectedWallpaperSize {
  const device = settings.wallpaperDevice ?? detectedDevice;
  // "This device" only makes sense when the wallpaper is for the kind of screen in hand.
  const sizeId =
    settings.wallpaperSizeId === "device-auto" && device !== detectedDevice
      ? defaultSizeForDevice[device]
      : settings.wallpaperSizeId;

  if (sizeId === "device-auto") {
    // Phones and tablets get tall wallpapers even if held sideways right now.
    const long = Math.max(detectedDeviceSize.width, detectedDeviceSize.height);
    const short = Math.min(detectedDeviceSize.width, detectedDeviceSize.height);
    const portrait = device !== "Laptop";
    return {
      id: "device-auto",
      group: "Device",
      label: "This device (automatic)",
      width: portrait ? short : long,
      height: portrait ? long : short,
    };
  }
  if (sizeId === "custom") {
    return {
      id: "custom",
      group: "Custom",
      label: "Custom size",
      width: settings.wallpaperCustomWidth,
      height: settings.wallpaperCustomHeight,
    };
  }
  return wallpaperSizePresets.find((item) => item.id === sizeId) ?? wallpaperSizePresets[2];
}

/** Renders the wallpaper off-screen and returns it as an image file (or null if the browser can't). */
export async function renderWallpaperBlob(
  settings: ScheduleSettings,
  entries: ScheduleEntry[],
  size: ScreenSize,
  format: "PNG" | "JPG" = "PNG",
): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }
  drawWallpaper(ctx, canvas.width, canvas.height, settings, entries);
  const mimeType = format === "JPG" ? "image/jpeg" : "image/png";
  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, mimeType, format === "JPG" ? JPG_QUALITY : 1),
  );
}
