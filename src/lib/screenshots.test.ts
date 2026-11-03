import { existsSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { appScreenshots } from "@/lib/screenshots";

const require = createRequire(import.meta.url);
// sharp ships with Next.js; only image dimensions are needed here.
type ImageMeta = { width?: number; height?: number };
const sharp = require("sharp") as (file: string) => { metadata(): Promise<ImageMeta> };
const publicDir = path.resolve(__dirname, "../../public");

describe("appScreenshots", () => {
  it("has at least 5 phone screenshots and a desktop one (Chrome's richer install UI)", () => {
    expect(appScreenshots.filter((shot) => shot.formFactor === "narrow").length).toBeGreaterThanOrEqual(5);
    expect(appScreenshots.some((shot) => shot.formFactor === "wide")).toBe(true);
  });

  it.each(appScreenshots)("$src exists with the declared size", async (shot) => {
    const file = path.join(publicDir, shot.src);
    expect(existsSync(file)).toBe(true);
    const meta = await sharp(file).metadata();
    expect([meta.width, meta.height]).toEqual([shot.width, shot.height]);
  });

  it("meets Chrome's rules: 320–3840px and aspect ratio no more than 2.3", () => {
    for (const shot of appScreenshots) {
      const long = Math.max(shot.width, shot.height);
      const short = Math.min(shot.width, shot.height);
      expect(short).toBeGreaterThanOrEqual(320);
      expect(long).toBeLessThanOrEqual(3840);
      expect(long / short).toBeLessThanOrEqual(2.3);
    }
  });
});
