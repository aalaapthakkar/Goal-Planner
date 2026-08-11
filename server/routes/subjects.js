import { Router } from 'express';
import { db } from '../db/connection.js';
import { withEffectiveTargetHours, getWeightSummary } from '../services/subjectsService.js';

const router = Router();

router.get('/', (req, res) => {
  const goalId = Number(req.query.goal_id);
  if (!goalId) return res.status(400).json({ error: 'goal_id query param is required' });

  const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(goalId);
  if (!goal) return res.status(404).json({ error: 'Goal not found' });

  const subjects = db
    .prepare('SELECT * FROM subjects WHERE goal_id = ? ORDER BY sort_order, id')
    .all(goalId);
  const { weightSum, weightSumOk } = getWeightSummary(subjects);

  res.json({ subjects: withEffectiveTargetHours(subjects, goal), weightSum, weightSumOk });
});

router.post('/', (req, res) => {
  const { goal_id: goalId, name, weight_pct: weightPct, target_hours_override: override, sort_order: sortOrder = 0 } = req.body;
  if (!goalId || !name || typeof weightPct !== 'number') {
    return res.status(400).json({ error: 'goal_id, name, and weight_pct are required' });
  }
  const info = db
    .prepare(
      'INSERT INTO subjects (goal_id, name, weight_pct, target_hours_override, sort_order) VALUES (?, ?, ?, ?, ?)'
    )
    .run(goalId, name, weightPct, override ?? null, sortOrder);
  const subject = db.prepare('SELECT * FROM subjects WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ subject });
});

router.put('/:id', (req, res) => {
  const subject = db.prepare('SELECT * FROM subjects WHERE id = ?').get(req.params.id);
  if (!subject) return res.status(404).json({ error: 'Subject not found' });

  const merged = {
    name: req.body.name ?? subject.name,
    weight_pct: req.body.weight_pct ?? subject.weight_pct,
    target_hours_override:
      req.body.target_hours_override !== undefined
        ? req.body.target_hours_override
        : subject.target_hours_override,
    sort_order: req.body.sort_order ?? subject.sort_order
  };

  db.prepare(
    `UPDATE subjects SET name = ?, weight_pct = ?, target_hours_override = ?, sort_order = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
     WHERE id = ?`
  ).run(merged.name, merged.weight_pct, merged.target_hours_override, merged.sort_order, subject.id);

  res.json({ subject: db.prepare('SELECT * FROM subjects WHERE id = ?').get(subject.id) });
});

router.delete('/:id', (req, res) => {
  const subject = db.prepare('SELECT * FROM subjects WHERE id = ?').get(req.params.id);
  if (!subject) return res.status(404).json({ error: 'Subject not found' });
  db.prepare('DELETE FROM subjects WHERE id = ?').run(subject.id); // cascades sessions
  res.status(204).end();
});

export default router;
