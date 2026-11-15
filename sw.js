/* Service Worker: hält die App auf dem Gerät bereit, damit sie auch ohne Netz startet.
   Bei Änderungen an Dateien die VERSION erhöhen – dann laden alle Geräte die neue Fassung. */
const VERSION = "bg-dashboard-11";
const DATEIEN = [
  "./", "index.html", "manifest.webmanifest", "css/app.css",
  "js/config.js", "js/kern.js", "js/daten.js", "js/ansichten.js", "js/lehrkraefte.js", "js/app.js",
  "config/portal.json", "fonts/inter-latin.woff2", "fonts/spacegrotesk-latin.woff2",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png", "icons/logo-bbs.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(DATEIEN)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;   // fremde Seiten nicht anfassen
  if (url.pathname.includes("/api/")) return;                                  // Daten immer frisch vom Server
  if (url.pathname.endsWith("config/portal.json")) {                           // Portal-Inhalte: erst Netz, sonst Speicher
    e.respondWith(fetch(e.request).then(r => { const k = r.clone(); caches.open(VERSION).then(c => c.put(e.request, k)); return r; }).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(t => t || fetch(e.request).catch(() => e.request.mode === "navigate" ? caches.match("index.html") : undefined)));
});
