const CACHE_NAME = "drive-control-cache-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./styles/style.css",
  "./scripts/app.js",
  "./scripts/state.js",
  "./scripts/deck.js",
  "./scripts/rules.js",
  "./scripts/ui.js",
  "./scripts/devsim.js",
  "./scripts/balance.js",
  "./styles/retro.css",
  "./assets/fonts/press-start-2p.woff2",
  "./icons/favicon.ico",
  "./manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
