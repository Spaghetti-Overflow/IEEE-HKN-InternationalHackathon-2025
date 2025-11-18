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

async function mapSummaries(budgetIds) {
  if (!budgetIds.length) return {};
  const { rows } = await db.query(
    `SELECT
        budget_id,
        SUM(CASE WHEN type = 'income' AND status = 'actual' THEN amount_cents ELSE 0 END) AS actual_income,
        SUM(CASE WHEN type = 'expense' AND status = 'actual' THEN amount_cents ELSE 0 END) AS actual_expense,
        SUM(CASE WHEN type = 'income' THEN amount_cents ELSE 0 END) AS projected_income,
        SUM(CASE WHEN type = 'expense' THEN amount_cents ELSE 0 END) AS projected_expense
      FROM transactions
      WHERE budget_id = ANY($1::int[])
      GROUP BY budget_id`,
    [budgetIds]
  );
  return rows.reduce((acc, row) => {
    acc[row.budget_id] = row;
    return acc;
  }, {});
}

router.get('/', authenticate, async (req, res) => {
  const { rows: budgets } = await db.query('SELECT * FROM budgets WHERE owner_id = $1 ORDER BY created_at DESC', [req.user.id]);
  const summaries = await mapSummaries(budgets.map((b) => b.id));
  const currentTs = now();
  const enriched = budgets.map((budget) => decorateBudget(budget, summaries[budget.id], currentTs));
  res.json(enriched);
});

router.get('/archived', authenticate, async (req, res) => {
  const { rows: budgets } = await db.query('SELECT * FROM budgets WHERE owner_id = $1 ORDER BY academic_year_end DESC', [req.user.id]);
  const summaries = await mapSummaries(budgets.map((b) => b.id));
  const currentTs = now();
  const archived = budgets
    .map((budget) => decorateBudget(budget, summaries[budget.id], currentTs))
    .filter((budget) => budget.isArchived);
  res.json(archived);
});

router.post('/', authenticate, budgetValidators, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, allocatedAmount, academicYearStart } = req.body;
  const timestamp = academicYearStart ? Number(academicYearStart) : now();
  const academic = getAcademicYearBounds(timestamp);
  const allocatedCents = Math.round(Number(allocatedAmount || 0) * 100);
  const createdAt = now();

  const {
    rows: [inserted]
  } = await db.query(
    `INSERT INTO budgets (name, academic_year_start, academic_year_end, allocated_amount, owner_id, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [name, academic.start, academic.end, allocatedCents, req.user.id, createdAt]
  );

  res.status(201).json({ id: inserted.id });
});

router.put('/:id', authenticate, budgetValidators, async (req, res) => {
  const { id } = req.params;
  const {
    rows: [existing]
  } = await db.query('SELECT * FROM budgets WHERE id = $1 AND owner_id = $2', [id, req.user.id]);
  if (!existing) {
    return res.status(404).json({ message: 'Budget not found' });
  }
  const { name, allocatedAmount } = req.body;
  const nextAllocated =
    allocatedAmount !== undefined ? Math.round(Number(allocatedAmount) * 100) : existing.allocated_amount;
  await db.query('UPDATE budgets SET name = $1, allocated_amount = $2 WHERE id = $3', [name || existing.name, nextAllocated, id]);
  res.json({ message: 'Budget updated' });
});

router.delete('/:id', authenticate, async (req, res) => {
  const {
    rows
  } = await db.query('DELETE FROM budgets WHERE id = $1 AND owner_id = $2 RETURNING id', [req.params.id, req.user.id]);
  if (!rows.length) {
    return res.status(404).json({ message: 'Budget not found' });
  }
  res.json({ message: 'Budget removed' });
});

export default router;
