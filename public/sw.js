// Service worker: app-schil offline beschikbaar, API altijd live.
const VERSIE = "toppers-v4";
const SCHIL = ["/", "/manifest.webmanifest", "/icoon.svg", "/icoon-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSIE).then((c) => c.addAll(SCHIL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSIE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  if (url.origin === location.origin && url.pathname.startsWith("/api/")) return; // altijd live
  // Pagina's: netwerk eerst, anders de schil uit de cache.
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).catch(() => caches.match("/")));
    return;
  }
  // Vaste bestanden met een versie in de naam (scripts, stijlen, lettertypen) en iconen: eerst uit de cache.
  if (url.origin === location.origin && (url.pathname.startsWith("/assets/") || /\.(png|svg|woff2?)$/.test(url.pathname))) {
    e.respondWith(
      caches.open(VERSIE).then(async (c) => {
        const oud = await c.match(e.request);
        const nieuw = fetch(e.request).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => oud);
        return oud || nieuw;
      })
    );
    return;
  }
  // Overige eigen bestanden (handleiding, voorbeelden, manifest): altijd de nieuwste, cache alleen als reserve.
  if (url.origin === location.origin) {
    e.respondWith(
      caches.open(VERSIE).then((c) =>
        fetch(e.request).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => c.match(e.request))
      )
    );
  }
});
