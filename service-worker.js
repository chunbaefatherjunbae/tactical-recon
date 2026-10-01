const CACHE_VERSION = 'v17-20261002';
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
    // HTML은 브라우저 HTTP 캐시보다 네트워크의 최신 배포본을 우선한다.
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

  // 문서 이동과 index.html은 항상 network-first.
  if (request.mode === 'navigate' || (url.origin === self.location.origin && url.pathname.endsWith('/index.html'))) {
    event.respondWith(networkFirstPage(request));
    return;
  }

  // 동일 출처의 정적 PWA 자원은 캐시 우선 + 백그라운드 갱신.
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
