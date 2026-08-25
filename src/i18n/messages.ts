// Interface message catalogs and locale-aware formatting. UI strings are whole
// phrases per locale — never assembled from English fragments. Devotional body
// text is never routed through here; it stays verbatim from the content
// artifacts.

import type { Locale } from '@/src/core/types';

export interface Messages {
  wordmark: string;
  readerSettings: string;
  save: string;
  saved: string;
  dayLabel: string;
  minutesLabel: string;
  previous: string;
  next: string;
  tabs: { today: string; archive: string; saved: string; settings: string };
  publisher: { title: string; imprint: string };
  today: string;
  languageName: string;
  otherLanguage: string;
  comingSoon: string;
  menu: string;
  savedEmpty: string;
  search: {
    label: string;
    placeholder: string;
    hint: string;
    loading: string;
    noResults: string;
    resultCount: (count: number) => string;
  };
  settings: {
    theme: string;
    themeSystem: string;
    themeLight: string;
    themeDark: string;
    textSize: string;
    textSmall: string;
    textMedium: string;
    textLarge: string;
    language: string;
    prevNext: string;
  };
}

const CATALOG: Record<Locale, Messages> = {
  en: {
    wordmark: 'The Christian’s Daily Challenge',
    readerSettings: 'Reader settings',
    save: 'Save',
    saved: 'Saved',
    dayLabel: 'Day',
    minutesLabel: 'min read',
    previous: 'Previous',
    next: 'Next',
    tabs: {
      today: 'Today',
      archive: 'Archive',
      saved: 'Saved',
      settings: 'Settings',
    },
    publisher: {
      title: 'The Christian’s Daily Challenge by Edwin and Lillian Harvey',
      imprint: 'Published by Harvey Christian Publishers',
    },
    today: 'Today',
    languageName: 'English',
    otherLanguage: 'Română',
    comingSoon: 'Coming soon',
    menu: 'Menu',
    savedEmpty: 'Readings you save appear here. Tap the bookmark on any reading.',
    search: {
      label: 'Search readings',
      placeholder: 'Search readings',
      hint: 'Search by title or words in the reading.',
      loading: 'Loading search…',
      noResults: 'No readings match your search.',
      resultCount: (count) => `${count} ${count === 1 ? 'result' : 'results'}`,
    },
    settings: {
      theme: 'Theme',
      themeSystem: 'System',
      themeLight: 'Light',
      themeDark: 'Dark',
      textSize: 'Reading text size',
      textSmall: 'Small',
      textMedium: 'Medium',
      textLarge: 'Large',
      language: 'Language',
      prevNext: 'Show previous / next buttons',
    },
  },
  ro: {
    wordmark: 'Provocarea Zilnică a Creștinului',
    readerSettings: 'Setări cititor',
    save: 'Salvează',
    saved: 'Salvate',
    dayLabel: 'Ziua',
    minutesLabel: 'min de citit',
    previous: 'Anterior',
    next: 'Următor',
    tabs: {
      today: 'Astăzi',
      archive: 'Arhivă',
      saved: 'Salvate',
      settings: 'Setări',
    },
    publisher: {
      title: 'Provocarea Zilnică a Creștinului de Edwin și Lillian Harvey',
      imprint: 'Publicată de Harvey Christian Publishers',
    },
    today: 'Astăzi',
    languageName: 'Română',
    otherLanguage: 'English',
    comingSoon: 'În curând',
    menu: 'Meniu',
    savedEmpty: 'Lecturile salvate apar aici. Atinge semnul de carte de pe orice lectură.',
    search: {
      label: 'Caută în lecturi',
      placeholder: 'Caută în lecturi',
      hint: 'Caută după titlu sau cuvinte din lectură.',
      loading: 'Se încarcă căutarea…',
      noResults: 'Nicio lectură nu corespunde căutării.',
      resultCount: (count) =>
        `${count} ${count === 1 ? 'rezultat' : 'rezultate'}`,
    },
    settings: {
      theme: 'Temă',
      themeSystem: 'Sistem',
      themeLight: 'Luminos',
      themeDark: 'Întunecat',
      textSize: 'Mărimea textului',
      textSmall: 'Mic',
      textMedium: 'Mediu',
      textLarge: 'Mare',
      language: 'Limbă',
      prevNext: 'Arată butoanele anterior / următor',
    },
  },
};

const INTL_LOCALE: Record<Locale, string> = {
  en: 'en-US',
  ro: 'ro-RO',
};

export function messages(locale: Locale): Messages {
  return CATALOG[locale];
}

/** Full date such as "August 24, 2026" / "24 august 2026" for a MM-DD + year. */
export function formatFullDate(
  monthDay: string,
  year: number,
  locale: Locale,
): string {
  const [month, day] = monthDay.split('-').map((part) => Number.parseInt(part, 10));
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/** Localized month name for a 1-based month number. */
export function monthName(
  month: number,
  locale: Locale,
  style: 'long' | 'short' = 'long',
): string {
  const date = new Date(Date.UTC(2012, month - 1, 1));
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    month: style,
    timeZone: 'UTC',
  }).format(date);
}

/** Estimated reading time in whole minutes (>= 1) at ~200 words per minute. */
export function readingMinutes(plainText: string): number {
  const words = plainText.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
