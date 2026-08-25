/* Service worker for offline use. CACHE_VERSION is rewritten at build time by
   scripts/gen-sw-manifest.mjs so a new deploy invalidates old caches. The app
   makes no network requests at load once installed: the shell, all client
   assets, and the full content library are precached. The only network call is
   the user-initiated Support submission (cross-origin, never intercepted). */

const CACHE_VERSION = 'DEV';
// Hashed client assets, injected at build time by scripts/gen-sw-manifest.mjs.
const PRECACHE_ASSETS = [/* @assets */];
const PRECACHE = `dc-precache-${CACHE_VERSION}`;
const RUNTIME = `dc-runtime-${CACHE_VERSION}`;

// App shell routes (server-rendered HTML) fetched fresh at install.
const SHELL_ROUTES = [
  '/',
  '/today',
  '/ro/today',
  '/archive',
  '/ro/archive',
  '/saved',
  '/ro/saved',
  '/search',
  '/ro/search',
  '/settings',
  '/ro/settings',
  '/support',
  '/ro/support',
  '/offline',
];

const STATIC_FILES = [
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon.png',
  '/favicon.svg',
];

async function putSafe(cache, url) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (response.ok) {
      await cache.put(url, response.clone());
    }
  } catch {
    /* best effort — missing entries just fall back to network when online */
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PRECACHE);

      // Hashed client assets baked in at build time.
      await Promise.allSettled(PRECACHE_ASSETS.map((url) => putSafe(cache, url)));

      // Full content library from the content manifest.
      try {
        const response = await fetch('/content/manifest.json', { cache: 'no-store' });
        if (response.ok) {
          const manifest = await response.json();
          const version = manifest.contentVersion;
          const urls = (manifest.files || []).map(
            (file) => file.url || `/content/${version}/${file.name}`,
          );
          urls.push('/content/manifest.json');
          await Promise.allSettled(urls.map((url) => putSafe(cache, url)));
        }
      } catch {
        /* content precache is best effort */
      }

      await Promise.allSettled(
        [...SHELL_ROUTES, ...STATIC_FILES].map((url) => putSafe(cache, url)),
      );

      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== PRECACHE && key !== RUNTIME)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return cached || Response.error();
  }
}

async function handleNavigation(request) {
  const cache = await caches.open(PRECACHE);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached =
      (await cache.match(request)) ||
      (await cache.match(new URL(request.url).pathname));
    if (cached) {
      return cached;
    }
    // Unvisited route offline: the client shell renders it from precached content.
    const offline = await cache.match('/offline');
    return offline || new Response('Offline', { status: 503 });
  }
}

function isContent(url) {
  return url.pathname.startsWith('/content/');
}

function isAsset(url) {
  return (
    url.pathname.startsWith('/_next/') ||
    /\.(?:js|mjs|css|png|jpg|jpeg|svg|webp|woff2?|ico|json)$/.test(url.pathname)
  );
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') {
    return;
  }
  const url = new URL(request.url);

  // Never touch cross-origin requests (e.g. the Support mail API).
  if (url.origin !== self.location.origin) {
    return;
  }

  if (isContent(url)) {
    event.respondWith(cacheFirst(request, PRECACHE));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (isAsset(url)) {
    event.respondWith(cacheFirst(request, RUNTIME));
    return;
  }

  event.respondWith(fetch(request).catch(() => caches.match(request)));
});
