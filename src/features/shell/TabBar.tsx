import Link from 'next/link';

import type { Locale } from '@/src/core/types';
import { messages } from '@/src/i18n/messages';
import { Icon, type IconName } from './icons';

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
  const tabs: { key: TabKey; label: string; href: string; icon: IconName }[] = [
    { key: 'today', label: copy.tabs.today, href: `${prefix}/today`, icon: 'today' },
    { key: 'archive', label: copy.tabs.archive, href: `${prefix}/archive`, icon: 'archive' },
    { key: 'saved', label: copy.tabs.saved, href: `${prefix}/saved`, icon: 'saved' },
    { key: 'settings', label: copy.tabs.settings, href: `${prefix}/settings`, icon: 'settings' },
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
            <Icon name={isActive && tab.key === 'saved' ? 'saved-fill' : tab.icon} size={24} className="tab-icon" />
            <span className="tab-label">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
