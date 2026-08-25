'use client';

import { useState } from 'react';

import type { Locale } from '@/src/core/types';
import { messages } from '@/src/i18n/messages';
import { Icon } from '@/src/features/shell/icons';

// Opens the native share sheet (Web Share API) on mobile and supporting
// desktop browsers; falls back to copying the permalink to the clipboard.
export function ShareButton({
  id,
  title,
  locale,
}: {
  id: number;
  title: string;
  locale: Locale;
}) {
  const copy = messages(locale);
  const [copied, setCopied] = useState(false);

  function permalink(): string {
    const prefix = locale === 'ro' ? '/ro' : '';
    return `${window.location.origin}${prefix}/devotional/${id}`;
  }

  async function onClick() {
    const url = permalink();
    const shareData = { title, text: title, url };
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch {
      // user dismissed the share sheet, or share failed — fall through to copy
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <button
      type="button"
      className="icon-button share-button"
      aria-label={copied ? copy.linkCopied : copy.share}
      onClick={onClick}
    >
      <Icon name="share" size={22} />
    </button>
  );
}
