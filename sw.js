/* Service worker: precache app shell. Never touches IndexedDB, so updates never delete user data. */
const VERSION = 'mm-v1.2.0';
const ASSETS = ['./', './index.html', './css/style.css', './js/jalali.js', './js/recur.js', './js/db.js', './js/sync.js', './js/tags.js', './js/vendor/supabase.js', './js/app.js', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-192.png', './icons/icon-maskable-512.png', './icons/icon-maskable.svg', './icons/apple-touch-icon.png', './icons/logo.svg',
  './img/tags/acc-order.webp', './img/tags/acc-photo.webp', './img/tags/acc-products.webp', './img/tags/acc-sell.webp', './img/tags/acc-supplier.webp', './img/tags/cg-air.webp', './img/tags/cg-boxes.webp', './img/tags/cg-customs.webp', './img/tags/cg-deliver.webp', './img/tags/cg-truck.webp', './img/tags/dood-insta.webp', './img/tags/dood-pack.webp', './img/tags/dood-products.webp', './img/tags/dood-ship.webp', './img/tags/dood-site.webp', './img/tags/dood-stock.webp', './img/tags/ex-bank.webp', './img/tags/ex-cash.webp', './img/tags/ex-docs.webp', './img/tags/ex-havale.webp', './img/tags/ex-rates.webp', './img/tags/ex-settle.webp', './img/tags/ex-usdt.webp', './img/tags/f-birthday.webp', './img/tags/f-doctor.webp', './img/tags/f-grocery.webp', './img/tags/f-school.webp', './img/tags/p-bank.webp', './img/tags/p-car.webp', './img/tags/p-health.webp', './img/tags/p-home.webp', './img/tags/p-moto.webp', './img/tags/p-travel.webp',
  './fonts/vazirmatn-arabic-400-normal.woff2', './fonts/vazirmatn-arabic-700-normal.woff2', './fonts/vazirmatn-arabic-800-normal.woff2', './fonts/vazirmatn-latin-400-normal.woff2', './fonts/vazirmatn-latin-700-normal.woff2'];
self.addEventListener('install', e => e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS))));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request).catch(() => caches.match('./index.html'))));
});
