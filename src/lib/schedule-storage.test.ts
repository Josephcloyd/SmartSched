import { describe, expect, it } from "vitest";
import {
  MAX_ENTRIES,
  defaultSettings,
  normalizeEntry,
  normalizeEntries,
  normalizeSettings,
  parseScheduleData,
} from "@/lib/schedule-storage";

describe("normalizeEntry", () => {
  it("keeps a valid entry unchanged", () => {
    const entry = {
      id: "abc",
      title: "Calculus",
      code: "MATH 101",
      room: "R204",
      days: ["Monday", "Wednesday"],
      start: "08:30",
      end: "10:00",
      type: "Class",
      reminderMinutes: 10,
      accentColor: "#123abc",
    };
    expect(normalizeEntry(entry)).toEqual(entry);
  });

  it("upgrades old single-day saves to a days array", () => {
    expect(normalizeEntry({ title: "Old", day: "Friday" }).days).toEqual(["Friday"]);
  });

  it("drops unknown and duplicate days, falling back to Monday", () => {
    expect(normalizeEntry({ days: ["Tuesday", "Funday", "Tuesday"] }).days).toEqual(["Tuesday"]);
    expect(normalizeEntry({ days: ["Funday"] }).days).toEqual(["Monday"]);
  });

  it("replaces malformed times with defaults", () => {
    const entry = normalizeEntry({ start: "25:00", end: "nine" });
    expect(entry.start).toBe("08:00");
    expect(entry.end).toBe("09:00");
  });

  it("rejects non-hex colours (no CSS injection via accentColor)", () => {
    expect(normalizeEntry({ type: "Exam", accentColor: "red;background:url(x)" }).accentColor).toBe(
      "#b42318",
    );
  });

  it("clamps reminder minutes to 0..1440 and rounds", () => {
    expect(normalizeEntry({ reminderMinutes: -5 }).reminderMinutes).toBe(0);
    expect(normalizeEntry({ reminderMinutes: 99999 }).reminderMinutes).toBe(1440);
    expect(normalizeEntry({ reminderMinutes: 7.6 }).reminderMinutes).toBe(8);
    expect(normalizeEntry({ reminderMinutes: Number.NaN }).reminderMinutes).toBe(15);
  });

  it("truncates very long text and defaults missing text", () => {
    const entry = normalizeEntry({ title: "x".repeat(500) });
    expect(entry.title).toHaveLength(120);
    expect(entry.code).toBe("");
    expect(normalizeEntry({}).title).toBe("Untitled");
  });

  it("falls back to Class for unknown types and generates an id", () => {
    const entry = normalizeEntry({ type: "Party" });
    expect(entry.type).toBe("Class");
    expect(entry.id).toMatch(/[0-9a-f-]{36}/);
  });

  it("handles non-object input without throwing", () => {
    expect(normalizeEntry(null).title).toBe("Untitled");
    expect(normalizeEntry("nope").days).toEqual(["Monday"]);
  });
});

describe("normalizeEntries", () => {
  it(`caps the list at ${MAX_ENTRIES} entries`, () => {
    expect(normalizeEntries(Array.from({ length: MAX_ENTRIES + 50 }, () => ({})))).toHaveLength(MAX_ENTRIES);
  });

  it("returns [] for non-arrays", () => {
    expect(normalizeEntries({ length: 3 })).toEqual([]);
  });
});

describe("normalizeSettings", () => {
  it("fills defaults for missing settings", () => {
    const settings = normalizeSettings();
    expect(settings).toMatchObject(defaultSettings);
    expect(settings.wallpaperDevice).toBe("Phone");
  });

  it("keeps the clock safety zone on unless explicitly turned off", () => {
    expect(normalizeSettings({ wallpaperClockSafetyZone: undefined }).wallpaperClockSafetyZone).toBe(true);
    expect(normalizeSettings({ wallpaperClockSafetyZone: false }).wallpaperClockSafetyZone).toBe(false);
  });

  it("infers the device from a saved desktop size preset", () => {
    expect(normalizeSettings({ wallpaperSizeId: "desktop-fhd" }).wallpaperDevice).toBe("Laptop");
  });
});

describe("parseScheduleData", () => {
  it("returns null when there is no entries array (not a SmartSched backup)", () => {
    expect(parseScheduleData({ hello: "world" })).toBeNull();
    expect(parseScheduleData(null)).toBeNull();
    expect(parseScheduleData([])).toBeNull();
  });

  it("parses a backup with an empty schedule", () => {
    const parsed = parseScheduleData({ entries: [] });
    expect(parsed?.entries).toEqual([]);
    expect(parsed?.holidayCalendar.enabled).toBe(true);
  });

  it("normalizes entries and holiday data inside a backup", () => {
    const parsed = parseScheduleData({
      entries: [{ title: "Bio", day: "Thursday" }],
      holidayCalendar: { countryCode: "ph", holidays: [{ date: "2026-12-25", name: "Christmas" }, { date: "bad" }] },
    });
    expect(parsed?.entries[0]).toMatchObject({ title: "Bio", days: ["Thursday"] });
    expect(parsed?.holidayCalendar.countryCode).toBe("PH");
    expect(parsed?.holidayCalendar.holidays).toHaveLength(1);
  });
});
