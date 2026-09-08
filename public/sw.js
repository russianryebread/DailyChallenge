/* A complete, versioned offline bundle. Installation fails if any required
   download fails; a partial bundle must never replace a working installation. */
const CACHE_VERSION = 'DEV';
const PRECACHE_ASSETS = [/* @assets */];
const PRECACHE = `dc-precache-${CACHE_VERSION}`;
const OFFLINE_SHELL = '/offline';
const PREFERENCES = 'dc-offline-preferences';
const LANGUAGE_KEY = '/_offline/selected-language';

function assetLocale(url) {
  return /^\/content\/[^/]+\/(en|ro)\//.exec(url)?.[1]
    || /^\/content\/[^/]+\/search-(en|ro)\.json$/.exec(url)?.[1];
}

async function selectedLocale() {
  const saved = await (await caches.open(PREFERENCES)).match(LANGUAGE_KEY);
  const locale = saved ? await saved.text() : new URL(self.location.href).searchParams.get('locale');
  return locale === 'ro' ? 'ro' : 'en';
}

async function rememberLocale(locale) {
  await (await caches.open(PREFERENCES)).put(LANGUAGE_KEY, new Response(locale));
}

// Language downloads are explicit and serialized. Already downloaded languages
// remain available; a failed switch cannot damage the current offline library.
let languageQueue = Promise.resolve();
async function ensureLanguage(locale) {
  const cache = await caches.open(PRECACHE);
  const urls = PRECACHE_ASSETS.filter((url) => assetLocale(url) === locale);
  if (urls.length !== 13) throw new Error('Incomplete language manifest');
  const missing = [];
  for (const url of urls) if (!(await cache.match(url))) missing.push(url);
  if (missing.length) {
    const stagingName = `dc-language-${CACHE_VERSION}-${locale}`;
    const staging = await caches.open(stagingName);
    try {
      for (const url of missing) await download(staging, url);
      for (const url of missing) await cache.put(url, await staging.match(url));
    } finally {
      await caches.delete(stagingName);
    }
  }
  await rememberLocale(locale);
}

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'DOWNLOAD_LANGUAGE' || !['en', 'ro'].includes(event.data.locale)) return;
  const task = languageQueue.then(() => ensureLanguage(event.data.locale));
  languageQueue = task.catch(() => {});
  event.waitUntil(task.then(
    () => event.ports[0]?.postMessage({ ok: true }),
    () => event.ports[0]?.postMessage({ ok: false }),
  ));
});

async function download(cache, url) {
  const response = await fetch(url, { cache: 'reload' });
  if (!response.ok) throw new Error(`Offline download failed: ${url} (${response.status})`);
  await cache.put(url, response);
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    // Development has unbundled modules and HMR, not a deployable offline app.
    if (CACHE_VERSION === 'DEV' || PRECACHE_ASSETS.length === 0) {
      throw new Error('Offline installation requires a production build');
    }
    const cache = await caches.open(PRECACHE);
    const locale = await selectedLocale();
    const urls = [...new Set([...PRECACHE_ASSETS.filter((url) => !assetLocale(url) || assetLocale(url) === locale), OFFLINE_SHELL])];
    // Bound concurrent downloads, especially on mobile connections. Wait for
    // all workers to stop before deleting an unsuccessful installation.
    let cursor = 0;
    let failure;
    const workers = Array.from({ length: 6 }, async () => {
      while (cursor < urls.length && !failure) {
        const url = urls[cursor++];
        try {
          await download(cache, url);
        } catch (error) {
          failure = error;
        }
      }
    });
    await Promise.all(workers);
    if (failure) {
      await caches.delete(PRECACHE);
      throw failure;
    }
    await rememberLocale(locale);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Keep the preceding bundle for tabs that are still finishing a reload.
    // Never delete another application's caches on the same origin.
    const keys = await caches.keys();
    const previous = keys.filter((key) => key.startsWith('dc-precache-') && key !== PRECACHE);
    await Promise.all(keys.filter((key) =>
      key.startsWith('dc-runtime-') || previous.slice(0, -1).includes(key),
    ).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

function isAppRoute(pathname) {
  return /^\/(?:ro\/?|(?:ro\/)?(?:today|saved|search|settings|support|offline|archive(?:\/(?:0[1-9]|1[0-2]))?|devotional\/[1-9]\d{0,2})\/?)?$/.test(pathname);
}

async function localResponse(request, url) {
  const cache = await caches.open(PRECACHE);
  if (request.mode === 'navigate' && isAppRoute(url.pathname)) {
    // Resolve dates, language, routes and readings on the device. Never cache
    // server-rendered "today" HTML, which goes stale the next day.
    const shell = await cache.match(OFFLINE_SHELL);
    if (shell) {
      // Clear the cached response URL so relative URLs/history keep the actual
      // navigation destination instead of inheriting /offline.
      return new Response(shell.body, {
        status: shell.status,
        headers: shell.headers,
      });
    }
  } else {
    const cached = await cache.match(url.pathname);
    if (cached) return cached;
    // An already-open tab may briefly need an asset from the preceding build.
    if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/_next/')) {
      for (const key of await caches.keys()) {
        if (!key.startsWith('dc-precache-') || key === PRECACHE) continue;
        const previous = await (await caches.open(key)).match(url.pathname);
        if (previous) return previous;
      }
    }
  }
  // No network fallback: a missing asset is a bundle error, not a reason to
  // silently make offline operation depend on a connection.
  return new Response('Not available in the offline bundle', { status: 503 });
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    // Explicit support submissions and external navigation need a connection.
    // Block incidental cross-origin assets/telemetry in the installed app.
    if (request.mode === 'navigate' ||
        (request.method === 'POST' && url.href === 'https://dailychallenge.me/api/v1/mail')) return;
    event.respondWith(Response.error());
    return;
  }
  event.respondWith(request.method === 'GET'
    ? localResponse(request, url)
    : Promise.resolve(new Response('Offline app does not use server actions', { status: 503 })));
});
