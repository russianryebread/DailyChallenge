import Link from 'next/link';

import type { Locale } from '@/src/core/types';
import type { MonthEntry } from '@/src/content/repository';
import { messages, monthName } from '@/src/i18n/messages';
import { TabBar } from '@/src/features/shell/TabBar';

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

function pad(month: number): string {
  return String(month).padStart(2, '0');
}

export function ArchiveScreen({
  locale,
  month,
  entries,
}: {
  locale: Locale;
  month: number;
  entries: MonthEntry[];
}) {
  const prefix = locale === 'ro' ? '/ro' : '';
  const copy = messages(locale);

  return (
    <main className="app-shell">
      <section className="list-screen" aria-label={copy.tabs.archive}>
        <header className="list-header">
          <p className="eyebrow list-eyebrow">{copy.tabs.archive}</p>
          <h1>{monthName(month, locale)}</h1>
          <nav className="month-picker" aria-label={copy.tabs.archive}>
            {MONTHS.map((candidate) => {
              const isActive = candidate === month;
              return (
                <Link
                  className={isActive ? 'month-chip active' : 'month-chip'}
                  href={`${prefix}/archive/${pad(candidate)}`}
                  key={candidate}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {monthName(candidate, locale, 'short')}
                </Link>
              );
            })}
          </nav>
        </header>

        <ol className="reading-index">
          {entries.map((entry) => (
            <li key={entry.id}>
              <Link
                className="index-row"
                href={`${prefix}/devotional/${entry.id}`}
              >
                <span className="index-day" aria-hidden="true">
                  {entry.day}
                </span>
                <span className="index-body">
                  <span className="index-title">{entry.title}</span>
                  <span className="index-meta">
                    {copy.dayLabel} {entry.id}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>

        <TabBar locale={locale} active="archive" />
      </section>
    </main>
  );
}
