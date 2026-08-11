import { db } from '../db/connection.js';
import { todayLocalISO } from '../lib/dateUtils.js';
import { computePacingSummary } from '../lib/pacing.js';
import { getEffectiveTargetHours, getWeightSummary } from './subjectsService.js';

// Availability and blackout dates are global (shared across all goals) -- they represent the
// user's real-life calendar, not a per-goal property.
function loadCalendar() {
  const availabilityRows = db.prepare('SELECT weekday, available_hours FROM availability').all();
  const availabilityMap = {};
  for (const row of availabilityRows) availabilityMap[row.weekday] = row.available_hours;

  const blackoutRows = db.prepare('SELECT date FROM blackout_dates').all();
  const blackoutDates = new Set(blackoutRows.map((r) => r.date));

  return { availabilityMap, blackoutDates };
}

/**
 * Builds the full pacing summary for a goal: goal-level pacing plus one summary per subject,
 * all sharing the same calendar (Requirement 6). Returns null if the goal doesn't exist.
 */
export function getPacingSummary(goalId) {
  const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(goalId);
  if (!goal) return null;

  const subjects = db
    .prepare('SELECT * FROM subjects WHERE goal_id = ? ORDER BY sort_order, id')
    .all(goalId);
  const { availabilityMap, blackoutDates } = loadCalendar();
  const today = todayLocalISO();

  const subjectIds = subjects.map((s) => s.id);
  const allSessions = subjectIds.length
    ? db
        .prepare(
          `SELECT * FROM sessions WHERE subject_id IN (${subjectIds.map(() => '?').join(',')})`
        )
        .all(...subjectIds)
    : [];

  const goalPacing = computePacingSummary({
    targetHours: goal.total_target_hours,
    sessions: allSessions,
    startDate: goal.start_date,
    examDate: goal.exam_date,
    today,
    availabilityMap,
    blackoutDates,
    maxDailyHours: goal.max_daily_hours
  });

  const subjectsPacing = subjects.map((subject) => {
    const targetHours = getEffectiveTargetHours(subject, goal);
    const sessions = allSessions.filter((s) => s.subject_id === subject.id);
    const pacing = computePacingSummary({
      targetHours,
      sessions,
      startDate: goal.start_date,
      examDate: goal.exam_date,
      today,
      availabilityMap,
      blackoutDates,
      maxDailyHours: goal.max_daily_hours
    });
    return {
      id: subject.id,
      name: subject.name,
      weight_pct: subject.weight_pct,
      target_hours_override: subject.target_hours_override,
      targetHours,
      ...pacing
    };
  });

  const { weightSum, weightSumOk } = getWeightSummary(subjects);

  return {
    goal: {
      id: goal.id,
      name: goal.name,
      exam_date: goal.exam_date,
      start_date: goal.start_date,
      total_target_hours: goal.total_target_hours,
      max_daily_hours: goal.max_daily_hours,
      ...goalPacing
    },
    subjects: subjectsPacing,
    weightSum,
    weightSumWarning: !weightSumOk
  };
}
