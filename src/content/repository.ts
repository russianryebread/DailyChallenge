// Server-side content repository. Reads the immutable language libraries and
// exposes typed lookups. This module bundles the reading artifacts, so it
// must only be imported from server components / server code — never shipped to
// the client bundle.

import type { Locale, LocalizedReading, Reading } from '@/src/core/types';
import { toMonthDay } from '@/src/core/calendar';
import englishData from './generated/full/readings.en.json';
import romanianData from './generated/full/readings.ro.json';

interface ReadingLibrary {
  contentVersion: string;
  locale: Locale;
  readings: Reading[];
}

const libraries: Record<Locale, ReadingLibrary> = {
  en: englishData as unknown as ReadingLibrary,
  ro: romanianData as unknown as ReadingLibrary,
};
const library = libraries.en;

const byId = new Map<number, Reading>();
const byMonthDay = new Map<string, Reading>();
const localizedByLocale: Record<Locale, Map<number, Reading>> = {
  en: byId,
  ro: new Map(libraries.ro.readings.map((reading) => [reading.id, reading])),
};

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

/** Look up the same reading in the requested language. */
export function localize(reading: Reading, locale: Locale): LocalizedReading {
  const translation = localizedByLocale[locale].get(reading.id);
  if (!translation) throw new Error(`Missing ${locale} reading ${reading.id}`);
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
      title: localizedByLocale[locale].get(reading.id)!.title,
    }));
}

/** Today's reading for a locale, resolved from a local date. */
export function localizedForDate(
  date: Date,
  locale: Locale,
): LocalizedReading | undefined {
  return localizedByMonthDay(toMonthDay(date), locale);
}

export interface MonthEntry {
  id: number;
  monthDay: string;
  day: number;
  title: string;
}

/** Catalog entries for one zero-padded month ("01"–"12"), in calendar order. */
export function readingsInMonth(month: string, locale: Locale): MonthEntry[] {
  return [...library.readings]
    .filter((reading) => reading.monthDay.startsWith(`${month}-`))
    .sort((left, right) => left.monthDay.localeCompare(right.monthDay))
    .map((reading) => ({
      id: reading.id,
      monthDay: reading.monthDay,
      day: Number.parseInt(reading.monthDay.slice(3), 10),
      title: localizedByLocale[locale].get(reading.id)!.title,
    }));
}
