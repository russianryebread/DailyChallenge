import type { Locale } from '@/src/core/types';

// No network call for a language that is already cached. New languages are
// downloaded by the worker only after an explicit selection/navigation.
export async function ensureOfflineLanguage(locale: Locale): Promise<void> {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return;
  const worker = navigator.serviceWorker.controller;
  // Legacy workers don't implement this message. They already cache both
  // languages; the next normal worker update adopts language-specific caching.
  if (!new URL(worker.scriptURL).searchParams.has('locale')) return;
  await new Promise<void>((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = window.setTimeout(() => {
      channel.port1.close();
      reject(new Error('Language download timed out'));
    }, 120_000);
    channel.port1.onmessage = (event: MessageEvent<{ ok: boolean }>) => {
      window.clearTimeout(timer);
      channel.port1.close();
      if (event.data.ok) resolve();
      else reject(new Error('Language download failed'));
    };
    worker.postMessage({ type: 'DOWNLOAD_LANGUAGE', locale }, [channel.port2]);
  });
}
