'use client';

import { useEffect } from 'react';

import { readTheme, updateThemeColor } from '@/src/features/settings/preferences';

// Keeps the theme-color meta correct after load, including when the system
// scheme changes while the app is following it.
export function ThemeColorSync() {
  useEffect(() => {
    updateThemeColor();
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (readTheme() === 'system') {
        updateThemeColor();
      }
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return null;
}
