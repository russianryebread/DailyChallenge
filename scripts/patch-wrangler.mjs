// vinext regenerates dist/server/wrangler.json on every build. This step adds
// the production custom domain so `wrangler deploy` binds app.dailychallenge.me
// to the worker. Requires the dailychallenge.me zone to be on the same
// Cloudflare account and an API token with Workers + DNS edit permissions.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CUSTOM_DOMAIN = process.env.DEPLOY_DOMAIN || 'app.dailychallenge.me';
const configPath = resolve(process.cwd(), 'dist/server/wrangler.json');

if (!existsSync(configPath)) {
  console.error('dist/server/wrangler.json not found — run the build first.');
  process.exit(1);
}

const config = JSON.parse(readFileSync(configPath, 'utf8'));
config.routes = [{ pattern: CUSTOM_DOMAIN, custom_domain: true }];
writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);

process.stdout.write(`Patched wrangler.json with custom domain ${CUSTOM_DOMAIN}\n`);
