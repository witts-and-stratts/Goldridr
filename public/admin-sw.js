const CACHE_NAME = "goldridr-admin-shell-v2";
const OFFLINE_URL = "/admin-offline.html";
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/admin.webmanifest",
  "/admin-icons/icon-192.png",
  "/admin-icons/icon-512.png",
  "/admin-icons/icon-maskable-512.png",
  "/admin-icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith("goldridr-admin-shell-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (PRECACHE_URLS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => cachedResponse || fetch(request)),
    );
    return;
  }

  if (request.mode !== "navigate") return;
  if (!url.pathname.startsWith("/admin") && !url.pathname.startsWith("/login")) return;

  event.respondWith(
    fetch(request).catch(async () => {
      const offlinePage = await caches.match(OFFLINE_URL);
      return offlinePage || Response.error();
    }),
  );
});
