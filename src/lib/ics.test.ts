import { describe, expect, it } from "vitest";
import { ICS_WEEKS, buildIcs, escapeIcs, getHolidayExclusions, toIcsDate } from "@/lib/ics";
import { defaultHolidayCalendar } from "@/lib/holidays";
import type { HolidayCalendar, ScheduleEntry } from "@/lib/types";

// Wednesday 2026-11-04, 10:00 in Manila (TZ fixed in vitest.config.ts).
const NOW = new Date(2026, 10, 4, 10, 0, 0);

const entry: ScheduleEntry = {
  id: "e1",
  title: "Physics, Lab; Part 1",
  code: "PHY 2",
  room: "Room 3",
  days: ["Monday", "Friday"],
  start: "13:00",
  end: "14:30",
  type: "Laboratory",
  reminderMinutes: 20,
  accentColor: "#26727f",
};

const noHolidays: HolidayCalendar = { ...defaultHolidayCalendar, enabled: false };

describe("escapeIcs", () => {
  it("escapes backslashes, commas, semicolons and newlines", () => {
    expect(escapeIcs("a\\b,c;d\ne\r\nf")).toBe("a\\\\b\\,c\\;d\\ne\\nf");
  });
});

describe("toIcsDate", () => {
  it("formats as a UTC basic timestamp", () => {
    expect(toIcsDate(new Date(Date.UTC(2026, 0, 2, 3, 4, 5)))).toBe("20260102T030405Z");
  });
});

describe("buildIcs", () => {
  const ics = buildIcs({ calendarName: "UC Schedule", entries: [entry], holidayCalendar: noHolidays, now: NOW });

  it("wraps everything in a VCALENDAR with CRLF line endings", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).not.toMatch(/[^\r]\n/);
  });

  it("creates one weekly event per day the class meets", () => {
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain(`RRULE:FREQ=WEEKLY;COUNT=${ICS_WEEKS}`);
    expect(ics).toContain("UID:e1-Monday@smartsched.local");
    expect(ics).toContain("UID:e1-Friday@smartsched.local");
  });

  it("starts each event on the next matching weekday at the class time", () => {
    // Next Friday after Wed Nov 4 is Nov 6; 13:00 Manila = 05:00 UTC.
    expect(ics).toContain("DTSTART:20261106T050000Z");
    expect(ics).toContain("DTEND:20261106T063000Z");
    // Next Monday is Nov 9.
    expect(ics).toContain("DTSTART:20261109T050000Z");
  });

  it("escapes text fields and sets the reminder alarm", () => {
    expect(ics).toContain("SUMMARY:PHY 2 Physics\\, Lab\\; Part 1");
    expect(ics).toContain("TRIGGER:-PT20M");
    expect(ics).toContain("X-WR-CALNAME:UC Schedule");
  });

  it("adds no EXDATE when holidays are off", () => {
    expect(ics).not.toContain("EXDATE");
  });

  it("skips class dates that fall on a holiday", () => {
    const calendar: HolidayCalendar = {
      ...defaultHolidayCalendar,
      enabled: true,
      holidays: [{ date: "2026-11-30", name: "Bonifacio Day", countryCode: "PH" }],
    };
    const withHoliday = buildIcs({ calendarName: "x", entries: [{ ...entry, days: ["Monday"] }], holidayCalendar: calendar, now: NOW });
    expect(withHoliday).toContain("EXDATE:20261130T050000Z");
  });
});

describe("getHolidayExclusions", () => {
  it("returns every weekly occurrence inside a school break", () => {
    const calendar: HolidayCalendar = {
      ...defaultHolidayCalendar,
      enabled: true,
      customBreaks: [{ id: "b", name: "Christmas break", startDate: "2026-12-20", endDate: "2027-01-03" }],
    };
    const firstMonday = new Date(2026, 10, 9, 13, 0);
    const exclusions = getHolidayExclusions(firstMonday, calendar, ICS_WEEKS);
    expect(exclusions.map((date) => date.toDateString())).toEqual([
      new Date(2026, 11, 21).toDateString(),
      new Date(2026, 11, 28).toDateString(),
    ]);
  });
});
