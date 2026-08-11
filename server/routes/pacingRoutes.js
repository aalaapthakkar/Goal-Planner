import { Router } from 'express';
import { getPacingSummary } from '../services/pacingService.js';

const router = Router();

router.get('/summary', (req, res) => {
  const goalId = Number(req.query.goal_id);
  if (!goalId) return res.status(400).json({ error: 'goal_id query param is required' });

  const summary = getPacingSummary(goalId);
  if (!summary) return res.status(404).json({ error: 'Goal not found' });

  res.json(summary);
});

export default router;
