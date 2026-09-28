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
      spacingScale: 0.78,
      paddingScale: 0.84,
      fontScale: 0.92,
    },
    Balanced: {
      spacingScale: 1,
      paddingScale: 1,
      fontScale: 1,
    },
    Spacious: {
      spacingScale: 1.24,
      paddingScale: 1.18,
      fontScale: 1.1,
    },
  };

  return profiles[layoutMode];
}

export function getAutoFitScale(
  width: number,
  height: number,
  enabled: boolean,
  isDesktop: boolean,
) {
  if (!enabled) {
    return 1;
  }

  const shortSide = Math.min(width, height);
  const longSide = Math.max(width, height);
  const base = isDesktop ? shortSide / 1080 : shortSide / 1080;
  const tallBonus = !isDesktop && longSide / shortSide > 1.9 ? 1.04 : 1;

  return clampNumber(base * 100 * tallBonus, 78, 112, 100) / 100;
}

export function allocateRowHeights(
  totalHeight: number,
  gap: number,
  demands: number[],
  minimumRowHeight: number,
) {
  if (demands.length === 0) {
    return [];
  }

  const usableHeight = Math.max(
    demands.length,
    totalHeight - gap * Math.max(0, demands.length - 1),
  );
  const baseHeight = Math.min(minimumRowHeight, usableHeight / demands.length);
  const remainingHeight = Math.max(0, usableHeight - baseHeight * demands.length);
  const extraDemands = demands.map((demand) => Math.max(0, demand - 1));
  const totalExtraDemand = extraDemands.reduce((sum, demand) => sum + demand, 0);

  if (totalExtraDemand === 0) {
    return demands.map(() => usableHeight / demands.length);
  }

  return extraDemands.map(
    (demand) => baseHeight + remainingHeight * (demand / totalExtraDemand),
  );
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
  ctx.roundRect(x, y, width, height, radius);
  ctx.fill();
}

export function drawFittedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  minSize: number,
) {
  let size = fontSize;
  while (ctx.measureText(text).width > maxWidth && size > minSize) {
    size -= 1;
    ctx.font = ctx.font.replace(/\d+px/, `${size}px`);
  }
  ctx.fillText(text || "-", x, y);
}

export function drawReadableScheduleCard(
  ctx: CanvasRenderingContext2D,
  entry: ScheduleEntry,
  x: number,
  y: number,
  width: number,
  height: number,
  scale = 1,
  colors: WallpaperCardColors = {
    card: "#222934",
    time: "#3b4654",
    title: "#fbfdff",
    detail: "#c6d1dc",
  },
  cardTextSize = 28,
  profile: WallpaperLayoutProfile = getWallpaperLayoutProfile("Balanced"),
) {
  const accent = getEntryAccentColor(entry);
  const padScale = scale * profile.paddingScale;
  const fontScale = scale * profile.fontScale;
  const pad = (value: number) => value * padScale;
  const fs = (value: number) => value * fontScale;
  const timeWidth = Math.max(pad(116), width * 0.25);
  const contentX = x + timeWidth + pad(22);
  const compactCard = height < pad(64);
  const titleSize = Math.max(
    7,
    Math.min(fs(cardTextSize), height * (compactCard ? 0.42 : 0.3)),
  );
  const detailSize = Math.max(7, Math.min(fs(Math.round(cardTextSize * 0.58)), height * 0.2));
  const timeSize = Math.max(7, Math.min(fs(Math.round(cardTextSize * 0.62)), height * 0.22));
  const endTimeSize = Math.max(7, Math.min(fs(Math.round(cardTextSize * 0.48)), height * 0.18));
  const verticalPad = Math.min(pad(7), Math.max(2, height * 0.12));

  ctx.shadowColor = "rgba(0, 0, 0, 0.22)";
  ctx.shadowBlur = pad(10);
  ctx.shadowOffsetY = pad(3);
  roundedRect(ctx, x, y, width, height, Math.min(pad(16), height * 0.24), colors.card);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.fillStyle = accent;
  ctx.fillRect(x, y, Math.max(4, pad(8)), height);

  roundedRect(
    ctx,
    x + pad(18),
    y + verticalPad,
    timeWidth - pad(30),
    Math.max(1, height - verticalPad * 2),
    Math.min(pad(12), height * 0.2),
    colors.time,
  );
  ctx.fillStyle = colors.title;
  ctx.font = `700 ${timeSize}px Arial`;
  drawFittedText(
    ctx,
    formatTime(entry.start),
    x + pad(30),
    y + height / 2 + (compactCard ? timeSize * 0.34 : -endTimeSize * 0.25),
    timeWidth - pad(54),
    timeSize,
    8,
  );
  if (!compactCard) {
    ctx.fillStyle = colors.detail;
    ctx.font = `700 ${endTimeSize}px Arial`;
    drawFittedText(
      ctx,
      formatTime(entry.end),
      x + pad(30),
      y + height / 2 + endTimeSize * 1.25,
      timeWidth - pad(54),
      endTimeSize,
      7,
    );
  }

  ctx.fillStyle = colors.title;
  ctx.font = `700 ${titleSize}px Arial`;
  drawFittedText(
    ctx,
    entry.title.toUpperCase(),
    contentX,
    y + height / 2 + (compactCard ? titleSize * 0.34 : -detailSize * 0.35),
    width - (contentX - x) - pad(18),
    titleSize,
    9,
  );

  if (!compactCard) {
    ctx.fillStyle = colors.detail;
    ctx.font = `700 ${detailSize}px Arial`;
    drawFittedText(
      ctx,
      [entry.code, entry.room].filter(Boolean).join(" - ") || entry.type,
      contentX,
      y + height / 2 + detailSize * 1.05,
      width - (contentX - x) - pad(18),
      detailSize,
      7,
    );
  }
}

export function drawDesktopWallpaper(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: ScheduleSettings,
  entries: ScheduleEntry[],
) {
  const schoolPalette = getSchoolPalette(settings.schoolPaletteId);
  const palette = getWallpaperPalette(settings.wallpaperStyle, schoolPalette);
  const profile = getWallpaperLayoutProfile(settings.wallpaperLayoutMode);
  const autoScale = getAutoFitScale(width, height, settings.wallpaperAutoFit, true);
  const scale = (width / 1920) * autoScale;
  const spacingScale = scale * profile.spacingScale;
  const paddingScale = scale * profile.paddingScale;
  const fontScale = scale * profile.fontScale;
  const s = (value: number) => value * scale;
  const sp = (value: number) => value * spacingScale;
  const pad = (value: number) => value * paddingScale;
  const fs = (value: number) => value * fontScale;
  const {
    pageStart,
    pageMid,
    pageEnd,
    text: silver,
    muted,
    soft,
    panel,
    panelAlt,
    card,
    line,
  } = palette;
  const pageGradient = ctx.createLinearGradient(0, 0, width, height);
  pageGradient.addColorStop(0, pageStart);
  pageGradient.addColorStop(0.54, pageMid);
  pageGradient.addColorStop(1, pageEnd);
  ctx.fillStyle = pageGradient;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = schoolPalette.colors[0];
  ctx.fillRect(0, 0, width * 0.72, Math.max(6, s(10)));
  ctx.fillStyle = schoolPalette.colors[1];
  ctx.fillRect(width * 0.72, 0, width * 0.28, Math.max(6, s(10)));

  ctx.fillStyle = palette.grid;
  for (let x = 0; x < width; x += Math.max(44, s(82))) {
    ctx.fillRect(x, 0, 1, height);
  }
  for (let y = 0; y < height; y += Math.max(44, s(82))) {
    ctx.fillRect(0, y, width, 1);
  }

  const margin = Math.max(42, pad(72));
  const title = settings.wallpaperTitle || "Class Schedule";
  const titleSize = Math.max(28, fs(settings.wallpaperTitleSize));
  const schoolSize = Math.max(15, fs(Math.round(settings.wallpaperTitleSize * 0.52)));

  ctx.fillStyle = soft;
  ctx.font = `700 ${titleSize}px Arial`;
  drawFittedText(ctx, title, margin, sp(108), width * 0.5, titleSize, 24);
  ctx.fillStyle = muted;
  ctx.font = `400 ${schoolSize}px Arial`;
  drawFittedText(
    ctx,
    schoolPalette.name,
    margin + pad(2),
    sp(154),
    width * 0.48,
    schoolSize,
    13,
  );

  roundedRect(ctx, width - margin - s(320), sp(76), s(320), sp(62), sp(31), "rgba(255, 255, 255, 0.08)");
  ctx.fillStyle = silver;
  ctx.font = `700 ${Math.max(15, fs(24))}px Arial`;
  drawFittedText(
    ctx,
    formatWallpaperSize(width, height),
    width - margin - s(284),
    sp(115),
    s(148),
    Math.max(15, fs(24)),
    12,
  );
  ctx.fillStyle = muted;
  ctx.font = `400 ${Math.max(12, fs(18))}px Arial`;
  drawFittedText(ctx, "DESKTOP", width - margin - s(124), sp(115), s(96), Math.max(12, fs(18)), 10);

  const boardTop = Math.max(sp(196), height * 0.22);
  const boardBottom = height - Math.max(42, sp(72));
  const boardHeight = boardBottom - boardTop;
  const wallpaperDays = getWallpaperDays(entries, settings);
  const rowGap = Math.max(8, sp(14));
  const rowWidth = width - margin * 2;
  const dayWidth = Math.max(pad(142), rowWidth * 0.11);
  const scheduleWidth = rowWidth - dayWidth - pad(48);
  const itemGap = Math.max(8, sp(14));
  const maxColumns = Math.max(
    1,
    Math.floor((scheduleWidth + itemGap) / (Math.max(s(250), 150) + itemGap)),
  );
  const rowHeights = allocateRowHeights(
    boardHeight,
    rowGap,
    wallpaperDays.map((day) =>
      Math.max(1, Math.ceil(entriesForDay(entries, day).length / maxColumns)),
    ),
    Math.max(sp(92), 68),
  );
  const cardColors: WallpaperCardColors = {
    card,
    time: palette.time,
    title: soft,
    detail: muted,
  };

  wallpaperDays.forEach((day, index) => {
    const x = margin;
    const rowHeight = rowHeights[index];
    const y =
      boardTop +
      rowHeights.slice(0, index).reduce((sum, height) => sum + height, 0) +
      index * rowGap;
    const dayEntries = entriesForDay(entries, day);
    const rowColor = index % 2 === 0 ? panel : panelAlt;

    ctx.shadowColor = "rgba(0, 0, 0, 0.24)";
    ctx.shadowBlur = sp(24);
    ctx.shadowOffsetY = sp(10);
    roundedRect(ctx, x, y, rowWidth, rowHeight, sp(24), rowColor);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.fillStyle = silver;
    ctx.font = `700 ${Math.max(18, fs(settings.wallpaperDayLabelSize * 0.72))}px Arial`;
    drawFittedText(
      ctx,
      day.slice(0, 3).toUpperCase(),
      x + pad(24),
      y + sp(48),
      dayWidth - pad(40),
      Math.max(18, fs(settings.wallpaperDayLabelSize * 0.72)),
      14,
    );
    ctx.fillStyle = muted;
    ctx.font = `700 ${Math.max(9, fs(14))}px Arial`;
    drawFittedText(
      ctx,
      `${dayEntries.length} ITEM${dayEntries.length === 1 ? "" : "S"}`,
      x + pad(26),
      y + sp(76),
      dayWidth - pad(44),
      Math.max(9, fs(14)),
      8,
    );
    ctx.fillStyle = line;
    ctx.fillRect(x + dayWidth, y + sp(24), Math.max(1, s(2)), rowHeight - sp(48));

    const scheduleX = x + dayWidth + pad(24);
    const scheduleY = y + sp(18);
    const scheduleHeight = rowHeight - sp(36);
    const visibleEntries = dayEntries;
    const columnCount = Math.max(1, Math.min(maxColumns, visibleEntries.length));
    const gridRowCount = Math.max(1, Math.ceil(visibleEntries.length / columnCount));
    const itemWidth =
      (scheduleWidth - itemGap * Math.max(0, columnCount - 1)) / columnCount;
    const itemHeight = Math.max(
      1,
      (scheduleHeight - itemGap * Math.max(0, gridRowCount - 1)) / gridRowCount,
    );
    const itemY = scheduleY;

    if (dayEntries.length === 0) {
      roundedRect(ctx, scheduleX, itemY, scheduleWidth, Math.max(sp(64), itemHeight), sp(16), palette.emptyPanel);
      ctx.fillStyle = muted;
      ctx.font = `700 ${Math.max(11, fs(18))}px Arial`;
      drawFittedText(ctx, "No scheduled class", scheduleX + pad(18), itemY + itemHeight / 2 + sp(6), scheduleWidth - pad(36), Math.max(11, fs(18)), 9);
      return;
    }

    visibleEntries.forEach((entry, entryIndex) => {
      const columnIndex = entryIndex % columnCount;
      const gridRowIndex = Math.floor(entryIndex / columnCount);
      const itemX = scheduleX + columnIndex * (itemWidth + itemGap);
      const gridItemY = itemY + gridRowIndex * (itemHeight + itemGap);
      drawReadableScheduleCard(
        ctx,
        entry,
        itemX,
        gridItemY,
        itemWidth,
        itemHeight,
        scale * 0.72,
        cardColors,
        settings.wallpaperCardTextSize,
        profile,
      );
    });
  });
}

export function drawWallpaper(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: ScheduleSettings,
  entries: ScheduleEntry[],
) {
  if (width >= height) {
    drawDesktopWallpaper(ctx, width, height, settings, entries);
    return;
  }

  const baseScale = width / 1440;
  const profile = getWallpaperLayoutProfile(settings.wallpaperLayoutMode);
  const autoScale = getAutoFitScale(width, height, settings.wallpaperAutoFit, false);
  const scale = baseScale * autoScale;
  const spacingScale = scale * profile.spacingScale;
  const paddingScale = scale * profile.paddingScale;
  const fontScale = scale * profile.fontScale;
  const s = (value: number) => value * scale;
  const sp = (value: number) => value * spacingScale;
  const pad = (value: number) => value * paddingScale;
  const fs = (value: number) => value * fontScale;
  const title = settings.wallpaperTitle || "Class Schedule";
  const busiestDayCount = Math.max(
    0,
    ...days.map((day) => entriesForDay(entries, day).length),
  );
  const denseSchedule = busiestDayCount >= 5 || entries.length >= 18;
  const titleSize = Math.max(23, fs(settings.wallpaperTitleSize));
  const schoolSize = Math.max(13, fs(Math.round(settings.wallpaperTitleSize * 0.52)));
  const clockSafetyBoost = settings.wallpaperClockSafetyZone ? s(140) : 0;
  const phoneClockSafeHeight = Math.round(
    Math.min(height * 0.38, Math.max(height * 0.2, s(560) + clockSafetyBoost)),
  );
  const titleBandHeight = Math.max(sp(150), titleSize + schoolSize + sp(54));
  const headerHeight = Math.round(
    Math.min(height * 0.48, phoneClockSafeHeight + titleBandHeight),
  );
  const schoolPalette = getSchoolPalette(settings.schoolPaletteId);
  const palette = getWallpaperPalette(settings.wallpaperStyle, schoolPalette);
  const {
    pageStart,
    pageMid,
    pageEnd,
    headerStart,
    headerMid,
    headerEnd,
    text: silver,
    muted,
    soft,
    panel,
    panelAlt,
    line,
    emptyPanel,
  } = palette;
  const cardColors: WallpaperCardColors = {
    card: palette.card,
    time: palette.time,
    title: palette.soft,
    detail: palette.muted,
  };

  const pageGradient = ctx.createLinearGradient(0, 0, width, height);
  pageGradient.addColorStop(0, pageStart);
  pageGradient.addColorStop(0.52, pageMid);
  pageGradient.addColorStop(1, pageEnd);
  ctx.fillStyle = pageGradient;
  ctx.fillRect(0, 0, width, height);

  const headerGradient = ctx.createLinearGradient(0, 0, width, headerHeight);
  headerGradient.addColorStop(0, headerStart);
  headerGradient.addColorStop(0.55, headerMid);
  headerGradient.addColorStop(1, headerEnd);
  ctx.fillStyle = headerGradient;
  ctx.fillRect(0, 0, width, headerHeight);

  ctx.fillStyle = schoolPalette.colors[0];
  ctx.fillRect(0, headerHeight - 18, width, 10);
  ctx.fillStyle = schoolPalette.colors[1];
  ctx.fillRect(0, headerHeight - 8, width, 8);

  ctx.fillStyle = palette.grid;
  for (let x = 0; x < width; x += Math.max(44, s(76))) {
    ctx.fillRect(x, 0, 1, height);
  }
  for (let y = 0; y < height; y += Math.max(44, s(76))) {
    ctx.fillRect(0, y, width, 1);
  }

  const left = Math.max(20, pad(58));
  const top = headerHeight + sp(16);
  const tableWidth = width - left * 2;
  const bottom =
    height - (denseSchedule ? Math.max(sp(94), 64) : Math.max(sp(120), 76));
  const tableHeight = bottom - top;
  const rowGap = denseSchedule ? Math.max(4, sp(9)) : Math.max(6, sp(16));
  const wallpaperDays = getWallpaperDays(entries, settings);
  const rowHeights = allocateRowHeights(
    tableHeight,
    rowGap,
    wallpaperDays.map((day) => Math.max(1, entriesForDay(entries, day).length)),
    denseSchedule ? Math.max(sp(104), 72) : Math.max(sp(132), 88),
  );
  const titleBaseline = Math.min(
    headerHeight - sp(76),
    phoneClockSafeHeight + titleSize + sp(24),
  );
  const schoolBaseline = Math.min(
    headerHeight - sp(36),
    titleBaseline + schoolSize * 1.4,
  );

  ctx.fillStyle = soft;
  ctx.font = `700 ${titleSize}px Arial`;
  drawFittedText(ctx, title, left + pad(18), titleBaseline, s(800), titleSize, 20);
  ctx.fillStyle = muted;
  ctx.font = `400 ${schoolSize}px Arial`;
  drawFittedText(
    ctx,
    schoolPalette.name,
    left + pad(20),
    schoolBaseline,
    s(820),
    schoolSize,
    12,
  );

  roundedRect(
    ctx,
    width - s(430),
    titleBaseline - titleSize * 0.95,
    s(300),
    sp(62),
    sp(31),
    "rgba(255, 255, 255, 0.12)",
  );
  ctx.fillStyle = silver;
  ctx.font = `700 ${Math.max(11, fs(24))}px Arial`;
  drawFittedText(
    ctx,
    formatWallpaperSize(width, height),
    width - s(390),
    titleBaseline - titleSize * 0.95 + sp(39),
    s(150),
    Math.max(11, fs(24)),
    9,
  );
  ctx.fillStyle = muted;
  ctx.font = `400 ${Math.max(9, fs(20))}px Arial`;
  drawFittedText(
    ctx,
    "PHONE WALLPAPER",
    width - s(245),
    titleBaseline - titleSize * 0.95 + sp(39),
    s(130),
    Math.max(9, fs(20)),
    8,
  );

  ctx.shadowColor = "rgba(0, 0, 0, 0.38)";
  ctx.shadowBlur = sp(38);
  ctx.shadowOffsetY = sp(18);
  roundedRect(ctx, left - pad(14), top - sp(18), tableWidth + pad(28), tableHeight + sp(36), sp(36), "rgba(11, 16, 22, 0.45)");
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  wallpaperDays.forEach((day, index) => {
    const rowHeight = rowHeights[index];
    const y =
      top +
      rowHeights.slice(0, index).reduce((sum, height) => sum + height, 0) +
      index * rowGap;
    const dayEntries = entriesForDay(entries, day);
    const rowColor = index % 2 === 0 ? panel : panelAlt;
    roundedRect(ctx, left, y, tableWidth, rowHeight, sp(28), rowColor);

    const dayColumnWidth = denseSchedule ? pad(132) : pad(166);
    const scheduleInset = denseSchedule ? pad(22) : pad(32);

    ctx.fillStyle = line;
    ctx.fillRect(
      left + dayColumnWidth,
      y + sp(denseSchedule ? 16 : 26),
      Math.max(1, s(2)),
      rowHeight - sp(denseSchedule ? 32 : 52),
    );

    ctx.fillStyle = silver;
    const dayLabelSize = Math.max(
      16,
      fs(settings.wallpaperDayLabelSize * (denseSchedule ? 0.82 : 1)),
    );
    ctx.font = `700 ${dayLabelSize}px Arial`;
    ctx.fillText(
      day.slice(0, 3).toUpperCase(),
      left + pad(denseSchedule ? 22 : 34),
      y + sp(denseSchedule ? 62 : 78),
    );
    ctx.fillStyle = muted;
    const fullDaySize = Math.max(9, fs(Math.round(settings.wallpaperDayLabelSize * 0.42)));
    ctx.font = `700 ${fullDaySize}px Arial`;
    if (!denseSchedule) {
      drawFittedText(ctx, day.toUpperCase(), left + pad(38), y + sp(114), pad(96), fullDaySize, 8);
    }

    roundedRect(
      ctx,
      left + pad(denseSchedule ? 20 : 34),
      y + rowHeight - sp(denseSchedule ? 54 : 72),
      pad(denseSchedule ? 90 : 106),
      sp(denseSchedule ? 32 : 40),
      sp(20),
      "rgba(255, 255, 255, 0.1)",
    );
    ctx.fillStyle = silver;
    ctx.font = `700 ${Math.max(8, fs(20))}px Arial`;
    drawFittedText(
      ctx,
      `${dayEntries.length} ITEM${dayEntries.length === 1 ? "" : "S"}`,
      left + pad(denseSchedule ? 34 : 52),
      y + rowHeight - sp(denseSchedule ? 32 : 45),
      pad(denseSchedule ? 62 : 74),
      Math.max(8, fs(20)),
      7,
    );

    const scheduleX = left + dayColumnWidth + scheduleInset;
    const scheduleY = y + sp(denseSchedule ? 12 : 22);
    const scheduleWidth = tableWidth - dayColumnWidth - scheduleInset - pad(30);
    const scheduleHeight = rowHeight - sp(denseSchedule ? 24 : 44);

    if (dayEntries.length === 0) {
      roundedRect(ctx, scheduleX, scheduleY, scheduleWidth, scheduleHeight, sp(22), emptyPanel);
      ctx.fillStyle = muted;
      ctx.font = `700 ${Math.max(12, fs(30))}px Arial`;
      drawFittedText(
        ctx,
        "No scheduled class",
        scheduleX + pad(34),
        scheduleY + scheduleHeight / 2 + sp(10),
        scheduleWidth - pad(68),
        Math.max(12, fs(30)),
        10,
      );
      return;
    }

    const itemGap = Math.min(
      Math.max(3, sp(denseSchedule ? 8 : 14)),
      scheduleHeight / Math.max(6, dayEntries.length * 5),
    );
    const visibleEntries = dayEntries;
    const availableItemHeight =
      (scheduleHeight - itemGap * (visibleEntries.length - 1)) /
      visibleEntries.length;
    const itemHeight = Math.max(1, availableItemHeight);
    const itemGroupHeight =
      itemHeight * visibleEntries.length + itemGap * (visibleEntries.length - 1);
    const itemStartY = scheduleY + (scheduleHeight - itemGroupHeight) / 2;

    visibleEntries.forEach((entry, entryIndex) => {
      const itemY = itemStartY + entryIndex * (itemHeight + itemGap);
      drawReadableScheduleCard(
        ctx,
        entry,
        scheduleX,
        itemY,
        scheduleWidth,
        itemHeight,
        scale,
        cardColors,
        settings.wallpaperCardTextSize,
        profile,
      );
    });
  });

  ctx.fillStyle = muted;
  ctx.font = `400 ${Math.max(10, fs(24))}px Arial`;
  ctx.fillText("Generated by SmartSched Local", s(76), height - Math.max(30, sp(56)));
  ctx.fillStyle = "#9ca3af";
  ctx.fillRect(width - s(272), height - Math.max(28, sp(52)), s(196), Math.max(3, s(8)));
}
