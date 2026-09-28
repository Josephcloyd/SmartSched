"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    // Only register service worker in production to avoid stale bundle caching during development
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  return null;
}
