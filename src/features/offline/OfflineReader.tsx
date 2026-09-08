'use client';

import { useEffect, useState, type ReactNode } from 'react';
import type { LocalizedReading, ReadingBlock } from '@/src/core/types';
import {
  activeSequence, isLeapYear, LEAP_DAY, nextInSequence, previousInSequence, toMonthDay,
} from '@/src/core/calendar';
import { messages } from '@/src/i18n/messages';
import { ReadingScreen } from '@/src/features/reader/ReadingScreen';
import { ArchiveScreen } from '@/src/features/archive/ArchiveScreen';
import { SearchScreen } from '@/src/features/search/SearchScreen';
import { SavedScreen } from '@/src/features/saved/SavedScreen';
import { SettingsScreen } from '@/src/features/settings/SettingsScreen';
import { SupportScreen } from '@/src/features/support/SupportScreen';
import { readLocale } from '@/src/features/settings/preferences';
import { AppLink, OfflineNavigation } from './navigation';
import { offlineRoute, type OfflineRoute } from './routes';
import { ensureOfflineLanguage } from './language';

interface SearchEntry { id: number; monthDay: string; title: string; text: string }
interface MonthReading { id: number; monthDay: string; title: string; blocks: ReadingBlock[] }
type Page = { route: OfflineRoute; catalog: SearchEntry[]; version: string; reading?: LocalizedReading; year: number };

async function loadJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Offline bundle missing: ${url}`);
  return response.json() as Promise<T>;
}

// All application routes share this shell. Its links use local history, so no
// RSC payloads or server-rendered pages are needed after installation.
export function OfflineReader() {
  const [location, setLocation] = useState<{ href: string; day: string } | null>(null);
  const [page, setPage] = useState<Page | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const sync = () => setLocation({ href: window.location.pathname, day: toMonthDay(new Date()) });
    const visible = () => { if (document.visibilityState === 'visible') sync(); };
    sync();
    window.addEventListener('popstate', sync);
    document.addEventListener('visibilitychange', visible);
    // Keep Today current when left open overnight, including Dec 31 -> Jan 1.
    const timer = window.setInterval(() => {
      const day = toMonthDay(new Date());
      setLocation((current) => current?.day === day ? current : { href: window.location.pathname, day });
    }, 30_000);
    return () => {
      window.removeEventListener('popstate', sync);
      document.removeEventListener('visibilitychange', visible);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!location) return;
    let cancelled = false;
    (async () => {
      const now = new Date();
      const route = offlineRoute(location.href, readLocale(), now);
      await ensureOfflineLanguage(route.locale);
      const manifest = await loadJson<{ contentVersion: string }>('/content/manifest.json');
      const version = manifest.contentVersion;
      const search = await loadJson<{ readings: SearchEntry[] }>(`/content/${version}/search-${route.locale}.json`);
      let reading: LocalizedReading | undefined;
      if (route.kind === 'today' || route.kind === 'devotional') {
        const entry = route.kind === 'today'
          ? search.readings.find((item) => item.monthDay === toMonthDay(now))
          : search.readings.find((item) => item.id === route.id);
        if (!entry) throw new Error('Reading missing from offline catalog');
        const month = await loadJson<{ readings: MonthReading[] }>(`/content/${version}/${route.locale}/${entry.monthDay.slice(0, 2)}.json`);
        const item = month.readings.find((item) => item.id === entry.id);
        if (!item) throw new Error('Reading missing from offline month');
        reading = { ...item, locale: route.locale, plainText: entry.text };
      }
      if (!cancelled) {
        document.documentElement.lang = route.locale;
        const copy = messages(route.locale);
        document.title = `${reading?.title ?? (route.kind in copy.tabs ? copy.tabs[route.kind as keyof typeof copy.tabs] : copy.wordmark)} · DailyChallenge`;
        setPage({ route, version, catalog: search.readings, reading, year: now.getFullYear() });
      }
    })().catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [location]);

  function navigate(href: string) {
    const url = new URL(href, window.location.href);
    window.history.pushState(null, '', url);
    setPage(null);
    setError(false);
    setLocation({ href: url.pathname, day: toMonthDay(new Date()) });
    window.scrollTo(0, 0);
  }

  let screen: ReactNode;
  if (error) {
    const copy = messages(readLocale());
    screen = <main className="app-shell"><section className="offline-screen"><div className="offline-card">
      <h1>{copy.offline.title}</h1><p>{copy.offline.body}</p>
      <AppLink className="offline-link" href="/">{copy.offline.today}</AppLink>
    </div></section></main>;
  } else if (!page) {
    screen = <main className="app-shell"><section className="reading-screen" aria-busy="true" /></main>;
  } else {
    const { route, reading, catalog, version, year } = page;
    const { locale } = route;
    switch (route.kind) {
      case 'today':
      case 'devotional': {
        const sequence = activeSequence(catalog.map((entry) => entry.monthDay), year);
        const ref = (md: string | null) => {
          const entry = catalog.find((item) => item.monthDay === md);
          return entry ? { id: entry.id, monthDay: entry.monthDay } : null;
        };
        screen = reading && <ReadingScreen reading={reading} year={year}
          previous={ref(previousInSequence(sequence, reading.monthDay))}
          next={ref(nextInSequence(sequence, reading.monthDay))} />;
        break;
      }
      case 'archive':
        screen = <ArchiveScreen locale={locale} month={route.month} entries={catalog
          .filter((entry) => Number(entry.monthDay.slice(0, 2)) === route.month && (isLeapYear(year) || entry.monthDay !== LEAP_DAY))
          .map((entry) => ({ ...entry, day: Number(entry.monthDay.slice(3)) }))} />;
        break;
      case 'search': screen = <SearchScreen locale={locale} indexUrl={`/content/${version}/search-${locale}.json`} />; break;
      case 'saved': screen = <SavedScreen locale={locale} catalog={catalog} />; break;
      case 'settings': screen = <SettingsScreen locale={locale} />; break;
      case 'support': screen = <SupportScreen locale={locale} />; break;
      default: screen = <main className="app-shell"><h1>{locale === 'ro' ? 'Pagina nu a fost găsită' : 'Page not found'}</h1><AppLink href="/">{messages(locale).offline.today}</AppLink></main>;
    }
  }
  return <OfflineNavigation.Provider value={navigate}>{screen}</OfflineNavigation.Provider>;
}
