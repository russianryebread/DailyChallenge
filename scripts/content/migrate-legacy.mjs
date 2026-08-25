import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { parseFragment, serialize } from 'parse5';

const DEFAULT_IDS = [1, 19, 58, 59, 60, 97, 100, 180, 237, 293, 366];
const ALLOWED_TAGS = new Set([
  'p',
  'div',
  'blockquote',
  'i',
  'em',
  'b',
  'strong',
  'br',
  'sup',
  'ul',
  'ol',
  'li',
  'hr',
]);
const DROP_WITH_CONTENT = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'template',
]);
const ALLOWED_CLASSES = new Set([
  'justify',
  'center',
  'narrow',
  'c3',
  'c4',
  'c5',
  'c6',
  'c7',
  'c8',
  'c10',
]);
const BLOCK_TAGS = new Set([
  'p',
  'div',
  'blockquote',
  'ul',
  'ol',
  'li',
  'hr',
]);

function parseArgs(argv) {
  const result = {
    sourceRoot: resolve(process.cwd(), '../christians-daily-challenge/DailyChallenge'),
    out: resolve(process.cwd(), 'src/content/generated/proof'),
    ids: DEFAULT_IDS,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--source-root') {
      result.sourceRoot = resolve(argv[index + 1]);
      index += 1;
    } else if (argument === '--out') {
      result.out = resolve(argv[index + 1]);
      index += 1;
    } else if (argument === '--ids') {
      result.ids = argv[index + 1]
        .split(',')
        .map((value) => Number.parseInt(value, 10))
        .filter(Number.isInteger);
      index += 1;
    } else if (argument === '--all') {
      result.ids = Array.from({ length: 366 }, (_, id) => id + 1);
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  if (result.ids.length === 0) {
    throw new Error('At least one reading ID is required.');
  }

  if (new Set(result.ids).size !== result.ids.length) {
    throw new Error('Reading IDs must be unique.');
  }

  if (result.ids.some((id) => id < 1 || id > 366)) {
    throw new Error('Reading IDs must be between 1 and 366.');
  }

  return result;
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function formatJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function countBy(values) {
  return Object.fromEntries(
    [...values.reduce((counts, value) => {
      counts.set(value, (counts.get(value) ?? 0) + 1);
      return counts;
    }, new Map())].sort(([left], [right]) => left.localeCompare(right)),
  );
}

function getTagName(node) {
  return node.tagName?.toLowerCase() ?? null;
}

function getClassNames(node) {
  const classAttribute = node.attrs?.find((attribute) => attribute.name === 'class');
  return classAttribute?.value.split(/\s+/).filter(Boolean) ?? [];
}

function sanitizeNodes(nodes, parent, anomaly) {
  const sanitized = [];

  for (const node of nodes ?? []) {
    if (node.nodeName === '#comment') {
      anomaly.removedComments += 1;
      continue;
    }

    if (node.nodeName === '#text') {
      node.parentNode = parent;
      sanitized.push(node);
      continue;
    }

    const tagName = getTagName(node);
    if (!tagName) {
      continue;
    }

    if (DROP_WITH_CONTENT.has(tagName)) {
      anomaly.removedDangerousElements.push(tagName);
      continue;
    }

    const children = sanitizeNodes(node.childNodes, node, anomaly);

    if (!ALLOWED_TAGS.has(tagName)) {
      anomaly.unwrappedElements.push(tagName);
      for (const child of children) {
        child.parentNode = parent;
        sanitized.push(child);
      }
      continue;
    }

    const nextAttributes = [];
    for (const attribute of node.attrs ?? []) {
      if (attribute.name === 'class') {
        const classes = attribute.value
          .split(/\s+/)
          .filter((className) => ALLOWED_CLASSES.has(className));
        if (classes.length > 0) {
          nextAttributes.push({ ...attribute, value: classes.join(' ') });
        }
        if (classes.length !== attribute.value.split(/\s+/).filter(Boolean).length) {
          anomaly.removedAttributes.push(`${tagName}.class`);
        }
      } else {
        anomaly.removedAttributes.push(`${tagName}.${attribute.name}`);
      }
    }

    node.attrs = nextAttributes;
    node.childNodes = children;
    node.parentNode = parent;
    for (const child of children) {
      child.parentNode = node;
    }
    sanitized.push(node);
  }

  return sanitized;
}

function sanitizeHtml(rawHtml) {
  const fragment = parseFragment(rawHtml, { sourceCodeLocationInfo: true });
  const anomaly = {
    removedComments: 0,
    removedDangerousElements: [],
    unwrappedElements: [],
    removedAttributes: [],
  };

  fragment.childNodes = sanitizeNodes(fragment.childNodes, fragment, anomaly);
  return {
    fragment,
    html: serialize(fragment),
    anomaly,
  };
}

function collectVisibleText(node, output = []) {
  if (node.nodeName === '#text') {
    output.push(node.value);
    return output;
  }

  const tagName = getTagName(node);
  if (tagName === 'br' || tagName === 'hr') {
    output.push('\n');
  }

  for (const child of node.childNodes ?? []) {
    collectVisibleText(child, output);
  }

  if (BLOCK_TAGS.has(tagName)) {
    output.push('\n');
  }

  return output;
}

function plainText(node) {
  return collectVisibleText(node)
    .join('')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .normalize('NFC');
}

function comparisonText(node) {
  return plainText(node).replace(/\s+/g, ' ').trim();
}

function serializeNode(node) {
  return serialize({
    nodeName: '#document-fragment',
    childNodes: [node],
  });
}

function scriptureParts(text) {
  const match = text.match(/^(.*)\s+\(([^()]+)\)\.?$/s);
  if (!match) {
    return { text };
  }
  return {
    text: match[1].trim(),
    reference: match[2].trim(),
  };
}

function isItalicLead(node) {
  const firstElement = (node.childNodes ?? []).find(
    (child) => child.nodeName !== '#text' || child.value.trim().length > 0,
  );
  return ['i', 'em'].includes(getTagName(firstElement));
}

function toBlocks(fragment) {
  const blocks = [];
  let poemLines = [];

  const flushPoem = () => {
    if (poemLines.length > 0) {
      blocks.push({ type: 'poem', lines: poemLines });
      poemLines = [];
    }
  };

  for (const node of fragment.childNodes ?? []) {
    const text = plainText(node);
    if (!text) {
      continue;
    }

    const tagName = getTagName(node);
    const classNames = getClassNames(node);

    if (tagName === 'div' && classNames.some((name) => ['c3', 'c6'].includes(name))) {
      poemLines.push(text);
      continue;
    }

    flushPoem();

    if (tagName === 'p' && isItalicLead(node) && /^[“\"]/.test(text)) {
      blocks.push({ type: 'scripture', ...scriptureParts(text), sourceText: text });
    } else if (
      (tagName === 'p' && classNames.some((name) => ['c4', 'c8', 'c10'].includes(name))) ||
      /^[—–-]/.test(text)
    ) {
      blocks.push({ type: 'attribution', text });
    } else if (tagName === 'p') {
      blocks.push({ type: 'prose', html: serializeNode(node), text });
    } else if (tagName === 'blockquote') {
      blocks.push({ type: 'quotation', html: serializeNode(node), text });
    } else if (tagName === 'ul' || tagName === 'ol') {
      blocks.push({
        type: 'list',
        ordered: tagName === 'ol',
        items: (node.childNodes ?? [])
          .filter((child) => getTagName(child) === 'li')
          .map((child) => plainText(child)),
      });
    } else if (tagName === 'hr') {
      blocks.push({ type: 'divider' });
    } else {
      blocks.push({ type: 'unknown', html: serializeNode(node), text });
    }
  }

  flushPoem();
  return blocks;
}

function readRows(databasePath, ids) {
  const database = new DatabaseSync(databasePath, { readOnly: true });
  try {
    const placeholders = ids.map(() => '?').join(', ');
    return database
      .prepare(
        `SELECT id, date, title, lesson, tags FROM daily WHERE id IN (${placeholders}) ORDER BY id`,
      )
      .all(...ids);
  } finally {
    database.close();
  }
}

function loadCorrections(path) {
  const manifest = JSON.parse(readFileSync(path, 'utf8'));
  if (!Number.isInteger(manifest.version) || !Array.isArray(manifest.entries)) {
    throw new Error('Corrections manifest must contain an integer version and entries array.');
  }
  return manifest;
}

function applyCorrections(row, locale, manifest) {
  const corrected = { ...row };
  const applied = [];
  const entries = manifest.entries.filter(
    (entry) => entry.locale === locale && entry.id === row.id,
  );

  for (const [index, entry] of entries.entries()) {
    const correctionId = entry.key ?? `${locale}-${row.id}-${index + 1}`;
    if (!['title', 'lesson', 'tags'].includes(entry.field)) {
      throw new Error(`Correction ${correctionId} has an unsupported field.`);
    }
    if (
      typeof entry.find !== 'string' ||
      entry.find.length === 0 ||
      typeof entry.replace !== 'string' ||
      typeof entry.reason !== 'string' ||
      entry.reason.length === 0
    ) {
      throw new Error(`Correction ${correctionId} is missing find, replace, or reason.`);
    }

    const value = corrected[entry.field] ?? '';
    const occurrences = value.split(entry.find).length - 1;
    if (occurrences !== 1) {
      throw new Error(
        `Correction ${correctionId} expected one source match, found ${occurrences}.`,
      );
    }
    corrected[entry.field] = value.replace(entry.find, entry.replace);
    applied.push({
      key: correctionId,
      locale,
      id: row.id,
      field: entry.field,
      reason: entry.reason,
    });
  }

  return { corrected, applied };
}

function convertRow(sourceRow, database, locale, correctionManifest) {
  const { corrected: row, applied } = applyCorrections(
    sourceRow,
    locale,
    correctionManifest,
  );
  const rawFragment = parseFragment(row.lesson);
  const sanitized = sanitizeHtml(row.lesson);
  const sourceVisibleText = comparisonText(rawFragment);
  const transformedVisibleText = comparisonText(sanitized.fragment);
  const textMatches = sourceVisibleText === transformedVisibleText;

  const translation = {
    title: row.title.normalize('NFC'),
    blocks: toBlocks(sanitized.fragment),
    sanitizedHtml: sanitized.html,
    plainText: plainText(sanitized.fragment),
    searchAliases: row.tags?.split(/\s+/).filter(Boolean) ?? [],
    source: {
      database,
      sourceId: row.id,
      sourceDate: row.date,
      rawChecksum: sha256(JSON.stringify(sourceRow)),
      correctionKeys: applied.map((correction) => correction.key),
    },
  };
  translation.source.transformedChecksum = sha256(JSON.stringify(translation));

  return {
    translation,
    validation: {
      textMatches,
      sourceLength: sourceVisibleText.length,
      transformedLength: transformedVisibleText.length,
      replacementCharacterCount: (sourceVisibleText.match(/\uFFFD/g) ?? []).length,
      appliedCorrections: applied,
      ...sanitized.anomaly,
    },
  };
}

function unique(values) {
  return [...new Set(values)].sort();
}

function duplicateTitles(readings, locale) {
  const idsByTitle = new Map();
  for (const reading of readings) {
    const title = reading.translations[locale].title;
    idsByTitle.set(title, [...(idsByTitle.get(title) ?? []), reading.id]);
  }
  return [...idsByTitle.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([title, ids]) => ({ title, ids }))
    .sort((left, right) => left.ids[0] - right.ids[0]);
}

function fileRecord(name, contents) {
  return {
    name,
    bytes: Buffer.byteLength(contents),
    sha256: sha256(contents),
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const correctionPath = resolve(process.cwd(), 'scripts/content/corrections.json');
  const correctionManifest = loadCorrections(correctionPath);
  const correctionManifestChecksum = sha256(formatJson(correctionManifest));
  const sources = {
    en: { file: 'cdc.db', database: 'cdc.db' },
    ro: { file: 'cdc-ro.db', database: 'cdc-ro.db' },
  };
  const rowsByLocale = Object.fromEntries(
    Object.entries(sources).map(([locale, source]) => [
      locale,
      readRows(resolve(options.sourceRoot, source.file), options.ids),
    ]),
  );

  for (const [locale, rows] of Object.entries(rowsByLocale)) {
    if (rows.length !== options.ids.length) {
      throw new Error(
        `${locale} returned ${rows.length} rows for ${options.ids.length} requested IDs.`,
      );
    }
    for (const row of rows) {
      if (!row.title?.trim() || !row.lesson?.trim()) {
        throw new Error(`${locale} reading ${row.id} has a blank title or lesson.`);
      }
    }
  }

  const requestedIds = [...options.ids].sort((left, right) => left - right);
  if (options.ids.length === 366) {
    const expectedIds = Array.from({ length: 366 }, (_, id) => id + 1);
    if (JSON.stringify(requestedIds) !== JSON.stringify(expectedIds)) {
      throw new Error('Full migration requires the contiguous ID set 1–366.');
    }
  }

  const readings = [];
  const validations = [];
  for (const id of requestedIds) {
    const englishRow = rowsByLocale.en.find((row) => row.id === id);
    const romanianRow = rowsByLocale.ro.find((row) => row.id === id);
    if (englishRow.date !== romanianRow.date) {
      throw new Error(`Locale date mismatch for reading ${id}.`);
    }

    const translations = {};
    for (const [locale, row] of [
      ['en', englishRow],
      ['ro', romanianRow],
    ]) {
      const converted = convertRow(
        row,
        sources[locale].database,
        locale,
        correctionManifest,
      );
      translations[locale] = converted.translation;
      validations.push({ id, locale, ...converted.validation });
    }

    readings.push({
      id,
      monthDay: englishRow.date.slice(5),
      leapOrdinal: id,
      translations,
    });
  }

  const contentVersion = sha256(
    JSON.stringify(
      {
        correctionManifestChecksum,
        readings: readings.map((reading) => ({
          id: reading.id,
          monthDay: reading.monthDay,
          hashes: Object.fromEntries(
            Object.entries(reading.translations).map(([locale, translation]) => [
              locale,
              translation.source.transformedChecksum,
            ]),
          ),
        })),
      },
    ),
  ).slice(0, 16);

  for (const reading of readings) {
    for (const translation of Object.values(reading.translations)) {
      translation.contentVersion = contentVersion;
    }
  }

  const failedTextParity = validations.filter((validation) => !validation.textMatches);
  const mode = requestedIds.length === 366 ? 'full' : 'proof';
  const unknownBlocks = Object.fromEntries(
    Object.keys(sources).map((locale) => [
      locale,
      readings
        .map((reading) => ({
          id: reading.id,
          count: reading.translations[locale].blocks.filter(
            (block) => block.type === 'unknown',
          ).length,
        }))
        .filter((entry) => entry.count > 0),
    ]),
  );
  const report = {
    generatorVersion: 2,
    mode,
    contentVersion,
    correctionManifest: {
      version: correctionManifest.version,
      checksum: correctionManifestChecksum,
      entryCount: correctionManifest.entries.length,
      applied: validations.flatMap((validation) => validation.appliedCorrections),
    },
    requestedIds,
    readingCount: readings.length,
    translationCount: readings.length * 2,
    dateCoverage: {
      uniqueMonthDays: new Set(readings.map((reading) => reading.monthDay)).size,
      includesLeapDay: readings.some((reading) => reading.monthDay === '02-29'),
    },
    textParity: {
      passed: validations.length - failedTextParity.length,
      failed: failedTextParity.length,
    },
    replacementCharacters: validations
      .filter((validation) => validation.replacementCharacterCount > 0)
      .map(({ id, locale, replacementCharacterCount }) => ({
        id,
        locale,
        count: replacementCharacterCount,
      })),
    anomalies: {
      removedDangerousElements: unique(
        validations.flatMap((validation) => validation.removedDangerousElements),
      ),
      unwrappedElements: unique(
        validations.flatMap((validation) => validation.unwrappedElements),
      ),
      removedAttributes: unique(
        validations.flatMap((validation) => validation.removedAttributes),
      ),
      removedAttributeCounts: countBy(
        validations.flatMap((validation) => validation.removedAttributes),
      ),
      unknownBlocks,
    },
    duplicateTitles: Object.fromEntries(
      Object.keys(sources).map((locale) => [locale, duplicateTitles(readings, locale)]),
    ),
    validations,
  };

  if (failedTextParity.length > 0) {
    throw new Error(`Visible-text parity failed for ${failedTextParity.length} translations.`);
  }

  if (mode === 'full' && report.dateCoverage.uniqueMonthDays !== 366) {
    throw new Error('Full migration did not produce 366 unique month/day keys.');
  }

  const appliedCorrectionCount = report.correctionManifest.applied.length;
  if (appliedCorrectionCount !== correctionManifest.entries.length) {
    throw new Error(
      `Applied ${appliedCorrectionCount} of ${correctionManifest.entries.length} corrections.`,
    );
  }

  const readingsDocument = formatJson({ contentVersion, readings });
  const catalogs = Object.fromEntries(
    Object.keys(sources).map((locale) => [
      locale,
      formatJson({
        contentVersion,
        locale,
        readings: readings.map((reading) => ({
          id: reading.id,
          monthDay: reading.monthDay,
          title: reading.translations[locale].title,
        })),
      }),
    ]),
  );
  const searchIndexes = Object.fromEntries(
    Object.keys(sources).map((locale) => [
      locale,
      formatJson({
        contentVersion,
        locale,
        readings: readings.map((reading) => ({
          id: reading.id,
          monthDay: reading.monthDay,
          title: reading.translations[locale].title,
          text: reading.translations[locale].plainText,
        })),
      }),
    ]),
  );
  const reportDocument = formatJson(report);
  const documents = {
    'readings.json': readingsDocument,
    'catalog.en.json': catalogs.en,
    'catalog.ro.json': catalogs.ro,
    'search.en.json': searchIndexes.en,
    'search.ro.json': searchIndexes.ro,
    'report.json': reportDocument,
  };
  const artifactManifest = formatJson({
    generatorVersion: 2,
    contentVersion,
    correctionManifestChecksum,
    readingCount: readings.length,
    translationCount: readings.length * 2,
    files: Object.entries(documents).map(([name, contents]) =>
      fileRecord(name, contents),
    ),
  });

  mkdirSync(options.out, { recursive: true });
  for (const [name, contents] of Object.entries(documents)) {
    writeFileSync(resolve(options.out, name), contents);
  }
  writeFileSync(resolve(options.out, 'manifest.json'), artifactManifest);
  process.stdout.write(
    `Generated ${readings.length} bilingual ${mode} readings at ${options.out}\n`,
  );
}

main();
