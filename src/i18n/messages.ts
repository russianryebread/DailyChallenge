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
  previous: string;
  next: string;
  tabs: { today: string; archive: string; saved: string; settings: string };
  publisher: { title: string; imprintPrefix: string };
  today: string;
  languageName: string;
  otherLanguage: string;
  comingSoon: string;
  menu: string;
  savedEmpty: string;
  share: string;
  linkCopied: string;
  offline: { title: string; body: string; today: string };
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
    support: string;
  };
  support: {
    title: string;
    intro: string;
    name: string;
    email: string;
    message: string;
    submit: string;
    sending: string;
    thanks: string;
    error: string;
    offline: string;
  };
}

const CATALOG: Record<Locale, Messages> = {
  en: {
    wordmark: 'The Christian’s Daily Challenge',
    readerSettings: 'Reader settings',
    save: 'Save',
    saved: 'Saved',
    dayLabel: 'Day',
    previous: 'Previous',
    next: 'Next',
    tabs: {
      today: 'Today',
      archive: 'Book',
      saved: 'Saved',
      settings: 'Settings',
    },
    publisher: {
      title: 'The Christian’s Daily Challenge by Edwin and Lillian Harvey',
      imprintPrefix: 'Published by',
    },
    today: 'Today',
    languageName: 'English',
    otherLanguage: 'Română',
    comingSoon: 'Coming soon',
    menu: 'Menu',
    savedEmpty: 'Readings you save appear here. Tap the bookmark on any reading.',
    share: 'Share',
    linkCopied: 'Link copied',
    offline: { title: 'Not available offline', body: 'This reading hasn\u2019t been saved for offline yet. Reconnect to load it.', today: 'Go to today\u2019s reading' },
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
      support: 'Support',
    },
    support: {
      title: 'Support',
      intro: 'Questions or trouble with the app? Send us a note and we’ll help.',
      name: 'Name',
      email: 'Your email address',
      message: 'How can we help?',
      submit: 'Send message',
      sending: 'Sending…',
      thanks: 'Thank you — your message has been sent.',
      error: 'Sorry, something went wrong. Please try again later.',
      offline: 'You’re offline. Reconnect to send your message.',
    },
  },
  ro: {
    wordmark: 'Provocarea Zilnică a Creștinului',
    readerSettings: 'Setări cititor',
    save: 'Salvează',
    saved: 'Salvate',
    dayLabel: 'Ziua',
    previous: 'Anterior',
    next: 'Următor',
    tabs: {
      today: 'Astăzi',
      archive: 'Carte',
      saved: 'Salvate',
      settings: 'Setări',
    },
    publisher: {
      title: 'Provocarea Zilnică a Creștinului de Edwin și Lillian Harvey',
      imprintPrefix: 'Publicată de',
    },
    today: 'Astăzi',
    languageName: 'Română',
    otherLanguage: 'English',
    comingSoon: 'În curând',
    menu: 'Meniu',
    savedEmpty: 'Lecturile salvate apar aici. Atinge semnul de carte de pe orice lectură.',
    share: 'Distribuie',
    linkCopied: 'Link copiat',
    offline: { title: 'Indisponibil offline', body: 'Aceast\u0103 lectur\u0103 nu a fost salvat\u0103 \u00eenc\u0103 pentru offline. Reconecteaz\u0103-te pentru a o \u00eenc\u0103rca.', today: 'Mergi la lectura de azi' },
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
      support: 'Asistență',
    },
    support: {
      title: 'Asistență',
      intro: 'Ai întrebări sau probleme cu aplicația? Scrie-ne și te ajutăm.',
      name: 'Nume',
      email: 'Adresa ta de e-mail',
      message: 'Cu ce te putem ajuta?',
      submit: 'Trimite mesajul',
      sending: 'Se trimite…',
      thanks: 'Mulțumim — mesajul tău a fost trimis.',
      error: 'Ne pare rău, ceva nu a funcționat. Încearcă din nou mai târziu.',
      offline: 'Ești offline. Reconectează-te pentru a trimite mesajul.',
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
