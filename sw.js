// Generated into /sw.js by tools/build-sw.js — edit this template, not sw.js.
const VERSION = "a8825ace480f";
const ASSETS = ["index.html","css/style.css","js/adelson.js","js/agent.js","js/arabov.js","js/auditorium.js","js/buildings.js","js/controls.js","js/court.js","js/declutter.js","js/device.js","js/dorm.js","js/elpern.js","js/features.js","js/flags.js","js/framegate.js","js/geo.js","js/gridload.js","js/gyro.js","js/hangar.js","js/hill.js","js/i18n.js","js/innovation.js","js/ivcher.js","js/jusidman.js","js/main.js","js/nav.js","js/ofer.js","js/parking.js","js/pwa.js","js/radzyner.js","js/renderloop.js","js/roofplan.js","js/rooms.js","js/route.js","js/runsign.js","js/scene.js","js/search.js","js/students.js","js/sunken.js","js/tile.js","js/trees.js","js/ui.js","vendor/three.module.min.js","manifest.webmanifest","assets/logo.png","assets/favicon-32.png","assets/favicon.ico","assets/icon-192.png","assets/icon-512.png","assets/icon-maskable-512.png","assets/apple-touch-icon.png","data/campus.json","data/tile.json","data/pois.json","data/categories.json","data/hill.json","data/parking.json","data/runsign.json","data/court.json","data/flags.json","data/sunken.json","data/building-codes.json","assets/ground-half.png","assets/ground.png","assets/walkgrid.png"];
const CACHE = "campus-" + VERSION;

// browsers refuse a redirected response for a navigation (hosts that redirect /index.html -> /), so rebuild it
const plain = res => (res.redirected ? new Response(res.body, { status: res.status, statusText: res.statusText, headers: res.headers }) : res);

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(a => new Request(a, { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("campus-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Network first (so a new version is shown as soon as you are online), cached copy when offline or when the network is slow.
const NETWORK_TIMEOUT = 4000;
function fresh(request, fallback) {
  const net = fetch(request).then(res => { if (res && res.ok) caches.open(CACHE).then(c => c.put(request, res.clone())).catch(() => {}); return res; });
  const cached = () => caches.match(fallback || request, { ignoreSearch: true });
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => cached().then(h => (h ? resolve(h) : net.then(resolve, reject))), NETWORK_TIMEOUT);
    net.then(res => { clearTimeout(t); resolve(res); }, () => { clearTimeout(t); cached().then(h => (h ? resolve(h) : reject(new TypeError("offline")))); });
  });
}
self.addEventListener("fetch", e => {
  const r = e.request; if (r.method !== "GET") return;
  const url = new URL(r.url); if (url.origin !== location.origin) return;
  if (r.mode === "navigate") { e.respondWith(fresh(r, "index.html").then(plain)); return; }   // the app shell, even offline
  e.respondWith(fresh(r));
});
