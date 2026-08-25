'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import type { Locale } from '@/src/core/types';
import { messages } from '@/src/i18n/messages';
import { getAll, toggleSaved } from '@/src/state/readingState';
import { TabBar } from '@/src/features/shell/TabBar';
import { AppMenu } from '@/src/features/shell/AppMenu';
import { Icon } from '@/src/features/shell/icons';

export interface CatalogEntry {
  id: number;
  monthDay: string;
  title: string;
}

interface SavedItem extends CatalogEntry {
  savedAt: number;
}

export function SavedScreen({
  locale,
  catalog,
}: {
  locale: Locale;
  catalog: CatalogEntry[];
}) {
  const copy = messages(locale);
  const prefix = locale === 'ro' ? '/ro' : '';
  const [items, setItems] = useState<SavedItem[] | null>(null);

  useEffect(() => {
    let active = true;
    const byMonthDay = new Map(catalog.map((entry) => [entry.monthDay, entry]));
    getAll().then((records) => {
      if (!active) {
        return;
      }
      const saved = records
        .filter((record) => record.saved)
        .map((record) => {
          const entry = byMonthDay.get(record.monthDay);
          return entry ? { ...entry, savedAt: record.savedAt ?? 0 } : null;
        })
        .filter((item): item is SavedItem => item !== null)
        .sort((left, right) => right.savedAt - left.savedAt);
      setItems(saved);
    });
    return () => {
      active = false;
    };
  }, [catalog]);

  async function remove(monthDay: string) {
    await toggleSaved(monthDay);
    setItems((current) =>
      current ? current.filter((item) => item.monthDay !== monthDay) : current,
    );
  }

  const isEmpty = items !== null && items.length === 0;

  return (
    <main className="app-shell">
      <section className="list-screen" aria-label={copy.tabs.saved}>
        <header className="list-header">
          <div className="list-header-top">
            <p className="eyebrow list-eyebrow">{copy.tabs.saved}</p>
            <AppMenu locale={locale} active="saved" />
          </div>
          <h1>{copy.tabs.saved}</h1>
        </header>

        {isEmpty ? (
          <p className="saved-empty">{copy.savedEmpty}</p>
        ) : (
          <ol className="reading-index">
            {(items ?? []).map((item) => (
              <li className="saved-row" key={item.id}>
                <Link className="index-row" href={`${prefix}/devotional/${item.id}`}>
                  <span className="index-body">
                    <span className="index-title">{item.title}</span>
                    <span className="index-meta">
                      {copy.dayLabel} {item.id}
                    </span>
                  </span>
                </Link>
                <button
                  type="button"
                  className="saved-remove"
                  aria-label={copy.saved}
                  aria-pressed="true"
                  onClick={() => remove(item.monthDay)}
                >
                  <Icon name="saved-fill" size={22} />
                </button>
              </li>
            ))}
          </ol>
        )}

        <TabBar locale={locale} active="saved" />
      </section>
    </main>
  );
}
