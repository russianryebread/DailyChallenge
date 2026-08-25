# Deployment

The app is a vinext (Next.js on Vite) project that builds to a Cloudflare
Worker with static assets. It deploys to **app.dailychallenge.me**.

## Automatic deploy on push

`.github/workflows/deploy.yml` builds and deploys on every push to `main`.

It needs two GitHub repository secrets (Settings → Secrets and variables →
Actions):

- `CLOUDFLARE_API_TOKEN` — a token with **Workers Scripts: Edit** and, for the
  custom domain, **Zone → DNS: Edit** and **Workers Routes: Edit** on the
  `dailychallenge.me` zone. Create it at
  <https://dash.cloudflare.com/profile/api-tokens> (the "Edit Cloudflare
  Workers" template plus DNS edit works).
- `CLOUDFLARE_ACCOUNT_ID` — your account ID (Workers & Pages → Overview).

Until both secrets exist the workflow runs but the deploy step fails.

## Manual deploy

```bash
npm run deploy
```

This builds, patches the generated `dist/server/wrangler.json` with the custom
domain, and runs `wrangler deploy`. Authenticate first with `wrangler login` or
by exporting `CLOUDFLARE_API_TOKEN`.

## Custom domain

`scripts/patch-wrangler.mjs` adds `app.dailychallenge.me` as a Worker custom
domain (override with `DEPLOY_DOMAIN`). The `dailychallenge.me` zone must be on
the same Cloudflare account; Wrangler creates the DNS record and route on first
deploy. Alternatively set the custom domain once in the dashboard
(Workers & Pages → the `daily-challenge-pwa` worker → Settings → Domains &
Routes) and remove the patch step.

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
