'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import type { Locale, LocalizedReading, ReadingBlock } from '@/src/core/types';
import type { NeighborRef } from '@/src/content/navigation';
import {
  activeSequence,
  nextInSequence,
  previousInSequence,
  toMonthDay,
} from '@/src/core/calendar';
import { messages } from '@/src/i18n/messages';
import { ReadingScreen } from '@/src/features/reader/ReadingScreen';
import { Icon } from '@/src/features/shell/icons';

interface SearchEntry {
  id: number;
  monthDay: string;
  title: string;
  text: string;
}

interface MonthReading {
  id: number;
  monthDay: string;
  title: string;
  blocks: ReadingBlock[];
}

type Parsed =
  | { locale: Locale; kind: 'today' }
  | { locale: Locale; kind: 'devotional'; id: number };

function parsePath(pathname: string): Parsed | null {
  let locale: Locale = 'en';
  let path = pathname;
  if (path === '/ro' || path.startsWith('/ro/')) {
    locale = 'ro';
    path = path.slice(3) || '/';
  }
  if (path === '/today' || path === '/' || path === '') {
    return { locale, kind: 'today' };
  }
  const match = path.match(/^\/devotional\/(\d+)$/);
  if (match) {
    return { locale, kind: 'devotional', id: Number.parseInt(match[1], 10) };
  }
  return null;
}

type State =
  | { status: 'loading' }
  | { status: 'notfound'; locale: Locale }
  | {
      status: 'ready';
      reading: LocalizedReading;
      year: number;
      previous: NeighborRef | null;
      next: NeighborRef | null;
    };

async function loadJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url}`);
  }
  return (await response.json()) as T;
}

export function OfflineReader() {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    (async () => {
      const parsed = parsePath(window.location.pathname);
      if (!parsed) {
        if (active) setState({ status: 'notfound', locale: 'en' });
        return;
      }
      try {
        const contentManifest = await loadJson<{ contentVersion: string }>(
          '/content/manifest.json',
        );
        const version = contentManifest.contentVersion;
        const search = await loadJson<{ readings: SearchEntry[] }>(
          `/content/${version}/search-${parsed.locale}.json`,
        );
        const byId = new Map(search.readings.map((r) => [r.id, r]));
        const byMonthDay = new Map(search.readings.map((r) => [r.monthDay, r]));
        const allMonthDays = search.readings.map((r) => r.monthDay);

        const monthDay =
          parsed.kind === 'today'
            ? toMonthDay(new Date())
            : byId.get(parsed.id)?.monthDay;
        if (!monthDay) {
          if (active) setState({ status: 'notfound', locale: parsed.locale });
          return;
        }

        const month = monthDay.slice(0, 2);
        const monthDoc = await loadJson<{ readings: MonthReading[] }>(
          `/content/${version}/${parsed.locale}/${month}.json`,
        );
        const monthReading = monthDoc.readings.find((r) => r.monthDay === monthDay);
        const searchEntry = byMonthDay.get(monthDay);
        if (!monthReading || !searchEntry) {
          if (active) setState({ status: 'notfound', locale: parsed.locale });
          return;
        }

        const reading: LocalizedReading = {
          id: monthReading.id,
          monthDay,
          locale: parsed.locale,
          title: monthReading.title,
          blocks: monthReading.blocks,
          plainText: searchEntry.text,
        };

        const year = new Date().getFullYear();
        const sequence = activeSequence(allMonthDays, year);
        const toRef = (md: string | null): NeighborRef | null => {
          const entry = md ? byMonthDay.get(md) : undefined;
          return entry ? { id: entry.id, monthDay: entry.monthDay } : null;
        };

        if (active) {
          setState({
            status: 'ready',
            reading,
            year,
            previous: toRef(previousInSequence(sequence, monthDay)),
            next: toRef(nextInSequence(sequence, monthDay)),
          });
        }
      } catch {
        if (active) setState({ status: 'notfound', locale: parsed.locale });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (state.status === 'loading') {
    return (
      <main className="app-shell">
        <section className="reading-screen" aria-busy="true" />
      </main>
    );
  }

  if (state.status === 'notfound') {
    const copy = messages(state.locale);
    const prefix = state.locale === 'ro' ? '/ro' : '';
    return (
      <main className="app-shell">
        <section className="offline-screen" aria-label={copy.offline.title}>
          <div className="offline-card">
            <span className="offline-icon" aria-hidden="true">
              <Icon name="today" size={30} />
            </span>
            <h1>{copy.offline.title}</h1>
            <p>{copy.offline.body}</p>
            <Link className="offline-link" href={`${prefix}/today`}>
              {copy.offline.today}
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <ReadingScreen
      reading={state.reading}
      year={state.year}
      previous={state.previous}
      next={state.next}
    />
  );
}
