// Client preference storage for values needed before first paint (theme and
// reader text size). Per the spec these use localStorage so the no-flash script
// can apply them synchronously; richer device state lives in IndexedDB later.

export type ThemeChoice = 'system' | 'light' | 'dark';
export type TextSize = 'small' | 'medium' | 'large';
export type Locale = 'en' | 'ro';

export const THEME_KEY = 'dc-theme';
export const TEXT_KEY = 'dc-text';
export const LOCALE_KEY = 'dc-locale';
export const PREVNEXT_KEY = 'dc-prevnext';

export const READING_SIZES: Record<TextSize, string> = {
  small: '17px',
  medium: '19px',
  large: '20px',
};

const THEMES: ThemeChoice[] = ['system', 'light', 'dark'];
const SIZES: TextSize[] = ['small', 'medium', 'large'];

export function readTheme(): ThemeChoice {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return THEMES.includes(value as ThemeChoice)
      ? (value as ThemeChoice)
      : 'system';
  } catch {
    return 'system';
  }
}

export function readTextSize(): TextSize {
  try {
    const value = localStorage.getItem(TEXT_KEY);
    return SIZES.includes(value as TextSize) ? (value as TextSize) : 'medium';
  } catch {
    return 'medium';
  }
}

// Status-bar / overscroll colors, matching --paper-1 in each theme.
export const THEME_COLORS = { light: '#faf5f0', dark: '#1a1512' } as const;

function prefersDark(): boolean {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}

/** Whether dark surfaces are currently active for the given (or stored) choice. */
export function isDarkActive(theme?: ThemeChoice): boolean {
  const choice = theme ?? readTheme();
  return choice === 'dark' || (choice === 'system' && prefersDark());
}

/**
 * Keep <meta name="theme-color"> in sync with the active theme so the status bar
 * and overscroll area are never the wrong color (e.g. white in dark mode). Keyed
 * on the app's theme choice, not just the system preference.
 */
export function updateThemeColor(theme?: ThemeChoice): void {
  const color = isDarkActive(theme) ? THEME_COLORS.dark : THEME_COLORS.light;
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', color);
}

export function applyTheme(theme: ThemeChoice): void {
  const root = document.documentElement;
  if (theme === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }
  updateThemeColor(theme);
}

export function applyTextSize(size: TextSize): void {
  document.documentElement.style.setProperty(
    '--reading-size',
    READING_SIZES[size],
  );
}

export function saveTheme(theme: ThemeChoice): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* storage unavailable — apply for this session only */
  }
  applyTheme(theme);
}

export function saveTextSize(size: TextSize): void {
  try {
    localStorage.setItem(TEXT_KEY, size);
  } catch {
    /* storage unavailable — apply for this session only */
  }
  applyTextSize(size);
}

/**
 * The reader locale. A stored choice always wins; otherwise the browser's
 * preferred languages are auto-detected (Romanian when any starts with "ro").
 */
export function detectLocale(): Locale {
  try {
    const languages =
      navigator.languages && navigator.languages.length > 0
        ? navigator.languages
        : [navigator.language];
    return languages.some((tag) => tag.toLowerCase().startsWith('ro'))
      ? 'ro'
      : 'en';
  } catch {
    return 'en';
  }
}

export function readLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_KEY);
    if (stored === 'en' || stored === 'ro') {
      return stored;
    }
  } catch {
    /* fall through to detection */
  }
  return detectLocale();
}

export function saveLocale(locale: Locale): void {
  try {
    localStorage.setItem(LOCALE_KEY, locale);
  } catch {
    /* storage unavailable — honoured for this session via navigation only */
  }
}

/** Whether the reader shows previous/next controls (off by default). */
export function readPrevNext(): boolean {
  try {
    return localStorage.getItem(PREVNEXT_KEY) === 'on';
  } catch {
    return false;
  }
}

export function applyPrevNext(enabled: boolean): void {
  const root = document.documentElement;
  if (enabled) {
    root.setAttribute('data-prevnext', 'on');
  } else {
    root.removeAttribute('data-prevnext');
  }
}

export function savePrevNext(enabled: boolean): void {
  try {
    localStorage.setItem(PREVNEXT_KEY, enabled ? 'on' : 'off');
  } catch {
    /* storage unavailable — apply for this session only */
  }
  applyPrevNext(enabled);
}

/**
 * Inline script that runs before first paint to prevent a theme/size flash.
 * Kept as a literal string so it can be injected without hydration.
 */
export const NO_FLASH_SCRIPT = `(function(){try{var d=document.documentElement;var t=localStorage.getItem('${THEME_KEY}');if(t==='light'||t==='dark'){d.setAttribute('data-theme',t);}var s=localStorage.getItem('${TEXT_KEY}');var m={small:'17px',medium:'19px',large:'20px'};if(s&&m[s]){d.style.setProperty('--reading-size',m[s]);}if(localStorage.getItem('${PREVNEXT_KEY}')==='on'){d.setAttribute('data-prevnext','on');}var dark=t==='dark'||(t!=='light'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);var mc=document.querySelector('meta[name="theme-color"]');if(!mc){mc=document.createElement('meta');mc.setAttribute('name','theme-color');document.head.appendChild(mc);}mc.setAttribute('content',dark?'${THEME_COLORS.dark}':'${THEME_COLORS.light}');}catch(e){}})();`;
