import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const artifact = JSON.parse(
  readFileSync(new URL('../src/content/generated/proof/readings.json', import.meta.url)),
);
const report = JSON.parse(
  readFileSync(new URL('../src/content/generated/proof/report.json', import.meta.url)),
);

test('proof contains the expected bilingual reading set', () => {
  assert.equal(artifact.readings.length, 11);
  assert.equal(report.translationCount, 22);
  assert.deepEqual(
    artifact.readings.map((reading) => reading.id),
    [1, 19, 58, 59, 60, 97, 100, 180, 237, 293, 366],
  );

  for (const reading of artifact.readings) {
    assert.match(reading.monthDay, /^\d{2}-\d{2}$/);
    assert.ok(reading.translations.en.title.length > 0);
    assert.ok(reading.translations.ro.title.length > 0);
    assert.ok(reading.translations.en.plainText.length > 0);
    assert.ok(reading.translations.ro.plainText.length > 0);
  }
});

test('proof sanitizer preserves visible source text', () => {
  assert.equal(report.textParity.failed, 0);
  assert.equal(report.textParity.passed, 22);
  assert.deepEqual(report.anomalies.removedDangerousElements, []);
});

test('proof includes malformed and leap-day regression fixtures', () => {
  const ids = new Set(artifact.readings.map((reading) => reading.id));
  assert.ok(ids.has(59));
  assert.ok(ids.has(60));
  assert.ok(ids.has(366));
  assert.equal(
    artifact.readings.find((reading) => reading.id === 60).monthDay,
    '02-29',
  );
});
