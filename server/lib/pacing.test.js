import { describe, it, expect } from 'vitest';
import {
  computeDailyAvailability,
  sumAvailableHours,
  countAvailableDays,
  computePlannedToDate,
  computeActualToDate,
  computeBacklog,
  computeRequiredDailyRate,
  isOffTrack,
  solveExtendedExamDate,
  solveAvailabilityIncrease,
  solveTargetCut,
  computePacingSummary
} from './pacing.js';

// weekday: 2h Mon-Fri, 4h Sat/Sun (matches the app's default seed template)
const UNEVEN_AVAILABILITY = { 0: 4, 1: 2, 2: 2, 3: 2, 4: 2, 5: 2, 6: 4 };
// weekday-only: 2h Mon-Fri, 0h Sat/Sun
const WEEKDAYS_ONLY_AVAILABILITY = { 0: 0, 1: 2, 2: 2, 3: 2, 4: 2, 5: 2, 6: 0 };
// uniform 2h every day of the week
const UNIFORM_AVAILABILITY = { 0: 2, 1: 2, 2: 2, 3: 2, 4: 2, 5: 2, 6: 2 };
// every day zero
const ZERO_AVAILABILITY = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

describe('computeDailyAvailability', () => {
  it('applies a weekday template across a full week (2026-01-05 Mon .. 2026-01-11 Sun)', () => {
    const daily = computeDailyAvailability({
      startDate: '2026-01-05',
      endDate: '2026-01-11',
      availabilityMap: UNEVEN_AVAILABILITY,
      blackoutDates: []
    });
    expect(daily).toHaveLength(7);
    expect(sumAvailableHours(daily, '2026-01-05', '2026-01-11')).toBe(18); // 5*2 + 2*4
    const saturday = daily.find((d) => d.date === '2026-01-10');
    expect(saturday.weekday).toBe(6);
    expect(saturday.availableHours).toBe(4);
  });

  it('lets a blackout date override weekday-template hours to zero', () => {
    const daily = computeDailyAvailability({
      startDate: '2026-01-05',
      endDate: '2026-01-11',
      availabilityMap: UNEVEN_AVAILABILITY,
      blackoutDates: ['2026-01-10'] // a Saturday, template says 4h
    });
    const saturday = daily.find((d) => d.date === '2026-01-10');
    expect(saturday.isBlackout).toBe(true);
    expect(saturday.availableHours).toBe(0);
  });

  it('returns [] when startDate > endDate', () => {
    const daily = computeDailyAvailability({
      startDate: '2026-01-11',
      endDate: '2026-01-05',
      availabilityMap: UNEVEN_AVAILABILITY,
      blackoutDates: []
    });
    expect(daily).toEqual([]);
  });
});

describe('computePlannedToDate', () => {
  it('is 0 when today is before start_date', () => {
    const daily = computeDailyAvailability({
      startDate: '2026-02-01',
      endDate: '2026-02-28',
      availabilityMap: UNEVEN_AVAILABILITY,
      blackoutDates: []
    });
    const result = computePlannedToDate({
      totalTargetHours: 100,
      startDate: '2026-02-01',
      examDate: '2026-02-28',
      today: '2026-01-15',
      dailyAvailability: daily
    });
    expect(result.plannedToDateHours).toBe(0);
    expect(result.availableToDateHours).toBe(0);
  });

  it('equals totalTargetHours when the exam date is in the past', () => {
    const daily = computeDailyAvailability({
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      availabilityMap: UNEVEN_AVAILABILITY,
      blackoutDates: []
    });
    const result = computePlannedToDate({
      totalTargetHours: 50,
      startDate: '2026-01-01',
      examDate: '2026-01-31',
      today: '2026-02-15',
      dailyAvailability: daily
    });
    expect(result.plannedToDateHours).toBe(50);
  });

  it('weights by hours, not an even per-day split', () => {
    // 2026-01-05 Mon .. 2026-01-11 Sun, 18h total (see computeDailyAvailability test above).
    // today = 2026-01-10 (Sat) is the 6th of 7 days by count, but only 14 of 18 hours (not 6/7).
    const daily = computeDailyAvailability({
      startDate: '2026-01-05',
      endDate: '2026-01-11',
      availabilityMap: UNEVEN_AVAILABILITY,
      blackoutDates: []
    });
    const result = computePlannedToDate({
      totalTargetHours: 180,
      startDate: '2026-01-05',
      examDate: '2026-01-11',
      today: '2026-01-10',
      dailyAvailability: daily
    });
    expect(result.totalAvailableHours).toBe(18);
    expect(result.availableToDateHours).toBe(14);
    expect(result.plannedToDateHours).toBe(140); // 180 * 14/18, NOT 180 * 6/7 (=154.3)
  });

  it('falls back to the full target when the window has zero available hours (0/0 rule)', () => {
    const daily = computeDailyAvailability({
      startDate: '2026-01-05',
      endDate: '2026-01-11',
      availabilityMap: ZERO_AVAILABILITY,
      blackoutDates: []
    });
    const result = computePlannedToDate({
      totalTargetHours: 50,
      startDate: '2026-01-05',
      examDate: '2026-01-11',
      today: '2026-01-08',
      dailyAvailability: daily
    });
    expect(result.totalAvailableHours).toBe(0);
    expect(result.plannedToDateHours).toBe(50);
  });
});

describe('computeActualToDate', () => {
  it('is 0 when nothing has been logged', () => {
    expect(computeActualToDate({ sessions: [], asOfDate: '2026-01-10' })).toBe(0);
  });

  it('sums minutes-to-hours for sessions on or before asOfDate, unbounded above target/planned (overlogging)', () => {
    const sessions = [
      { session_date: '2026-01-05', minutes: 1800 },
      { session_date: '2026-01-06', minutes: 1200 },
      { session_date: '2026-01-20', minutes: 6000 } // after asOfDate, excluded
    ];
    expect(computeActualToDate({ sessions, asOfDate: '2026-01-10' })).toBe(50); // 3000 min = 50h
  });
});

describe('computeBacklog', () => {
  it('is positive ("behind") when planned exceeds actual', () => {
    expect(computeBacklog({ plannedToDateHours: 10, actualToDateHours: 4 })).toEqual({
      backlogHours: 6,
      status: 'behind'
    });
  });

  it('is negative ("ahead", a surplus) on overlogging -- no clamping', () => {
    expect(computeBacklog({ plannedToDateHours: 10, actualToDateHours: 50 })).toEqual({
      backlogHours: -40,
      status: 'ahead'
    });
  });

  it('is exactly 0 ("on-pace") when planned equals actual', () => {
    expect(computeBacklog({ plannedToDateHours: 5, actualToDateHours: 5 })).toEqual({
      backlogHours: 0,
      status: 'on-pace'
    });
  });
});

describe('computeRequiredDailyRate', () => {
  it('is Infinity when the exam date is in the past and hours are still owed', () => {
    const tomorrow = '2026-02-16';
    const examDate = '2026-01-31'; // already past relative to tomorrow
    const daily = computeDailyAvailability({
      startDate: tomorrow,
      endDate: examDate,
      availabilityMap: UNEVEN_AVAILABILITY,
      blackoutDates: []
    });
    const result = computeRequiredDailyRate({
      totalTargetHours: 100,
      actualToDateHours: 20,
      tomorrow,
      examDate,
      dailyAvailability: daily
    });
    expect(result.remainingAvailableDays).toBe(0);
    expect(result.remainingHoursNeeded).toBe(80);
    expect(result.requiredDailyRateHours).toBe(Infinity);
  });

  it('is 0 when nothing is left to do, regardless of remaining days', () => {
    const tomorrow = '2026-01-06';
    const examDate = '2026-01-11';
    const daily = computeDailyAvailability({
      startDate: tomorrow,
      endDate: examDate,
      availabilityMap: UNEVEN_AVAILABILITY,
      blackoutDates: []
    });
    const result = computeRequiredDailyRate({
      totalTargetHours: 50,
      actualToDateHours: 60,
      tomorrow,
      examDate,
      dailyAvailability: daily
    });
    expect(result.remainingHoursNeeded).toBe(0);
    expect(result.requiredDailyRateHours).toBe(0);
  });

  it('is Infinity when hours are owed but every remaining day has zero capacity', () => {
    const tomorrow = '2026-01-06';
    const examDate = '2026-01-11';
    const daily = computeDailyAvailability({
      startDate: tomorrow,
      endDate: examDate,
      availabilityMap: ZERO_AVAILABILITY,
      blackoutDates: []
    });
    const result = computeRequiredDailyRate({
      totalTargetHours: 100,
      actualToDateHours: 10,
      tomorrow,
      examDate,
      dailyAvailability: daily
    });
    expect(result.remainingAvailableDays).toBe(0);
    expect(result.requiredDailyRateHours).toBe(Infinity);
  });
});

describe('isOffTrack', () => {
  it('is NOT off-track when the required rate exactly equals max_daily_hours (inclusive boundary)', () => {
    expect(isOffTrack({ requiredDailyRateHours: 6, maxDailyHours: 6 })).toBe(false);
  });

  it('is off-track when the required rate strictly exceeds max_daily_hours', () => {
    expect(isOffTrack({ requiredDailyRateHours: 6.01, maxDailyHours: 6 })).toBe(true);
  });
});

describe('solveExtendedExamDate', () => {
  it('finds the earliest new exam date whose recomputed rate is <= maxDailyHours', () => {
    const result = solveExtendedExamDate({
      totalTargetHours: 100,
      actualToDateHours: 0,
      tomorrow: '2026-01-01',
      examDate: '2026-01-10', // 10 uniform days -> rate 10, off track at max 6
      availabilityMap: UNIFORM_AVAILABILITY,
      blackoutDates: [],
      maxDailyHours: 6
    });
    expect(result).not.toBeNull();
    expect(result.newExamDate).toBe('2026-01-17'); // 17 days needed: ceil-ish search finds first <=6
    expect(result.requiredDailyRateHours).toBeLessThanOrEqual(6);
    expect(result.requiredDailyRateHours).toBeCloseTo(100 / 17, 6);
  });

  it('returns null when availability is zero forever (unreachable within the search limit)', () => {
    const result = solveExtendedExamDate({
      totalTargetHours: 100,
      actualToDateHours: 0,
      tomorrow: '2026-01-01',
      examDate: '2026-01-10',
      availabilityMap: ZERO_AVAILABILITY,
      blackoutDates: [],
      maxDailyHours: 6,
      searchLimitDays: 30
    });
    expect(result).toBeNull();
  });

  it('returns null when there is nothing left to fix', () => {
    const result = solveExtendedExamDate({
      totalTargetHours: 50,
      actualToDateHours: 50,
      tomorrow: '2026-01-01',
      examDate: '2026-01-10',
      availabilityMap: UNIFORM_AVAILABILITY,
      blackoutDates: [],
      maxDailyHours: 6
    });
    expect(result).toBeNull();
  });
});

describe('solveAvailabilityIncrease', () => {
  it('activating one previously-zero weekday (Sunday) achieves feasibility', () => {
    // tomorrow=2026-01-04 (Sun) .. examDate=2026-01-18 (Sun): 15 days, 3 Sundays, 2 Saturdays,
    // 10 weekdays (2h each -> currentDays=10). Need 13 days; Sunday alone (occurs 3x) suffices.
    const result = solveAvailabilityIncrease({
      totalTargetHours: 78,
      actualToDateHours: 0,
      tomorrow: '2026-01-04',
      examDate: '2026-01-18',
      availabilityMap: WEEKDAYS_ONLY_AVAILABILITY,
      blackoutDates: [],
      maxDailyHours: 6
    });
    expect(result.feasible).toBe(true);
    expect(result.weekdaysToActivate).toEqual([0]); // Sunday only
    expect(result.daysGained).toBe(3);
    expect(result.resultingRequiredDailyRateHours).toBe(6); // 78 / 13
  });

  it('is infeasible when every weekday already has availability', () => {
    const result = solveAvailabilityIncrease({
      totalTargetHours: 1000,
      actualToDateHours: 0,
      tomorrow: '2026-01-05',
      examDate: '2026-01-11', // 7 days, all active under UNEVEN_AVAILABILITY
      availabilityMap: UNEVEN_AVAILABILITY,
      blackoutDates: [],
      maxDailyHours: 6
    });
    expect(result.feasible).toBe(false);
    expect(result.weekdaysToActivate).toEqual([]);
  });
});

describe('solveTargetCut', () => {
  it('computes a reduced target whose required rate lands exactly at maxDailyHours', () => {
    const tomorrow = '2026-01-05';
    const examDate = '2026-01-11'; // 7 days, all active
    const result = solveTargetCut({
      totalTargetHours: 80,
      actualToDateHours: 10,
      tomorrow,
      examDate,
      availabilityMap: UNEVEN_AVAILABILITY,
      blackoutDates: [],
      maxDailyHours: 6
    });
    expect(result.reducedTargetHours).toBe(52); // 10 + 6*7
    expect(result.cutHours).toBe(28); // 80 - 52

    const daily = computeDailyAvailability({
      startDate: tomorrow,
      endDate: examDate,
      availabilityMap: UNEVEN_AVAILABILITY,
      blackoutDates: []
    });
    const recomputed = computeRequiredDailyRate({
      totalTargetHours: result.reducedTargetHours,
      actualToDateHours: 10,
      tomorrow,
      examDate,
      dailyAvailability: daily
    });
    expect(recomputed.requiredDailyRateHours).toBe(6);
  });
});

describe('computePacingSummary', () => {
  it('handles a degenerate goal (start_date after exam_date) without throwing or producing NaN', () => {
    const result = computePacingSummary({
      targetHours: 100,
      sessions: [],
      startDate: '2026-02-01',
      examDate: '2026-01-01',
      today: '2026-01-15',
      availabilityMap: UNEVEN_AVAILABILITY,
      blackoutDates: [],
      maxDailyHours: 6
    });
    expect(result.isDegenerate).toBe(true);
    for (const key of [
      'plannedToDateHours',
      'totalAvailableHours',
      'availableToDateHours',
      'actualToDateHours',
      'backlogHours',
      'requiredDailyRateHours',
      'remainingHoursNeeded',
      'remainingAvailableDays'
    ]) {
      expect(Number.isNaN(result[key])).toBe(false);
    }
    expect(result.remediation).toBeNull();
  });

  it('reflects only pre-start sessions in backlog when today is before start_date', () => {
    const result = computePacingSummary({
      targetHours: 50,
      sessions: [{ session_date: '2026-01-20', minutes: 120 }], // 2h, logged before start_date
      startDate: '2026-03-01',
      examDate: '2026-03-31',
      today: '2026-02-01',
      availabilityMap: UNEVEN_AVAILABILITY,
      blackoutDates: [],
      maxDailyHours: 6
    });
    expect(result.plannedToDateHours).toBe(0);
    expect(result.actualToDateHours).toBe(2);
    expect(result.backlogHours).toBe(-2);
    expect(result.backlogStatus).toBe('ahead');
  });

  it('never looks at weight_pct / subject weighting -- pure function of the given targetHours', () => {
    const args = {
      targetHours: 12.2,
      sessions: [{ session_date: '2026-01-05', minutes: 60 }],
      startDate: '2026-01-01',
      examDate: '2026-06-01',
      today: '2026-01-10',
      availabilityMap: UNEVEN_AVAILABILITY,
      blackoutDates: [],
      maxDailyHours: 6
    };
    const first = computePacingSummary(args);
    const second = computePacingSummary({ ...args }); // fresh object, same values
    expect(second).toEqual(first); // deterministic, no hidden weight-sum dependency
    expect(Object.keys(first)).not.toContain('weight_pct');
  });

  it('shares the same calendar between a goal-level and a subject-level call', () => {
    const shared = {
      startDate: '2026-01-01',
      examDate: '2026-06-01',
      today: '2026-02-01',
      availabilityMap: UNEVEN_AVAILABILITY,
      blackoutDates: [],
      maxDailyHours: 6
    };
    const goalLevel = computePacingSummary({
      ...shared,
      targetHours: 900,
      sessions: [{ session_date: '2026-01-15', minutes: 6000 }]
    });
    const subjectLevel = computePacingSummary({
      ...shared,
      targetHours: 110, // e.g. a 12.2% slice of 900
      sessions: [{ session_date: '2026-01-15', minutes: 600 }]
    });
    expect(subjectLevel.remainingAvailableDays).toBe(goalLevel.remainingAvailableDays);
    expect(subjectLevel.totalAvailableHours).toBe(goalLevel.totalAvailableHours);
    expect(subjectLevel.backlogHours).not.toBe(goalLevel.backlogHours);
    expect(subjectLevel.requiredDailyRateHours).not.toBe(goalLevel.requiredDailyRateHours);
  });
});

describe('DST-boundary regression guard', () => {
  it('computes correct day/hour counts across the US DST fallback week (spans 2026-11-01)', () => {
    const daily = computeDailyAvailability({
      startDate: '2026-10-29', // Thu
      endDate: '2026-11-04', // Wed
      availabilityMap: UNEVEN_AVAILABILITY,
      blackoutDates: []
    });
    expect(daily).toHaveLength(7);
    // Thu,Fri,Sat,Sun,Mon,Tue,Wed = 2,2,4,4,2,2,2 = 18
    expect(sumAvailableHours(daily, '2026-10-29', '2026-11-04')).toBe(18);
    expect(countAvailableDays(daily, '2026-10-29', '2026-11-04')).toBe(7);
  });
});
