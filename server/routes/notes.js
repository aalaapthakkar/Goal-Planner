import { Router } from 'express';
import { db } from '../db/connection.js';

const router = Router();
const COLORS = ['yellow', 'pink', 'green', 'blue', 'orange', 'purple'];

function validateNoteBody(body) {
  const errors = [];
  if (body.content !== undefined && typeof body.content !== 'string') errors.push('content must be a string');
  if (body.color !== undefined && !COLORS.includes(body.color)) errors.push(`color must be one of ${COLORS.join(', ')}`);
  if (body.pos_x !== undefined && typeof body.pos_x !== 'number') errors.push('pos_x must be a number');
  if (body.pos_y !== undefined && typeof body.pos_y !== 'number') errors.push('pos_y must be a number');
  if (body.rotation !== undefined && (typeof body.rotation !== 'number' || body.rotation < -15 || body.rotation > 15)) {
    errors.push('rotation must be a number between -15 and 15');
  }
  if (body.z_index !== undefined && !Number.isInteger(body.z_index)) errors.push('z_index must be an integer');
  return errors;
}

router.get('/', (req, res) => {
  res.json({ notes: db.prepare('SELECT * FROM notes ORDER BY id').all() });
});

router.post('/', (req, res) => {
  const errors = validateNoteBody(req.body);
  if (errors.length) return res.status(400).json({ errors });

  const {
    content = '',
    color = 'yellow',
    pos_x: posX = 40,
    pos_y: posY = 40,
    rotation = Math.random() * 6 - 3,
    z_index: zIndex
  } = req.body;
  const nextZ = zIndex ?? db.prepare('SELECT COALESCE(MAX(z_index), 0) + 1 AS z FROM notes').get().z;

  const info = db
    .prepare('INSERT INTO notes (content, color, pos_x, pos_y, rotation, z_index) VALUES (?, ?, ?, ?, ?, ?)')
    .run(content, color, posX, posY, rotation, nextZ);
  res.status(201).json({ note: db.prepare('SELECT * FROM notes WHERE id = ?').get(info.lastInsertRowid) });
});

router.put('/:id', (req, res) => {
  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
  if (!note) return res.status(404).json({ error: 'Note not found' });

  const errors = validateNoteBody(req.body);
  if (errors.length) return res.status(400).json({ errors });

  const merged = {
    content: req.body.content !== undefined ? req.body.content : note.content,
    color: req.body.color ?? note.color,
    pos_x: req.body.pos_x ?? note.pos_x,
    pos_y: req.body.pos_y ?? note.pos_y,
    rotation: req.body.rotation ?? note.rotation,
    z_index: req.body.z_index ?? note.z_index
  };

  db.prepare(
    `UPDATE notes SET content = ?, color = ?, pos_x = ?, pos_y = ?, rotation = ?, z_index = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
     WHERE id = ?`
  ).run(merged.content, merged.color, merged.pos_x, merged.pos_y, merged.rotation, merged.z_index, note.id);

  res.json({ note: db.prepare('SELECT * FROM notes WHERE id = ?').get(note.id) });
});

router.delete('/:id', (req, res) => {
  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
  if (!note) return res.status(404).json({ error: 'Note not found' });
  db.prepare('DELETE FROM notes WHERE id = ?').run(note.id);
  res.status(204).end();
});

export default router;
