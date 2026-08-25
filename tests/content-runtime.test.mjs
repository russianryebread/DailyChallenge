import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const publicContentUrl = new URL('../public/content/', import.meta.url);
const manifest = JSON.parse(
  readFileSync(new URL('manifest.json', publicContentUrl), 'utf8'),
);
const versionUrl = new URL(`${manifest.contentVersion}/`, publicContentUrl);
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

test('runtime library is complete and remains inside its size budget', () => {
  assert.equal(manifest.readingCount, 366);
  assert.equal(manifest.translationCount, 732);
  assert.equal(manifest.files.length, 26);
  assert.ok(manifest.maxFileBytes <= 1024 * 1024);
  assert.ok(manifest.totalBytes <= 12 * 1024 * 1024);
});

test('runtime manifest hashes every content file', () => {
  for (const file of manifest.files) {
    const contents = readFileSync(new URL(file.name, versionUrl));
    assert.equal(contents.byteLength, file.bytes);
    assert.equal(sha256(contents), file.sha256);
  }
});

test('month chunks cover each locale once without QA-only fields', () => {
  for (const locale of ['en', 'ro']) {
    const ids = [];
    for (let monthNumber = 1; monthNumber <= 12; monthNumber += 1) {
      const month = String(monthNumber).padStart(2, '0');
      const document = JSON.parse(
        readFileSync(new URL(`${locale}/${month}.json`, versionUrl), 'utf8'),
      );
      assert.equal(document.locale, locale);
      assert.equal(document.month, month);
      for (const reading of document.readings) {
        ids.push(reading.id);
        assert.ok(reading.title);
        assert.ok(reading.blocks.length);
        assert.equal('source' in reading, false);
        assert.equal('plainText' in reading, false);
        assert.equal('sanitizedHtml' in reading, false);
        assert.equal(
          JSON.stringify(reading),
          JSON.stringify(reading).normalize('NFC'),
        );
      }
    }
    assert.deepEqual(ids, Array.from({ length: 366 }, (_, index) => index + 1));
  }
});
