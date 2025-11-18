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

router.get('/', authenticate, async (req, res) => {
  const { rows: budgets } = await db.query('SELECT id FROM budgets WHERE owner_id = $1', [req.user.id]);
  if (!budgets.length) {
    return res.json([]);
  }
  const budgetIds = budgets.map((b) => b.id);
  const { rows } = await db.query(
    `SELECT * FROM deadlines WHERE budget_id = ANY($1::int[]) ORDER BY due_timestamp ASC`,
    [budgetIds]
  );
  const formatted = rows.map((row) => ({
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
  res.json(formatted);
});

router.post('/', authenticate, validators, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const {
    rows: [budget]
  } = await db.query('SELECT id FROM budgets WHERE id = $1 AND owner_id = $2', [req.body.budgetId, req.user.id]);
  if (!budget) {
    return res.status(404).json({ message: 'Budget not found' });
  }
  const createdAt = now();
  const {
    rows: [inserted]
  } = await db.query(
    `INSERT INTO deadlines (budget_id, title, description, due_timestamp, category, status, link, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      req.body.budgetId,
      req.body.title,
      req.body.description || null,
      req.body.dueTimestamp,
      req.body.category || null,
      req.body.status || 'open',
      req.body.link || null,
      createdAt
    ]
  );
  res.status(201).json({ id: inserted.id });
});

router.put('/:id', authenticate, validators, async (req, res) => {
  const {
    rows: [deadline]
  } = await db.query(
    `SELECT d.* FROM deadlines d JOIN budgets b ON b.id = d.budget_id
     WHERE d.id = $1 AND b.owner_id = $2`,
    [req.params.id, req.user.id]
  );
  if (!deadline) {
    return res.status(404).json({ message: 'Deadline not found' });
  }
  const {
    rows: [targetBudget]
  } = await db.query('SELECT id FROM budgets WHERE id = $1 AND owner_id = $2', [req.body.budgetId, req.user.id]);
  if (!targetBudget) {
    return res.status(404).json({ message: 'Budget not found' });
  }
  await db.query(
    `UPDATE deadlines SET
        budget_id = $1,
        title = $2,
        description = $3,
        due_timestamp = $4,
        category = $5,
        status = $6,
        link = $7
      WHERE id = $8`,
    [
      req.body.budgetId,
      req.body.title,
      req.body.description || null,
      req.body.dueTimestamp,
      req.body.category || null,
      req.body.status || 'open',
      req.body.link || null,
      req.params.id
    ]
  );
  res.json({ message: 'Deadline updated' });
});

router.delete('/:id', authenticate, async (req, res) => {
  const { rows } = await db.query(
    `DELETE FROM deadlines
     WHERE id = $1 AND budget_id IN (SELECT id FROM budgets WHERE owner_id = $2)
     RETURNING id`,
    [req.params.id, req.user.id]
  );
  if (!rows.length) {
    return res.status(404).json({ message: 'Deadline not found' });
  }
  res.json({ message: 'Deadline removed' });
});

export default router;
