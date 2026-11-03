import { describe, expect, it } from "vitest";
import {
  conflictingEntries,
  dayNameForDate,
  entriesForDay,
  formatDuration,
  formatTime,
  hasTimeConflict,
  nextDateForDay,
  sortEntries,
} from "@/lib/utils";
import type { ScheduleEntry } from "@/lib/types";

function makeEntry(overrides: Partial<ScheduleEntry>): ScheduleEntry {
  return {
    id: "x",
    title: "Class",
    code: "",
    room: "",
    days: ["Monday"],
    start: "08:00",
    end: "09:00",
    type: "Class",
    reminderMinutes: 15,
    accentColor: "#256f53",
    ...overrides,
  };
}

describe("time conflicts", () => {
  const existing = makeEntry({ id: "a", days: ["Monday", "Thursday"], start: "10:00", end: "11:30" });

  it("detects an overlap on a shared day", () => {
    const candidate = makeEntry({ id: "b", days: ["Thursday"], start: "11:00", end: "12:00" });
    expect(hasTimeConflict(candidate, [existing])).toBe(true);
    expect(conflictingEntries(candidate, [existing]).map((entry) => entry.id)).toEqual(["a"]);
  });

  it("treats back-to-back classes as not overlapping", () => {
    const candidate = makeEntry({ id: "b", days: ["Monday"], start: "11:30", end: "12:30" });
    expect(hasTimeConflict(candidate, [existing])).toBe(false);
  });

  it("ignores overlaps on different days", () => {
    const candidate = makeEntry({ id: "b", days: ["Tuesday"], start: "10:00", end: "11:00" });
    expect(hasTimeConflict(candidate, [existing])).toBe(false);
  });

  it("doesn't flag an entry as conflicting with itself when editing", () => {
    expect(hasTimeConflict({ ...existing }, [existing])).toBe(false);
  });
});

describe("formatting", () => {
  it("formats 24h times as 12h", () => {
    expect(formatTime("00:05")).toBe("12:05 AM");
    expect(formatTime("12:00")).toBe("12:00 PM");
    expect(formatTime("13:45")).toBe("1:45 PM");
  });

  it("formats durations", () => {
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(60)).toBe("1 hr");
    expect(formatDuration(95)).toBe("1 hr 35 min");
    expect(formatDuration(-3)).toBe("0 min");
  });
});

describe("dates", () => {
  const wednesday = new Date(2026, 10, 4, 15, 30);

  it("finds today's weekday name", () => {
    expect(dayNameForDate(wednesday)).toBe("Wednesday");
  });

  it("returns today (at midnight) when the target day is today", () => {
    const result = nextDateForDay("Wednesday", wednesday);
    expect(result.toDateString()).toBe(wednesday.toDateString());
    expect(result.getHours()).toBe(0);
  });

  it("returns the next matching weekday", () => {
    expect(nextDateForDay("Monday", wednesday).getDate()).toBe(9);
    expect(nextDateForDay("Sunday", wednesday).getDate()).toBe(8);
  });
});

describe("sorting", () => {
  it("orders a day's entries by start time even when they span several days", () => {
    const monThu = makeEntry({ id: "late", days: ["Monday", "Thursday"], start: "13:00" });
    const thuOnly = makeEntry({ id: "early", days: ["Thursday"], start: "08:00" });
    expect(entriesForDay([monThu, thuOnly], "Thursday").map((entry) => entry.id)).toEqual(["early", "late"]);
  });

  it("sorts by first day, then time, without mutating the input", () => {
    const input = [makeEntry({ id: "fri", days: ["Friday"] }), makeEntry({ id: "mon", days: ["Monday"] })];
    expect(sortEntries(input).map((entry) => entry.id)).toEqual(["mon", "fri"]);
    expect(input[0].id).toBe("fri");
  });
});
