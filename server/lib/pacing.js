// Pure pacing engine. No DB, no Express -- every function here takes plain JS data in and
// returns plain JS data out, which is what makes it trivially unit-testable and safe to share
// between goal-level and per-subject calculations (see computePacingSummary).
//
// Shared shapes used throughout:
//   availabilityMap: Record<weekday(0-6), hoursPerDay>   -- weekly template, 0=Sun..6=Sat
//   blackoutDates:   Set<string> | string[]              -- 'YYYY-MM-DD' dates with 0 hours, always
//                                                            overriding the weekday template
//   sessions:        Array<{ session_date: string, minutes: number }>

import { compareISODates, addDaysISO, enumerateDatesISO, getWeekdayISO } from './dateUtils.js';

/**
 * Requirement 1: per-day available capacity across [startDate, endDate].
 * Blackout ALWAYS overrides the weekday template (forces 0 hours), regardless of what the
 * template says for that weekday.
 * @returns {Array<{date:string, weekday:number, availableHours:number, isBlackout:boolean}>}
 *   [] if startDate > endDate.
 */
export function computeDailyAvailability({ startDate, endDate, availabilityMap, blackoutDates }) {
  if (compareISODates(startDate, endDate) > 0) return [];
  const blackoutSet = blackoutDates instanceof Set ? blackoutDates : new Set(blackoutDates ?? []);
  return enumerateDatesISO(startDate, endDate).map((date) => {
    const weekday = getWeekdayISO(date);
    const isBlackout = blackoutSet.has(date);
    const availableHours = isBlackout ? 0 : availabilityMap[weekday] ?? 0;
    return { date, weekday, availableHours, isBlackout };
  });
}

/** Sum of availableHours for entries whose date falls within [fromDate, toDate] inclusive. */
export function sumAvailableHours(dailyAvailability, fromDate, toDate) {
  let sum = 0;
  for (const entry of dailyAvailability) {
    if (compareISODates(entry.date, fromDate) >= 0 && compareISODates(entry.date, toDate) <= 0) {
      sum += entry.availableHours;
    }
  }
  return sum;
}

/** Count of entries with availableHours > 0 whose date falls within [fromDate, toDate] inclusive. */
export function countAvailableDays(dailyAvailability, fromDate, toDate) {
  let count = 0;
  for (const entry of dailyAvailability) {
    if (
      entry.availableHours > 0 &&
      compareISODates(entry.date, fromDate) >= 0 &&
      compareISODates(entry.date, toDate) <= 0
    ) {
      count++;
    }
  }
  return count;
}

/**
 * Requirement 2: planned cumulative-to-date, hour-weighted (NOT an even per-day split).
 *   plannedToDateHours = totalTargetHours x (hours[start..today] / hours[start..exam])
 * `dailyAvailability` must already cover [startDate, examDate] (or a superset).
 *   today < startDate            -> 0 (goal hasn't started)
 *   today > examDate             -> totalTargetHours (fully due)
 *   totalAvailableHours === 0    -> totalTargetHours (today is already >= startDate here --
 *       the < startDate case returned above -- so with zero capacity ever accruing, the whole
 *       target is immediately due; this is what correctly drives backlog/off-track signals in
 *       the zero-capacity edge case instead of a NaN from 0/0)
 *   else                         -> the ratio above
 */
export function computePlannedToDate({ totalTargetHours, startDate, examDate, today, dailyAvailability }) {
  const totalAvailableHours = sumAvailableHours(dailyAvailability, startDate, examDate);

  if (compareISODates(today, startDate) < 0) {
    return { plannedToDateHours: 0, totalAvailableHours, availableToDateHours: 0 };
  }

  if (compareISODates(today, examDate) > 0) {
    return { plannedToDateHours: totalTargetHours, totalAvailableHours, availableToDateHours: totalAvailableHours };
  }

  const availableToDateHours = sumAvailableHours(dailyAvailability, startDate, today);

  if (totalAvailableHours === 0) {
    return { plannedToDateHours: totalTargetHours, totalAvailableHours, availableToDateHours };
  }

  return {
    plannedToDateHours: totalTargetHours * (availableToDateHours / totalAvailableHours),
    totalAvailableHours,
    availableToDateHours
  };
}

/**
 * Requirement 3 input: hours logged with session_date <= asOfDate.
 * No lower bound -- sessions logged before start_date still count as real hours banked.
 */
export function computeActualToDate({ sessions, asOfDate }) {
  let minutes = 0;
  for (const session of sessions) {
    if (compareISODates(session.session_date, asOfDate) <= 0) {
      minutes += session.minutes;
    }
  }
  return minutes / 60;
}

/**
 * Requirement 3: backlogHours = plannedToDateHours - actualToDateHours.
 * POSITIVE = behind (deficit, bad). NEGATIVE = ahead (surplus, good). Always paired with an
 * explicit status label so a negative number is never read as bad news in the UI.
 */
export function computeBacklog({ plannedToDateHours, actualToDateHours }) {
  const backlogHours = plannedToDateHours - actualToDateHours;
  const status = backlogHours > 0 ? 'behind' : backlogHours < 0 ? 'ahead' : 'on-pace';
  return { backlogHours, status };
}

/**
 * Requirement 4: required daily rate over the window [tomorrow, examDate] -- NOT [today, examDate].
 * "today" is already fully folded into the to-date planned/actual buckets above, so starting the
 * remaining window at tomorrow avoids double-counting today across both buckets.
 * `dailyAvailability` must already cover [tomorrow, examDate] (or a superset).
 *   remainingAvailableDays = COUNT (not hour-sum) of non-blackout days with hours>0 in the window --
 *     deliberately a day count, since required rate is compared directly against max_daily_hours,
 *     which is also a per-study-day ceiling.
 *   remainingHoursNeeded = max(totalTargetHours - actualToDateHours, 0)
 *   requiredDailyRateHours = 0 if nothing needed; Infinity if needed but zero days available;
 *     else remainingHoursNeeded / remainingAvailableDays.
 */
export function computeRequiredDailyRate({ totalTargetHours, actualToDateHours, tomorrow, examDate, dailyAvailability }) {
  const remainingHoursNeeded = Math.max(totalTargetHours - actualToDateHours, 0);
  const remainingAvailableDays = countAvailableDays(dailyAvailability, tomorrow, examDate);

  let requiredDailyRateHours;
  if (remainingHoursNeeded === 0) {
    requiredDailyRateHours = 0;
  } else if (remainingAvailableDays === 0) {
    requiredDailyRateHours = Infinity;
  } else {
    requiredDailyRateHours = remainingHoursNeeded / remainingAvailableDays;
  }

  return { requiredDailyRateHours, remainingHoursNeeded, remainingAvailableDays };
}

/** Requirement 5a: off-track iff required rate strictly exceeds the max. Exactly-equal is on-track. */
export function isOffTrack({ requiredDailyRateHours, maxDailyHours }) {
  return requiredDailyRateHours > maxDailyHours;
}

/**
 * Requirement 5b-i "extend the exam date": day-by-day forward scan from
 * max(tomorrow, examDate+1) for the earliest date at which the recomputed required rate is
 * <= maxDailyHours, holding target/actual/availability fixed. The day count only ever grows as
 * the candidate date moves forward, so the first date found is optimal.
 * @returns {{newExamDate:string, requiredDailyRateHours:number} | null} null if there's nothing
 *   to fix (remainingHoursNeeded === 0), or no date within searchLimitDays resolves it (e.g. an
 *   all-zero availability template that can never gain a study day).
 */
export function solveExtendedExamDate({
  totalTargetHours,
  actualToDateHours,
  tomorrow,
  examDate,
  availabilityMap,
  blackoutDates,
  maxDailyHours,
  searchLimitDays = 3650
}) {
  const remainingHoursNeeded = Math.max(totalTargetHours - actualToDateHours, 0);
  if (remainingHoursNeeded === 0) return null;

  const dayAfterExam = addDaysISO(examDate, 1);
  const searchStart = compareISODates(tomorrow, dayAfterExam) > 0 ? tomorrow : dayAfterExam;
  const searchEnd = addDaysISO(searchStart, searchLimitDays);

  const extendedDaily = computeDailyAvailability({
    startDate: tomorrow,
    endDate: searchEnd,
    availabilityMap,
    blackoutDates
  });

  for (
    let candidate = searchStart;
    compareISODates(candidate, searchEnd) <= 0;
    candidate = addDaysISO(candidate, 1)
  ) {
    const days = countAvailableDays(extendedDaily, tomorrow, candidate);
    if (days === 0) continue;
    const rate = remainingHoursNeeded / days;
    if (rate <= maxDailyHours) {
      return { newExamDate: candidate, requiredDailyRateHours: rate };
    }
  }
  return null;
}

/**
 * Requirement 5b-ii "raise availability": remainingAvailableDays is a day COUNT, so adding hours
 * to an already-active weekday does nothing to the metric -- only activating a currently-zero-hour
 * weekday (turning a non-study day into a study day) increases the count. Ranks zero-hour weekdays
 * by how many times they occur (excluding individually blacked-out dates, which stay 0 regardless)
 * in [tomorrow, examDate], descending, and greedily activates until the target day count is met or
 * candidates are exhausted.
 * @returns {{feasible:boolean, weekdaysToActivate:number[], daysGained:number, resultingRequiredDailyRateHours:number}}
 *   feasible:false means raising availability ALONE cannot fix it (every weekday already active) --
 *   point the user at the extend-date / cut-target scenarios instead.
 */
export function solveAvailabilityIncrease({
  totalTargetHours,
  actualToDateHours,
  tomorrow,
  examDate,
  availabilityMap,
  blackoutDates,
  maxDailyHours
}) {
  const remainingHoursNeeded = Math.max(totalTargetHours - actualToDateHours, 0);
  const dailyAvailability = computeDailyAvailability({
    startDate: tomorrow,
    endDate: examDate,
    availabilityMap,
    blackoutDates
  });
  const currentDays = countAvailableDays(dailyAvailability, tomorrow, examDate);

  if (remainingHoursNeeded === 0) {
    return { feasible: true, weekdaysToActivate: [], daysGained: 0, resultingRequiredDailyRateHours: 0 };
  }

  const neededDays = Math.ceil(remainingHoursNeeded / maxDailyHours);

  if (currentDays >= neededDays) {
    return {
      feasible: true,
      weekdaysToActivate: [],
      daysGained: 0,
      resultingRequiredDailyRateHours: remainingHoursNeeded / currentDays
    };
  }

  const occurrenceCounts = {};
  for (const entry of dailyAvailability) {
    const templateHours = availabilityMap[entry.weekday] ?? 0;
    if (templateHours === 0 && !entry.isBlackout) {
      occurrenceCounts[entry.weekday] = (occurrenceCounts[entry.weekday] ?? 0) + 1;
    }
  }

  const candidateWeekdays = Object.keys(occurrenceCounts)
    .map(Number)
    .sort((a, b) => occurrenceCounts[b] - occurrenceCounts[a]);

  const weekdaysToActivate = [];
  let daysGained = 0;
  for (const weekday of candidateWeekdays) {
    if (currentDays + daysGained >= neededDays) break;
    weekdaysToActivate.push(weekday);
    daysGained += occurrenceCounts[weekday];
  }

  const resultingDays = currentDays + daysGained;
  const feasible = resultingDays >= neededDays;

  return {
    feasible,
    weekdaysToActivate,
    daysGained,
    resultingRequiredDailyRateHours: resultingDays > 0 ? remainingHoursNeeded / resultingDays : Infinity
  };
}

/**
 * Requirement 5b-iii "cut the target": algebraic solve holding availability/dates fixed.
 *   reducedTargetHours = actualToDateHours + maxDailyHours x remainingAvailableDays
 *   cutHours = max(totalTargetHours - reducedTargetHours, 0)
 */
export function solveTargetCut({
  totalTargetHours,
  actualToDateHours,
  tomorrow,
  examDate,
  availabilityMap,
  blackoutDates,
  maxDailyHours
}) {
  const dailyAvailability = computeDailyAvailability({
    startDate: tomorrow,
    endDate: examDate,
    availabilityMap,
    blackoutDates
  });
  const remainingAvailableDays = countAvailableDays(dailyAvailability, tomorrow, examDate);
  const reducedTargetHours = actualToDateHours + maxDailyHours * remainingAvailableDays;
  const cutHours = Math.max(totalTargetHours - reducedTargetHours, 0);
  return { reducedTargetHours, cutHours };
}

/**
 * Requirement 6: single entry point shared by goal-level and per-subject pacing -- same shape,
 * different targetHours/sessions, SAME availabilityMap/blackoutDates (subjects don't have their
 * own calendar; availability is a property of the person's real-life schedule, not the topic).
 * Never looks at weight_pct -- it receives an already-resolved targetHours. Weight-sum validation
 * is deliberately not a pacing.js concern.
 */
export function computePacingSummary({
  targetHours,
  sessions,
  startDate,
  examDate,
  today,
  availabilityMap,
  blackoutDates,
  maxDailyHours
}) {
  const isDegenerate = compareISODates(startDate, examDate) > 0;
  const tomorrow = addDaysISO(today, 1);

  const toDateDailyAvailability = computeDailyAvailability({
    startDate,
    endDate: examDate,
    availabilityMap,
    blackoutDates
  });

  const { plannedToDateHours, totalAvailableHours, availableToDateHours } = computePlannedToDate({
    totalTargetHours: targetHours,
    startDate,
    examDate,
    today,
    dailyAvailability: toDateDailyAvailability
  });

  const actualToDateHours = computeActualToDate({ sessions, asOfDate: today });
  const { backlogHours, status: backlogStatus } = computeBacklog({ plannedToDateHours, actualToDateHours });

  const remainingDailyAvailability = computeDailyAvailability({
    startDate: tomorrow,
    endDate: examDate,
    availabilityMap,
    blackoutDates
  });
  const { requiredDailyRateHours, remainingHoursNeeded, remainingAvailableDays } = computeRequiredDailyRate({
    totalTargetHours: targetHours,
    actualToDateHours,
    tomorrow,
    examDate,
    dailyAvailability: remainingDailyAvailability
  });

  const offTrack = isOffTrack({ requiredDailyRateHours, maxDailyHours });

  // Remediation scenarios are only meaningful when the goal's own dates aren't already broken --
  // a degenerate goal needs its dates fixed first, not a "raise availability" suggestion.
  let remediation = null;
  if (offTrack && !isDegenerate) {
    remediation = {
      extendExamDate: solveExtendedExamDate({
        totalTargetHours: targetHours,
        actualToDateHours,
        tomorrow,
        examDate,
        availabilityMap,
        blackoutDates,
        maxDailyHours
      }),
      raiseAvailability: solveAvailabilityIncrease({
        totalTargetHours: targetHours,
        actualToDateHours,
        tomorrow,
        examDate,
        availabilityMap,
        blackoutDates,
        maxDailyHours
      }),
      cutTarget: solveTargetCut({
        totalTargetHours: targetHours,
        actualToDateHours,
        tomorrow,
        examDate,
        availabilityMap,
        blackoutDates,
        maxDailyHours
      })
    };
  }

  return {
    today,
    tomorrow,
    isDegenerate,
    plannedToDateHours,
    totalAvailableHours,
    availableToDateHours,
    actualToDateHours,
    backlogHours,
    backlogStatus,
    requiredDailyRateHours,
    remainingHoursNeeded,
    remainingAvailableDays,
    offTrack,
    remediation
  };
}
