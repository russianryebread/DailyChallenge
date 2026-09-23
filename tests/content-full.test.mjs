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
    [243, 263, 305],
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

test('credits are separate blocks and dialogue stays in the reading text', () => {
  for (const [locale, id, credit] of [
    ['en', 15, '—Unknown'],
    ['en', 61, '—J. H. Jowett'],
    ['en', 230, '—Elizabeth S. Brengle'],
    ['en', 266, '—Unknown'],
    ['ro', 1, '—Charles Kingsley'],
    ['ro', 266, '—Autor necunoscut'],
    ['ro', 365, '—W.M. Taylor'],
  ]) {
    const reading = artifacts[locale].readings.find((item) => item.id === id);
    const index = reading.blocks.findIndex((block) => block.type === 'attribution' && block.text === credit);
    assert.ok(index > 0, `${locale} reading ${id}: ${credit}`);
    assert.equal(reading.blocks[index - 1].type, 'prose');
    assert.equal(reading.blocks[index - 1].text.includes(credit), false);
  }

  for (const locale of ['en', 'ro']) {
    const names = new Set(artifacts[locale].readings.flatMap((reading) =>
      reading.blocks.filter((block) => block.type === 'attribution')
        .map((block) => block.text.replace(/^[-—–]+\s*/, '').replace(/\.$/, '').trim())
        .filter((name) => name.length >= 4),
    ));
    for (const reading of artifacts[locale].readings) {
      for (const block of reading.blocks) {
        if (!['prose', 'quotation', 'unknown'].includes(block.type)) continue;
        const text = block.text.trim().replace(/\.$/, '');
        for (const name of names) {
          assert.equal(
            ['—', '–', '-'].some((dash) => text.endsWith(`${dash}${name}`)),
            false,
            `${locale} reading ${reading.id}: credit left in ${block.type}`,
          );
        }
      }
    }
  }

  const romanianDialogue = artifacts.ro.readings.find((reading) => reading.id === 86);
  assert.ok(romanianDialogue.blocks.some((block) =>
    block.type === 'prose' && block.text.startsWith('– Fiule,'),
  ));

  for (const [locale, id, credit] of [
    ['en', 2, '—A. B. Simpson'],
    ['en', 338, '—S. D. Gordon'],
    ['ro', 67, '—Christina Rossetti'],
    ['ro', 188, '—C. H. Spurgeon'],
    ['ro', 284, '—Daniel Steele'],
    ['ro', 284, '—Gerhardt Tersteegen'],
  ]) {
    const reading = artifacts[locale].readings.find((item) => item.id === id);
    assert.ok(reading.blocks.some((block) => block.type === 'attribution' && block.text === credit));
  }
  assert.ok(artifacts.en.readings[24].blocks.some((block) =>
    block.type === 'poem' && block.lines.some((line) => line.text === '—But God had shut the door'),
  ));

  const september17 = artifacts.ro.readings.find((reading) => reading.monthDay === '09-17');
  assert.deepEqual(september17.blocks.slice(-2).map((block) => [block.type, block.text]), [
    ['attribution', '—John Keble'],
    ['attribution', '—A.B. Simpson'],
  ]);
  for (const [id, credit, followingType] of [
    [58, '—Samuel Logan Brengle', 'scripture'],
    [112, '—Alexander Maclaren', 'scripture'],
    [135, '—Barclay Buxton', 'prose'],
    [145, '—Frances Ridley Havergal', 'scripture'],
    [236, '—Autor necunoscut', 'prose'],
  ]) {
    const reading = artifacts.ro.readings.find((item) => item.id === id);
    const index = reading.blocks.findIndex((block) => block.type === 'attribution' && block.text === credit);
    assert.ok(index >= 0, `Romanian reading ${id}: ${credit}`);
    assert.equal(reading.blocks[index + 1]?.type, followingType);
  }
});

test('rendered blocks retain every letter from the original reading', () => {
  const letters = (value) => value.normalize('NFC').replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
  for (const locale of ['en', 'ro']) {
    for (const reading of artifacts[locale].readings) {
      const rendered = reading.blocks.map((block) => {
        if (block.type === 'scripture') return block.sourceText;
        if (block.type === 'poem') return block.lines.map((line) => line.text).join(' ');
        if (block.type === 'list') return block.items.join(' ');
        return block.text ?? '';
      }).join(' ');
      assert.equal(letters(rendered), letters(reading.plainText), `${locale} reading ${reading.id}`);
    }
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
