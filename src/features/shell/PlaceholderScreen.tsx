import type { Locale } from '@/src/core/types';
import { messages } from '@/src/i18n/messages';
import { TabBar, type TabKey } from './TabBar';

/**
 * Temporary screen for tabs that are not built yet (Archive, Saved, Settings).
 * Keeps navigation coherent so no primary destination 404s while those features
 * land in their own commits.
 */
export function PlaceholderScreen({
  locale,
  active,
  title,
}: {
  locale: Locale;
  active: TabKey;
  title: string;
}) {
  const copy = messages(locale);
  return (
    <main className="app-shell">
      <section className="reading-screen placeholder-screen" aria-label={title}>
        <header className="app-bar placeholder-bar">
          <span className="wordmark">{copy.wordmark}</span>
        </header>
        <div className="placeholder-body">
          <h1>{title}</h1>
          <p>{copy.comingSoon}</p>
        </div>
        <TabBar locale={locale} active={active} />
      </section>
    </main>
  );
}
