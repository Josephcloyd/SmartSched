"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

/**
 * Vercel Web Analytics (cookie-free, anonymous page counts).
 * Strips the query and hash before sending so a `#share=…` schedule link never leaves the device.
 */
function stripPrivateParts(event: BeforeSendEvent): BeforeSendEvent {
  const url = new URL(event.url);
  return { ...event, url: `${url.origin}${url.pathname}` };
}

export function PrivacyAnalytics() {
  return <Analytics beforeSend={stripPrivateParts} />;
}
