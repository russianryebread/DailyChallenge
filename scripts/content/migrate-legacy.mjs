import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
  'author',
  'p4',
  'p5',
  'p6',
  'p9',
  'p11',
  'ul1',
  'li4',
  'li9',
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
    runtimeOut: null,
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
    } else if (argument === '--runtime-out') {
      result.runtimeOut = resolve(argv[index + 1]);
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
  }).normalize('NFC');
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
  return ['i', 'em'].includes(getTagName(firstElement)) ? firstElement : null;
}

// Poem lines encode their book indentation as leading whitespace inside the
// source paragraph, which plainText() otherwise trims away.
function hasLeadingIndent(node) {
  return /^[ \t ]/.test(collectVisibleText(node).join(''));
}

// Attribution credits follow the book style: no trailing period after the name.
// A final period that terminates a lone initial (e.g. "—E. S. M.") is part of
// the abbreviation and is preserved.
function stripTrailingPeriod(text) {
  if (/(^|[\s.])\p{Lu}\.$/u.test(text)) {
    return text.trimEnd();
  }
  return text.replace(/\.\s*$/, '').trimEnd();
}

// A verse paragraph either leads with an italic quote or is a quotation that
// closes with a scripture reference such as "(Gal. 3:6)".
function isScriptureParagraph(node, text) {
  if (getTagName(node) !== 'p') {
    return false;
  }
  if (!/^\s*[“"„«]/.test(text)) {
    return false;
  }
  const italicLead = isItalicLead(node);
  if (italicLead) {
    const remainder = text.slice(plainText(italicLead).length).trim();
    if (!remainder || /^\([^()]+\)\.?$/u.test(remainder)) return true;
  }
  const { reference } = scriptureParts(text);
  return Boolean(reference && /\d/.test(reference));
}

// Detach a credit at the end of a prose paragraph. In the source, the dash and
// name may be inside one italic element, split across several italic elements,
// or plain text. Only accept a plain-text credit after sentence punctuation.
function extractTrailingAttribution(node) {
  const textNodes = [];
  let rawText = '';
  const collect = (current, italic = false) => {
    if (current.nodeName === '#text') {
      const start = rawText.length;
      rawText += current.value;
      textNodes.push({ node: current, start, end: rawText.length, italic });
      return;
    }
    const childItalic = italic || ['i', 'em'].includes(getTagName(current));
    for (const child of current.childNodes ?? []) collect(child, childItalic);
  };
  collect(node);

  const match = /[—–•-]\s*([\p{Lu}][\p{L}\p{M}.’'&\[\]\s]{0,95})\.?\s*$/u.exec(rawText);
  if (!match) return null;
  const name = stripTrailingPeriod(match[1].trim().replace(/\s+/g, ' '));
  if (!name || name.split(/\s+/).length > 14) return null;

  const creditStart = match.index > 0 && rawText[match.index - 1] === rawText[match.index]
    ? match.index - 1
    : match.index;
  const hasItalicName = textNodes.some(
    ({ start, end, italic }) => italic && end > creditStart + 1 && start < rawText.length,
  );
  const beforeCredit = rawText.slice(0, creditStart);
  if (!hasItalicName && (
    name.split(/\s+/).length > 6 ||
    !/[.!?…”’]\s+$/.test(beforeCredit)
  )) return null;
  if (!beforeCredit.trim()) return null;

  for (const item of textNodes) {
    if (item.start >= creditStart) item.node.value = '';
    else if (item.end > creditStart) item.node.value = item.node.value.slice(0, creditStart - item.start);
  }
  const removeEmpty = (current) => {
    current.childNodes = (current.childNodes ?? []).filter((child) => {
      if (child.nodeName === '#text') return child.value.length > 0;
      removeEmpty(child);
      return !['i', 'em'].includes(getTagName(child)) || child.childNodes.length > 0;
    });
  };
  removeEmpty(node);
  return `—${name}`;
}

function isStandaloneItalicCredit(node, text) {
  const meaningful = (node.childNodes ?? []).filter(
    (child) => child.nodeName !== '#text' || child.value.trim(),
  );
  if (meaningful.length !== 1 || !['i', 'em'].includes(getTagName(meaningful[0]))) {
    return false;
  }
  return /^Prelucrare de\b/u.test(text) ||
    (/^[\p{Lu}][\p{L}.']+(?:\s+[\p{Lu}][\p{L}.']+){1,3}$/u.test(text) && text.length < 80);
}

function standaloneDashCredit(text) {
  const match = /^[-—–•]{1,2}\s*(.+?)\.?\s*$/u.exec(text.trim());
  if (!match) return null;
  const name = stripTrailingPeriod(match[1].trim().replace(/\s+/g, ' '));
  if (name.length > 95 || !name) return null;
  if (/^From the [\p{Lu}\p{L}\s]+$/u.test(name)) return `—${name}`;
  const words = name.split(/\s+/);
  if (words.length > 7 || !words.every((word) =>
    /^[\p{Lu}][\p{L}\p{M}.’'\[\]]*\.?$/u.test(word) || /^[\p{Lu}]\.$/u.test(word)
  )) return null;
  return `—${name}`;
}

function italicDashCredit(node) {
  if (!['i', 'em'].includes(getTagName(node))) return null;
  return standaloneDashCredit(plainText(node));
}

// Some source paragraphs begin with a credit and immediately continue with
// another credit or the next quotation. Peel off one credit at a time while
// leaving the remaining markup intact for normal block classification.
function extractLeadingAttribution(node) {
  const raw = collectVisibleText(node).join('');
  const match = /^((?:—|––)\s*)([\p{Lu}][\p{L}\p{M}.’'&\s]{1,70}?)(?=\s+[—–]{1,2}\s*\p{Lu}|[„“"])/u.exec(raw);
  if (!match) return null;
  const name = match[2].trim().replace(/\s+/g, ' ');
  if (!name || name.split(/\s+/).length > 6) return null;
  let remaining = match[0].length;
  const trimPrefix = (current) => {
    if (current.nodeName === '#text') {
      const removed = Math.min(remaining, current.value.length);
      current.value = current.value.slice(removed);
      remaining -= removed;
      return;
    }
    for (const child of current.childNodes ?? []) trimPrefix(child);
    current.childNodes = (current.childNodes ?? []).filter((child) =>
      child.nodeName === '#text'
        ? child.value.length > 0
        : !['i', 'em'].includes(getTagName(child)) || child.childNodes.length > 0,
    );
  };
  trimPrefix(node);
  return `—${stripTrailingPeriod(name)}`;
}

function toBlocks(fragment) {
  const blocks = [];
  let poemLines = [];

  const flushPoem = () => {
    if (poemLines.length > 0) {
      let attribution = standaloneDashCredit(poemLines.at(-1).text);
      if (attribution) {
        poemLines.pop();
      } else {
        const last = poemLines.at(-1);
        const match = /^(.*[.!?])([—–•-][^—–•-]{2,95})$/u.exec(last.text);
        attribution = match ? standaloneDashCredit(match[2]) : null;
        if (attribution) last.text = match[1];
      }
      if (poemLines.length) blocks.push({ type: 'poem', lines: poemLines });
      if (attribution) blocks.push({ type: 'attribution', text: attribution });
      poemLines = [];
    }
  };

  for (const node of fragment.childNodes ?? []) {
    let text = plainText(node);
    const tagName = getTagName(node);
    if (tagName === 'hr') {
      flushPoem();
      blocks.push({ type: 'divider' });
      continue;
    }
    if (!text) {
      continue;
    }

    const classNames = getClassNames(node);

    if (tagName === 'div' && classNames.some((name) => ['c3', 'c6'].includes(name))) {
      poemLines.push({ text, indent: hasLeadingIndent(node) });
      continue;
    }

    flushPoem();

    let hadLeadingCredit = false;
    if (tagName === 'p') {
      let credit;
      while ((credit = extractLeadingAttribution(node))) {
        blocks.push({ type: 'attribution', text: credit });
        hadLeadingCredit = true;
      }
      if (hadLeadingCredit) text = plainText(node);
      if (!text) continue;
    }

    if (isScriptureParagraph(node, text)) {
      blocks.push({ type: 'scripture', ...scriptureParts(text), sourceText: text });
    } else if (
      (!hadLeadingCredit && tagName === 'p' &&
        classNames.some((name) => ['author', 'c4', 'c8', 'c10'].includes(name))) ||
      /^(?:—|––|-(?!\s))/u.test(text) ||
      (tagName === 'p' && isStandaloneItalicCredit(node, text))
    ) {
      blocks.push({ type: 'attribution', text: stripTrailingPeriod(text) });
    } else if (tagName === 'p') {
      const attribution = extractTrailingAttribution(node);
      blocks.push({ type: 'prose', html: serializeNode(node), text: plainText(node) });
      if (attribution) {
        blocks.push({ type: 'attribution', text: attribution });
      }
    } else if (tagName === 'blockquote') {
      blocks.push({ type: 'quotation', html: serializeNode(node), text });
    } else if (tagName === 'ul' || tagName === 'ol') {
      let items = [];
      const flushList = () => {
        if (items.length) blocks.push({ type: 'list', ordered: tagName === 'ol', items });
        items = [];
      };
      for (const item of (node.childNodes ?? []).filter((child) => getTagName(child) === 'li')) {
        let segment = [];
        let afterCredit = false;
        const flushSegment = () => {
          const fragment = { nodeName: '#document-fragment', childNodes: segment };
          const segmentText = plainText(fragment);
          if (segmentText) {
            if (afterCredit) {
              blocks.push({ type: 'prose', html: `<p>${serialize(fragment)}</p>`, text: segmentText });
            } else {
              items.push(segmentText);
            }
          }
          segment = [];
        };
        for (const child of item.childNodes ?? []) {
          const credit = italicDashCredit(child);
          if (credit) {
            flushSegment();
            flushList();
            blocks.push({ type: 'attribution', text: credit });
            afterCredit = true;
          } else {
            segment.push(child);
          }
        }
        flushSegment();
      }
      flushList();
    } else {
      blocks.push({ type: 'unknown', html: serializeNode(node), text });
    }
  }

  flushPoem();
  const joined = [];
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    const next = blocks[index + 1];
    if (
      block.type === 'scripture' && !block.reference &&
      next?.type === 'prose' &&
      !/[”“]/u.test(block.sourceText) &&
      /^\s*\p{L}/u.test(next.text) &&
      /[”“]\s*\([^()]+\)\.?$/u.test(next.text)
    ) {
      const sourceText = `${block.sourceText} ${next.text}`;
      const parts = scriptureParts(sourceText);
      if (parts.reference) {
        joined.push({ type: 'scripture', ...parts, sourceText });
        index += 1;
        continue;
      }
    }
    joined.push(block);
  }
  return joined;
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
  const normalizedLesson = row.lesson.normalize('NFC');
  const normalizedTitleSource = row.title.normalize('NFC');
  const titleFragment = parseFragment(normalizedTitleSource);
  const titleHadMarkup = (titleFragment.childNodes ?? []).some(
    (node) => node.nodeName !== '#text',
  );
  const normalizedTitle = plainText(titleFragment);
  const rawFragment = parseFragment(normalizedLesson);
  const sanitized = sanitizeHtml(normalizedLesson);
  const sourceVisibleText = comparisonText(rawFragment);
  const transformedVisibleText = comparisonText(sanitized.fragment);
  const textMatches = sourceVisibleText === transformedVisibleText;
  const readingPlainText = plainText(sanitized.fragment);

  const translation = {
    title: normalizedTitle,
    blocks: toBlocks(sanitized.fragment),
    plainText: readingPlainText,
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
      titleHadMarkup,
      titleRequiredNormalization: row.title !== normalizedTitleSource,
      lessonRequiredNormalization: row.lesson !== normalizedLesson,
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

function runtimeBlock(block) {
  switch (block.type) {
    case 'scripture':
      return {
        type: block.type,
        text: block.text,
        ...(block.reference ? { reference: block.reference } : {}),
      };
    case 'prose':
    case 'quotation':
    case 'unknown':
      return { type: block.type, html: block.html };
    case 'poem':
      return { type: block.type, lines: block.lines };
    case 'attribution':
      return { type: block.type, text: block.text };
    case 'list':
      return { type: block.type, ordered: block.ordered, items: block.items };
    case 'divider':
      return { type: block.type };
    default:
      throw new Error(`Unsupported runtime block type: ${block.type}`);
  }
}

function writeRuntimeLibrary(root, readings, contentVersion) {
  const previousManifestPath = resolve(root, 'manifest.json');
  const previousVersion = existsSync(previousManifestPath)
    ? JSON.parse(readFileSync(previousManifestPath, 'utf8')).contentVersion
    : null;
  const versionRoot = resolve(root, contentVersion);
  const documents = {};

  for (const locale of ['en', 'ro']) {
    for (let monthNumber = 1; monthNumber <= 12; monthNumber += 1) {
      const month = String(monthNumber).padStart(2, '0');
      const monthReadings = readings
        .filter((reading) => reading.monthDay.startsWith(`${month}-`))
        .map((reading) => ({
          id: reading.id,
          monthDay: reading.monthDay,
          title: reading.translations[locale].title,
          blocks: reading.translations[locale].blocks.map(runtimeBlock),
        }));
      documents[`${locale}/${month}.json`] = formatJson({
        contentVersion,
        locale,
        month,
        readings: monthReadings,
      });
    }

    documents[`search-${locale}.json`] = formatJson({
      contentVersion,
      locale,
      readings: readings.map((reading) => ({
        id: reading.id,
        monthDay: reading.monthDay,
        title: reading.translations[locale].title,
        text: reading.translations[locale].plainText,
      })),
    });
  }

  const files = Object.entries(documents).map(([name, contents]) => ({
    ...fileRecord(name, contents),
    url: `/content/${contentVersion}/${name}`,
  }));
  const maxFileBytes = Math.max(...files.map((file) => file.bytes));
  const totalBytes = files.reduce((total, file) => total + file.bytes, 0);
  const oneMebibyte = 1024 * 1024;
  const twelveMebibytes = 12 * oneMebibyte;
  if (maxFileBytes > oneMebibyte) {
    throw new Error(`Runtime content file exceeds 1 MiB (${maxFileBytes} bytes).`);
  }
  if (totalBytes > twelveMebibytes) {
    throw new Error(`Runtime content exceeds 12 MiB (${totalBytes} bytes).`);
  }

  const manifestDocument = formatJson({
    generatorVersion: 2,
    contentVersion,
    readingCount: readings.length,
    translationCount: readings.length * 2,
    maxFileBytes,
    totalBytes,
    files,
  });

  for (const [name, contents] of Object.entries(documents)) {
    const destination = resolve(versionRoot, name);
    mkdirSync(resolve(destination, '..'), { recursive: true });
    writeFileSync(destination, contents);
  }
  mkdirSync(versionRoot, { recursive: true });
  writeFileSync(resolve(versionRoot, 'manifest.json'), manifestDocument);
  mkdirSync(root, { recursive: true });
  writeFileSync(resolve(root, 'manifest.json'), manifestDocument);
  if (previousVersion && previousVersion !== contentVersion && /^[a-f0-9]{16}$/.test(previousVersion)) {
    rmSync(resolve(root, previousVersion), { recursive: true, force: true });
  }

  return { maxFileBytes, totalBytes, fileCount: files.length };
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
    titleMarkup: validations
      .filter((validation) => validation.titleHadMarkup)
      .map(({ id, locale }) => ({ id, locale })),
    unicodeNormalization: {
      titles: Object.fromEntries(
        Object.keys(sources).map((locale) => [
          locale,
          validations.filter(
            (validation) =>
              validation.locale === locale && validation.titleRequiredNormalization,
          ).length,
        ]),
      ),
      lessons: Object.fromEntries(
        Object.keys(sources).map((locale) => [
          locale,
          validations.filter(
            (validation) =>
              validation.locale === locale && validation.lessonRequiredNormalization,
          ).length,
        ]),
      ),
    },
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

  const readingsDocuments = Object.fromEntries(
    Object.keys(sources).map((locale) => [
      `readings.${locale}.json`,
      formatJson({
        contentVersion,
        locale,
        readings: readings.map((reading) => ({
          id: reading.id,
          monthDay: reading.monthDay,
          leapOrdinal: reading.leapOrdinal,
          ...reading.translations[locale],
        })),
      }),
    ]),
  );
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
    ...readingsDocuments,
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
  rmSync(resolve(options.out, 'readings.json'), { force: true });
  for (const [name, contents] of Object.entries(documents)) {
    writeFileSync(resolve(options.out, name), contents);
  }
  writeFileSync(resolve(options.out, 'manifest.json'), artifactManifest);
  const runtime =
    mode === 'full' && options.runtimeOut
      ? writeRuntimeLibrary(options.runtimeOut, readings, contentVersion)
      : null;
  process.stdout.write(
    `Generated ${readings.length} bilingual ${mode} readings at ${options.out}${
      runtime
        ? ` and ${runtime.fileCount} offline files (${runtime.totalBytes} bytes)`
        : ''
    }\n`,
  );
}

main();
