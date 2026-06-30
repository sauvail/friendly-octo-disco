/* Service worker — offline app shell. Bump CACHE to force-refresh clients after a deploy. */
const CACHE = "suivi-muscu-v3";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});
// Page asks us to activate the new version immediately when the user taps "Recharger".
self.addEventListener("message", e => { if (e.data && e.data.type === "skipWaiting") self.skipWaiting(); });

// Tapping the end-of-rest notification focuses (or opens) the app.
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(cls => {
      for (const c of cls) { if ("focus" in c) return c.focus(); }
      if (self.clients.openWindow) return self.clients.openWindow("./");
    })
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Cross-origin (e.g. jsonbin.io API) → never cache, go straight to network.
  if (url.origin !== self.location.origin) return;

  // Navigations → network-first so a new deploy is picked up; fall back to cached shell offline.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put("./index.html", cp)); return r; })
        .catch(() => caches.match("./index.html").then(r => r || caches.match("./")))
    );
    return;
  }

  // Same-origin assets → cache-first, fill cache on miss.
  e.respondWith(
    caches.match(req).then(c => c || fetch(req).then(r => {
      if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(ca => ca.put(req, cp)); }
      return r;
    }))
  );
});
