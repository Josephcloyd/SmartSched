import {
  days,
  type DayName,
  type ScheduleEntry,
  type ScheduleSettings,
  type ScheduleType,
  type WallpaperLayoutMode,
  type WallpaperStyle,
} from "@/lib/types";
import { getSchoolPalette, type SchoolPalette, schoolPalettes } from "@/lib/school-palettes";
import { entriesForDay, formatTime } from "@/lib/utils";

export const typeStyle: Record<ScheduleType, string> = {
  Class: "#256f53",
  Laboratory: "#26727f",
  Quiz: "#7b5aa6",
  Exam: "#b42318",
  Assignment: "#b55d2c",
  Event: "#3f5f9e",
};

export type WallpaperCardColors = {
  card: string;
  time: string;
  title: string;
  detail: string;
};

export type WallpaperPalette = {
  pageStart: string;
  pageMid: string;
  pageEnd: string;
  headerStart: string;
  headerMid: string;
  headerEnd: string;
  text: string;
  muted: string;
  soft: string;
  panel: string;
  panelAlt: string;
  line: string;
  emptyPanel: string;
  card: string;
  time: string;
  grid: string;
};

export type WallpaperLayoutProfile = {
  spacingScale: number;
  paddingScale: number;
  fontScale: number;
};

export function clampNumber(
  value: number,
  min: number,
  max: number,
  fallback: number,
) {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, value));
}

export function formatWallpaperSize(width: number, height: number) {
  return `${width}x${height}`;
}

export function getEntryAccentColor(entry: ScheduleEntry) {
  return entry.accentColor || typeStyle[entry.type] || "#256f53";
}

export function getWallpaperDays(entries: ScheduleEntry[], settings: ScheduleSettings): DayName[] {
  return days.filter((day) => {
    const isWeekend = day === "Saturday" || day === "Sunday";
    const isEmpty = entriesForDay(entries, day).length === 0;

    if (isWeekend && isEmpty) {
      return false;
    }

    if (!settings.wallpaperShowEmptyWeekdays && isEmpty) {
      return false;
    }

    return true;
  });
}

export function hexToRgba(hex: string, alpha: number) {
  const value = hex.replace("#", "");
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function shadeHex(hex: string, intensity: number) {
  const value = hex.replace("#", "");
  const channel = (start: number) =>
    Math.round(Number.parseInt(value.slice(start, start + 2), 16) * intensity)
      .toString(16)
      .padStart(2, "0");
  return `#${channel(0)}${channel(2)}${channel(4)}`;
}

export function getWallpaperPalette(
  style: WallpaperStyle,
  schoolPalette: SchoolPalette = schoolPalettes[0],
): WallpaperPalette {
  const palettes: Record<WallpaperStyle, WallpaperPalette> = {
    "School Palette": {
      pageStart: schoolPalette.uiPrimary,
      pageMid: schoolPalette.uiPrimaryStrong,
      pageEnd: shadeHex(schoolPalette.uiAccent, 0.32),
      headerStart: schoolPalette.uiPrimary,
      headerMid: schoolPalette.uiPrimaryStrong,
      headerEnd: shadeHex(schoolPalette.uiAccent, 0.42),
      text: "#ffffff",
      muted: "#d5e0e8",
      soft: "#ffffff",
      panel: hexToRgba(schoolPalette.uiPrimary, 0.72),
      panelAlt: hexToRgba(schoolPalette.uiPrimaryStrong, 0.82),
      line: schoolPalette.uiAccent,
      emptyPanel: "rgba(255, 255, 255, 0.1)",
      card: hexToRgba(schoolPalette.uiPrimaryStrong, 0.94),
      time: hexToRgba(schoolPalette.uiAccent, 0.38),
      grid: "rgba(255, 255, 255, 0.055)",
    },
    "Soft Charcoal": {
      pageStart: "#20252c",
      pageMid: "#1f2630",
      pageEnd: "#171d24",
      headerStart: "#2b323b",
      headerMid: "#252d36",
      headerEnd: "#1d242c",
      text: "#eef3f7",
      muted: "#b8c3ce",
      soft: "#f7fbff",
      panel: "#353c46",
      panelAlt: "#303842",
      line: "#8fa1b3",
      emptyPanel: "rgba(226, 235, 244, 0.12)",
      card: "#222934",
      time: "#3b4654",
      grid: "rgba(226, 235, 244, 0.045)",
    },
    Sage: {
      pageStart: "#eef4ef",
      pageMid: "#e4ede6",
      pageEnd: "#d7e4dd",
      headerStart: "#fbfdfc",
      headerMid: "#f0f6f2",
      headerEnd: "#e5eee9",
      text: "#14241b",
      muted: "#4f675b",
      soft: "#102018",
      panel: "#f8faf8",
      panelAlt: "#edf4ef",
      line: "#91a79d",
      emptyPanel: "rgba(39, 58, 50, 0.08)",
      card: "#ffffff",
      time: "#e5eee9",
      grid: "rgba(83, 108, 96, 0.07)",
    },
    "Warm Gray": {
      pageStart: "#eeece8",
      pageMid: "#e3e0da",
      pageEnd: "#d8d3cc",
      headerStart: "#fbfaf7",
      headerMid: "#f1eee8",
      headerEnd: "#e6e1d8",
      text: "#251f1a",
      muted: "#665d53",
      soft: "#1d1815",
      panel: "#f8f6f2",
      panelAlt: "#eeeae3",
      line: "#a69b8e",
      emptyPanel: "rgba(64, 55, 47, 0.08)",
      card: "#fffdfa",
      time: "#e9e4dc",
      grid: "rgba(86, 74, 64, 0.07)",
    },
    Paper: {
      pageStart: "#f7f6ef",
      pageMid: "#efede4",
      pageEnd: "#e5e1d7",
      headerStart: "#fffefa",
      headerMid: "#f5f2e9",
      headerEnd: "#ebe5da",
      text: "#1f2521",
      muted: "#5f665f",
      soft: "#161d18",
      panel: "#fffefa",
      panelAlt: "#f2efe6",
      line: "#a1a89e",
      emptyPanel: "rgba(47, 55, 49, 0.08)",
      card: "#ffffff",
      time: "#ece9df",
      grid: "rgba(70, 78, 72, 0.065)",
    },
    "High Contrast": {
      pageStart: "#121417",
      pageMid: "#171a1e",
      pageEnd: "#0f1115",
      headerStart: "#22262c",
      headerMid: "#1c2026",
      headerEnd: "#15191e",
      text: "#fbf8ee",
      muted: "#d7d1c3",
      soft: "#fffaf0",
      panel: "#242931",
      panelAlt: "#1f242b",
      line: "#d6cfc0",
      emptyPanel: "rgba(255, 250, 240, 0.12)",
      card: "#11151a",
      time: "#30363f",
      grid: "rgba(255, 250, 240, 0.055)",
    },
  };

  return palettes[style];
}

export function getWallpaperLayoutProfile(
  layoutMode: WallpaperLayoutMode,
): WallpaperLayoutProfile {
  const profiles: Record<WallpaperLayoutMode, WallpaperLayoutProfile> = {
    Compact: {
      spacingScale: 0.7,
      paddingScale: 0.8,
      fontScale: 0.94,
    },
    Balanced: {
      spacingScale: 1,
      paddingScale: 1,
      fontScale: 1,
    },
    Spacious: {
      spacingScale: 1.3,
      paddingScale: 1.18,
      fontScale: 1.06,
    },
  };

  return profiles[layoutMode];
}

export function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, Math.max(0, Math.min(radius, height / 2, width / 2)));
  ctx.fill();
}

/*
 * Layout engine
 *
 * Everything is sized in "units": roughly one CSS pixel on the target screen
 * (a 1080px-wide phone image has 3 canvas px per unit). Text sizes are therefore
 * real, readable sizes instead of shrinking with the number of classes.
 *
 * For each wallpaper the engine tries a few item styles (full cards, compact
 * one-line rows) and column counts, works out how far each must be scaled to fit,
 * and keeps the one with the largest text. Long titles are truncated with "…"
 * rather than shrunk.
 */

const FONT_STACK = '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const font = (weight: number, size: number) => `${weight} ${Math.round(size)}px ${FONT_STACK}`;

type ItemStyle = "card" | "row";

type ItemSpec = {
  height: number;
  minWidth: number;
  maxWidth: number;
  gap: number;
  timeWidth: number;
  title: number;
  detail: number;
  time: number;
};

// Base sizes in units, before the text-size setting and scale-to-fit are applied.
const itemSpecs: Record<ItemStyle, ItemSpec> = {
  card: { height: 50, minWidth: 210, maxWidth: 440, gap: 7, timeWidth: 70, title: 15, detail: 11.5, time: 12.5 },
  row: { height: 27, minWidth: 200, maxWidth: 440, gap: 4, timeWidth: 62, title: 13.5, detail: 11.5, time: 12 },
};

// Rows are less informative than cards, so they need clearly bigger text to win.
const ROW_STYLE_PENALTY = 0.8;
// Phones stay single-column (full titles, easy to scan) unless that would push
// text below this fraction of its normal size.
const PHONE_SINGLE_COLUMN_MIN_SCALE = 0.78;
const MAX_FIT_SCALE = 1.15;

type LayoutMetrics = {
  textScale: number;
  dayScale: number;
  spacing: number;
  padding: number;
};

type DayGroup = {
  day: DayName;
  entries: ScheduleEntry[];
};

type LayoutChoice = {
  style: ItemStyle;
  columns: number;
  scale: number;
};

function getLayoutMetrics(settings: ScheduleSettings): LayoutMetrics {
  const profile = getWallpaperLayoutProfile(settings.wallpaperLayoutMode);
  return {
    textScale:
      clampNumber(settings.wallpaperCardTextSize / 28, 0.65, 1.5, 1) * profile.fontScale,
    dayScale:
      clampNumber(settings.wallpaperDayLabelSize / 52, 0.6, 1.5, 1) * profile.fontScale,
    spacing: profile.spacingScale,
    padding: profile.paddingScale,
  };
}

function itemHeight(style: ItemStyle, metrics: LayoutMetrics) {
  return itemSpecs[style].height * metrics.textScale;
}

function itemGap(style: ItemStyle, metrics: LayoutMetrics) {
  return itemSpecs[style].gap * metrics.spacing;
}

function gridHeight(count: number, columns: number, style: ItemStyle, metrics: LayoutMetrics) {
  const rows = Math.ceil(count / columns);
  return rows * itemHeight(style, metrics) + Math.max(0, rows - 1) * itemGap(style, metrics);
}

function gridMinWidth(columns: number, style: ItemStyle, metrics: LayoutMetrics) {
  return (
    columns * itemSpecs[style].minWidth * metrics.textScale +
    (columns - 1) * itemGap(style, metrics)
  );
}

// Phone layout: each day is a panel with the day name on top and classes stacked below.
function phoneGeometry(metrics: LayoutMetrics) {
  return {
    groupPad: 10 * metrics.padding,
    headerHeight: 22 * metrics.dayScale,
    headerGap: 7 * metrics.spacing,
    dayGap: 9 * metrics.spacing,
  };
}

function measurePhone(groups: DayGroup[], style: ItemStyle, columns: number, metrics: LayoutMetrics) {
  const g = phoneGeometry(metrics);
  const height =
    groups.reduce((sum, group) => {
      const items =
        group.entries.length > 0
          ? g.headerGap + gridHeight(group.entries.length, columns, style, metrics)
          : 0;
      return sum + g.groupPad * 2 + g.headerHeight + items;
    }, 0) +
    Math.max(0, groups.length - 1) * g.dayGap;
  const width = g.groupPad * 2 + gridMinWidth(columns, style, metrics);
  return { height, width };
}

// Desktop layout: each day is a row with the day name on the left and a class grid on the right.
function desktopGeometry(metrics: LayoutMetrics) {
  return {
    dayColumn: 84 * metrics.dayScale,
    rowPad: 10 * metrics.padding,
    rowMinHeight: 46 * metrics.dayScale,
    dayGap: 8 * metrics.spacing,
  };
}

function desktopRowHeight(count: number, style: ItemStyle, columns: number, metrics: LayoutMetrics) {
  const g = desktopGeometry(metrics);
  if (count === 0) return g.rowMinHeight;
  return Math.max(g.rowMinHeight, g.rowPad * 2 + gridHeight(count, columns, style, metrics));
}

function measureDesktop(groups: DayGroup[], style: ItemStyle, columns: number, metrics: LayoutMetrics) {
  const g = desktopGeometry(metrics);
  const height =
    groups.reduce(
      (sum, group) => sum + desktopRowHeight(group.entries.length, style, columns, metrics),
      0,
    ) +
    Math.max(0, groups.length - 1) * g.dayGap;
  const width = g.dayColumn + g.rowPad * 2 + gridMinWidth(columns, style, metrics);
  return { height, width };
}

function chooseLayout(
  groups: DayGroup[],
  isPhone: boolean,
  availableWidth: number,
  availableHeight: number,
  unit: number,
  metrics: LayoutMetrics,
  autoFit: boolean,
): LayoutChoice {
  const busiestDay = Math.max(1, ...groups.map((group) => group.entries.length));
  const maxColumns = isPhone ? Math.min(2, busiestDay) : Math.min(6, busiestDay);
  const candidates: (LayoutChoice & { score: number })[] = [];

  for (const style of ["card", "row"] as const) {
    for (let columns = 1; columns <= maxColumns; columns += 1) {
      const size = isPhone
        ? measurePhone(groups, style, columns, metrics)
        : measureDesktop(groups, style, columns, metrics);
      const widthFit = availableWidth / (size.width * unit);
      const heightFit = autoFit ? availableHeight / (size.height * unit) : Infinity;
      const scale = Math.min(MAX_FIT_SCALE, widthFit, heightFit);
      const score =
        scale *
        (style === "row" ? ROW_STYLE_PENALTY : 1) *
        // On wide screens, extra columns only help if they buy real text size.
        (isPhone ? 1 : 1 - (columns - 1) * 0.015);
      candidates.push({ style, columns, scale, score });
    }
  }

  const pickBest = (list: typeof candidates) =>
    list.reduce((best, candidate) => (candidate.score > best.score ? candidate : best));

  if (isPhone) {
    const singleColumn = pickBest(candidates.filter((candidate) => candidate.columns === 1));
    if (singleColumn.scale >= PHONE_SINGLE_COLUMN_MIN_SCALE) {
      return singleColumn;
    }
  }
  return pickBest(candidates);
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (maxWidth <= 0) return "";
  if (ctx.measureText(text).width <= maxWidth) return text;
  let low = 0;
  let high = text.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (ctx.measureText(`${text.slice(0, mid).trimEnd()}…`).width <= maxWidth) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }
  return low > 0 ? `${text.slice(0, low).trimEnd()}…` : "";
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  weight: number,
  size: number,
  color: string,
  align: CanvasTextAlign = "left",
) {
  ctx.font = font(weight, size);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(fitText(ctx, text, maxWidth), x, y);
  ctx.textAlign = "left";
}

function entryDetail(entry: ScheduleEntry) {
  return [entry.room, entry.code].filter(Boolean).join(" · ");
}

function withRoundedClip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  draw: () => void,
) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, Math.min(radius, height / 2));
  ctx.clip();
  draw();
  ctx.restore();
}

/** Full card: accent edge, time block (start/end), title, and room/code line. */
function drawCardItem(
  ctx: CanvasRenderingContext2D,
  entry: ScheduleEntry,
  x: number,
  y: number,
  width: number,
  height: number,
  t: number,
  palette: WallpaperPalette,
) {
  const spec = itemSpecs.card;
  const accent = getEntryAccentColor(entry);
  const edge = 4.5 * t;

  withRoundedClip(ctx, x, y, width, height, 10 * t, () => {
    ctx.fillStyle = palette.card;
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = accent;
    ctx.fillRect(x, y, edge, height);
  });

  const timeX = x + edge + 6 * t;
  const timeWidth = spec.timeWidth * t;
  roundedRect(ctx, timeX, y + 6 * t, timeWidth, height - 12 * t, 7 * t, palette.time);
  const midY = y + height / 2;
  drawText(ctx, formatTime(entry.start), timeX + timeWidth / 2, midY - 0.5 * t, timeWidth - 8 * t, 700, spec.time * t, palette.soft, "center");
  drawText(ctx, formatTime(entry.end), timeX + timeWidth / 2, midY + spec.time * t * 0.95, timeWidth - 8 * t, 600, (spec.time - 1.5) * t, palette.muted, "center");

  const contentX = timeX + timeWidth + 10 * t;
  const contentWidth = x + width - contentX - 10 * t;
  const detail = entryDetail(entry) || entry.type;
  drawText(ctx, entry.title, contentX, midY - 1 * t, contentWidth, 700, spec.title * t, palette.soft);
  drawText(ctx, detail, contentX, midY + spec.detail * t + 2 * t, contentWidth, 500, spec.detail * t, palette.muted);
}

/** Compact one-line row for busy schedules: time · title · room. */
function drawRowItem(
  ctx: CanvasRenderingContext2D,
  entry: ScheduleEntry,
  x: number,
  y: number,
  width: number,
  height: number,
  t: number,
  palette: WallpaperPalette,
) {
  const spec = itemSpecs.row;
  const accent = getEntryAccentColor(entry);
  const edge = 4 * t;

  withRoundedClip(ctx, x, y, width, height, 7 * t, () => {
    ctx.fillStyle = palette.card;
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = accent;
    ctx.fillRect(x, y, edge, height);
  });

  const baseline = y + height / 2 + spec.title * t * 0.36;
  const timeX = x + edge + 7 * t;
  drawText(ctx, formatTime(entry.start), timeX, baseline, spec.timeWidth * t - 6 * t, 700, spec.time * t, palette.soft);

  const titleX = timeX + spec.timeWidth * t;
  const right = x + width - 8 * t;
  // One line is tight: show just where to go (room, else code) and favour the title.
  const detail = entry.room || entry.code;
  let detailWidth = 0;
  if (detail) {
    ctx.font = font(500, spec.detail * t);
    detailWidth = Math.min(ctx.measureText(detail).width, (right - titleX) * 0.32);
    drawText(ctx, detail, right, baseline, detailWidth, 500, spec.detail * t, palette.muted, "right");
  }
  drawText(ctx, entry.title, titleX, baseline, right - titleX - (detailWidth ? detailWidth + 10 * t : 0), 700, spec.title * t, palette.soft);
}

function drawItemGrid(
  ctx: CanvasRenderingContext2D,
  entries: ScheduleEntry[],
  x: number,
  y: number,
  width: number,
  choice: LayoutChoice,
  metrics: LayoutMetrics,
  s: number,
  palette: WallpaperPalette,
) {
  const spec = itemSpecs[choice.style];
  const t = s * metrics.textScale;
  const gap = itemGap(choice.style, metrics) * s;
  const height = itemHeight(choice.style, metrics) * s;
  // Multi-column grids fill the row; a lone column is capped so it doesn't
  // stretch into a very wide bar on big screens.
  const fullWidth = (width - gap * (choice.columns - 1)) / choice.columns;
  const columnWidth = choice.columns === 1 ? Math.min(fullWidth, spec.maxWidth * t) : fullWidth;
  const draw = choice.style === "card" ? drawCardItem : drawRowItem;

  entries.forEach((entry, index) => {
    const column = index % choice.columns;
    const row = Math.floor(index / choice.columns);
    draw(
      ctx,
      entry,
      x + column * (columnWidth + gap),
      y + row * (height + gap),
      columnWidth,
      height,
      t,
      palette,
    );
  });
}

function countLabel(count: number) {
  return count === 0 ? "No classes" : `${count} class${count === 1 ? "" : "es"}`;
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  palette: WallpaperPalette,
  gridStep: number,
) {
  const pageGradient = ctx.createLinearGradient(0, 0, width, height);
  pageGradient.addColorStop(0, palette.pageStart);
  pageGradient.addColorStop(0.52, palette.pageMid);
  pageGradient.addColorStop(1, palette.pageEnd);
  ctx.fillStyle = pageGradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = palette.grid;
  for (let x = 0; x < width; x += gridStep) ctx.fillRect(x, 0, 1, height);
  for (let y = 0; y < height; y += gridStep) ctx.fillRect(0, y, width, 1);
}

function drawEmptyMessage(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  unit: number,
  palette: WallpaperPalette,
) {
  roundedRect(ctx, x, y, width, 70 * unit, 16 * unit, palette.emptyPanel);
  drawText(ctx, "Add your classes in SmartSched", x + width / 2, y + 41 * unit, width - 24 * unit, 600, 15 * unit, palette.muted, "center");
}

function getDayGroups(entries: ScheduleEntry[], settings: ScheduleSettings): DayGroup[] {
  return getWallpaperDays(entries, settings).map((day) => ({
    day,
    entries: entriesForDay(entries, day),
  }));
}

function drawPhoneWallpaper(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: ScheduleSettings,
  entries: ScheduleEntry[],
) {
  const schoolPalette = getSchoolPalette(settings.schoolPaletteId);
  const palette = getWallpaperPalette(settings.wallpaperStyle, schoolPalette);
  const metrics = getLayoutMetrics(settings);
  // ~1 unit per CSS px on a phone; height bound keeps tablets from getting huge text.
  const unit = Math.min(width / 360, height / 680);
  const titleScale = clampNumber(settings.wallpaperTitleSize / 58, 0.6, 1.5, 1);
  const titleSize = 24 * unit * titleScale;
  const schoolSize = 12.5 * unit * titleScale;
  const margin = 14 * unit;

  // Leave the top for the lock-screen clock and the bottom for lock-screen shortcuts.
  // Tablet clocks take a much smaller share of the screen than phone clocks.
  const clockShare = settings.wallpaperDevice === "Tablet" ? 0.15 : 0.27;
  const safeTop = settings.wallpaperClockSafetyZone ? height * clockShare : height * 0.06;
  const safeBottom = height * 0.085;
  const titleBaseline = safeTop + titleSize;
  const schoolBaseline = titleBaseline + schoolSize * 1.55;
  const headerBottom = schoolBaseline + 16 * unit;

  drawBackground(ctx, width, height, palette, Math.max(44, 26 * unit));
  const headerGradient = ctx.createLinearGradient(0, 0, width, headerBottom);
  headerGradient.addColorStop(0, palette.headerStart);
  headerGradient.addColorStop(0.55, palette.headerMid);
  headerGradient.addColorStop(1, palette.headerEnd);
  ctx.fillStyle = headerGradient;
  ctx.fillRect(0, 0, width, headerBottom);
  ctx.fillStyle = schoolPalette.colors[0];
  ctx.fillRect(0, headerBottom - 5 * unit, width * 0.72, 5 * unit);
  ctx.fillStyle = schoolPalette.colors[1];
  ctx.fillRect(width * 0.72, headerBottom - 5 * unit, width * 0.28, 5 * unit);

  drawText(ctx, settings.wallpaperTitle || "Class Schedule", margin + 4 * unit, titleBaseline, width - margin * 2, 800, titleSize, palette.soft);
  drawText(ctx, schoolPalette.name, margin + 4 * unit, schoolBaseline, width - margin * 2, 500, schoolSize, palette.muted);

  const boardTop = headerBottom + 14 * unit;
  const boardWidth = width - margin * 2;
  const boardHeight = height - safeBottom - boardTop;
  const groups = getDayGroups(entries, settings);
  if (groups.length === 0) {
    drawEmptyMessage(ctx, margin, boardTop, boardWidth, unit, palette);
    return;
  }

  const choice = chooseLayout(groups, true, boardWidth, boardHeight, unit, metrics, settings.wallpaperAutoFit);
  const s = unit * choice.scale;
  const g = phoneGeometry(metrics);

  let y = boardTop;
  groups.forEach((group, index) => {
    const count = group.entries.length;
    const groupHeight =
      (g.groupPad * 2 +
        g.headerHeight +
        (count > 0 ? g.headerGap + gridHeight(count, choice.columns, choice.style, metrics) : 0)) *
      s;
    roundedRect(ctx, margin, y, boardWidth, groupHeight, 14 * s, index % 2 === 0 ? palette.panel : palette.panelAlt);

    const labelSize = 17 * metrics.dayScale * s;
    const headerBaseline = y + g.groupPad * s + g.headerHeight * s * 0.76;
    const labelX = margin + g.groupPad * s;
    drawText(ctx, group.day.toUpperCase(), labelX, headerBaseline, boardWidth * 0.55, 800, labelSize, palette.text);
    drawText(ctx, countLabel(count), margin + boardWidth - g.groupPad * s, headerBaseline, boardWidth * 0.4, 600, 11.5 * metrics.dayScale * s, palette.muted, "right");

    if (count > 0) {
      drawItemGrid(
        ctx,
        group.entries,
        labelX,
        y + (g.groupPad + g.headerHeight + g.headerGap) * s,
        boardWidth - g.groupPad * s * 2,
        choice,
        metrics,
        s,
        palette,
      );
    }
    y += groupHeight + g.dayGap * s;
  });
}

function drawDesktopWallpaper(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: ScheduleSettings,
  entries: ScheduleEntry[],
) {
  const schoolPalette = getSchoolPalette(settings.schoolPaletteId);
  const palette = getWallpaperPalette(settings.wallpaperStyle, schoolPalette);
  const metrics = getLayoutMetrics(settings);
  // ~1 unit per CSS px on a 1280x720-class display.
  const unit = Math.min(width / 1280, height / 720);
  const titleScale = clampNumber(settings.wallpaperTitleSize / 58, 0.6, 1.5, 1);
  const titleSize = 30 * unit * titleScale;
  const schoolSize = 14 * unit * titleScale;
  const margin = 36 * unit;

  drawBackground(ctx, width, height, palette, Math.max(44, 54 * unit));
  ctx.fillStyle = schoolPalette.colors[0];
  ctx.fillRect(0, 0, width * 0.72, 6 * unit);
  ctx.fillStyle = schoolPalette.colors[1];
  ctx.fillRect(width * 0.72, 0, width * 0.28, 6 * unit);

  const titleBaseline = margin + titleSize;
  const schoolBaseline = titleBaseline + schoolSize * 1.6;
  drawText(ctx, settings.wallpaperTitle || "Class Schedule", margin, titleBaseline, width * 0.6, 800, titleSize, palette.soft);
  drawText(ctx, schoolPalette.name, margin + unit, schoolBaseline, width * 0.6, 500, schoolSize, palette.muted);

  const boardTop = schoolBaseline + 22 * unit;
  const boardWidth = width - margin * 2;
  // Extra bottom room for a taskbar or dock.
  const boardHeight = height - boardTop - Math.max(margin, 48 * unit);
  const groups = getDayGroups(entries, settings);
  if (groups.length === 0) {
    drawEmptyMessage(ctx, margin, boardTop, Math.min(boardWidth, 520 * unit), unit, palette);
    return;
  }

  const choice = chooseLayout(groups, false, boardWidth, boardHeight, unit, metrics, settings.wallpaperAutoFit);
  const s = unit * choice.scale;
  const g = desktopGeometry(metrics);

  let y = boardTop;
  groups.forEach((group, index) => {
    const count = group.entries.length;
    const rowHeight = desktopRowHeight(count, choice.style, choice.columns, metrics) * s;
    roundedRect(ctx, margin, y, boardWidth, rowHeight, 14 * s, index % 2 === 0 ? palette.panel : palette.panelAlt);

    const labelX = margin + g.rowPad * s + 4 * s;
    const labelSize = 19 * metrics.dayScale * s;
    const labelBaseline = y + g.rowPad * s + labelSize * 0.95;
    drawText(ctx, group.day.slice(0, 3).toUpperCase(), labelX, labelBaseline, g.dayColumn * s - g.rowPad * s * 2, 800, labelSize, palette.text);
    if (count > 0) {
      drawText(ctx, countLabel(count), labelX, labelBaseline + 15 * metrics.dayScale * s, g.dayColumn * s - g.rowPad * s * 2, 600, 10.5 * metrics.dayScale * s, palette.muted);
    }
    ctx.fillStyle = palette.line;
    ctx.globalAlpha = 0.6;
    ctx.fillRect(margin + g.dayColumn * s, y + 10 * s, Math.max(1, 1.5 * s), rowHeight - 20 * s);
    ctx.globalAlpha = 1;

    const gridX = margin + g.dayColumn * s + g.rowPad * s;
    const gridWidth = boardWidth - g.dayColumn * s - g.rowPad * s * 2;
    if (count === 0) {
      drawText(ctx, "No classes", gridX, y + rowHeight / 2 + 5 * s, gridWidth, 600, 13 * metrics.textScale * s, palette.muted);
    } else {
      drawItemGrid(ctx, group.entries, gridX, y + g.rowPad * s, gridWidth, choice, metrics, s, palette);
    }
    y += rowHeight + g.dayGap * s;
  });
}

export function drawWallpaper(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: ScheduleSettings,
  entries: ScheduleEntry[],
) {
  ctx.textBaseline = "alphabetic";
  if (width >= height) {
    drawDesktopWallpaper(ctx, width, height, settings, entries);
  } else {
    drawPhoneWallpaper(ctx, width, height, settings, entries);
  }
}
