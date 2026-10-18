const CACHE_NAME = "liquindo-shell-v4";
const APP_BASE = "/liquindo/";
const HOME_URL = APP_BASE + "index.html";
const OFFLINE_URL = APP_BASE + "offline.html";
const SHELL_ASSETS = [
  APP_BASE,
  HOME_URL,
  OFFLINE_URL,
  APP_BASE + "style.css",
  APP_BASE + "app-shell.js",
  APP_BASE + "manifest.webmanifest",
  APP_BASE + "app-icon.svg",
  APP_BASE + "app-icon-maskable.svg",
  APP_BASE + "app-icon-180.png"
];

function isCacheableStaticAsset(url) {
  // Only cache known static asset types. Never cache HTML subpages, API responses,
  // authentication endpoints, arbitrary JSON, or cross-origin requests.
  return /\.(?:css|js|svg|png|jpe?g|webp|gif|ico|woff2?)$/i.test(url.pathname);
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // One missing asset must not prevent the entire app from installing.
    await Promise.all(SHELL_ASSETS.map(async (asset) => {
      try {
        const response = await fetch(asset, { cache: "reload" });
        if (response.ok && response.type === "basic") {
          await cache.put(asset, response);
        }
      } catch {
        // A later visit can retry this asset. Keep installation resilient.
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith("liquindo-shell-") && key !== CACHE_NAME)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(APP_BASE)) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        return await fetch(request);
      } catch {
        const cache = await caches.open(CACHE_NAME);
        // Only the homepage may fall back to the cached homepage. Never disguise
        // an unavailable subpage (especially account/admin pages) as another page.
        if (url.pathname === APP_BASE || url.pathname === HOME_URL) {
          return (await cache.match(HOME_URL)) || (await cache.match(APP_BASE)) ||
            (await cache.match(OFFLINE_URL)) || Response.error();
        }
        return (await cache.match(OFFLINE_URL)) || Response.error();
      }
    })());
    return;
  }

  if (!isCacheableStaticAsset(url)) return;

  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (response.ok && response.type === "basic") {
        const cache = await caches.open(CACHE_NAME);
        // Store a canonical URL without query parameters so versioned CSS/JS URLs
        // can still use the latest cached asset while offline.
        await cache.put(new Request(url.origin + url.pathname), response.clone());
      }
      return response;
    } catch {
      const cache = await caches.open(CACHE_NAME);
      return (await cache.match(new Request(url.origin + url.pathname))) || Response.error();
    }
  })());
});
