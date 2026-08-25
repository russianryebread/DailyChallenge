'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

import type { Locale } from '@/src/core/types';
import { messages } from '@/src/i18n/messages';
import { Icon, type IconName } from './icons';
import type { TabKey } from './TabBar';

// Desktop navigation. The bottom tab bar is hidden at wider widths (CSS); this
// tasteful dropdown replaces it. Hidden on mobile via `.app-menu` styles.
export function AppMenu({
  locale,
  active,
}: {
  locale: Locale;
  active: TabKey;
}) {
  const prefix = locale === 'ro' ? '/ro' : '';
  const copy = messages(locale);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const items: { key: TabKey; label: string; href: string; icon: IconName }[] = [
    { key: 'today', label: copy.tabs.today, href: `${prefix}/today`, icon: 'today' },
    { key: 'archive', label: copy.tabs.archive, href: `${prefix}/archive`, icon: 'archive' },
    { key: 'saved', label: copy.tabs.saved, href: `${prefix}/saved`, icon: 'saved' },
    { key: 'settings', label: copy.tabs.settings, href: `${prefix}/settings`, icon: 'settings' },
  ];

  return (
    <div className="app-menu" ref={containerRef}>
      <button
        type="button"
        className="app-menu-button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={copy.menu}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="menu" size={22} />
      </button>
      {open ? (
        <div className="app-menu-popover" role="menu">
          {items.map((item) => (
            <Link
              key={item.key}
              className={item.key === active ? 'app-menu-item active' : 'app-menu-item'}
              href={item.href}
              role="menuitem"
              aria-current={item.key === active ? 'page' : undefined}
              onClick={() => setOpen(false)}
            >
              <Icon name={item.icon} size={20} />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
