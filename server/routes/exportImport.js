import { Router } from 'express';
import { db } from '../db/connection.js';
import { isValidISODate } from '../lib/dateUtils.js';
import {
  sessionsToCsv,
  parseSessionsCsv,
  subjectsToCsv,
  parseSubjectsCsv,
  goalToCsv,
  parseGoalCsv,
  availabilityToCsv,
  parseAvailabilityCsv,
  blackoutDatesToCsv,
  parseBlackoutDatesCsv
} from '../services/csvService.js';

const router = Router();

function requireGoal(req, res) {
  const goalId = Number(req.query.goal_id);
  const goal = goalId ? db.prepare('SELECT * FROM goals WHERE id = ?').get(goalId) : null;
  if (!goal) {
    res.status(400).json({ error: 'goal_id query param must reference an existing goal' });
    return null;
  }
  return goal;
}

function sendCsv(res, filename, csvText) {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csvText);
}

// --- sessions ---

router.get('/export/sessions.csv', (req, res) => {
  const goal = requireGoal(req, res);
  if (!goal) return;
  const subjects = db.prepare('SELECT id, name FROM subjects WHERE goal_id = ?').all(goal.id);
  const subjectNameById = new Map(subjects.map((s) => [s.id, s.name]));
  const subjectIds = subjects.map((s) => s.id);
  const sessions = subjectIds.length
    ? db
        .prepare(`SELECT * FROM sessions WHERE subject_id IN (${subjectIds.map(() => '?').join(',')})`)
        .all(...subjectIds)
    : [];
  sendCsv(res, 'sessions.csv', sessionsToCsv(sessions, subjectNameById));
});

router.post('/import/sessions', (req, res) => {
  const goal = requireGoal(req, res);
  if (!goal) return;

  const rows = parseSessionsCsv(req.body);
  const subjects = db.prepare('SELECT id, name FROM subjects WHERE goal_id = ?').all(goal.id);
  const subjectIdByLowerName = new Map(subjects.map((s) => [s.name.toLowerCase(), s.id]));

  const insert = db.prepare(
    'INSERT INTO sessions (subject_id, session_date, minutes, focus_rating, notes) VALUES (?, ?, ?, ?, ?)'
  );
  const update = db.prepare(
    `UPDATE sessions SET subject_id = ?, session_date = ?, minutes = ?, focus_rating = ?, notes = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
     WHERE id = ?`
  );

  let imported = 0;
  let updated = 0;
  const skipped = [];

  db.transaction(() => {
    rows.forEach((row, index) => {
      const subjectId = subjectIdByLowerName.get(String(row.subject_name ?? '').trim().toLowerCase());
      const minutes = Number(row.minutes);
      const focusRating = row.focus_rating ? Number(row.focus_rating) : null;

      if (!subjectId) {
        skipped.push({ row: index + 1, reason: `Unknown subject "${row.subject_name}"` });
        return;
      }
      if (!isValidISODate(row.session_date)) {
        skipped.push({ row: index + 1, reason: `Invalid session_date "${row.session_date}"` });
        return;
      }
      if (!Number.isFinite(minutes) || minutes <= 0) {
        skipped.push({ row: index + 1, reason: `Invalid minutes "${row.minutes}"` });
        return;
      }

      if (row.id) {
        const existing = db.prepare('SELECT id FROM sessions WHERE id = ?').get(Number(row.id));
        if (!existing) {
          skipped.push({ row: index + 1, reason: `Session id ${row.id} not found` });
          return;
        }
        update.run(subjectId, row.session_date, minutes, focusRating, row.notes || null, Number(row.id));
        updated++;
      } else {
        insert.run(subjectId, row.session_date, minutes, focusRating, row.notes || null);
        imported++;
      }
    });
  })();

  res.json({ imported, updated, skipped });
});

// --- subjects (update-only by name match) ---

router.get('/export/subjects.csv', (req, res) => {
  const goal = requireGoal(req, res);
  if (!goal) return;
  const subjects = db.prepare('SELECT * FROM subjects WHERE goal_id = ? ORDER BY sort_order, id').all(goal.id);
  sendCsv(res, 'subjects.csv', subjectsToCsv(subjects));
});

router.post('/import/subjects', (req, res) => {
  const goal = requireGoal(req, res);
  if (!goal) return;

  const rows = parseSubjectsCsv(req.body);
  const subjects = db.prepare('SELECT * FROM subjects WHERE goal_id = ?').all(goal.id);
  const subjectByLowerName = new Map(subjects.map((s) => [s.name.toLowerCase(), s]));

  const update = db.prepare(
    `UPDATE subjects SET weight_pct = ?, target_hours_override = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
     WHERE id = ?`
  );

  let updated = 0;
  const skipped = [];

  db.transaction(() => {
    rows.forEach((row, index) => {
      const subject = subjectByLowerName.get(String(row.name ?? '').trim().toLowerCase());
      const weightPct = Number(row.weight_pct);

      if (!subject) {
        skipped.push({ row: index + 1, reason: `Unknown subject "${row.name}" (import is update-only)` });
        return;
      }
      if (!Number.isFinite(weightPct) || weightPct < 0 || weightPct > 100) {
        skipped.push({ row: index + 1, reason: `Invalid weight_pct "${row.weight_pct}"` });
        return;
      }

      const override = row.target_hours_override === '' || row.target_hours_override == null
        ? null
        : Number(row.target_hours_override);
      update.run(weightPct, Number.isFinite(override) ? override : null, subject.id);
      updated++;
    });
  })();

  res.json({ imported: 0, updated, skipped });
});

// --- goal (single row) ---

router.get('/export/goal.csv', (req, res) => {
  const goal = requireGoal(req, res);
  if (!goal) return;
  sendCsv(res, 'goal.csv', goalToCsv(goal));
});

router.post('/import/goal', (req, res) => {
  const goal = requireGoal(req, res);
  if (!goal) return;

  const row = parseGoalCsv(req.body);
  if (!row) return res.status(400).json({ error: 'CSV had no data row' });

  const totalTargetHours = Number(row.total_target_hours);
  const maxDailyHours = Number(row.max_daily_hours);

  if (!row.name || !isValidISODate(row.exam_date) || !isValidISODate(row.start_date) || !Number.isFinite(totalTargetHours) || !Number.isFinite(maxDailyHours)) {
    return res.status(400).json({ error: 'goal.csv row is missing or has invalid fields' });
  }

  db.prepare(
    `UPDATE goals SET name = ?, exam_date = ?, start_date = ?, total_target_hours = ?, max_daily_hours = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
     WHERE id = ?`
  ).run(row.name, row.exam_date, row.start_date, totalTargetHours, maxDailyHours, goal.id);

  res.json({ goal: db.prepare('SELECT * FROM goals WHERE id = ?').get(goal.id) });
});

// --- availability (global, exactly 7 rows) ---

router.get('/export/availability.csv', (req, res) => {
  const rows = db.prepare('SELECT weekday, available_hours FROM availability ORDER BY weekday').all();
  sendCsv(res, 'availability.csv', availabilityToCsv(rows));
});

router.post('/import/availability', (req, res) => {
  const rows = parseAvailabilityCsv(req.body);
  if (rows.length !== 7 || rows.some((r) => !Number.isFinite(r.weekday) || !Number.isFinite(r.available_hours))) {
    return res.status(400).json({ error: 'availability.csv must have exactly 7 valid rows (weekday, available_hours)' });
  }

  const upsert = db.prepare(
    'INSERT INTO availability (weekday, available_hours) VALUES (?, ?) ON CONFLICT(weekday) DO UPDATE SET available_hours = excluded.available_hours'
  );
  db.transaction(() => {
    for (const row of rows) upsert.run(row.weekday, row.available_hours);
  })();

  res.json({ availability: db.prepare('SELECT weekday, available_hours FROM availability ORDER BY weekday').all() });
});

// --- blackout dates (global, merge by date) ---

router.get('/export/blackout-dates.csv', (req, res) => {
  const rows = db.prepare('SELECT date, reason FROM blackout_dates ORDER BY date').all();
  sendCsv(res, 'blackout-dates.csv', blackoutDatesToCsv(rows));
});

router.post('/import/blackout-dates', (req, res) => {
  const rows = parseBlackoutDatesCsv(req.body);
  const upsert = db.prepare(
    'INSERT INTO blackout_dates (date, reason) VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET reason = excluded.reason'
  );

  let imported = 0;
  const skipped = [];

  db.transaction(() => {
    rows.forEach((row, index) => {
      if (!isValidISODate(row.date)) {
        skipped.push({ row: index + 1, reason: `Invalid date "${row.date}"` });
        return;
      }
      upsert.run(row.date, row.reason || null);
      imported++;
    });
  })();

  res.json({ imported, skipped });
});

export default router;
