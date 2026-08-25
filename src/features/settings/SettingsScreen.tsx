'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import type { Locale } from '@/src/core/types';
import { messages } from '@/src/i18n/messages';
import { TabBar } from '@/src/features/shell/TabBar';
import {
  applyTextSize,
  applyTheme,
  readTextSize,
  readTheme,
  saveTextSize,
  saveTheme,
  type TextSize,
  type ThemeChoice,
} from './preferences';

function SegmentedControl<T extends string>({
  legend,
  value,
  options,
  onChange,
}: {
  legend: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (next: T) => void;
}) {
  return (
    <fieldset className="setting-group">
      <legend className="setting-legend">{legend}</legend>
      <div className="segmented" role="radiogroup" aria-label={legend}>
        {options.map((option) => {
          const isActive = option.value === value;
          return (
            <button
              type="button"
              key={option.value}
              className={isActive ? 'segment active' : 'segment'}
              role="radio"
              aria-checked={isActive}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function SettingsScreen({ locale }: { locale: Locale }) {
  const copy = messages(locale);
  const [theme, setTheme] = useState<ThemeChoice>('system');
  const [textSize, setTextSize] = useState<TextSize>('medium');

  // Read persisted values after mount to avoid a hydration mismatch; the
  // no-flash script has already applied them to the document, so this only
  // syncs the control UI. Post-mount setState is intentional here.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setTheme(readTheme());
    setTextSize(readTextSize());
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function changeTheme(next: ThemeChoice) {
    setTheme(next);
    saveTheme(next);
  }

  function changeTextSize(next: TextSize) {
    setTextSize(next);
    saveTextSize(next);
  }

  // Keep the document in sync if state is set programmatically.
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);
  useEffect(() => {
    applyTextSize(textSize);
  }, [textSize]);

  return (
    <main className="app-shell">
      <section className="list-screen settings-screen" aria-label={copy.tabs.settings}>
        <header className="list-header">
          <p className="eyebrow list-eyebrow">{copy.tabs.settings}</p>
          <h1>{copy.tabs.settings}</h1>
        </header>

        <div className="settings-body">
          <SegmentedControl
            legend={copy.settings.theme}
            value={theme}
            onChange={changeTheme}
            options={[
              { value: 'system', label: copy.settings.themeSystem },
              { value: 'light', label: copy.settings.themeLight },
              { value: 'dark', label: copy.settings.themeDark },
            ]}
          />

          <SegmentedControl
            legend={copy.settings.textSize}
            value={textSize}
            onChange={changeTextSize}
            options={[
              { value: 'small', label: copy.settings.textSmall },
              { value: 'medium', label: copy.settings.textMedium },
              { value: 'large', label: copy.settings.textLarge },
            ]}
          />

          <fieldset className="setting-group">
            <legend className="setting-legend">{copy.settings.language}</legend>
            <div className="segmented" role="group" aria-label={copy.settings.language}>
              <Link
                className={locale === 'en' ? 'segment active' : 'segment'}
                href="/settings"
                aria-current={locale === 'en' ? 'true' : undefined}
                hrefLang="en"
              >
                English
              </Link>
              <Link
                className={locale === 'ro' ? 'segment active' : 'segment'}
                href="/ro/settings"
                aria-current={locale === 'ro' ? 'true' : undefined}
                hrefLang="ro"
              >
                Română
              </Link>
            </div>
          </fieldset>

          <p className="settings-sample" aria-hidden="true" style={{ fontSize: 'var(--reading-size)' }}>
            {locale === 'ro'
              ? 'Credința este substanța lucrurilor nădăjduite.'
              : 'Faith is the substance of things hoped for.'}
          </p>
        </div>

        <TabBar locale={locale} active="settings" />
      </section>
    </main>
  );
}
