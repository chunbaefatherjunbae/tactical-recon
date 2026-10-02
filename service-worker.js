const CACHE_VERSION = 'v25-20261002';
const STATIC_CACHE = `tactical-recon-static-${CACHE_VERSION}`;
const PAGE_CACHE = `tactical-recon-pages-${CACHE_VERSION}`;
const STATIC_ASSETS = [
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
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

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (request.mode === 'navigate' || (url.origin === self.location.origin && url.pathname.endsWith('/index.html'))) {
    event.respondWith(networkFirstPage(request));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      const networkPromise = fetch(request).then(async response => {
        if (response && response.ok) {
          const cache = await caches.open(STATIC_CACHE);
          await cache.put(request, response.clone());
        }
        return response;
      }).catch(() => null);
      return cached || await networkPromise || Response.error();
    })());
  }
});
