import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { db } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

const validators = [
  body('budgetId').isInt({ min: 1 }),
  body('name').notEmpty(),
  body('allocatedAmount').optional().isFloat({ min: 0 }),
  body('startTs').optional().isInt({ min: 0 }),
  body('endTs').optional().isInt({ min: 0 })
];

router.get('/', authenticate, async (req, res) => {
  const { rows: budgets } = await db.query('SELECT id FROM budgets WHERE owner_id = $1', [req.user.id]);
  if (!budgets.length) {
    return res.json([]);
  }
  const budgetIds = budgets.map((b) => b.id);
  const { rows } = await db.query(
    `SELECT e.*,
        SUM(CASE WHEN t.type = 'income' THEN t.amount_cents ELSE 0 END) AS projected_income,
        SUM(CASE WHEN t.type = 'expense' THEN t.amount_cents ELSE 0 END) AS projected_expense,
        SUM(CASE WHEN t.type = 'income' AND t.status = 'actual' THEN t.amount_cents ELSE 0 END) AS actual_income,
        SUM(CASE WHEN t.type = 'expense' AND t.status = 'actual' THEN t.amount_cents ELSE 0 END) AS actual_expense
     FROM events e
     LEFT JOIN transactions t ON t.event_id = e.id
     WHERE e.budget_id = ANY($1::int[])
     GROUP BY e.id
     ORDER BY e.start_ts ASC NULLS LAST`,
    [budgetIds]
  );
  const formatted = rows.map((row) => ({
    id: row.id,
    budgetId: row.budget_id,
    name: row.name,
    allocatedAmount: row.allocated_amount / 100,
    startTs: row.start_ts,
    endTs: row.end_ts,
    notes: row.notes,
    actualBalance: ((row.actual_income || 0) - (row.actual_expense || 0)) / 100,
    projectedBalance: ((row.projected_income || 0) - (row.projected_expense || 0)) / 100
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
  const {
    rows: [inserted]
  } = await db.query(
    `INSERT INTO events (budget_id, name, allocated_amount, start_ts, end_ts, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      req.body.budgetId,
      req.body.name,
      Math.round(Number(req.body.allocatedAmount || 0) * 100),
      req.body.startTs || null,
      req.body.endTs || null,
      req.body.notes || null
    ]
  );
  res.status(201).json({ id: inserted.id });
});

router.put('/:id', authenticate, validators, async (req, res) => {
  const {
    rows: [event]
  } = await db.query(
    `SELECT e.* FROM events e JOIN budgets b ON b.id = e.budget_id
     WHERE e.id = $1 AND b.owner_id = $2`,
    [req.params.id, req.user.id]
  );
  if (!event) {
    return res.status(404).json({ message: 'Event not found' });
  }
  const {
    rows: [targetBudget]
  } = await db.query('SELECT id FROM budgets WHERE id = $1 AND owner_id = $2', [req.body.budgetId, req.user.id]);
  if (!targetBudget) {
    return res.status(404).json({ message: 'Budget not found' });
  }
  await db.query(
    `UPDATE events SET
        budget_id = $1,
        name = $2,
        allocated_amount = $3,
        start_ts = $4,
        end_ts = $5,
        notes = $6
      WHERE id = $7`,
    [
      req.body.budgetId,
      req.body.name,
      Math.round(Number(req.body.allocatedAmount || 0) * 100),
      req.body.startTs || null,
      req.body.endTs || null,
      req.body.notes || null,
      req.params.id
    ]
  );
  res.json({ message: 'Event updated' });
});

router.delete('/:id', authenticate, async (req, res) => {
  const { rows } = await db.query(
    `DELETE FROM events
     WHERE id = $1 AND budget_id IN (SELECT id FROM budgets WHERE owner_id = $2)
     RETURNING id`,
    [req.params.id, req.user.id]
  );
  if (!rows.length) {
    return res.status(404).json({ message: 'Event not found' });
  }
  await db.query('UPDATE transactions SET event_id = NULL WHERE event_id = $1', [req.params.id]);
  res.json({ message: 'Event removed' });
});

export default router;
