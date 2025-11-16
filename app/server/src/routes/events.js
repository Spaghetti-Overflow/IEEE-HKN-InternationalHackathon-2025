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

router.get('/', authenticate, (req, res) => {
  const budgets = db.prepare('SELECT id FROM budgets WHERE owner_id = ?').all(req.user.id).map((b) => b.id);
  if (!budgets.length) {
    return res.json([]);
  }
  const stmt = db.prepare(`
    SELECT e.*,
      SUM(CASE WHEN t.type = 'income' THEN t.amount_cents ELSE 0 END) AS projected_income,
      SUM(CASE WHEN t.type = 'expense' THEN t.amount_cents ELSE 0 END) AS projected_expense,
      SUM(CASE WHEN t.type = 'income' AND t.status = 'actual' THEN t.amount_cents ELSE 0 END) AS actual_income,
      SUM(CASE WHEN t.type = 'expense' AND t.status = 'actual' THEN t.amount_cents ELSE 0 END) AS actual_expense
    FROM events e
    LEFT JOIN transactions t ON t.event_id = e.id
    WHERE e.budget_id IN (${budgets.map(() => '?').join(',')})
    GROUP BY e.id
    ORDER BY e.start_ts ASC NULLS LAST
  `);
  const rows = stmt.all(...budgets).map((row) => ({
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
    INSERT INTO events (budget_id, name, allocated_amount, start_ts, end_ts, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    req.body.budgetId,
    req.body.name,
    Math.round(Number(req.body.allocatedAmount || 0) * 100),
    req.body.startTs || null,
    req.body.endTs || null,
    req.body.notes || null
  );
  res.status(201).json({ id: info.lastInsertRowid });
});

router.put('/:id', authenticate, validators, (req, res) => {
  const event = db.prepare(`
    SELECT e.* FROM events e JOIN budgets b ON b.id = e.budget_id
    WHERE e.id = ? AND b.owner_id = ?
  `).get(req.params.id, req.user.id);
  if (!event) {
    return res.status(404).json({ message: 'Event not found' });
  }
  db.prepare(`
    UPDATE events SET
      budget_id = ?,
      name = ?,
      allocated_amount = ?,
      start_ts = ?,
      end_ts = ?,
      notes = ?
    WHERE id = ?
  `).run(
    req.body.budgetId,
    req.body.name,
    Math.round(Number(req.body.allocatedAmount || 0) * 100),
    req.body.startTs || null,
    req.body.endTs || null,
    req.body.notes || null,
    req.params.id
  );
  res.json({ message: 'Event updated' });
});

router.delete('/:id', authenticate, (req, res) => {
  const result = db.prepare(`
    DELETE FROM events
    WHERE id = ? AND budget_id IN (SELECT id FROM budgets WHERE owner_id = ?)
  `).run(req.params.id, req.user.id);
  if (!result.changes) {
    return res.status(404).json({ message: 'Event not found' });
  }
  db.prepare('UPDATE transactions SET event_id = NULL WHERE event_id = ?').run(req.params.id);
  res.json({ message: 'Event removed' });
});

export default router;
