import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Hosts the browser is allowed to call: holiday lookup + coarse reverse geocoding (src/lib/holidays.ts).
const connectSources = [
  "'self'",
  "https://date.nager.at",
  "https://api.bigdatacloud.net",
];

// Static pages can't use per-request nonces, so inline scripts are allowed ('unsafe-inline'),
// per the Next.js "CSP without nonces" guide. Everything else is locked to this origin.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  `connect-src ${connectSources.join(" ")}`,
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Geolocation stays available to this site for "Detect location & holidays"; the rest is off.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), payment=(), usb=(), geolocation=(self)",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
