import { Router } from 'express';
import { db } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/overview', authenticate, async (req, res) => {
  const { budgetId } = req.query;
  const {
    rows: [budget]
  } = await db.query('SELECT * FROM budgets WHERE id = $1 AND owner_id = $2', [budgetId, req.user.id]);
  if (!budget) {
    return res.status(404).json({ message: 'Budget not found' });
  }
  const {
    rows: [summary]
  } = await db.query(
    `SELECT
        SUM(CASE WHEN type = 'income' AND status = 'actual' THEN amount_cents ELSE 0 END) AS actual_income,
        SUM(CASE WHEN type = 'expense' AND status = 'actual' THEN amount_cents ELSE 0 END) AS actual_expense,
        SUM(CASE WHEN type = 'income' THEN amount_cents ELSE 0 END) AS projected_income,
        SUM(CASE WHEN type = 'expense' THEN amount_cents ELSE 0 END) AS projected_expense
      FROM transactions
      WHERE budget_id = $1`,
    [budgetId]
  );
  const balance = {
    allocated: budget.allocated_amount / 100,
    actualIncome: Number(summary?.actual_income || 0) / 100,
    actualExpense: Number(summary?.actual_expense || 0) / 100,
    projectedIncome: Number(summary?.projected_income || 0) / 100,
    projectedExpense: Number(summary?.projected_expense || 0) / 100
  };
  balance.actualNet = balance.actualIncome - balance.actualExpense;
  balance.projectedNet = balance.projectedIncome - balance.projectedExpense;
  balance.utilization = balance.allocated > 0 ? balance.actualExpense / balance.allocated : 0;

  const { rows: categoryRows } = await db.query(
    `SELECT category,
        SUM(CASE WHEN type = 'expense' THEN amount_cents ELSE 0 END) AS expense_cents,
        SUM(CASE WHEN type = 'income' THEN amount_cents ELSE 0 END) AS income_cents
     FROM transactions
     WHERE budget_id = $1
     GROUP BY category`,
    [budgetId]
  );
  const categories = categoryRows.map((row) => ({
    category: row.category,
    expenses: (row.expense_cents || 0) / 100,
    incomes: (row.income_cents || 0) / 100
  }));

  const { rows: trendRows } = await db.query(
    `SELECT to_char(to_timestamp(timestamp), 'YYYY-MM') AS month,
        SUM(CASE WHEN type = 'income' THEN amount_cents ELSE 0 END) AS income_cents,
        SUM(CASE WHEN type = 'expense' THEN amount_cents ELSE 0 END) AS expense_cents
     FROM transactions
     WHERE budget_id = $1
     GROUP BY month
     ORDER BY month`,
    [budgetId]
  );
  const trend = trendRows.map((row) => ({
    month: row.month,
    incomes: (row.income_cents || 0) / 100,
    expenses: (row.expense_cents || 0) / 100
  }));

  const { rows: deadlineRows } = await db.query(
    `SELECT status, COUNT(*) AS count FROM deadlines WHERE budget_id = $1 GROUP BY status`,
    [budgetId]
  );
  const deadlineCounts = deadlineRows.reduce((acc, row) => {
    acc[row.status] = Number(row.count);
    return acc;
  }, {});

  const nowTs = Math.floor(Date.now() / 1000);
  const horizonDays = 30;
  const futureTs = nowTs + horizonDays * 24 * 60 * 60;
  const { rows: upcomingRows } = await db.query(
    `SELECT t.*, e.name AS event_name
     FROM transactions t
     LEFT JOIN events e ON e.id = t.event_id
     WHERE t.budget_id = $1
       AND t.status IN ('planned', 'recurring')
       AND t.timestamp BETWEEN $2 AND $3
     ORDER BY t.timestamp ASC
     LIMIT 10`,
    [budgetId, nowTs, futureTs]
  );
  const upcoming = upcomingRows.map((row) => ({
    id: row.id,
    type: row.type,
    status: row.status,
    amount: row.amount_cents / 100,
    category: row.category,
    timestamp: row.timestamp,
    eventName: row.event_name || null
  }));

  res.json({ categories, trend, deadlineCounts, balance, upcoming, projectionWindowDays: horizonDays });
});

export default router;
