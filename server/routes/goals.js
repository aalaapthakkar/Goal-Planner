import { Router } from 'express';
import { db } from '../db/connection.js';
import { seedCfaSubjects } from '../db/seed.js';
import { isValidISODate } from '../lib/dateUtils.js';

const router = Router();

function getMeta(key) {
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get(key);
  return row ? row.value : null;
}

function setMeta(key, value) {
  db.prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(
    key,
    value
  );
}

function resolveActiveGoal() {
  const activeId = getMeta('active_goal_id');
  if (activeId) {
    const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(Number(activeId));
    if (goal) return goal;
  }
  // Fall back to the most recently created goal (handles unset or stale/deleted active id).
  const fallback = db.prepare('SELECT * FROM goals ORDER BY id DESC LIMIT 1').get();
  if (fallback) setMeta('active_goal_id', String(fallback.id));
  return fallback ?? null;
}

function validateGoalBody(body, { partial = false } = {}) {
  const errors = [];
  if (!partial || body.name !== undefined) {
    if (!body.name || typeof body.name !== 'string') errors.push('name is required');
  }
  if (!partial || body.exam_date !== undefined) {
    if (!isValidISODate(body.exam_date)) errors.push('exam_date must be a valid YYYY-MM-DD date');
  }
  if (!partial || body.start_date !== undefined) {
    if (!isValidISODate(body.start_date)) errors.push('start_date must be a valid YYYY-MM-DD date');
  }
  if (!partial || body.total_target_hours !== undefined) {
    if (typeof body.total_target_hours !== 'number' || body.total_target_hours < 0) {
      errors.push('total_target_hours must be a non-negative number');
    }
  }
  if (body.max_daily_hours !== undefined) {
    if (typeof body.max_daily_hours !== 'number' || body.max_daily_hours <= 0) {
      errors.push('max_daily_hours must be a positive number');
    }
  }
  return errors;
}

router.get('/', (req, res) => {
  const goals = db.prepare('SELECT * FROM goals ORDER BY created_at DESC').all();
  res.json({ goals });
});

router.get('/active', (req, res) => {
  const goal = resolveActiveGoal();
  res.json({ goal });
});

router.put('/active', (req, res) => {
  const { goal_id: goalId } = req.body;
  const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(goalId);
  if (!goal) return res.status(404).json({ error: 'Goal not found' });
  setMeta('active_goal_id', String(goal.id));
  res.json({ goal });
});

router.post('/', (req, res) => {
  const errors = validateGoalBody(req.body);
  if (errors.length) return res.status(400).json({ errors });

  const { name, exam_date, start_date, total_target_hours, max_daily_hours = 6 } = req.body;
  const insertGoal = db.prepare(
    'INSERT INTO goals (name, exam_date, start_date, total_target_hours, max_daily_hours) VALUES (?, ?, ?, ?, ?)'
  );

  const goal = db.transaction(() => {
    const info = insertGoal.run(name, exam_date, start_date, total_target_hours, max_daily_hours);
    seedCfaSubjects(db, info.lastInsertRowid);
    const created = db.prepare('SELECT * FROM goals WHERE id = ?').get(info.lastInsertRowid);
    if (!getMeta('active_goal_id')) {
      setMeta('active_goal_id', String(created.id));
    }
    return created;
  })();

  res.status(201).json({ goal });
});

router.put('/:id', (req, res) => {
  const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(req.params.id);
  if (!goal) return res.status(404).json({ error: 'Goal not found' });

  const errors = validateGoalBody(req.body, { partial: true });
  if (errors.length) return res.status(400).json({ errors });

  const merged = { ...goal, ...req.body };
  db.prepare(
    `UPDATE goals SET name = ?, exam_date = ?, start_date = ?, total_target_hours = ?, max_daily_hours = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
     WHERE id = ?`
  ).run(
    merged.name,
    merged.exam_date,
    merged.start_date,
    merged.total_target_hours,
    merged.max_daily_hours,
    goal.id
  );

  res.json({ goal: db.prepare('SELECT * FROM goals WHERE id = ?').get(goal.id) });
});

router.delete('/:id', (req, res) => {
  const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(req.params.id);
  if (!goal) return res.status(404).json({ error: 'Goal not found' });

  const wasActive = getMeta('active_goal_id') === String(goal.id);
  db.prepare('DELETE FROM goals WHERE id = ?').run(goal.id); // cascades subjects -> sessions

  if (wasActive) {
    const fallback = db.prepare('SELECT * FROM goals ORDER BY id DESC LIMIT 1').get();
    setMeta('active_goal_id', fallback ? String(fallback.id) : '');
  }

  res.status(204).end();
});

export default router;
