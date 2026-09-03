import Link from 'next/link';

import type { Locale, LocalizedReading } from '@/src/core/types';
import type { NeighborRef } from '@/src/content/navigation';
import { formatFullDate, messages } from '@/src/i18n/messages';
import { TabBar } from '@/src/features/shell/TabBar';
import { DesktopNav } from '@/src/features/shell/DesktopNav';
import { Blocks } from './Blocks';
import { SaveButton } from './SaveButton';
import { ShareButton } from './ShareButton';
import { ReadingTracker } from './ReadingTracker';
import { HeroParallax } from './HeroParallax';

function localePrefix(locale: Locale): string {
  return locale === 'ro' ? '/ro' : '';
}

function ReadingNav({
  locale,
  previous,
  next,
}: {
  locale: Locale;
  previous: NeighborRef | null;
  next: NeighborRef | null;
}) {
  const prefix = localePrefix(locale);
  const copy = messages(locale);
  return (
    <nav className="reading-nav" aria-label={`${copy.previous} / ${copy.next}`}>
      {previous ? (
        <Link className="reading-nav-link prev" href={`${prefix}/devotional/${previous.id}`} rel="prev">
          <span className="reading-nav-dir">← {copy.previous}</span>
        </Link>
      ) : (
        <span className="reading-nav-link prev is-disabled" aria-disabled="true">
          <span className="reading-nav-dir">← {copy.previous}</span>
        </span>
      )}
      {next ? (
        <Link className="reading-nav-link next" href={`${prefix}/devotional/${next.id}`} rel="next">
          <span className="reading-nav-dir">{copy.next} →</span>
        </Link>
      ) : (
        <span className="reading-nav-link next is-disabled" aria-disabled="true">
          <span className="reading-nav-dir">{copy.next} →</span>
        </span>
      )}
    </nav>
  );
}

export function ReadingScreen({
  reading,
  year,
  previous,
  next,
}: {
  reading: LocalizedReading;
  year: number;
  previous: NeighborRef | null;
  next: NeighborRef | null;
}) {
  const { locale } = reading;
  const copy = messages(locale);
  const dateLabel = formatFullDate(reading.monthDay, year, locale).toUpperCase();

  return (
    <>
      <DesktopNav
        locale={locale}
        active="today"
        actions={<SaveButton monthDay={reading.monthDay} locale={locale} />}
      />
      <nav className="app-bar reading-topbar" aria-label={copy.wordmark}>
        <span className="wordmark">{copy.wordmark}</span>
        <div className="app-actions">
          <SaveButton monthDay={reading.monthDay} locale={locale} />
          <ShareButton id={reading.id} title={reading.title} locale={locale} />
        </div>
      </nav>
      <main className="app-shell">
        <ReadingTracker monthDay={reading.monthDay} />
        <HeroParallax />
        <section className="reading-screen" aria-label={reading.title}>
          <header className="reading-hero">
            <div className="hero-copy">
              <div className="hero-flex">
                <p className="eyebrow">{dateLabel}</p>
                <div className="hero-meta" aria-label={`${copy.dayLabel} ${reading.id}`}>
                  <span>
                    {copy.dayLabel} {reading.id}
                  </span>
                </div>
              </div>
              <h1>{reading.title}</h1>
            </div>
          </header>

          <article className="reading-card">
            <div className="reading-content">
              <Blocks blocks={reading.blocks} />

              <ReadingNav locale={locale} previous={previous} next={next} />

              <div className="publisher-credit">
                <p>{copy.publisher.title}</p>
                <p>
                  {copy.publisher.imprintPrefix}{' '}
                  <a href="https://harveycp.com" target="_blank" rel="noopener noreferrer" className="font-medium underline">
                    Harvey Christian Publishers
                  </a>
                </p>
              </div>
            </div>
          </article>

          <TabBar locale={locale} active="today" />
        </section>
      </main>
    </>
  );
}
