const CACHE_NAME = "liquindo-shell-v1";
const APP_BASE = "/liquindo/";
const SHELL_ASSETS = [
  APP_BASE,
  APP_BASE + "index.html",
  APP_BASE + "style.css",
  APP_BASE + "app-shell.js",
  APP_BASE + "manifest.webmanifest",
  APP_BASE + "app-icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("liquindo-shell-") && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(APP_BASE)) return;

  // Never cache authentication, Supabase/API traffic, or page navigations.
  // Only cache the static app shell and assets; private responses stay network-only.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(async () => {
      const cache = await caches.open(CACHE_NAME);
      return (await cache.match(APP_BASE + "index.html")) || Response.error();
    }));
    return;
  }

  if (url.pathname.endsWith(".html") || url.pathname.includes("/rest/") || url.pathname.includes("/auth/")) return;

  event.respondWith(
    fetch(request).then((response) => {
      if (response.ok && response.type === "basic") {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    }).catch(async () => (await caches.match(request)) || Response.error())
  );
});
