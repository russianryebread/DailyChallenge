'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { readLocale } from '@/src/features/settings/preferences';

// Entry gateway: respect a saved language choice, otherwise auto-detect from the
// browser, then open that locale's Today. A no-JS fallback links to English.
export default function RootGateway() {
  const router = useRouter();

  useEffect(() => {
    const locale = readLocale();
    router.replace(locale === 'ro' ? '/ro/today' : '/today');
  }, [router]);

  return (
    <main className="app-shell">
      <section className="reading-screen" aria-busy="true" />
      <noscript>
        <a href="/today">Open today’s reading</a>
      </noscript>
    </main>
  );
}
