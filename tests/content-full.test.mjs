import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const generatedUrl = new URL('../src/content/generated/full/', import.meta.url);
const readJson = (name) =>
  JSON.parse(readFileSync(new URL(name, generatedUrl), 'utf8'));
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

const artifacts = { en: readJson('readings.en.json'), ro: readJson('readings.ro.json') };
const artifact = artifacts.en;
const report = readJson('report.json');
const manifest = readJson('manifest.json');
const catalogs = { en: readJson('catalog.en.json'), ro: readJson('catalog.ro.json') };
const searchIndexes = { en: readJson('search.en.json'), ro: readJson('search.ro.json') };

test('full migration contains every aligned reading in separate language files', () => {
  assert.equal(report.translationCount, 732);
  for (const locale of ['en', 'ro']) {
    const library = artifacts[locale];
    assert.equal(library.locale, locale);
    assert.equal(library.readings.length, 366);
    assert.deepEqual(library.readings.map((reading) => reading.id), Array.from({ length: 366 }, (_, index) => index + 1));
    assert.deepEqual(library.readings.map((reading) => reading.monthDay), artifact.readings.map((reading) => reading.monthDay));
    assert.equal(new Set(library.readings.map((reading) => reading.monthDay)).size, 366);
    assert.equal(library.readings.find((reading) => reading.id === 60).monthDay, '02-29');
    for (const reading of library.readings) {
      assert.ok(reading.title.trim());
      assert.ok(reading.plainText.trim());
      assert.equal(reading.contentVersion, artifact.contentVersion);
      assert.equal('sanitizedHtml' in reading, false);
      assert.equal('translations' in reading, false);
    }
  }
});

test('full migration preserves source text and reports unresolved encoding', () => {
  assert.deepEqual(report.textParity, { passed: 732, failed: 0 });
  assert.deepEqual(
    report.replacementCharacters.map(({ id, locale, count }) => ({ id, locale, count })),
    [
      { id: 19, locale: 'ro', count: 2 },
      { id: 58, locale: 'ro', count: 2 },
      { id: 97, locale: 'ro', count: 2 },
    ],
  );
  assert.deepEqual(report.anomalies.removedDangerousElements, []);
  assert.deepEqual(report.anomalies.unknownBlocks.en, []);
  assert.deepEqual(
    report.anomalies.unknownBlocks.ro.map(({ id }) => id),
    [263, 305],
  );
  assert.deepEqual(
    report.titleMarkup.map(({ id, locale }) => ({ id, locale })),
    [124, 243, 263, 305, 362].map((id) => ({ id, locale: 'ro' })),
  );
  assert.deepEqual(report.unicodeNormalization.lessons, { en: 0, ro: 366 });
  for (const locale of ['en', 'ro']) {
    for (const reading of artifacts[locale].readings) {
      assert.equal(reading.title.includes('<'), false);
      assert.equal(JSON.stringify(reading), JSON.stringify(reading).normalize('NFC'));
    }
  }
});

test('catalogs and search indexes cover the content version', () => {
  for (const locale of ['en', 'ro']) {
    assert.equal(catalogs[locale].contentVersion, artifact.contentVersion);
    assert.equal(searchIndexes[locale].contentVersion, artifact.contentVersion);
    assert.equal(catalogs[locale].readings.length, 366);
    assert.equal(searchIndexes[locale].readings.length, 366);
  }
});

test('artifact manifest hashes every generated document byte-for-byte', () => {
  assert.equal(manifest.contentVersion, artifact.contentVersion);
  for (const file of manifest.files) {
    const contents = readFileSync(new URL(file.name, generatedUrl));
    assert.equal(contents.byteLength, file.bytes);
    assert.equal(sha256(contents), file.sha256);
  }
});
