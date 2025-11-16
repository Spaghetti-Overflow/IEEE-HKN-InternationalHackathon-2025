import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { db } from '../db.js';
import { now, getAcademicYearBounds } from '../utils/time.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

const budgetValidators = [
  body('name').notEmpty(),
  body('allocatedAmount').optional().isFloat({ min: 0 }),
  body('academicYearStart').optional().isInt()
];

function decorateBudget(budget, summary, currentTs) {
  const actual = (summary?.actual_income || 0) - (summary?.actual_expense || 0);
  const projected = (summary?.projected_income || 0) - (summary?.projected_expense || 0);
  const startYear = new Date(budget.academic_year_start * 1000).getUTCFullYear();
  const label = `${startYear}/${startYear + 1}`;
  const isCurrent = currentTs >= budget.academic_year_start && currentTs <= budget.academic_year_end;
  return {
    id: budget.id,
    name: budget.name,
    academicYearStart: budget.academic_year_start,
    academicYearEnd: budget.academic_year_end,
    academicLabel: label,
    allocatedAmount: budget.allocated_amount / 100,
    actualBalance: actual / 100,
    projectedBalance: projected / 100,
    createdAt: budget.created_at,
    isCurrentYear: isCurrent,
    isArchived: budget.academic_year_end < currentTs
  };
}

router.get('/', authenticate, (req, res) => {
  const budgets = db.prepare('SELECT * FROM budgets WHERE owner_id = ? ORDER BY created_at DESC').all(req.user.id);
  const summaryStmt = db.prepare(`
    SELECT
      budget_id,
      SUM(CASE WHEN type = 'income' AND status = 'actual' THEN amount_cents ELSE 0 END) AS actual_income,
      SUM(CASE WHEN type = 'expense' AND status = 'actual' THEN amount_cents ELSE 0 END) AS actual_expense,
      SUM(CASE WHEN type = 'income' THEN amount_cents ELSE 0 END) AS projected_income,
      SUM(CASE WHEN type = 'expense' THEN amount_cents ELSE 0 END) AS projected_expense
    FROM transactions
    WHERE budget_id IN (SELECT id FROM budgets WHERE owner_id = ?)
    GROUP BY budget_id
  `);
  const summaries = summaryStmt.all(req.user.id).reduce((acc, row) => {
    acc[row.budget_id] = row;
    return acc;
  }, {});

  const currentTs = now();
  const enriched = budgets.map((budget) => decorateBudget(budget, summaries[budget.id], currentTs));

  res.json(enriched);
});

router.get('/archived', authenticate, (req, res) => {
  const budgets = db.prepare('SELECT * FROM budgets WHERE owner_id = ? ORDER BY academic_year_end DESC').all(req.user.id);
  const summaryStmt = db.prepare(`
    SELECT
      budget_id,
      SUM(CASE WHEN type = 'income' AND status = 'actual' THEN amount_cents ELSE 0 END) AS actual_income,
      SUM(CASE WHEN type = 'expense' AND status = 'actual' THEN amount_cents ELSE 0 END) AS actual_expense,
      SUM(CASE WHEN type = 'income' THEN amount_cents ELSE 0 END) AS projected_income,
      SUM(CASE WHEN type = 'expense' THEN amount_cents ELSE 0 END) AS projected_expense
    FROM transactions
    WHERE budget_id IN (SELECT id FROM budgets WHERE owner_id = ?)
    GROUP BY budget_id
  `);
  const summaries = summaryStmt.all(req.user.id).reduce((acc, row) => {
    acc[row.budget_id] = row;
    return acc;
  }, {});
  const currentTs = now();
  const archived = budgets
    .map((budget) => decorateBudget(budget, summaries[budget.id], currentTs))
    .filter((budget) => budget.isArchived);
  res.json(archived);
});

router.post('/', authenticate, budgetValidators, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, allocatedAmount, academicYearStart } = req.body;
  const timestamp = academicYearStart ? Number(academicYearStart) : now();
  const academic = getAcademicYearBounds(timestamp);
  const stmt = db.prepare(`
    INSERT INTO budgets (name, academic_year_start, academic_year_end, allocated_amount, owner_id, created_at)
    VALUES (@name, @start, @end, @allocated, @owner, @created)
  `);

  const info = stmt.run({
    name,
    start: academic.start,
    end: academic.end,
    allocated: Math.round(Number(allocatedAmount || 0) * 100),
    owner: req.user.id,
    created: now()
  });

  res.status(201).json({ id: info.lastInsertRowid });
});

router.put('/:id', authenticate, budgetValidators, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM budgets WHERE id = ? AND owner_id = ?').get(id, req.user.id);
  if (!existing) {
    return res.status(404).json({ message: 'Budget not found' });
  }
  const { name, allocatedAmount } = req.body;
  db.prepare('UPDATE budgets SET name = ?, allocated_amount = ? WHERE id = ?').run(
    name || existing.name,
    allocatedAmount !== undefined ? Math.round(Number(allocatedAmount) * 100) : existing.allocated_amount,
    id
  );
  res.json({ message: 'Budget updated' });
});

router.delete('/:id', authenticate, (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM transactions WHERE budget_id = ?').run(id);
  db.prepare('DELETE FROM deadlines WHERE budget_id = ?').run(id);
  db.prepare('DELETE FROM events WHERE budget_id = ?').run(id);
  const result = db.prepare('DELETE FROM budgets WHERE id = ? AND owner_id = ?').run(id, req.user.id);
  if (!result.changes) {
    return res.status(404).json({ message: 'Budget not found' });
  }
  res.json({ message: 'Budget removed' });
});

export default router;
