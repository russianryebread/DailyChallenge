// Shared server rendering for the reader routes so the app/ layer stays thin.
// Both the English and Romanian route trees delegate here.

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import type { Locale } from '@/src/core/types';
import { resolveToday } from '@/src/core/calendar';
import {
  allMonthDays,
  localizedById,
  localizedByMonthDay,
  monthDayIndex,
} from '@/src/content/repository';
import { neighbors } from '@/src/content/navigation';
import { formatFullDate, messages } from '@/src/i18n/messages';
import { ReadingScreen } from './ReadingScreen';
import { LocalTodaySync } from './LocalTodaySync';

function currentYear(): number {
  return new Date().getFullYear();
}

function excerpt(plainText: string, max = 160): string {
  const normalized = plainText.replace(/\s+/g, ' ').trim();
  if (normalized.length <= max) {
    return normalized;
  }
  return `${normalized.slice(0, max - 1).trimEnd()}…`;
}

function parseId(idParam: string): number | null {
  if (!/^[1-9]\d{0,2}$/.test(idParam)) {
    return null;
  }
  const id = Number.parseInt(idParam, 10);
  return id >= 1 && id <= 366 ? id : null;
}

export function TodayView({ locale }: { locale: Locale }) {
  const now = new Date();
  const year = now.getFullYear();
  const monthDay = resolveToday(allMonthDays, now);
  const reading = localizedByMonthDay(monthDay, locale);
  if (!reading) {
    notFound();
  }
  const { previous, next } = neighbors(monthDay, year);
  return (
    <>
      <LocalTodaySync
        serverMonthDay={monthDay}
        locale={locale}
        monthDayIndex={monthDayIndex}
      />
      <ReadingScreen
        reading={reading}
        year={year}
        previous={previous}
        next={next}
      />
    </>
  );
}

export function todayMetadata(locale: Locale): Metadata {
  const monthDay = resolveToday(allMonthDays, new Date());
  const reading = localizedByMonthDay(monthDay, locale);
  const prefix = locale === 'ro' ? '/ro' : '';
  return {
    title: reading?.title,
    description: reading ? excerpt(reading.plainText) : undefined,
    alternates: {
      canonical: `${prefix}/today`,
      languages: { en: '/today', ro: '/ro/today' },
    },
  };
}

export function DevotionalView({
  locale,
  idParam,
}: {
  locale: Locale;
  idParam: string;
}) {
  const id = parseId(idParam);
  const reading = id ? localizedById(id, locale) : undefined;
  if (!reading) {
    notFound();
  }
  const year = currentYear();
  const { previous, next } = neighbors(reading.monthDay, year);
  return (
    <ReadingScreen
      reading={reading}
      year={year}
      previous={previous}
      next={next}
    />
  );
}

export function devotionalMetadata(
  locale: Locale,
  idParam: string,
): Metadata {
  const id = parseId(idParam);
  const reading = id ? localizedById(id, locale) : undefined;
  if (!reading) {
    return {};
  }
  const date = formatFullDate(reading.monthDay, currentYear(), locale);
  const prefix = locale === 'ro' ? '/ro' : '';
  const copy = messages(locale);
  return {
    title: reading.title,
    description: `${date} · ${copy.dayLabel} ${id} — ${excerpt(reading.plainText, 120)}`,
    alternates: {
      canonical: `${prefix}/devotional/${id}`,
      languages: {
        en: `/devotional/${id}`,
        ro: `/ro/devotional/${id}`,
      },
    },
    openGraph: {
      title: reading.title,
      description: excerpt(reading.plainText),
      type: 'article',
      locale: locale === 'ro' ? 'ro_RO' : 'en_US',
      url: `${prefix}/devotional/${id}`,
    },
  };
}
