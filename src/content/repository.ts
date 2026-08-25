// Server-side content repository. Reads the immutable generated library and
// exposes typed lookups. This module bundles the full readings artifact, so it
// must only be imported from server components / server code — never shipped to
// the client bundle.

import type { Locale, LocalizedReading, Reading } from '@/src/core/types';
import { toMonthDay } from '@/src/core/calendar';
import readingsData from './generated/full/readings.json';

interface ReadingLibrary {
  contentVersion: string;
  readings: Reading[];
}

const library = readingsData as unknown as ReadingLibrary;

const byId = new Map<number, Reading>();
const byMonthDay = new Map<string, Reading>();

for (const reading of library.readings) {
  byId.set(reading.id, reading);
  byMonthDay.set(reading.monthDay, reading);
}

export const contentVersion = library.contentVersion;

export const allMonthDays: readonly string[] = library.readings.map(
  (reading) => reading.monthDay,
);

/**
 * Compact MM-DD -> id map. Small enough (366 entries) to hand to a client
 * component so it can correct "today" to the viewer's local calendar day
 * without shipping the full library.
 */
export const monthDayIndex: Record<string, number> = Object.fromEntries(
  library.readings.map((reading) => [reading.monthDay, reading.id]),
);

export function getReadingById(id: number): Reading | undefined {
  return byId.get(id);
}

export function getReadingByMonthDay(monthDay: string): Reading | undefined {
  return byMonthDay.get(monthDay);
}

/** Reduce a bilingual reading to the single locale being rendered. */
export function localize(reading: Reading, locale: Locale): LocalizedReading {
  const translation = reading.translations[locale];
  return {
    id: reading.id,
    monthDay: reading.monthDay,
    locale,
    title: translation.title,
    blocks: translation.blocks,
    plainText: translation.plainText,
  };
}

export function localizedById(
  id: number,
  locale: Locale,
): LocalizedReading | undefined {
  const reading = getReadingById(id);
  return reading ? localize(reading, locale) : undefined;
}

export function localizedByMonthDay(
  monthDay: string,
  locale: Locale,
): LocalizedReading | undefined {
  const reading = getReadingByMonthDay(monthDay);
  return reading ? localize(reading, locale) : undefined;
}

/** Catalog entries (id + monthDay + title) for a locale, in calendar order. */
export function catalog(
  locale: Locale,
): { id: number; monthDay: string; title: string }[] {
  return [...library.readings]
    .sort((left, right) => left.monthDay.localeCompare(right.monthDay))
    .map((reading) => ({
      id: reading.id,
      monthDay: reading.monthDay,
      title: reading.translations[locale].title,
    }));
}

/** Today's reading for a locale, resolved from a local date. */
export function localizedForDate(
  date: Date,
  locale: Locale,
): LocalizedReading | undefined {
  return localizedByMonthDay(toMonthDay(date), locale);
}
