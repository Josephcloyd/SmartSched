"use client";

import { useEffect, useRef } from "react";
import { ImageDown, Share2 } from "lucide-react";
import {
  wallpaperExportFormats,
  wallpaperLayoutModes,
  wallpaperSizePresets,
  wallpaperStyles,
  type ScheduleEntry,
  type ScheduleSettings,
  type SchoolPaletteId,
  type WallpaperExportFormat,
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
  Sheet,
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
    <Field label="School colors">
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
      <div className="flex items-center gap-1.5" aria-label="Selected school colors">
        {getSchoolPalette(selectedId).colors.map((color) => (
          <span
            key={color}
            className="h-6 flex-1 rounded-lg border border-border"
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
    <Field label="Style">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
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
                  : "template-option border-border hover:border-primary/40"
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
    <div className="grid gap-5">
      <Field label="Wallpaper title">
        <input
          className="field"
          value={settings.wallpaperTitle}
          placeholder="Class Schedule"
          onChange={(event) =>
            setSettings((current) => ({ ...current, wallpaperTitle: event.target.value }))
          }
        />
      </Field>
      <WallpaperTemplatePicker
        value={settings.wallpaperStyle}
        schoolPaletteId={settings.schoolPaletteId}
        onChange={(wallpaperStyle) =>
          setSettings((current) => ({ ...current, wallpaperStyle }))
        }
      />
      <Field label="Spacing">
        <div className="segmented w-full" role="group" aria-label="Wallpaper spacing">
          {wallpaperLayoutModes.map((layout) => (
            <button
              key={layout}
              type="button"
              className="flex-1 justify-center"
              aria-pressed={settings.wallpaperLayoutMode === layout}
              onClick={() =>
                setSettings((current) => ({ ...current, wallpaperLayoutMode: layout }))
              }
            >
              {layout}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Screen size">
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
      <Field label="File type">
        <div className="segmented w-full" role="group" aria-label="Export format">
          {wallpaperExportFormats.map((format) => (
            <button
              key={format}
              type="button"
              className="flex-1 justify-center"
              aria-pressed={settings.wallpaperExportFormat === format}
              onClick={() =>
                setSettings((current) => ({
                  ...current,
                  wallpaperExportFormat: format as WallpaperExportFormat,
                }))
              }
            >
              {format}
            </button>
          ))}
        </div>
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
        label="Class text size"
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
      <div className="grid gap-2">
        <ToggleControl
          label="Auto-fit to screen"
          description="Shrinks text only when your week doesn't fit."
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
          label="Leave room for the lock-screen clock"
          checked={Boolean(settings.wallpaperClockSafetyZone)}
          onChange={(checked) =>
            setSettings((current) => ({
              ...current,
              wallpaperClockSafetyZone: checked,
            }))
          }
        />
      </div>
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
    // Smaller portrait preview on phones so the controls below stay within reach.
    <div className={`mx-auto w-full ${isPortrait ? "max-w-[230px] sm:max-w-[360px]" : "max-w-[920px]"}`}>
      <div
        className={
          isPortrait
            ? "rounded-[40px] bg-[#08080a] p-2.5 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.6)] ring-1 ring-white/10"
            : "rounded-[24px] bg-[#121316] p-2.5 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.6)] ring-1 ring-white/10"
        }
      >
        <canvas
          ref={canvasRef}
          className={
            isPortrait
              ? "block h-auto w-full rounded-[32px]"
              : "block h-auto w-full rounded-[16px]"
          }
          style={{ aspectRatio: `${sizePreset.width} / ${sizePreset.height}` }}
        />
      </div>
      <p className="mt-3 text-center text-xs leading-5 text-muted">
        This is exactly what your downloaded wallpaper will look like.
      </p>
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
    <Sheet
      size="xl"
      title="Wallpaper maker"
      description={`${sizePreset.label} · ${formatWallpaperSize(sizePreset.width, sizePreset.height)}`}
      onClose={onClose}
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {canShare && onShare ? (
            <button
              type="button"
              className="secondary-button"
              onClick={() => onShare()}
              title="Share via your phone's share sheet"
            >
              <Share2 aria-hidden="true" className="size-4" />
              Share
            </button>
          ) : null}
          <button
            type="button"
            className="primary-button flex-1 sm:flex-none"
            onClick={() => onDownload(settings.wallpaperExportFormat)}
          >
            <ImageDown aria-hidden="true" className="size-4" />
            Download {settings.wallpaperExportFormat}
          </button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[340px_1fr] lg:items-start">
        <div className="order-2 lg:order-1">
          <WallpaperControls
            settings={settings}
            setSettings={setSettings}
            sizePreset={sizePreset}
          />
        </div>
        <div className="order-1 lg:sticky lg:top-0 lg:order-2">
          <WallpaperCanvasPreview
            settings={settings}
            entries={entries}
            sizePreset={sizePreset}
          />
        </div>
      </div>
    </Sheet>
  );
}
