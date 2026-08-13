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

self.addEventListener("push", (event) => {
  if (!event.data) return;

  event.waitUntil((async () => {
    let data;
    try {
      data = event.data.json();
    } catch {
      data = { title: "GoldRidr Admin", body: event.data.text() };
    }

    await self.registration.showNotification(data.title || "GoldRidr Admin", {
      body: data.body || "You have a new notification.",
      icon: data.icon || "/admin-icons/icon-192.png",
      badge: data.badge || "/admin-icons/icon-192.png",
      tag: data.tag || `goldridr-admin-${data.recipientId || Date.now()}`,
      renotify: true,
      data: {
        recipientId: Number(data.recipientId || 0),
        url: data.url || "/admin/notifications",
      },
    });
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const targetUrl = new URL(data.url || "/admin/notifications", self.location.origin).href;

  event.waitUntil((async () => {
    if (data.recipientId) {
      await fetch("/api/admin/notifications", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_read", recipientIds: [data.recipientId] }),
      }).catch(() => undefined);
    }

    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = windows.find((client) => new URL(client.url).origin === self.location.origin);
    if (existing) {
      await existing.navigate(targetUrl);
      await existing.focus();
      return;
    }
    await self.clients.openWindow(targetUrl);
  })());
});
