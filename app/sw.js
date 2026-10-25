// Keeps the app opening with weak or no signal. Supabase (customer data) is never cached here:
// those calls always go to the network, and the app keeps its own last-loaded copy for offline viewing.
// Bump VERSION when shipping changes so phones drop the old files.
const VERSION = "lgcpro-v1";
const SHELL = ["./", "index.html", "app.css", "app.js", "config.js", "manifest.webmanifest", "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png"];
const LIBS = ["cdn.jsdelivr.net", "fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Pinned library versions and fonts never change at the same URL, so cache-first is safe and fast.
  if (LIBS.includes(url.hostname)) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    })));
    return;
  }
  if (url.origin !== self.location.origin) return;

  // App files: network first so updates land right away, cached copy when offline.
  // no-cache makes the browser revalidate instead of trusting its own HTTP cache (GitHub Pages sends max-age=600).
  e.respondWith(fetch(req, { cache: "no-cache" }).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || (req.mode === "navigate" ? caches.match("index.html") : Response.error()))));
});
