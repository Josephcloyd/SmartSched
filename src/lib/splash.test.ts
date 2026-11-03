import { describe, expect, it } from "vitest";
import {
  SPLASH_FIRST_VISIT_MS,
  SPLASH_RETURNING_MS,
  SPLASH_SEEN_CLASS,
  SPLASH_SEEN_KEY,
  splashHoldMs,
  splashSeenScript,
} from "@/lib/splash";

describe("splashHoldMs", () => {
  it("plays the full intro on a first visit", () => {
    expect(splashHoldMs({ reducedMotion: false, seenBefore: false })).toBe(SPLASH_FIRST_VISIT_MS);
  });

  it("is shorter for returning visitors", () => {
    expect(splashHoldMs({ reducedMotion: false, seenBefore: true })).toBe(SPLASH_RETURNING_MS);
    expect(SPLASH_RETURNING_MS).toBeLessThan(SPLASH_FIRST_VISIT_MS);
  });

  it("doesn't make reduced-motion users wait", () => {
    expect(splashHoldMs({ reducedMotion: true, seenBefore: false })).toBe(0);
  });
});

describe("splashSeenScript", () => {
  it("adds the class when the flag is stored, and never throws", () => {
    const classes = new Set<string>();
    const fakeWindow = {
      localStorage: { getItem: (key: string) => (key === SPLASH_SEEN_KEY ? "1" : null) },
      document: { documentElement: { classList: { add: (name: string) => classes.add(name) } } },
    };
    new Function("localStorage", "document", splashSeenScript)(fakeWindow.localStorage, fakeWindow.document);
    expect(classes.has(SPLASH_SEEN_CLASS)).toBe(true);

    const throwing = { getItem: () => { throw new Error("blocked"); } };
    expect(() => new Function("localStorage", "document", splashSeenScript)(throwing, fakeWindow.document)).not.toThrow();
  });
});
