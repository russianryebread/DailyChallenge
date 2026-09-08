'use client';

import { useEffect, useState } from 'react';
import { readLocale } from '@/src/features/settings/preferences';

const copy = {
  en: { downloading: 'Downloading the app and readings in your selected language for offline use…', error: 'Offline download did not finish. Keep this page open with a connection and retry.', retry: 'Retry download' },
  ro: { downloading: 'Se descarcă aplicația și lecturile în limba selectată pentru utilizare offline…', error: 'Descărcarea offline nu s-a terminat. Păstrează pagina deschisă cu o conexiune și încearcă din nou.', retry: 'Reîncearcă descărcarea' },
};

export function RegisterSW() {
  const [status, setStatus] = useState<'idle' | 'downloading' | 'error'>('idle');
  const [attempt, setAttempt] = useState(0);
  const [locale, setLocale] = useState<'en' | 'ro'>('en');

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    // Vite dev modules/HMR cannot form a complete offline production bundle.
    if (process.env.NODE_ENV !== 'production') {
      // Remove legacy DEV installations left by earlier versions of this app.
      // Unregistering only affects this app's worker, not other local projects.
      void navigator.serviceWorker.getRegistration('/').then(async (registration) => {
        const scriptURL = registration?.active?.scriptURL;
        if (!registration || !scriptURL || new URL(scriptURL).pathname !== '/sw.js') return;
        const controlled = navigator.serviceWorker.controller?.scriptURL === scriptURL;
        await registration.unregister();
        if (controlled) window.location.reload();
      }).catch(() => {});
      return;
    }
    let disposed = false;
    let reloading = false;
    const cleanups: (() => void)[] = [];
    const change = () => {
      if (reloading) return;
      reloading = true;
      // The new worker only claims clients after the entire bundle is cached.
      // Reload into its local shell instead of leaving server routes mounted.
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', change);

    const watch = (worker: ServiceWorker) => {
      const update = () => {
        if (disposed) return;
        if (worker.state === 'redundant') setStatus('error');
        else if (worker.state === 'activated') setStatus('idle');
        else setStatus('downloading');
      };
      worker.addEventListener('statechange', update);
      cleanups.push(() => worker.removeEventListener('statechange', update));
      update();
    };
    (async () => {
      const pathname = window.location.pathname;
      const selected = pathname === '/' || pathname === '/offline'
        ? readLocale()
        : pathname === '/ro' || pathname.startsWith('/ro/') ? 'ro' : 'en';
      setLocale(selected);
      let registration = await navigator.serviceWorker.getRegistration('/');
      if (disposed) return;
      // Avoid an app-initiated update request every time an installed app opens.
      // Browsers can still run their own independent update checks.
      if (!registration?.active || !new URL(registration.active.scriptURL).searchParams.has('locale') || attempt > 0) {
        setStatus('downloading');
        registration = await navigator.serviceWorker.register(`/sw.js?locale=${selected}`, { updateViaCache: 'none' });
      }
      if (disposed) return;
      const found = () => { if (registration?.installing) watch(registration.installing); };
      registration.addEventListener('updatefound', found);
      cleanups.push(() => registration.removeEventListener('updatefound', found));
      found();
      if (registration.waiting) watch(registration.waiting);
      if (registration.active && !registration.installing) {
        setStatus('idle');
        // A ready bundle already exists (e.g. launching a newly installed PWA).
        // The browser will attach its controller at the next navigation.
        if (!navigator.serviceWorker.controller) change();
      }
      // Best-effort protection from storage eviction; denial doesn't make the
      // app unusable and must not trigger a permission prompt or retry loop.
      if (navigator.storage?.persist) void navigator.storage.persist().catch(() => false);
    })().catch(() => { if (!disposed) setStatus('error'); });
    return () => {
      disposed = true;
      navigator.serviceWorker.removeEventListener('controllerchange', change);
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [attempt]);

  if (status === 'idle') return null;
  const text = copy[locale];
  return <div className="offline-download-status" role="status">
    <span>{status === 'error' ? text.error : text.downloading}</span>
    {status === 'error' && <button type="button" onClick={() => setAttempt((value) => value + 1)}>{text.retry}</button>}
  </div>;
}
