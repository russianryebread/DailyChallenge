// Gregorian calendar rules for resolving the active reading sequence.
//
// Readings are keyed by zero-padded MM-DD. Because MM-DD strings sort in
// chronological order, the active sequence is simply the sorted set of keys,
// with 02-29 excluded in common years. Canonical IDs never shift: 02-29 keeps
// its ID (60) even in years where it is not part of the active sequence.

export const LEAP_DAY = '02-29';

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Local (never UTC) MM-DD for a given date. */
export function toMonthDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}-${day}`;
}

/**
 * The ordered MM-DD sequence a reader can page through in the given year.
 * `allMonthDays` is the full set from the content library (which includes
 * 02-29); common years drop the leap day.
 */
export function activeSequence(
  allMonthDays: readonly string[],
  year: number,
): string[] {
  const sorted = [...allMonthDays].sort();
  if (isLeapYear(year)) {
    return sorted;
  }
  return sorted.filter((monthDay) => monthDay !== LEAP_DAY);
}

/**
 * Resolve "today" to a reading key for the given year. Falls back to the
 * nearest preceding active day if the exact key is somehow absent (defensive;
 * every real MM-DD except 02-29-in-a-common-year is present, and 02-29 cannot
 * occur in a common year).
 */
export function resolveToday(
  allMonthDays: readonly string[],
  date: Date,
): string {
  const sequence = activeSequence(allMonthDays, date.getFullYear());
  const monthDay = toMonthDay(date);
  if (sequence.includes(monthDay)) {
    return monthDay;
  }
  return previousInSequence(sequence, monthDay) ?? sequence[0];
}

/** Largest active key strictly before `monthDay`, or null at the lower bound. */
export function previousInSequence(
  sequence: readonly string[],
  monthDay: string,
): string | null {
  let candidate: string | null = null;
  for (const key of sequence) {
    if (key < monthDay) {
      candidate = key;
    } else {
      break;
    }
  }
  return candidate;
}

/** Smallest active key strictly after `monthDay`, or null at the upper bound. */
export function nextInSequence(
  sequence: readonly string[],
  monthDay: string,
): string | null {
  for (const key of sequence) {
    if (key > monthDay) {
      return key;
    }
  }
  return null;
}
