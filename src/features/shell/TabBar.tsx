import Link from 'next/link';

import type { Locale } from '@/src/core/types';
import { messages } from '@/src/i18n/messages';

export type TabKey = 'today' | 'archive' | 'saved' | 'settings';

export function TabBar({
  locale,
  active,
}: {
  locale: Locale;
  active: TabKey;
}) {
  const prefix = locale === 'ro' ? '/ro' : '';
  const copy = messages(locale);
  const tabs: { key: TabKey; label: string; href: string }[] = [
    { key: 'today', label: copy.tabs.today, href: `${prefix}/today` },
    { key: 'archive', label: copy.tabs.archive, href: `${prefix}/archive` },
    { key: 'saved', label: copy.tabs.saved, href: `${prefix}/saved` },
    { key: 'settings', label: copy.tabs.settings, href: `${prefix}/settings` },
  ];

  return (
    <nav className="tab-bar" aria-label={copy.wordmark}>
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            className={isActive ? 'tab active' : 'tab'}
            href={tab.href}
            key={tab.key}
            aria-current={isActive ? 'page' : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
