/**
 * Schedule share links. The whole schedule is packed into the URL *fragment* (`#share=…`),
 * which browsers never send to the server — so sharing keeps the "never leaves your device"
 * promise: it goes only from one student's phone to the other's, inside the link itself.
 *
 * Format v1: base64url( deflate-raw( JSON ) ), JSON = { v, t, p, e: [compact entry tuples] }.
 */
import {
  days,
  scheduleTypes,
  schoolPaletteIds,
  type DayName,
  type ScheduleEntry,
  type SchoolPaletteId,
} from "@/lib/types";
import { MAX_ENTRIES, normalizeEntry } from "@/lib/schedule-storage";
import { uid } from "@/lib/utils";

export const SHARE_HASH_KEY = "share";
const FORMAT_VERSION = 1;
/** Refuse absurdly long links before doing any work. */
const MAX_PAYLOAD_CHARS = 20_000;
/** Cap decompressed size so a hostile link can't exhaust memory (zip-bomb guard). */
const MAX_DECOMPRESSED_BYTES = 256 * 1024;
/** A QR code tops out around 2,900 bytes; leave headroom for the site URL and error correction. */
export const MAX_QR_URL_LENGTH = 2_300;

export type SharedSchedule = {
  title: string;
  schoolPaletteId?: SchoolPaletteId;
  entries: ScheduleEntry[];
};

// [title, code, room, dayMask, start, end, typeIndex, reminderMinutes, accentColor]
type CompactEntry = [string, string, string, number, string, string, number, number, string];

type SharePayload = {
  v: number;
  t: string;
  p?: string;
  e: CompactEntry[];
};

function daysToMask(entryDays: DayName[]) {
  return entryDays.reduce((mask, day) => mask | (1 << days.indexOf(day)), 0);
}

function maskToDays(mask: number): DayName[] {
  return days.filter((_, index) => (mask & (1 << index)) !== 0);
}

function toCompact(entry: ScheduleEntry): CompactEntry {
  return [
    entry.title,
    entry.code,
    entry.room,
    daysToMask(entry.days),
    entry.start,
    entry.end,
    Math.max(0, scheduleTypes.indexOf(entry.type)),
    entry.reminderMinutes,
    entry.accentColor,
  ];
}

function fromCompact(raw: unknown): ScheduleEntry {
  const tuple = Array.isArray(raw) ? raw : [];
  const [title, code, room, mask, start, end, typeIndex, reminderMinutes, accentColor] = tuple;
  // Re-validate everything through the same normalizer used for backups; links are untrusted.
  return normalizeEntry({
    id: uid(),
    title,
    code,
    room,
    days: typeof mask === "number" ? maskToDays(mask) : [],
    start,
    end,
    type: typeof typeIndex === "number" ? scheduleTypes[typeIndex] : undefined,
    reminderMinutes,
    accentColor,
  });
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function readLimited(stream: ReadableStream<Uint8Array>, limit: number) {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      throw new Error("Shared schedule is too large");
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

async function compress(text: string) {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function decompress(bytes: Uint8Array) {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new TextDecoder().decode(await readLimited(stream, MAX_DECOMPRESSED_BYTES));
}

export function isShareLinkSupported() {
  return typeof CompressionStream === "function" && typeof DecompressionStream === "function";
}

/** Builds `${origin}/#share=…` for the given schedule. */
export async function createShareLink(origin: string, schedule: SharedSchedule) {
  const payload: SharePayload = {
    v: FORMAT_VERSION,
    t: schedule.title,
    p: schedule.schoolPaletteId,
    e: schedule.entries.slice(0, MAX_ENTRIES).map(toCompact),
  };
  const encoded = bytesToBase64Url(await compress(JSON.stringify(payload)));
  return `${origin.replace(/\/$/, "")}/#${SHARE_HASH_KEY}=${encoded}`;
}

/** Pulls the encoded schedule out of a URL hash like `#share=…`, or null if there isn't one. */
export function readShareHash(hash: string): string | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const value = params.get(SHARE_HASH_KEY);
  return value && value.length <= MAX_PAYLOAD_CHARS ? value : null;
}

/** Removes `#share=…` from the address bar so a refresh doesn't offer the import again. */
export function clearShareHash() {
  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
}

/** Decodes and validates a shared schedule. Returns null for anything malformed. */
export async function decodeSharedSchedule(encoded: string): Promise<SharedSchedule | null> {
  try {
    const payload = JSON.parse(await decompress(base64UrlToBytes(encoded))) as Partial<SharePayload>;
    if (payload?.v !== FORMAT_VERSION || !Array.isArray(payload.e)) {
      return null;
    }
    const palette = schoolPaletteIds.find((id) => id === payload.p);
    return {
      title: typeof payload.t === "string" ? payload.t.slice(0, 80) : "Shared schedule",
      schoolPaletteId: palette,
      entries: payload.e.slice(0, MAX_ENTRIES).map(fromCompact),
    };
  } catch {
    return null;
  }
}
