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

The app makes **no** network requests at load once installed — everything is
precached by the service worker, and there are no web fonts, CDNs, or analytics
in the code. To keep it that way in production:

- **Do not enable Cloudflare Web Analytics / RUM** for `app.dailychallenge.me`.
  Its automatic setup injects `beacon.min.js`, which is a runtime network
  request. If you want analytics, use a build-time-excluded approach instead.

The only intentional network call is the **Support** form, which POSTs to
`https://dailychallenge.me/api/v1/mail` on explicit user submit. Because the app
is served from the `app.` subdomain, that endpoint must allow cross-origin
requests from `https://app.dailychallenge.me` (add
`Access-Control-Allow-Origin`), or the browser will block the submission.
