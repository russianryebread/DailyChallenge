'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import type { Locale } from '@/src/core/types';
import { toMonthDay } from '@/src/core/calendar';

/**
 * Server rendering resolves "today" from the server clock (UTC on the edge).
 * On mount we re-resolve against the viewer's local calendar day and, if it
 * differs, replace the route with the correct reading permalink. This keeps the
 * Today route correct across timezones without shipping the full library.
 */
export function LocalTodaySync({
  serverMonthDay,
  locale,
  monthDayIndex,
}: {
  serverMonthDay: string;
  locale: Locale;
  monthDayIndex: Record<string, number>;
}) {
  const router = useRouter();

  useEffect(() => {
    const localMonthDay = toMonthDay(new Date());
    if (localMonthDay === serverMonthDay) {
      return;
    }
    const id = monthDayIndex[localMonthDay];
    if (!id) {
      return;
    }
    const prefix = locale === 'ro' ? '/ro' : '';
    router.replace(`${prefix}/devotional/${id}`);
  }, [serverMonthDay, locale, monthDayIndex, router]);

  return null;
}
