const CACHE_VERSION = 'r2-3-viewport-coordinates-20261006-1';
const STATIC_CACHE = `tactical-recon-static-${CACHE_VERSION}`;
const PAGE_CACHE = `tactical-recon-pages-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './app-base.css',
  './location-core.js',
  './app-base.js',
  './v27-stable.css',
  './v27-stable.js',
  './v28.css',
  './v28.js',
  './v29-storage.js',
  './v28-runtime.js',
  './v29.css',
  './v29.js',
  './v29-ui.js',
  './vendor/mgrs-1.0.0.js',
  './vendor/leaflet-1.9.4.js',
  './vendor/leaflet-1.9.4.css',
  './r1.css',
  './r1.js',
  './r2.css',
  './r2.js',
  './offline/kr-low.geojson',
  './offline/NOTICE.txt'
];

self.addEventListener('install', event => {
  event.waitUntil(Promise.all([
    caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_ASSETS)),
    caches.open(PAGE_CACHE).then(cache => cache.add('./index.html'))
  ]));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keep = new Set([STATIC_CACHE, PAGE_CACHE]);
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(key => key.startsWith('tactical-recon-') && !keep.has(key))
        .map(key => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

async function networkFirstPage(request) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const response = await fetch(request, { cache: 'reload' });
    if (response && response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    const fallback = await cache.match('./index.html') || await caches.match('./index.html');
    if (fallback) return fallback;
    throw error;
  }
}

async function cacheFirstAsset(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return Response.error();
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (request.mode === 'navigate' || (url.origin === self.location.origin && url.pathname.endsWith('/index.html'))) {
    event.respondWith(networkFirstPage(request));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirstAsset(request));
  }
});
