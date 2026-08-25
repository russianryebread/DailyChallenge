import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import type { Locale } from '@/src/core/types';
import { isLeapYear, LEAP_DAY } from '@/src/core/calendar';
import { readingsInMonth } from '@/src/content/repository';
import { messages, monthName } from '@/src/i18n/messages';
import { ArchiveScreen } from './ArchiveScreen';

function currentMonth(): number {
  return new Date().getMonth() + 1;
}

function parseMonth(monthParam: string): number | null {
  if (!/^(0[1-9]|1[0-2])$/.test(monthParam)) {
    return null;
  }
  return Number.parseInt(monthParam, 10);
}

function view(locale: Locale, month: number) {
  const year = new Date().getFullYear();
  let entries = readingsInMonth(String(month).padStart(2, '0'), locale);
  // The leap day is a valid permalink but is not part of a common year's
  // active archive sequence.
  if (!isLeapYear(year)) {
    entries = entries.filter((entry) => entry.monthDay !== LEAP_DAY);
  }
  return <ArchiveScreen locale={locale} month={month} entries={entries} />;
}

export function ArchiveCurrentView({ locale }: { locale: Locale }) {
  return view(locale, currentMonth());
}

export function ArchiveMonthView({
  locale,
  monthParam,
}: {
  locale: Locale;
  monthParam: string;
}) {
  const month = parseMonth(monthParam);
  if (!month) {
    notFound();
  }
  return view(locale, month);
}

export function archiveMonthMetadata(
  locale: Locale,
  monthParam: string,
): Metadata {
  const month = parseMonth(monthParam);
  if (!month) {
    return {};
  }
  const prefix = locale === 'ro' ? '/ro' : '';
  const name = monthName(month, locale);
  return {
    title: `${name} — ${messages(locale).tabs.archive}`,
    alternates: {
      canonical: `${prefix}/archive/${String(month).padStart(2, '0')}`,
    },
  };
}
