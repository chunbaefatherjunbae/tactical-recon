const CACHE_VERSION = 'v29-stabilized-20261005-1';
const STATIC_CACHE = `tactical-recon-static-${CACHE_VERSION}`;
const PAGE_CACHE = `tactical-recon-pages-${CACHE_VERSION}`;
const VENDOR_ASSETS = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdn.jsdelivr.net/npm/mgrs@1.0.0/dist/mgrs.min.js'
];
const STATIC_ASSETS = [
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
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
  './v29-stabilize.css',
  './v29-stabilize.js'
];

async function cacheVendorAssets() {
  const cache = await caches.open(STATIC_CACHE);
  await Promise.allSettled(VENDOR_ASSETS.map(async url => {
    try {
      const request = new Request(url, { mode:'no-cors', cache:'reload' });
      const response = await fetch(request);
      if (response) await cache.put(request, response.clone());
    } catch (e) {}
  }));
}

self.addEventListener('install', event => {
  event.waitUntil(Promise.all([
    caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_ASSETS)),
    caches.open(PAGE_CACHE).then(cache => cache.add('./index.html')),
    cacheVendorAssets()
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

async function injectStableOverlay(response) {
  if (!response || !response.ok) return response;
  const type = response.headers.get('content-type') || '';
  if (type && !type.includes('text/html')) return response;
  let html = await response.text();
  // Cached pages from older workers may already contain legacy overlay tags.
  // Strip them before inserting the single stable bundle to avoid double execution.
  html = html
    .replace(/\s*<link[^>]+href=["']\.\/v27-2\.css["'][^>]*>\s*/g, '\n')
    .replace(/\s*<link[^>]+href=["']\.\/v27-2-1\.css["'][^>]*>\s*/g, '\n')
    .replace(/\s*<link[^>]+href=["']\.\/v27-3\.css["'][^>]*>\s*/g, '\n')
    .replace(/\s*<script[^>]+src=["']\.\/v27-2\.js["'][^>]*><\/script>\s*/g, '\n')
    .replace(/\s*<script[^>]+src=["']\.\/v27-2-1\.js["'][^>]*><\/script>\s*/g, '\n')
    .replace(/\s*<script[^>]+src=["']\.\/v27-3\.js["'][^>]*><\/script>\s*/g, '\n');

  if (!html.includes('v27-stable.css')) {
    html = html.replace('</head>', '  <link rel="stylesheet" href="./v27-stable.css" />\n</head>');
  }
  if (!html.includes('v27-stable.js')) {
    html = html.replace('</body>', '  <script src="./v27-stable.js"></script>\n</body>');
  }
  if (!html.includes('v28.css')) {
    html = html.replace('</head>', '  <link rel="stylesheet" href="./v28.css" />\n</head>');
  }
  if (!html.includes('v28.js')) {
    html = html.replace('</body>', '  <script src="./v28.js"></script>\n</body>');
  }
  if (!html.includes('v29-storage.js')) {
    html = html.replace('</body>', '  <script src="./v29-storage.js"></script>\n</body>');
  }
  if (!html.includes('v28-runtime.js')) {
    html = html.replace('</body>', '  <script src="./v28-runtime.js"></script>\n</body>');
  }
  if (!html.includes('v29.css')) {
    html = html.replace('</head>', '  <link rel="stylesheet" href="./v29.css" />\n</head>');
  }
  if (!html.includes('v29.js')) {
    html = html.replace('</body>', '  <script src="./v29.js"></script>\n</body>');
  }
  if (!html.includes('v29-ui.js')) {
    html = html.replace('</body>', '  <script src="./v29-ui.js"></script>\n</body>');
  }
  if (!html.includes('v29-stabilize.css')) {
    html = html.replace('</head>', '  <link rel="stylesheet" href="./v29-stabilize.css" />\n</head>');
  }
  if (!html.includes('v29-stabilize.js')) {
    html = html.replace('</body>', '  <script src="./v29-stabilize.js"></script>\n</body>');
  }
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.set('content-type', 'text/html; charset=utf-8');
  return new Response(html, { status:response.status, statusText:response.statusText, headers });
}

async function networkFirstPage(request) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const response = await fetch(request, { cache: 'reload' });
    const injected = await injectStableOverlay(response);
    if (injected && injected.ok) await cache.put(request, injected.clone());
    return injected;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return injectStableOverlay(cached);
    const fallback = await cache.match('./index.html') || await caches.match('./index.html');
    if (fallback) return injectStableOverlay(fallback);
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

  if (VENDOR_ASSETS.includes(url.href)) {
    event.respondWith((async () => {
      const cached = await caches.match(request) || await caches.match(url.href);
      if (cached) return cached;
      try {
        const response = await fetch(new Request(url.href, { mode:'no-cors' }));
        if (response) {
          const cache = await caches.open(STATIC_CACHE);
          await cache.put(new Request(url.href, { mode:'no-cors' }), response.clone());
          return response;
        }
      } catch (e) {}
      return Response.error();
    })());
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
