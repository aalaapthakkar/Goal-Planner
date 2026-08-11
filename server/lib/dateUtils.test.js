import { describe, it, expect } from 'vitest';
import {
  isValidISODate,
  compareISODates,
  getWeekdayISO,
  addDaysISO,
  diffDaysISO,
  enumerateDatesISO,
  clampISO
} from './dateUtils.js';

describe('getWeekdayISO', () => {
  it('computes known weekday anchors correctly', () => {
    expect(getWeekdayISO('2026-08-11')).toBe(2); // Tuesday
    expect(getWeekdayISO('2026-01-01')).toBe(4); // Thursday
  });
});

describe('addDaysISO', () => {
  it('crosses a month boundary', () => {
    expect(addDaysISO('2026-01-31', 1)).toBe('2026-02-01');
  });

  it('crosses a year boundary', () => {
    expect(addDaysISO('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('handles leap-year Feb 29 vs non-leap Feb 28 -> Mar 1', () => {
    expect(addDaysISO('2028-02-28', 1)).toBe('2028-02-29'); // 2028 is leap
    expect(addDaysISO('2027-02-28', 1)).toBe('2027-03-01'); // 2027 is not leap
  });

  it('supports negative n', () => {
    expect(addDaysISO('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('diffDaysISO', () => {
  it('counts days correctly across a DST-heavy span, unaffected by timezone', () => {
    // Purely UTC component math -- no local DST transition can shift this result.
    expect(diffDaysISO('2026-01-01', '2026-03-01')).toBe(59);
  });

  it('is negative when toStr is before fromStr', () => {
    expect(diffDaysISO('2026-03-01', '2026-01-01')).toBe(-59);
  });
});

describe('compareISODates', () => {
  it('orders strings correctly', () => {
    expect(compareISODates('2026-01-01', '2026-01-02')).toBe(-1);
    expect(compareISODates('2026-01-02', '2026-01-01')).toBe(1);
    expect(compareISODates('2026-01-01', '2026-01-01')).toBe(0);
  });
});

describe('enumerateDatesISO', () => {
  it('returns an inclusive array of the correct length', () => {
    const dates = enumerateDatesISO('2026-01-01', '2026-01-05');
    expect(dates).toEqual([
      '2026-01-01',
      '2026-01-02',
      '2026-01-03',
      '2026-01-04',
      '2026-01-05'
    ]);
  });

  it('returns [] when from > to', () => {
    expect(enumerateDatesISO('2026-01-05', '2026-01-01')).toEqual([]);
  });

  it('returns a single-element array when from === to', () => {
    expect(enumerateDatesISO('2026-01-01', '2026-01-01')).toEqual(['2026-01-01']);
  });
});

describe('isValidISODate', () => {
  it('rejects a calendar-invalid date', () => {
    expect(isValidISODate('2026-02-30')).toBe(false);
  });

  it('rejects a malformed date string', () => {
    expect(isValidISODate('26-08-11')).toBe(false);
  });

  it('accepts a well-formed, calendar-valid date', () => {
    expect(isValidISODate('2026-08-11')).toBe(true);
  });

  it('accepts a leap-day date only in a leap year', () => {
    expect(isValidISODate('2028-02-29')).toBe(true);
    expect(isValidISODate('2027-02-29')).toBe(false);
  });
});

describe('clampISO', () => {
  it('clamps below the minimum', () => {
    expect(clampISO('2026-01-01', '2026-06-01', '2026-12-01')).toBe('2026-06-01');
  });

  it('clamps above the maximum', () => {
    expect(clampISO('2027-01-01', '2026-06-01', '2026-12-01')).toBe('2026-12-01');
  });

  it('passes through a value already within range', () => {
    expect(clampISO('2026-07-01', '2026-06-01', '2026-12-01')).toBe('2026-07-01');
  });
});
