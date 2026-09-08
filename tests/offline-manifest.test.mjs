import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const generator = new URL('../scripts/gen-sw-manifest.mjs', import.meta.url);
const worker = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');

test('build manifest includes the library and changes version for static, content, server and worker edits', () => {
  const root = mkdtempSync(join(tmpdir(), 'dc-offline-manifest-'));
  try {
    const files = {
      'public/sw.js': worker,
      'dist/client/sw.js': worker,
      'dist/client/assets/app.js': 'client',
      'dist/client/content/manifest.json': '{"contentVersion":"test"}',
      'dist/client/content/test/en/01.json': '{"readings":[]}',
      'dist/client/manifest.webmanifest': '{}',
      'dist/server/index.js': 'server',
      'dist/client/.vite/manifest.json': '{}',
      'dist/client/_headers': 'headers',
    };
    for (const [path, value] of Object.entries(files)) {
      const destination = join(root, path);
      mkdirSync(join(destination, '..'), { recursive: true });
      writeFileSync(destination, value);
    }
    function build() {
      execFileSync(process.execPath, [fileURLToPath(generator)], { cwd: root });
      const output = readFileSync(join(root, 'dist/client/sw.js'), 'utf8');
      return {
        assets: JSON.parse(/const PRECACHE_ASSETS = (.*);/.exec(output)[1]),
        version: /const CACHE_VERSION = '(.*)';/.exec(output)[1],
      };
    }
    let last = build();
    assert.ok(last.assets.includes('/content/manifest.json'));
    assert.ok(last.assets.includes('/content/test/en/01.json'));
    assert.ok(last.assets.includes('/assets/app.js'));
    assert.ok(!last.assets.includes('/_headers'));
    assert.ok(!last.assets.includes('/.vite/manifest.json'));
    assert.ok(!last.assets.includes('/sw.js'));
    assert.equal(build().version, last.version);
    for (const file of ['dist/client/manifest.webmanifest', 'dist/client/content/test/en/01.json', 'dist/server/index.js', 'public/sw.js']) {
      writeFileSync(join(root, file), `${files[file]}\n`);
      const next = build();
      assert.notEqual(next.version, last.version, file);
      last = next;
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
