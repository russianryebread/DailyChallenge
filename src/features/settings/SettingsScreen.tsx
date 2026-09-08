'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ensureOfflineLanguage } from '@/src/features/offline/language';
import { useOfflineNavigation } from '@/src/features/offline/navigation';
import { AppLink as Link } from '@/src/features/offline/navigation';

import type { Locale } from '@/src/core/types';
import { messages } from '@/src/i18n/messages';
import { TabBar } from '@/src/features/shell/TabBar';
import { DesktopNav } from '@/src/features/shell/DesktopNav';
import {
  applyPrevNext,
  applyTextSize,
  applyTheme,
  readPrevNext,
  readTextSize,
  readTheme,
  savePrevNext,
  saveLocale,
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
  const router = useRouter();
  const navigateOffline = useOfflineNavigation();
  const [theme, setTheme] = useState<ThemeChoice>('system');
  const [textSize, setTextSize] = useState<TextSize>('medium');
  const [prevNext, setPrevNext] = useState(false);
  const [languageStatus, setLanguageStatus] = useState<'idle' | 'downloading' | 'error'>('idle');

  // Read persisted values after mount to avoid a hydration mismatch; the
  // no-flash script has already applied them to the document.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setTheme(readTheme());
    setTextSize(readTextSize());
    setPrevNext(readPrevNext());
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);
  useEffect(() => {
    applyTextSize(textSize);
  }, [textSize]);
  useEffect(() => {
    applyPrevNext(prevNext);
  }, [prevNext]);

  function changeTheme(next: ThemeChoice) {
    setTheme(next);
    saveTheme(next);
  }

  function changeTextSize(next: TextSize) {
    setTextSize(next);
    saveTextSize(next);
  }

  function togglePrevNext() {
    const next = !prevNext;
    setPrevNext(next);
    savePrevNext(next);
  }

  async function changeLocale(next: Locale) {
    if (next === locale || languageStatus === 'downloading') {
      return;
    }
    setLanguageStatus('downloading');
    try {
      await ensureOfflineLanguage(next);
    } catch {
      setLanguageStatus('error');
      return;
    }
    setLanguageStatus('idle');
    saveLocale(next);
    const href = next === 'ro' ? '/ro/settings' : '/settings';
    if (navigateOffline) navigateOffline(href);
    else router.push(href);
  }

  return (
    <>
      <DesktopNav locale={locale} active="settings" />
      <main className="app-shell">
      <section className="list-screen settings-screen" aria-label={copy.tabs.settings}>
        <header className="list-header">
          <div className="list-header-top">
            <p className="eyebrow list-eyebrow">{copy.tabs.settings}</p>
          </div>
          <h1>{copy.tabs.settings}</h1>
        </header>

        <div className="settings-body">
          {languageStatus !== 'idle' && <p role="status">
            {languageStatus === 'downloading'
              ? (locale === 'ro' ? 'Se descarcă lecturile în limba selectată…' : 'Downloading readings in the selected language…')
              : (locale === 'ro' ? 'Descărcarea nu s-a terminat. Reconectează-te și selectează din nou limba.' : 'Download did not finish. Reconnect and select the language again.')}
          </p>}
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
            <div className="segmented" role="radiogroup" aria-label={copy.settings.language}>
              <button
                type="button"
                className={locale === 'en' ? 'segment active' : 'segment'}
                role="radio"
                aria-checked={locale === 'en'}
                onClick={() => changeLocale('en')}
              >
                English
              </button>
              <button
                type="button"
                className={locale === 'ro' ? 'segment active' : 'segment'}
                role="radio"
                aria-checked={locale === 'ro'}
                onClick={() => changeLocale('ro')}
              >
                Română
              </button>
            </div>
          </fieldset>

          <div className="setting-row">
            <span className="setting-legend setting-row-label">
              {copy.settings.prevNext}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={prevNext}
              className={prevNext ? 'switch on' : 'switch'}
              onClick={togglePrevNext}
            >
              <span className="switch-thumb" />
            </button>
          </div>

          <p
            className="settings-sample"
            aria-hidden="true"
            style={{ fontSize: 'var(--reading-size)' }}
          >
            {locale === 'ro'
              ? 'Credința este substanța lucrurilor nădăjduite.'
              : 'Faith is the substance of things hoped for.'}
          </p>

          <nav className="settings-links" aria-label={copy.settings.support}>
            <Link
              className="settings-link"
              href={locale === 'ro' ? '/ro/support' : '/support'}
            >
              {copy.settings.support}
            </Link>
          </nav>
        </div>

        <TabBar locale={locale} active="settings" />
      </section>
    </main>
    </>
  );
}
