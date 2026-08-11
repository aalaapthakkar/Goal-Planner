import { Router } from 'express';
import { db } from '../db/connection.js';
import { isValidISODate } from '../lib/dateUtils.js';

const router = Router();

function validateSessionBody(body, { partial = false } = {}) {
  const errors = [];
  if (!partial || body.subject_id !== undefined) {
    if (!body.subject_id) errors.push('subject_id is required');
  }
  if (!partial || body.session_date !== undefined) {
    if (!isValidISODate(body.session_date)) errors.push('session_date must be a valid YYYY-MM-DD date');
  }
  if (!partial || body.minutes !== undefined) {
    if (typeof body.minutes !== 'number' || body.minutes <= 0) errors.push('minutes must be a positive number');
  }
  if (body.focus_rating !== undefined && body.focus_rating !== null) {
    if (typeof body.focus_rating !== 'number' || body.focus_rating < 1 || body.focus_rating > 5) {
      errors.push('focus_rating must be between 1 and 5');
    }
  }
  return errors;
}

router.get('/', (req, res) => {
  const { subject_id: subjectId, goal_id: goalId, from, to } = req.query;
  let sql = goalId
    ? 'SELECT sessions.* FROM sessions JOIN subjects ON sessions.subject_id = subjects.id WHERE subjects.goal_id = ?'
    : 'SELECT * FROM sessions WHERE 1=1';
  const params = goalId ? [Number(goalId)] : [];
  if (subjectId) {
    sql += ' AND subject_id = ?';
    params.push(Number(subjectId));
  }
  if (from) {
    sql += ' AND session_date >= ?';
    params.push(from);
  }
  if (to) {
    sql += ' AND session_date <= ?';
    params.push(to);
  }
  sql += ' ORDER BY session_date DESC, id DESC';
  res.json({ sessions: db.prepare(sql).all(...params) });
});

router.post('/', (req, res) => {
  const errors = validateSessionBody(req.body);
  if (errors.length) return res.status(400).json({ errors });

  const { subject_id: subjectId, session_date: sessionDate, minutes, focus_rating: focusRating = null, notes = null } = req.body;
  const info = db
    .prepare(
      'INSERT INTO sessions (subject_id, session_date, minutes, focus_rating, notes) VALUES (?, ?, ?, ?, ?)'
    )
    .run(subjectId, sessionDate, minutes, focusRating, notes);
  res.status(201).json({ session: db.prepare('SELECT * FROM sessions WHERE id = ?').get(info.lastInsertRowid) });
});

router.put('/:id', (req, res) => {
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const errors = validateSessionBody(req.body, { partial: true });
  if (errors.length) return res.status(400).json({ errors });

  const merged = {
    subject_id: req.body.subject_id ?? session.subject_id,
    session_date: req.body.session_date ?? session.session_date,
    minutes: req.body.minutes ?? session.minutes,
    focus_rating: req.body.focus_rating !== undefined ? req.body.focus_rating : session.focus_rating,
    notes: req.body.notes !== undefined ? req.body.notes : session.notes
  };

  db.prepare(
    `UPDATE sessions SET subject_id = ?, session_date = ?, minutes = ?, focus_rating = ?, notes = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
     WHERE id = ?`
  ).run(merged.subject_id, merged.session_date, merged.minutes, merged.focus_rating, merged.notes, session.id);

  res.json({ session: db.prepare('SELECT * FROM sessions WHERE id = ?').get(session.id) });
});

router.delete('/:id', (req, res) => {
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  db.prepare('DELETE FROM sessions WHERE id = ?').run(session.id);
  res.status(204).end();
});

export default router;
