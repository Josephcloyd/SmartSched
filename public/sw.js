const CACHE_NAME = "smartsched-local-v33";
const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
];
// Next.js build output: content-hashed file names, so a cached copy is never stale.
const STATIC_ASSET_PATTERN = /\/_next\/static\/[^"'\s)]+/g;

/**
 * Caches the app shell plus every JS/CSS/font chunk the home page references,
 * so the app works offline right after the first visit (not only after each
 * file happens to be requested). Missing chunks never fail the install.
 */
async function precacheAppShell() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(APP_SHELL);

  const page = await cache.match("/");
  if (!page) return;
  const html = await page.text();
  const assets = [...new Set(html.match(STATIC_ASSET_PATTERN) || [])];
  await Promise.allSettled(assets.map((asset) => cache.add(asset)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheAppShell());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      ),
  );
  self.clients.claim();
});

function cacheResponse(request, response) {
  if (response && response.status === 200 && response.type === "basic") {
    const copy = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy).catch(() => undefined));
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);
  if (!url.protocol.startsWith("http") || url.origin !== self.location.origin) {
    return;
  }

  // Avoid caching development HMR or analytics beacons
  if (url.pathname.includes("webpack-hmr") || url.pathname.startsWith("/_vercel/")) {
    return;
  }

  // Hashed build assets: cache first (instant + offline), fall back to network.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches
        .match(event.request)
        .then((cached) => cached || fetch(event.request).then((response) => cacheResponse(event.request, response))),
    );
    return;
  }

  // Pages and everything else: network first so updates show up, cache when offline.
  event.respondWith(
    fetch(event.request)
      .then((response) => cacheResponse(event.request, response))
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("/"))),
  );
});

// Tapping a class reminder focuses an open SmartSched tab, or opens one.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => "focus" in client);
      return existing ? existing.focus() : self.clients.openWindow("/");
    }),
  );
});
