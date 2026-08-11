import { Router } from 'express';
import { db } from '../db/connection.js';
import { isValidISODate } from '../lib/dateUtils.js';

const router = Router();

router.get('/', (req, res) => {
  res.json({ blackoutDates: db.prepare('SELECT date, reason FROM blackout_dates ORDER BY date').all() });
});

router.post('/', (req, res) => {
  const { date, reason = null } = req.body;
  if (!isValidISODate(date)) return res.status(400).json({ error: 'date must be a valid YYYY-MM-DD date' });

  db.prepare(
    'INSERT INTO blackout_dates (date, reason) VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET reason = excluded.reason'
  ).run(date, reason);

  res.status(201).json({ blackoutDate: db.prepare('SELECT date, reason FROM blackout_dates WHERE date = ?').get(date) });
});

router.delete('/:date', (req, res) => {
  const existing = db.prepare('SELECT date FROM blackout_dates WHERE date = ?').get(req.params.date);
  if (!existing) return res.status(404).json({ error: 'Blackout date not found' });
  db.prepare('DELETE FROM blackout_dates WHERE date = ?').run(req.params.date);
  res.status(204).end();
});

export default router;
