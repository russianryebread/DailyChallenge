import type { Locale } from '../../core/types';

export type OfflineRoute = { locale: Locale } & (
  | { kind: 'today' }
  | { kind: 'devotional'; id: number }
  | { kind: 'archive'; month: number }
  | { kind: 'saved' | 'search' | 'settings' | 'support' | 'notfound' }
);

export function offlineRoute(pathname: string, preferredLocale: Locale, now: Date): OfflineRoute {
  let locale: Locale = pathname === '/ro' || pathname.startsWith('/ro/') ? 'ro' : 'en';
  const path = (locale === 'ro' ? pathname.slice(3) : pathname).replace(/\/$/, '') || '/';
  if (pathname === '/' || pathname === '/offline') locale = preferredLocale;
  if (path === '/' || path === '/today' || path === '/offline') return { locale, kind: 'today' };
  const reading = /^\/devotional\/([1-9]\d{0,2})$/.exec(path);
  if (reading && Number(reading[1]) <= 366) return { locale, kind: 'devotional', id: Number(reading[1]) };
  const archive = /^\/archive(?:\/(0[1-9]|1[0-2]))?$/.exec(path);
  if (archive) return { locale, kind: 'archive', month: archive[1] ? Number(archive[1]) : now.getMonth() + 1 };
  for (const kind of ['saved', 'search', 'settings', 'support'] as const) {
    if (path === `/${kind}`) return { locale, kind };
  }
  return { locale, kind: 'notfound' };
}
