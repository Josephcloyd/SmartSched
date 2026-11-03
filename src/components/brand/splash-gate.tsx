"use client";

import { useEffect, useState } from "react";
import { SplashScreen } from "@/components/brand/brand";
import { SPLASH_SEEN_CLASS, SPLASH_SEEN_KEY, splashHoldMs } from "@/lib/splash";

/**
 * Shows the branded splash until both the app is ready and the hold time has passed,
 * then fades it out and unmounts it. First visits see the full intro; returning
 * visitors see the finished logo briefly (see src/lib/splash.ts).
 */
export function SplashGate({ isAppReady }: { isAppReady: boolean }) {
  const [holdDone, setHoldDone] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seenBefore = document.documentElement.classList.contains(SPLASH_SEEN_CLASS);
    const timer = window.setTimeout(() => setHoldDone(true), splashHoldMs({ reducedMotion, seenBefore }));
    return () => window.clearTimeout(timer);
  }, []);

  const isExiting = isAppReady && holdDone;

  useEffect(() => {
    if (!isExiting) return;
    try {
      localStorage.setItem(SPLASH_SEEN_KEY, "1");
    } catch {
      // Storage blocked: the full intro just plays again next time.
    }
  }, [isExiting]);

  if (gone) return null;

  return (
    <div
      className={isExiting ? "lm-splash-exit" : undefined}
      aria-hidden={isExiting || undefined}
      onAnimationEnd={(event) => {
        // Splash child animations bubble here too — only react to this wrapper's own fade.
        if (event.target === event.currentTarget) setGone(true);
      }}
    >
      <SplashScreen />
    </div>
  );
}
