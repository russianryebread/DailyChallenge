// Previous/next resolution over the active reading sequence for a given year.
// Boundaries return null (no year wrapping until product approves it). 02-29
// direct links in common years resolve to their calendar neighbours (02-28 and
// 03-01) even though the leap day is absent from that year's sequence.

import {
  activeSequence,
  nextInSequence,
  previousInSequence,
} from '@/src/core/calendar';
import { allMonthDays, getReadingByMonthDay } from './repository';

export interface NeighborRef {
  id: number;
  monthDay: string;
}

function refFor(monthDay: string | null): NeighborRef | null {
  if (!monthDay) {
    return null;
  }
  const reading = getReadingByMonthDay(monthDay);
  return reading ? { id: reading.id, monthDay: reading.monthDay } : null;
}

export function neighbors(
  monthDay: string,
  year: number,
): { previous: NeighborRef | null; next: NeighborRef | null } {
  const sequence = activeSequence(allMonthDays, year);
  return {
    previous: refFor(previousInSequence(sequence, monthDay)),
    next: refFor(nextInSequence(sequence, monthDay)),
  };
}
