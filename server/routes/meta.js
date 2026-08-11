import { Router } from 'express';
import { db } from '../db/connection.js';

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

router.get('/', (req, res) => {
  const { count: goalsCount } = db.prepare('SELECT COUNT(*) AS count FROM goals').get();
  res.json({
    firstRun: goalsCount === 0,
    weightsBannerDismissed: getMeta('weights_verified') === '1'
  });
});

router.post('/dismiss-weights-banner', (req, res) => {
  setMeta('weights_verified', '1');
  res.status(204).end();
});

export default router;
