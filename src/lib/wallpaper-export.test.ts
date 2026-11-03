import { describe, expect, it } from "vitest";
import { getWallpaperSizePreset } from "@/lib/wallpaper-export";
import { defaultSettings } from "@/lib/schedule-storage";

const phoneScreen = { width: 1080, height: 2400 };

describe("getWallpaperSizePreset", () => {
  it("uses this screen in portrait for a phone, even when held sideways", () => {
    const size = getWallpaperSizePreset({ ...defaultSettings, wallpaperDevice: "Phone" }, { width: 2400, height: 1080 }, "Phone");
    expect(size).toMatchObject({ id: "device-auto", width: 1080, height: 2400 });
  });

  it("uses landscape for a laptop", () => {
    const size = getWallpaperSizePreset(
      { ...defaultSettings, wallpaperDevice: "Laptop" },
      { width: 1080, height: 1920 },
      "Laptop",
    );
    expect(size).toMatchObject({ width: 1920, height: 1080 });
  });

  it("switches to that device's default size when designing for a different kind of screen", () => {
    const size = getWallpaperSizePreset({ ...defaultSettings, wallpaperDevice: "Laptop" }, phoneScreen, "Phone");
    expect(size).toMatchObject({ id: "desktop-fhd", width: 1920, height: 1080 });
  });

  it("honours a custom size", () => {
    const size = getWallpaperSizePreset(
      { ...defaultSettings, wallpaperSizeId: "custom", wallpaperCustomWidth: 900, wallpaperCustomHeight: 1600 },
      phoneScreen,
      "Phone",
    );
    expect(size).toMatchObject({ id: "custom", width: 900, height: 1600 });
  });

  it("returns a named preset", () => {
    const size = getWallpaperSizePreset({ ...defaultSettings, wallpaperSizeId: "iphone-se", wallpaperDevice: "Phone" }, phoneScreen, "Phone");
    expect(size).toMatchObject({ id: "iphone-se", width: 750, height: 1334 });
  });
});
