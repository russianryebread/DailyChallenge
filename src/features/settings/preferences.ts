// Client preference storage for values needed before first paint (theme and
// reader text size). Per the spec these use localStorage so the no-flash script
// can apply them synchronously; richer device state lives in IndexedDB later.

export type ThemeChoice = 'system' | 'light' | 'dark';
export type TextSize = 'small' | 'medium' | 'large';

export const THEME_KEY = 'dc-theme';
export const TEXT_KEY = 'dc-text';

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

export function applyTheme(theme: ThemeChoice): void {
  const root = document.documentElement;
  if (theme === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }
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
 * Inline script that runs before first paint to prevent a theme/size flash.
 * Kept as a literal string so it can be injected without hydration.
 */
export const NO_FLASH_SCRIPT = `(function(){try{var d=document.documentElement;var t=localStorage.getItem('${THEME_KEY}');if(t==='light'||t==='dark'){d.setAttribute('data-theme',t);}var s=localStorage.getItem('${TEXT_KEY}');var m={small:'17px',medium:'19px',large:'20px'};if(s&&m[s]){d.style.setProperty('--reading-size',m[s]);}}catch(e){}})();`;
