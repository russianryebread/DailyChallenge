import type { ReactNode } from 'react';
import Link from 'next/link';

import type { Locale } from '@/src/core/types';
import { messages } from '@/src/i18n/messages';
import { Icon, type IconName } from './icons';
import type { TabKey } from './TabBar';

// Centralized desktop navigation: one consistent top bar on every page (the
// mobile bottom tab bar is hidden on desktop). Replaces the old dropdown menu.
// Screens may pass contextual `actions` (e.g. the reader's Save button).
export function DesktopNav({
  locale,
  active,
  actions,
}: {
  locale: Locale;
  active: TabKey;
  actions?: ReactNode;
}) {
  const prefix = locale === 'ro' ? '/ro' : '';
  const copy = messages(locale);
  const items: { key: TabKey; label: string; href: string; icon: IconName }[] = [
    { key: 'today', label: copy.tabs.today, href: `${prefix}/today`, icon: 'today' },
    { key: 'archive', label: copy.tabs.archive, href: `${prefix}/archive`, icon: 'archive' },
    { key: 'saved', label: copy.tabs.saved, href: `${prefix}/saved`, icon: 'saved' },
    { key: 'settings', label: copy.tabs.settings, href: `${prefix}/settings`, icon: 'settings' },
  ];

  return (
    <nav className="desktop-nav" aria-label={copy.wordmark}>
      <Link className="desktop-nav-brand" href={`${prefix}/today`}>
        {copy.wordmark}
      </Link>
      <div className="desktop-nav-right">
        <div className="desktop-nav-links">
          {items.map((item) => (
            <Link
              key={item.key}
              className={item.key === active ? 'desktop-nav-link active' : 'desktop-nav-link'}
              href={item.href}
              aria-current={item.key === active ? 'page' : undefined}
            >
              <Icon name={item.icon} size={18} />
              <span>{item.label}</span>
            </Link>
          ))}
          <Link
            className="desktop-nav-link icon-only"
            href={`${prefix}/search`}
            aria-label={copy.search.label}
          >
            <Icon name="search" size={18} />
          </Link>
        </div>
        {actions ? <div className="desktop-nav-actions">{actions}</div> : null}
      </div>
    </nav>
  );
}
