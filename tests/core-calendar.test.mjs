import assert from 'node:assert/strict';
import test from 'node:test';

import {
  activeSequence,
  isLeapYear,
  nextInSequence,
  previousInSequence,
  resolveToday,
  toMonthDay,
} from '../src/core/calendar.ts';

// The full 366-key set (every MM-DD of a leap year), matching the content library.
const ALL_MONTH_DAYS = (() => {
  const keys = [];
  for (let month = 0; month < 12; month += 1) {
    const daysInMonth = new Date(Date.UTC(2012, month + 1, 0)).getUTCDate();
    for (let day = 1; day <= daysInMonth; day += 1) {
      keys.push(
        `${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      );
    }
  }
  return keys;
})();

test('isLeapYear applies the century exception', () => {
  assert.equal(isLeapYear(2024), true);
  assert.equal(isLeapYear(2026), false);
  assert.equal(isLeapYear(1900), false);
  assert.equal(isLeapYear(2000), true);
  assert.equal(isLeapYear(2100), false);
  assert.equal(isLeapYear(2400), true);
});

test('active sequence includes the leap day only in leap years', () => {
  const leap = activeSequence(ALL_MONTH_DAYS, 2024);
  const common = activeSequence(ALL_MONTH_DAYS, 2026);
  assert.equal(leap.length, 366);
  assert.ok(leap.includes('02-29'));
  assert.equal(common.length, 365);
  assert.equal(common.includes('02-29'), false);
});

test('February advances directly to March 1 in a common year', () => {
  const common = activeSequence(ALL_MONTH_DAYS, 2026);
  assert.equal(nextInSequence(common, '02-28'), '03-01');
  assert.equal(previousInSequence(common, '03-01'), '02-28');
});

test('February 28 reaches the leap day in a leap year', () => {
  const leap = activeSequence(ALL_MONTH_DAYS, 2024);
  assert.equal(nextInSequence(leap, '02-28'), '02-29');
  assert.equal(nextInSequence(leap, '02-29'), '03-01');
});

test('leap-day permalink resolves calendar neighbours in a common year', () => {
  const common = activeSequence(ALL_MONTH_DAYS, 2026);
  // 02-29 is absent from the sequence but still yields adjacent days.
  assert.equal(previousInSequence(common, '02-29'), '02-28');
  assert.equal(nextInSequence(common, '02-29'), '03-01');
});

test('sequence boundaries do not wrap', () => {
  const common = activeSequence(ALL_MONTH_DAYS, 2026);
  assert.equal(previousInSequence(common, '01-01'), null);
  assert.equal(nextInSequence(common, '12-31'), null);
});

test('toMonthDay uses local date parts', () => {
  const date = new Date(2026, 7, 25); // local August 25, 2026
  assert.equal(toMonthDay(date), '08-25');
});

test('resolveToday maps a common-year date to its reading key', () => {
  const date = new Date(2026, 7, 25);
  assert.equal(resolveToday(ALL_MONTH_DAYS, date), '08-25');
});
