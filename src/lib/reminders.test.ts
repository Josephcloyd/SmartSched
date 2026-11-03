import { describe, expect, it } from "vitest";
import { findDueReminders } from "@/lib/reminders";
import { defaultHolidayCalendar } from "@/lib/holidays";
import type { HolidayCalendar, ScheduleEntry } from "@/lib/types";

const wednesday = (hour: number, minute: number, second = 0) => new Date(2026, 10, 4, hour, minute, second);

const calc: ScheduleEntry = {
  id: "calc",
  title: "Calculus",
  code: "MATH 1",
  room: "R1",
  days: ["Wednesday"],
  start: "09:00",
  end: "10:00",
  type: "Class",
  reminderMinutes: 15,
  accentColor: "#256f53",
};

const noHolidays: HolidayCalendar = { ...defaultHolidayCalendar, enabled: false };

describe("findDueReminders", () => {
  it("fires exactly at reminder time (start minus reminderMinutes)", () => {
    const due = findDueReminders([calc], noHolidays, wednesday(8, 45), new Set());
    expect(due).toHaveLength(1);
    expect(due[0].title).toBe("Calculus starts at 9:00 AM");
    expect(due[0].body).toBe("MATH 1 - R1");
  });

  it("fires up to 30s early and up to 60s late, but not outside that window", () => {
    expect(findDueReminders([calc], noHolidays, wednesday(8, 44, 31), new Set())).toHaveLength(1);
    expect(findDueReminders([calc], noHolidays, wednesday(8, 46, 0), new Set())).toHaveLength(1);
    expect(findDueReminders([calc], noHolidays, wednesday(8, 44, 0), new Set())).toHaveLength(0);
    expect(findDueReminders([calc], noHolidays, wednesday(8, 46, 1), new Set())).toHaveLength(0);
  });

  it("doesn't repeat a reminder that was already shown", () => {
    const [first] = findDueReminders([calc], noHolidays, wednesday(8, 45), new Set());
    expect(findDueReminders([calc], noHolidays, wednesday(8, 45, 30), new Set([first.key]))).toEqual([]);
  });

  it("ignores classes that don't meet today", () => {
    expect(findDueReminders([{ ...calc, days: ["Thursday"] }], noHolidays, wednesday(8, 45), new Set())).toEqual([]);
  });

  it("stays quiet on public holidays", () => {
    const calendar: HolidayCalendar = {
      ...defaultHolidayCalendar,
      enabled: true,
      holidays: [{ date: "2026-11-04", name: "Holiday", countryCode: "PH" }],
    };
    expect(findDueReminders([calc], calendar, wednesday(8, 45), new Set())).toEqual([]);
  });

  it("handles reminders that cross into the previous hour", () => {
    const early = { ...calc, start: "09:05", reminderMinutes: 30 };
    expect(findDueReminders([early], noHolidays, wednesday(8, 35), new Set())).toHaveLength(1);
  });
});
