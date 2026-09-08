# Deployment

The app is a vinext (Next.js on Vite) project that builds to a Cloudflare
Worker with static assets. It deploys to **app.dailychallenge.me**.

## Automatic deploy (Cloudflare git integration)

Deployment is handled on Cloudflare's side via Workers Builds connected to this
GitHub repo — there is no GitHub Actions workflow. Configure the build in the
Cloudflare dashboard (Workers & Pages → the `daily-challenge-pwa` worker →
Settings → Builds):

- **Build command:** `npm run build`
- **Deploy command:** `npx wrangler deploy --config dist/server/wrangler.json`

`vinext build` generates `dist/server/wrangler.json`; the deploy command uses it.
The custom domain **app.dailychallenge.me** is bound once in the dashboard
(the same worker → Settings → Domains & Routes).

## Manual deploy

```bash
npm run deploy
```

This builds, patches the generated `dist/server/wrangler.json` to add the custom
domain (`scripts/patch-wrangler.mjs`, override with `DEPLOY_DOMAIN`), and runs
`wrangler deploy`. Authenticate first with `wrangler login`. The patch step is
optional if the domain is already bound in the dashboard.

## Keeping the app 100% offline-capable

A production installation downloads one complete offline bundle: every built
client asset, icons/manifest, the selected language’s 12 monthly reading files and search index,
the content manifest, and the `/offline` app shell. Activation only succeeds when
every download succeeds. A failed update leaves the previous working bundle in
place and shows a retry notice. Keep the app open online until its initial
“Downloading…” notice disappears before relying on airplane mode.

Once controlled by the service worker, the app serves all application routes and
assets from Cache Storage without a network fallback. Navigation runs locally;
Today uses the device clock, and archive, search, saved readings, settings and
switching to a previously downloaded language work without a server. Selecting
a new language downloads its complete library first; if that download fails,
the current language remains selected and usable. Other languages are never
automatically downloaded. Updates use the most recently selected language. The bundle is versioned from file
contents, including content files, the worker and server output.

`npm run dev` is **not an offline/PWA test environment**: Vite's unbundled modules
and HMR require a server. Use `npm run build` and `npm run start -- --port 3001`
(on a clean local origin), visit once online to finish the download, then stop the
server and reload. Check an unvisited reading, both languages, every archive
month, search, saved readings and settings. `npm run test:offline` checks bundle
completeness/versioning, failed installs and zero network fallback calls.

The app does not request background refreshes during ordinary use. Browsers may
independently check `/sw.js` for updates, and storage can be removed by the user
or evicted by the operating system; those browser behaviors cannot be prohibited
by application code. The app requests persistent storage where supported.

The Support form still requires a connection when the user explicitly sends a
message; external publisher links also leave the offline app. Incidental
cross-origin subresources (including telemetry) are blocked by the worker.
**Do not enable Cloudflare Web Analytics / RUM** for `app.dailychallenge.me`:
it injects `beacon.min.js` before an initial visit is controlled by the worker.

The Support form POSTs to `https://dailychallenge.me/api/v1/mail`. Because the app
is served from the `app.` subdomain, that endpoint must allow cross-origin
requests (`Access-Control-Allow-Origin`).
