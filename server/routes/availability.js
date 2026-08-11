import { Router } from 'express';
import { db } from '../db/connection.js';

const router = Router();

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT weekday, available_hours FROM availability ORDER BY weekday').all();
  res.json({ availability: rows });
});

router.put('/', (req, res) => {
  const rows = req.body;
  if (!Array.isArray(rows) || rows.length !== 7) {
    return res.status(400).json({ error: 'Body must be an array of exactly 7 {weekday, available_hours} rows' });
  }
  for (const row of rows) {
    if (
      typeof row.weekday !== 'number' ||
      row.weekday < 0 ||
      row.weekday > 6 ||
      typeof row.available_hours !== 'number' ||
      row.available_hours < 0
    ) {
      return res.status(400).json({ error: 'Each row needs weekday (0-6) and available_hours (>=0)' });
    }
  }

  const upsert = db.prepare(
    'INSERT INTO availability (weekday, available_hours) VALUES (?, ?) ON CONFLICT(weekday) DO UPDATE SET available_hours = excluded.available_hours'
  );
  db.transaction(() => {
    for (const row of rows) upsert.run(row.weekday, row.available_hours);
  })();

  res.json({ availability: db.prepare('SELECT weekday, available_hours FROM availability ORDER BY weekday').all() });
});

export default router;
