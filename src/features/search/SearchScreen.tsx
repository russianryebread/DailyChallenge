'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import type { Locale } from '@/src/core/types';
import { messages } from '@/src/i18n/messages';
import { TabBar } from '@/src/features/shell/TabBar';
import { fold, queryTerms } from './normalize';

interface IndexEntry {
  id: number;
  monthDay: string;
  title: string;
  text: string;
}

interface FoldedEntry extends IndexEntry {
  foldedTitle: string;
  foldedText: string;
}

interface Result extends IndexEntry {
  inTitle: boolean;
  excerpt: string;
}

const MAX_RESULTS = 50;

function excerptFor(text: string, terms: string[]): string {
  const haystack = text.toLowerCase();
  let position = -1;
  for (const term of terms) {
    const index = haystack.indexOf(term);
    if (index >= 0 && (position < 0 || index < position)) {
      position = index;
    }
  }
  if (position < 0) {
    return text.length > 150 ? `${text.slice(0, 150).trimEnd()}…` : text;
  }
  const start = Math.max(0, position - 40);
  const end = Math.min(text.length, position + 110);
  return `${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${
    end < text.length ? '…' : ''
  }`;
}

export function SearchScreen({
  locale,
  indexUrl,
}: {
  locale: Locale;
  indexUrl: string;
}) {
  const copy = messages(locale);
  const prefix = locale === 'ro' ? '/ro' : '';
  const [entries, setEntries] = useState<FoldedEntry[] | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch(indexUrl)
      .then((response) => response.json() as Promise<{ readings: IndexEntry[] }>)
      .then((data) => {
        if (cancelled) {
          return;
        }
        setEntries(
          data.readings.map((entry) => ({
            ...entry,
            foldedTitle: fold(entry.title),
            foldedText: fold(entry.text),
          })),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setEntries([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [indexUrl]);

  const terms = useMemo(() => queryTerms(query), [query]);

  const results = useMemo<Result[]>(() => {
    if (!entries || terms.length === 0) {
      return [];
    }
    const matches: Result[] = [];
    for (const entry of entries) {
      const inTitle = terms.every((term) => entry.foldedTitle.includes(term));
      const inBody = terms.every((term) => entry.foldedText.includes(term));
      if (!inTitle && !inBody) {
        continue;
      }
      matches.push({
        id: entry.id,
        monthDay: entry.monthDay,
        title: entry.title,
        text: entry.text,
        inTitle,
        excerpt: excerptFor(entry.text, terms),
      });
    }
    matches.sort((left, right) => {
      if (left.inTitle !== right.inTitle) {
        return left.inTitle ? -1 : 1;
      }
      return left.monthDay.localeCompare(right.monthDay);
    });
    return matches.slice(0, MAX_RESULTS);
  }, [entries, terms]);

  const hasQuery = terms.length > 0;
  const loading = entries === null;

  return (
    <main className="app-shell">
      <section className="list-screen search-screen" aria-label={copy.search.label}>
        <header className="list-header">
          <p className="eyebrow list-eyebrow">{copy.tabs.archive}</p>
          <form className="search-field" role="search" onSubmit={(event) => event.preventDefault()}>
            <input
              type="search"
              className="search-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.search.placeholder}
              aria-label={copy.search.label}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              autoFocus
            />
          </form>
        </header>

        <div className="search-results">
          <p className="search-status" role="status" aria-live="polite">
            {loading
              ? copy.search.loading
              : hasQuery
                ? copy.search.resultCount(results.length)
                : copy.search.hint}
          </p>

          {hasQuery && !loading && results.length === 0 ? (
            <p className="search-empty">{copy.search.noResults}</p>
          ) : null}

          <ol className="reading-index">
            {results.map((result) => (
              <li key={result.id}>
                <Link
                  className="index-row"
                  href={`${prefix}/devotional/${result.id}`}
                >
                  <span className="index-body">
                    <span className="index-title">{result.title}</span>
                    <span className="index-excerpt">{result.excerpt}</span>
                    <span className="index-meta">
                      {copy.dayLabel} {result.id}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>

        <TabBar locale={locale} active="archive" />
      </section>
    </main>
  );
}
