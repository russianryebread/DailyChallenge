'use client';

import { useEffect, useState } from 'react';

import type { Locale } from '@/src/core/types';
import { messages } from '@/src/i18n/messages';
import { getState, toggleSaved } from '@/src/state/readingState';
import { Icon } from '@/src/features/shell/icons';

export function SaveButton({
  monthDay,
  locale,
}: {
  monthDay: string;
  locale: Locale;
}) {
  const copy = messages(locale);
  const [saved, setSaved] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    getState(monthDay).then((record) => {
      if (active) {
        setSaved(Boolean(record?.saved));
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, [monthDay]);

  async function onClick() {
    const next = await toggleSaved(monthDay);
    setSaved(next);
  }

  return (
    <button
      type="button"
      className={saved ? 'icon-button save-button is-saved' : 'icon-button save-button'}
      aria-pressed={saved}
      aria-label={saved ? copy.saved : copy.save}
      onClick={onClick}
      data-ready={ready ? 'true' : undefined}
    >
      <Icon name={saved ? 'saved-fill' : 'saved'} size={22} />
    </button>
  );
}
