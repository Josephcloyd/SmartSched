/** Splash timing. The full intro (hex trace → tree → wordmark → caption) finishes at ~1.3s. */
export const SPLASH_SEEN_KEY = "smartsched.local.splash-seen.v1";
/** Class put on <html> before first paint for returning visitors (see `splashSeenScript`). */
export const SPLASH_SEEN_CLASS = "splash-seen";

/** First visit: let the whole intro play, then a 0.35s fade → ~1.8s on screen. */
export const SPLASH_FIRST_VISIT_MS = 1450;
/** Returning visitors see the finished logo (no intro), briefly, then the fade → ~0.95s. */
export const SPLASH_RETURNING_MS = 600;
/** Reduced motion: no animation to wait for, so go straight to the (short) fade. */
export const SPLASH_REDUCED_MOTION_MS = 0;

/**
 * Inline <head> script: marks returning visitors before the first paint so the splash
 * renders as the finished logo instead of starting the intro and then jumping.
 * Static string, no user data.
 */
export const splashSeenScript = `try{if(localStorage.getItem(${JSON.stringify(SPLASH_SEEN_KEY)}))document.documentElement.classList.add(${JSON.stringify(SPLASH_SEEN_CLASS)})}catch(e){}`;

export function splashHoldMs({ reducedMotion, seenBefore }: { reducedMotion: boolean; seenBefore: boolean }) {
  if (reducedMotion) return SPLASH_REDUCED_MOTION_MS;
  return seenBefore ? SPLASH_RETURNING_MS : SPLASH_FIRST_VISIT_MS;
}
