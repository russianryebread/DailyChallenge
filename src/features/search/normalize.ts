// Locale-aware text normalization for offline search. Queries and indexed text
// are folded the same way so Romanian diacritics match their bare forms and
// case is ignored. Nothing here contacts a server.

/** Unicode-normalize, lowercase, and strip diacritics (NFD + combining marks). */
export function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .normalize('NFC');
}

/** Split a raw query into folded terms, or [] for blank/punctuation-only input. */
export function queryTerms(raw: string): string[] {
  return fold(raw)
    .replace(/[^\p{Letter}\p{Number}\s]+/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}
