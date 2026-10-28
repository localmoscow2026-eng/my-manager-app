/* Service worker: precache app shell. Never touches IndexedDB, so updates never delete user data. */
const VERSION = 'mm-v1.0.0';
const ASSETS = ['./', './index.html', './css/style.css', './js/jalali.js', './js/recur.js', './js/db.js', './js/app.js', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-192.png', './icons/icon-maskable-512.png', './icons/icon-maskable.svg', './icons/apple-touch-icon.png', './icons/logo.svg',
  './fonts/vazirmatn-arabic-400-normal.woff2', './fonts/vazirmatn-arabic-700-normal.woff2', './fonts/vazirmatn-arabic-800-normal.woff2', './fonts/vazirmatn-latin-400-normal.woff2', './fonts/vazirmatn-latin-700-normal.woff2'];
self.addEventListener('install', e => e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS))));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request).catch(() => caches.match('./index.html'))));
});
