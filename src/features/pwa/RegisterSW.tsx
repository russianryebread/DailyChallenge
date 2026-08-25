'use client';

import { useEffect } from 'react';

// Registers the offline service worker. Failures are ignored (e.g. unsupported
// browsers) — the app still works online without it.
export function RegisterSW() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }
    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* offline support unavailable */
      });
    };
    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register, { once: true });
    }
  }, []);

  return null;
}
