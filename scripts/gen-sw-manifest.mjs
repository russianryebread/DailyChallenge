// Post-build step: enumerate the built client assets and inject them into the
// deployed sw.js (PRECACHE_ASSETS) so the service worker can precache every
// hashed asset for full offline use, plus stamp a content-derived CACHE_VERSION
// so a new deploy invalidates old caches. The list is baked into sw.js rather
// than a side file so it is always served as a known asset.

import { createHash } from 'node:crypto';
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { relative, resolve } from 'node:path';

const clientDir = resolve(process.cwd(), 'dist/client');

if (!existsSync(clientDir)) {
  console.error('dist/client not found — run the build first.');
  process.exit(1);
}

const EXCLUDE_PREFIXES = ['.vite/', 'sw.js', 'sw-manifest.json'];
const EXCLUDE_FILES = new Set([
  '_headers',
  '.assetsignore',
  'vinext-client-entry-manifest.json',
]);

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = resolve(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, files);
    } else {
      files.push(full);
    }
  }
  return files;
}

const assets = walk(clientDir)
  .map((file) => `/${relative(clientDir, file).split('\\').join('/')}`)
  .filter((url) => {
    const path = url.slice(1);
    if (EXCLUDE_FILES.has(path)) {
      return false;
    }
    return !EXCLUDE_PREFIXES.some((prefix) => path.startsWith(prefix));
  })
  .sort();

// Include bytes, the worker itself, and server output (the shell HTML depends
// on it). Stable filenames must invalidate the bundle when their contents change.
const hash = createHash('sha256');
for (const url of assets) {
  hash.update(url).update(readFileSync(resolve(clientDir, url.slice(1))));
}
hash.update(readFileSync(resolve(process.cwd(), 'public/sw.js')));
const serverDir = resolve(process.cwd(), 'dist/server');
for (const file of walk(serverDir).sort()) {
  hash.update(relative(serverDir, file)).update(readFileSync(file));
}
const version = hash.digest('hex').slice(0, 12);

const swPath = resolve(clientDir, 'sw.js');
if (!existsSync(swPath)) {
  console.error('dist/client/sw.js not found — is public/sw.js present?');
  process.exit(1);
}

const source = readFileSync(swPath, 'utf8')
  .replace(/const CACHE_VERSION = '[^']*';/, `const CACHE_VERSION = '${version}';`)
  .replace(
    /const PRECACHE_ASSETS = \[[^\]]*\];/,
    `const PRECACHE_ASSETS = ${JSON.stringify(assets)};`,
  );
writeFileSync(swPath, source);

process.stdout.write(
  `Stamped sw.js (${assets.length} assets, version ${version})\n`,
);
