import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { offlineRoute } from '../src/features/offline/routes.ts';

const origin = 'https://app.example';
const source = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
const manifest = JSON.parse(readFileSync(new URL('../public/content/manifest.json', import.meta.url), 'utf8'));
const assets = ['/assets/app.js', '/assets/app.css', '/manifest.webmanifest', '/icons/icon-192.png', '/content/manifest.json', ...manifest.files.map((file) => file.url)];

export function workerHarness(workerSource, fetchImpl, stored = new Map(), locale = 'en') {
  const listeners = new Map();
  let skipped = false;
  let claimed = false;
  const keyOf = (request) => new URL(typeof request === 'string' ? request : request.url, origin).href;
  const caches = {
    keys: async () => [...stored.keys()],
    delete: async (key) => stored.delete(key),
    open: async (name) => {
      if (!stored.has(name)) stored.set(name, new Map());
      const entries = stored.get(name);
      return {
        put: async (request, response) => { entries.set(keyOf(request), response.clone()); },
        match: async (request) => entries.get(keyOf(request))?.clone(),
      };
    },
  };
  vm.runInNewContext(workerSource, {
    self: {
      location: { origin, href: `${origin}/sw.js?locale=${locale}` },
      addEventListener: (name, listener) => listeners.set(name, listener),
      skipWaiting: async () => { skipped = true; },
      clients: { claim: async () => { claimed = true; } },
    }, caches, fetch: fetchImpl, Response, URL, Set, console,
  });
  return {
    stored, caches, get skipped() { return skipped; }, get claimed() { return claimed; },
    async lifecycle(name) {
      let pending;
      listeners.get(name)({ waitUntil: (promise) => { pending = promise; } });
      await pending;
    },
    async language(locale) {
      let pending;
      let result;
      listeners.get('message')({ data: { type: 'DOWNLOAD_LANGUAGE', locale }, ports: [{ postMessage: (value) => { result = value; } }], waitUntil: (promise) => { pending = promise; } });
      await pending;
      return result;
    },
    async request(path, mode = 'cors', method = 'GET') {
      let pending;
      listeners.get('fetch')({ request: { url: new URL(path, origin).href, mode, method }, respondWith: (promise) => { pending = Promise.resolve(promise); } });
      return pending;
    },
  };
}

function build(version = 'test') {
  return source.replace("'DEV'", `'${version}'`).replace('[/* @assets */]', JSON.stringify(assets));
}

test('all assets and all app routes use the complete bundle with zero network calls after install', async () => {
  const calls = [];
  let offline = false;
  const worker = workerHarness(build(), async (url) => {
    calls.push(url);
    if (offline) throw new Error('Network unavailable');
    return new Response(url === '/offline' ? '<html>local app shell</html>' : `cached:${url}`);
  });
  await worker.lifecycle('install');
  assert.equal(worker.skipped, true);
  assert.equal(calls.length, assets.length + 1 - 13);
  assert.ok(calls.every((url) => !url.includes('/ro/') && !url.endsWith('search-ro.json')));
  await worker.lifecycle('activate');
  assert.equal(worker.claimed, true);
  offline = true;
  calls.length = 0;
  for (const url of assets) {
    const otherLanguage = url.includes('/ro/') || url.endsWith('search-ro.json');
    assert.equal((await worker.request(`${url}?v=123`)).status, otherLanguage ? 503 : 200, url);
  }
  for (const prefix of ['', '/ro']) {
    for (const route of ['/', '/today', '/archive', '/saved', '/search', '/settings', '/support']) {
      assert.match(await (await worker.request(`${prefix}${route}`, 'navigate')).text(), /local app shell/);
    }
    for (let id = 1; id <= 366; id++) {
      assert.equal((await worker.request(`${prefix}/devotional/${id}`, 'navigate')).status, 200);
    }
    for (let month = 1; month <= 12; month++) {
      assert.equal((await worker.request(`${prefix}/archive/${String(month).padStart(2, '0')}`, 'navigate')).status, 200);
    }
  }
  assert.equal((await worker.request('/assets/missing.js')).status, 503);
  assert.equal((await worker.request('/today?_rsc=uncached')).status, 503);
  assert.equal((await worker.request('https://tracker.example/beacon.js')).type, 'error');
  assert.equal(await worker.request('https://dailychallenge.me/api/v1/mail', 'cors', 'POST'), undefined);
  assert.deepEqual(calls, []);
});

test('failed downloads reject installation, remove partial cache, and preserve the active bundle', async () => {
  for (const failure of ['/assets/app.js', manifest.files.find((file) => file.name === 'en/12.json').url, '/offline']) {
    const stored = new Map([['dc-precache-working', new Map()], ['unrelated-cache', new Map()]]);
    const worker = workerHarness(build(), async (url) => new Response('body', { status: url === failure ? 500 : 200 }), stored);
    await assert.rejects(worker.lifecycle('install'), /Offline download failed/);
    assert.equal(worker.skipped, false);
    assert.equal(stored.has('dc-precache-test'), false);
    assert.equal(stored.has('dc-precache-working'), true);
    assert.equal(stored.has('unrelated-cache'), true);
  }
});

test('development worker refuses to advertise offline support', async () => {
  const worker = workerHarness(source, () => { throw new Error('must not fetch'); });
  await assert.rejects(worker.lifecycle('install'), /production build/);
  assert.equal(worker.skipped, false);
});

test('activation preserves other applications and retains the preceding bundle', async () => {
  const stored = new Map(['unrelated', 'dc-precache-ancient', 'dc-precache-previous', 'dc-precache-test', 'dc-runtime-old'].map((key) => [key, new Map()]));
  const worker = workerHarness(build(), async () => new Response(''), stored);
  await worker.lifecycle('activate');
  assert.deepEqual([...stored.keys()], ['unrelated', 'dc-precache-previous', 'dc-precache-test']);
});

test('local route resolution covers both languages, every reading and month, and rejects invalid routes', () => {
  const now = new Date(2026, 8, 7);
  assert.deepEqual(offlineRoute('/', 'ro', now), { locale: 'ro', kind: 'today' });
  for (const locale of ['en', 'ro']) {
    const prefix = locale === 'ro' ? '/ro' : '';
    for (let id = 1; id <= 366; id++) assert.deepEqual(offlineRoute(`${prefix}/devotional/${id}`, 'en', now), { locale, kind: 'devotional', id });
    for (let month = 1; month <= 12; month++) assert.deepEqual(offlineRoute(`${prefix}/archive/${String(month).padStart(2, '0')}`, 'en', now), { locale, kind: 'archive', month });
    for (const kind of ['today', 'saved', 'search', 'settings', 'support']) assert.deepEqual(offlineRoute(`${prefix}/${kind}`, 'en', now), { locale, kind });
  }
  assert.equal(offlineRoute('/archive', 'en', now).month, 9);
  assert.equal(offlineRoute('/archive', 'en', new Date(2027, 0, 1)).month, 1);
  for (const path of ['/devotional/367', '/devotional/0', '/archive/13', '/other']) assert.equal(offlineRoute(path, 'en', now).kind, 'notfound');
});


test('switching downloads only the newly selected library; switching back uses cache', async () => {
  const calls = [];
  const worker = workerHarness(build(), async (url) => { calls.push(url); return new Response(url); });
  await worker.lifecycle('install');
  calls.length = 0;
  assert.equal((await worker.language('ro')).ok, true);
  assert.equal(calls.length, 13);
  assert.ok(calls.every((url) => url.includes('/ro/') || url.endsWith('search-ro.json')));
  calls.length = 0;
  assert.equal((await worker.language('en')).ok, true);
  assert.deepEqual(calls, []);
});

test('failed language switch keeps the original language and retries successfully', async () => {
  let fail = false;
  const worker = workerHarness(build(), async (url) => {
    if (fail && url.includes('/ro/')) throw new Error('offline');
    return new Response(url);
  });
  await worker.lifecycle('install');
  fail = true;
  assert.equal((await worker.language('ro')).ok, false);
  const prefs = await worker.caches.open('dc-offline-preferences');
  assert.equal(await (await prefs.match('/_offline/selected-language')).text(), 'en');
  assert.equal((await worker.request(manifest.files.find((file) => file.name === 'en/01.json').url)).status, 200);
  fail = false;
  assert.equal((await worker.language('ro')).ok, true);
  assert.equal(await (await prefs.match('/_offline/selected-language')).text(), 'ro');
});

test('updates download the most recently selected language only', async () => {
  const original = workerHarness(build(), async (url) => new Response(url));
  await original.lifecycle('install');
  await original.language('ro');
  const calls = [];
  const update = workerHarness(build('next'), async (url) => { calls.push(url); return new Response(url); }, original.stored);
  await update.lifecycle('install');
  assert.ok(calls.some((url) => url.includes('/ro/')));
  assert.ok(calls.every((url) => !url.includes('/en/') && !url.endsWith('search-en.json')));
});


test('a Romanian first installation never downloads the English library', async () => {
  const calls = [];
  const worker = workerHarness(build(), async (url) => { calls.push(url); return new Response(url); }, new Map(), 'ro');
  await worker.lifecycle('install');
  assert.equal(calls.filter((url) => url.includes('/ro/') || url.endsWith('search-ro.json')).length, 13);
  assert.ok(calls.every((url) => !url.includes('/en/') && !url.endsWith('search-en.json')));
});
