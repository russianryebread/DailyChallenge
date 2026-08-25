// Domain types shared across features. These mirror the immutable content
// artifacts produced by scripts/content/migrate-legacy.mjs and must not carry
// any device-local state (saved/read/preferences live in src/state).

export type Locale = 'en' | 'ro';

export const LOCALES: readonly Locale[] = ['en', 'ro'];

export interface ScriptureBlock {
  type: 'scripture';
  text: string;
  reference?: string;
  sourceText?: string;
}

export interface ProseBlock {
  type: 'prose';
  html: string;
  text: string;
}

export interface QuotationBlock {
  type: 'quotation';
  html: string;
  text: string;
}

export interface PoemLine {
  text: string;
  indent: boolean;
}

export interface PoemBlock {
  type: 'poem';
  lines: PoemLine[];
}

export interface AttributionBlock {
  type: 'attribution';
  text: string;
}

export interface ListBlock {
  type: 'list';
  ordered: boolean;
  items: string[];
}

export interface DividerBlock {
  type: 'divider';
}

export interface UnknownBlock {
  type: 'unknown';
  html: string;
  text: string;
}

export type ReadingBlock =
  | ScriptureBlock
  | ProseBlock
  | QuotationBlock
  | PoemBlock
  | AttributionBlock
  | ListBlock
  | DividerBlock
  | UnknownBlock;

export interface ReadingTranslation {
  title: string;
  blocks: ReadingBlock[];
  plainText: string;
  searchAliases?: string[];
}

export interface Reading {
  id: number;
  monthDay: string;
  leapOrdinal: number;
  translations: Record<Locale, ReadingTranslation>;
}

/** A reading paired with the single locale being rendered. */
export interface LocalizedReading {
  id: number;
  monthDay: string;
  locale: Locale;
  title: string;
  blocks: ReadingBlock[];
  plainText: string;
}
