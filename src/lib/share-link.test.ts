import { describe, expect, it } from "vitest";
import {
  MAX_QR_URL_LENGTH,
  createShareLink,
  decodeSharedSchedule,
  readShareHash,
} from "@/lib/share-link";
import type { ScheduleEntry } from "@/lib/types";

const ORIGIN = "https://smartschedule.getlaunchph.com";

function makeEntry(index: number): ScheduleEntry {
  return {
    id: `id-${index}`,
    title: `Subject ${index}`,
    code: `SUBJ ${100 + index}`,
    room: `Room ${index}`,
    days: index % 2 ? ["Monday", "Wednesday", "Friday"] : ["Tuesday", "Thursday"],
    start: "08:00",
    end: "09:30",
    type: index === 3 ? "Laboratory" : "Class",
    reminderMinutes: 10,
    accentColor: "#256f53",
  };
}

async function roundTrip(entries: ScheduleEntry[]) {
  const link = await createShareLink(ORIGIN, { title: "1st Sem", schoolPaletteId: "university-of-cebu", entries });
  const encoded = readShareHash(new URL(link).hash);
  expect(encoded).not.toBeNull();
  return { link, decoded: await decodeSharedSchedule(encoded!) };
}

describe("share links", () => {
  it("round-trips a schedule (with fresh ids)", async () => {
    const entries = [makeEntry(1), makeEntry(2), makeEntry(3)];
    const { link, decoded } = await roundTrip(entries);

    expect(link.startsWith(`${ORIGIN}/#share=`)).toBe(true);
    expect(decoded?.title).toBe("1st Sem");
    expect(decoded?.schoolPaletteId).toBe("university-of-cebu");
    const withoutId = (entry: ScheduleEntry) => ({ ...entry, id: undefined });
    expect(decoded?.entries.map(withoutId)).toEqual(entries.map(withoutId));
    expect(decoded?.entries.every((entry, index) => entry.id !== entries[index].id)).toBe(true);
  });

  it("keeps a typical 10-subject schedule small enough for a QR code", async () => {
    const { link } = await roundTrip(Array.from({ length: 10 }, (_, index) => makeEntry(index)));
    expect(link.length).toBeLessThan(MAX_QR_URL_LENGTH);
  });

  it("puts the schedule in the URL fragment so it's never sent to the server", async () => {
    const { link } = await roundTrip([makeEntry(1)]);
    const url = new URL(link);
    expect(url.search).toBe("");
    expect(url.pathname).toBe("/");
  });

  it("rejects garbage and tampered links", async () => {
    expect(await decodeSharedSchedule("not-base64!!")).toBeNull();
    expect(await decodeSharedSchedule("AAAA")).toBeNull();
  });

  it("ignores unknown palettes and re-validates entry fields", async () => {
    const hostile = {
      v: 1,
      t: "x",
      p: "evil-palette",
      e: [["Hack", "", "", 1, "99:99", "10:00", 42, -10, "url(javascript:alert(1))"]],
    };
    const bytes = new Uint8Array(
      await new Response(
        new Blob([JSON.stringify(hostile)]).stream().pipeThrough(new CompressionStream("deflate-raw")),
      ).arrayBuffer(),
    );
    const encoded = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const decoded = await decodeSharedSchedule(encoded);

    expect(decoded?.schoolPaletteId).toBeUndefined();
    expect(decoded?.entries[0]).toMatchObject({
      title: "Hack",
      days: ["Monday"],
      start: "08:00",
      type: "Class",
      reminderMinutes: 0,
      accentColor: "#256f53",
    });
  });

  it("reads the share hash only when present and not oversized", () => {
    expect(readShareHash("#share=abc")).toBe("abc");
    expect(readShareHash("#other=1")).toBeNull();
    expect(readShareHash("")).toBeNull();
    expect(readShareHash(`#share=${"a".repeat(20_001)}`)).toBeNull();
  });
});
