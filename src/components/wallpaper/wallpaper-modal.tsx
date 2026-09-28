"use client";

import { useEffect, useRef } from "react";
import { ImageDown, Share2, X } from "lucide-react";
import {
  wallpaperExportFormats,
  wallpaperLayoutModes,
  wallpaperSizePresets,
  wallpaperStyles,
  type ScheduleEntry,
  type ScheduleSettings,
  type SchoolPaletteId,
  type WallpaperExportFormat,
  type WallpaperLayoutMode,
  type WallpaperSizeGroup,
  type WallpaperSizeId,
  type WallpaperStyle,
} from "@/lib/types";
import {
  getSchoolPalette,
  schoolPalettes,
  type SchoolPalette,
} from "@/lib/school-palettes";
import {
  clampNumber,
  drawWallpaper,
  formatWallpaperSize,
  getWallpaperPalette,
} from "@/lib/wallpaper-renderer";
import {
  Field,
  RangeControl,
  ToggleControl,
} from "@/components/ui/form-controls";

const wallpaperSizeGroups: WallpaperSizeGroup[] = [
  "Device",
  "Custom",
  "Desktop",
  "iPhone",
  "Android",
];

export type WallpaperSizePreset = (typeof wallpaperSizePresets)[number];
export type SelectedWallpaperSize = Omit<WallpaperSizePreset, "width" | "height"> & {
  width: number;
  height: number;
};

export function clampWallpaperDimension(value: number) {
  return clampNumber(Math.round(value), 320, 8000, 1080);
}

export function SchoolPalettePicker({
  selectedId,
  onChange,
}: {
  selectedId: SchoolPaletteId;
  onChange: (palette: SchoolPalette) => void;
}) {
  return (
    <Field label="Philippine school palette">
      <select
        className="field"
        value={selectedId}
        onChange={(event) =>
          onChange(getSchoolPalette(event.target.value as SchoolPaletteId))
        }
      >
        {(["State universities", "Private universities"] as const).map(
          (category) => (
            <optgroup key={category} label={category}>
              {schoolPalettes
                .filter((palette) => palette.category === category)
                .map((palette) => (
                  <option key={palette.id} value={palette.id}>
                    {palette.name}
                  </option>
                ))}
            </optgroup>
          ),
        )}
      </select>
      <div className="flex items-center gap-2" aria-label="Selected school colors">
        {getSchoolPalette(selectedId).colors.map((color) => (
          <span
            key={color}
            className="h-7 flex-1 rounded-lg border-2 border-border"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    </Field>
  );
}

export function WallpaperTemplatePicker({
  value,
  schoolPaletteId,
  onChange,
}: {
  value: WallpaperStyle;
  schoolPaletteId: SchoolPaletteId;
  onChange: (style: WallpaperStyle) => void;
}) {
  return (
    <Field label="Wallpaper template">
      <div className="grid grid-cols-2 gap-2">
        {wallpaperStyles.map((style) => {
          const palette = getWallpaperPalette(
            style,
            getSchoolPalette(schoolPaletteId),
          );
          const selected = value === style;

          return (
            <button
              key={style}
              type="button"
              aria-pressed={selected}
              className={
                selected
                  ? "template-option border-primary ring-2 ring-primary/30"
                  : "template-option border-border"
              }
              onClick={() => onChange(style)}
            >
              <span
                className="template-preview"
                style={{
                  background: `linear-gradient(145deg, ${palette.headerStart}, ${palette.pageEnd})`,
                }}
              >
                <span style={{ backgroundColor: palette.panel }} />
                <span style={{ backgroundColor: palette.card }} />
              </span>
              <span>{style}</span>
            </button>
          );
        })}
      </div>
    </Field>
  );
}

export function WallpaperControls({
  settings,
  setSettings,
  sizePreset,
}: {
  settings: ScheduleSettings;
  setSettings: (updater: (current: ScheduleSettings) => ScheduleSettings) => void;
  sizePreset: SelectedWallpaperSize;
}) {
  return (
    <div className="grid gap-3">
      <WallpaperTemplatePicker
        value={settings.wallpaperStyle}
        schoolPaletteId={settings.schoolPaletteId}
        onChange={(wallpaperStyle) =>
          setSettings((current) => ({ ...current, wallpaperStyle }))
        }
      />
      <Field label="Layout">
        <select
          className="field"
          value={settings.wallpaperLayoutMode}
          onChange={(event) =>
            setSettings((current) => ({
              ...current,
              wallpaperLayoutMode: event.target.value as WallpaperLayoutMode,
            }))
          }
        >
          {wallpaperLayoutModes.map((layout) => (
            <option key={layout} value={layout}>
              {layout}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Wallpaper size">
        <select
          className="field"
          value={settings.wallpaperSizeId}
          onChange={(event) =>
            setSettings((current) => ({
              ...current,
              wallpaperSizeId: event.target.value as WallpaperSizeId,
            }))
          }
        >
          {wallpaperSizeGroups.map((group) => (
            <optgroup key={group} label={group}>
              {wallpaperSizePresets
                .filter((preset) => preset.group === group)
                .map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.id === "device-auto"
                      ? preset.label
                      : `${preset.label} - ${formatWallpaperSize(preset.width, preset.height)}`}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
        {settings.wallpaperSizeId === "custom" ? (
          <div className="grid grid-cols-2 gap-3 text-sm font-medium text-foreground">
            <div className="grid gap-2">
              <span>Width</span>
              <input
                aria-label="Custom wallpaper width"
                className="field"
                type="number"
                min="320"
                max="8000"
                step="1"
                value={String(settings.wallpaperCustomWidth)}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    wallpaperCustomWidth: clampWallpaperDimension(
                      Number(event.target.value),
                    ),
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <span>Height</span>
              <input
                aria-label="Custom wallpaper height"
                className="field"
                type="number"
                min="320"
                max="8000"
                step="1"
                value={String(settings.wallpaperCustomHeight)}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    wallpaperCustomHeight: clampWallpaperDimension(
                      Number(event.target.value),
                    ),
                  }))
                }
              />
            </div>
          </div>
        ) : null}
        <span className="text-xs leading-5 text-muted">
          {settings.wallpaperSizeId === "device-auto" ? "Detected: " : ""}
          {sizePreset.group} / {formatWallpaperSize(sizePreset.width, sizePreset.height)}
        </span>
      </Field>
      <Field label="Export format">
        <select
          className="field"
          value={settings.wallpaperExportFormat}
          onChange={(event) =>
            setSettings((current) => ({
              ...current,
              wallpaperExportFormat: event.target.value as WallpaperExportFormat,
            }))
          }
        >
          {wallpaperExportFormats.map((format) => (
            <option key={format} value={format}>
              {format}
            </option>
          ))}
        </select>
      </Field>
      <RangeControl
        label="Day label size"
        min={28}
        max={76}
        value={settings.wallpaperDayLabelSize}
        onChange={(value) =>
          setSettings((current) => ({
            ...current,
            wallpaperDayLabelSize: value,
          }))
        }
      />
      <RangeControl
        label="Class card text"
        min={18}
        max={42}
        value={settings.wallpaperCardTextSize}
        onChange={(value) =>
          setSettings((current) => ({
            ...current,
            wallpaperCardTextSize: value,
          }))
        }
      />
      <ToggleControl
        label="Auto-fit wallpaper"
        checked={settings.wallpaperAutoFit}
        onChange={(checked) =>
          setSettings((current) => ({
            ...current,
            wallpaperAutoFit: checked,
          }))
        }
      />
      <ToggleControl
        label="Show empty weekdays"
        checked={settings.wallpaperShowEmptyWeekdays}
        onChange={(checked) =>
          setSettings((current) => ({
            ...current,
            wallpaperShowEmptyWeekdays: checked,
          }))
        }
      />
      <ToggleControl
        label="Lock-screen clock safe margin"
        checked={Boolean(settings.wallpaperClockSafetyZone)}
        onChange={(checked) =>
          setSettings((current) => ({
            ...current,
            wallpaperClockSafetyZone: checked,
          }))
        }
      />
    </div>
  );
}

export function WallpaperCanvasPreview({
  settings,
  entries,
  sizePreset,
}: {
  settings: ScheduleSettings;
  entries: ScheduleEntry[];
  sizePreset: SelectedWallpaperSize;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isPortrait = sizePreset.height >= sizePreset.width;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    canvas.width = sizePreset.width;
    canvas.height = sizePreset.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    drawWallpaper(ctx, canvas.width, canvas.height, settings, entries);
  }, [entries, settings, sizePreset]);

  return (
    <div className="mx-auto w-full" style={{ maxWidth: isPortrait ? 430 : 920 }}>
      <div
        className={
          isPortrait
            ? "rounded-[42px] bg-[#08080a] p-3 shadow-[0_38px_90px_-36px_rgba(0,0,0,0.62)] ring-1 ring-white/10"
            : "rounded-[28px] bg-[#121316] p-3 shadow-[0_38px_90px_-36px_rgba(0,0,0,0.62)] ring-1 ring-white/10"
        }
      >
        <canvas
          ref={canvasRef}
          className={
            isPortrait
              ? "block h-auto w-full rounded-[32px]"
              : "block h-auto w-full rounded-[18px]"
          }
          style={{ aspectRatio: `${sizePreset.width} / ${sizePreset.height}` }}
        />
      </div>
      <div className="neo-card mt-3 p-4 text-sm leading-6 text-muted">
        This canvas uses the exact wallpaper renderer that creates the downloaded file.
      </div>
    </div>
  );
}

export function PhonePreviewDialog({
  settings,
  setSettings,
  entries,
  sizePreset,
  onClose,
  onDownload,
  onShare,
}: {
  settings: ScheduleSettings;
  setSettings: (updater: (current: ScheduleSettings) => ScheduleSettings) => void;
  entries: ScheduleEntry[];
  sizePreset: SelectedWallpaperSize;
  onClose: () => void;
  onDownload: (format?: WallpaperExportFormat) => void | Promise<void>;
  onShare?: () => void | Promise<void>;
}) {
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/72 px-4 py-5 backdrop-blur-sm sm:px-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="phone-preview-title"
    >
      <div className="mx-auto flex min-h-full w-full max-w-7xl items-center justify-center">
        <div className="w-full rounded-2xl border border-white/10 bg-surface p-4 shadow-[0_32px_110px_-30px_rgba(0,0,0,0.7)] sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2
                id="phone-preview-title"
                className="text-lg font-semibold text-foreground"
              >
                Wallpaper Preview & Customizer
              </h2>
              <p className="mt-1 text-sm text-muted">
                {sizePreset.label} -{" "}
                {formatWallpaperSize(sizePreset.width, sizePreset.height)} -{" "}
                {settings.wallpaperLayoutMode}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canShare && onShare ? (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => onShare()}
                  title="Share directly via mobile share sheet"
                >
                  <Share2 aria-hidden="true" className="size-4" />
                  Share
                </button>
              ) : null}
              <button
                className="primary-button"
                onClick={() => onDownload(settings.wallpaperExportFormat)}
              >
                <ImageDown aria-hidden="true" className="size-4" />
                Download {settings.wallpaperExportFormat}
              </button>
              <button
                className="secondary-button"
                onClick={() =>
                  onDownload(settings.wallpaperExportFormat === "PNG" ? "JPG" : "PNG")
                }
              >
                <ImageDown aria-hidden="true" className="size-4" />
                {settings.wallpaperExportFormat === "PNG" ? "JPG" : "PNG"}
              </button>
              <button
                className="secondary-button"
                aria-label="Close phone preview"
                onClick={onClose}
              >
                <X aria-hidden="true" className="size-4" />
                Close
              </button>
            </div>
          </div>
          <div className="grid gap-5 lg:grid-cols-[320px_1fr] lg:items-start">
            <div className="neo-inset p-4 lg:max-h-[78vh] lg:overflow-y-auto">
              <WallpaperControls
                settings={settings}
                setSettings={setSettings}
                sizePreset={sizePreset}
              />
            </div>
            <WallpaperCanvasPreview
              settings={settings}
              entries={entries}
              sizePreset={sizePreset}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
