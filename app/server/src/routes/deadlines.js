import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { db } from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { now } from '../utils/time.js';

const router = Router();

const validators = [
  body('budgetId').isInt({ min: 1 }),
  body('title').notEmpty(),
  body('dueTimestamp').isInt({ min: 0 }),
  body('category').optional().isString(),
  body('status').optional().isIn(['open', 'submitted', 'won', 'lost']),
  body('link').optional().isURL()
];

router.get('/', authenticate, (req, res) => {
  const budgets = db.prepare('SELECT id FROM budgets WHERE owner_id = ?').all(req.user.id).map((b) => b.id);
  if (!budgets.length) {
    return res.json([]);
  }
  const stmt = db.prepare(`
    SELECT * FROM deadlines WHERE budget_id IN (${budgets.map(() => '?').join(',')}) ORDER BY due_timestamp ASC
  `);
  const rows = stmt.all(...budgets).map((row) => ({
    id: row.id,
    budgetId: row.budget_id,
    title: row.title,
    description: row.description,
    dueTimestamp: row.due_timestamp,
    category: row.category,
    status: row.status,
    link: row.link,
    createdAt: row.created_at
  }));
  res.json(rows);
});

router.post('/', authenticate, validators, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const budget = db.prepare('SELECT id FROM budgets WHERE id = ? AND owner_id = ?').get(req.body.budgetId, req.user.id);
  if (!budget) {
    return res.status(404).json({ message: 'Budget not found' });
  }
  const stmt = db.prepare(`
    INSERT INTO deadlines (budget_id, title, description, due_timestamp, category, status, link, created_at)
    VALUES (@budget_id, @title, @description, @due, @category, @status, @link, @created)
  `);
  const info = stmt.run({
    budget_id: req.body.budgetId,
    title: req.body.title,
    description: req.body.description || null,
    due: req.body.dueTimestamp,
    category: req.body.category || null,
    status: req.body.status || 'open',
    link: req.body.link || null,
    created: now()
  });
  res.status(201).json({ id: info.lastInsertRowid });
});

router.put('/:id', authenticate, validators, (req, res) => {
  const deadline = db.prepare(`
    SELECT d.* FROM deadlines d JOIN budgets b ON b.id = d.budget_id
    WHERE d.id = ? AND b.owner_id = ?
  `).get(req.params.id, req.user.id);
  if (!deadline) {
    return res.status(404).json({ message: 'Deadline not found' });
  }
  db.prepare(`
    UPDATE deadlines SET
      budget_id = ?,
      title = ?,
      description = ?,
      due_timestamp = ?,
      category = ?,
      status = ?,
      link = ?
    WHERE id = ?
  `).run(
    req.body.budgetId,
    req.body.title,
    req.body.description || null,
    req.body.dueTimestamp,
    req.body.category || null,
    req.body.status || 'open',
    req.body.link || null,
    req.params.id
  );
  res.json({ message: 'Deadline updated' });
});

router.delete('/:id', authenticate, (req, res) => {
  const result = db.prepare(`
    DELETE FROM deadlines
    WHERE id = ? AND budget_id IN (SELECT id FROM budgets WHERE owner_id = ?)
  `).run(req.params.id, req.user.id);
  if (!result.changes) {
    return res.status(404).json({ message: 'Deadline not found' });
  }
  res.json({ message: 'Deadline removed' });
});

export default router;
