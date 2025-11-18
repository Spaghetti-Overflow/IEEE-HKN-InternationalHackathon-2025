import { Router } from 'express';
import { db } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/overview', authenticate, (req, res) => {
  const { budgetId } = req.query;
  const budget = db.prepare('SELECT * FROM budgets WHERE id = ? AND owner_id = ?').get(budgetId, req.user.id);
  if (!budget) {
    return res.status(404).json({ message: 'Budget not found' });
  }
  const summaryStmt = db.prepare(`
    SELECT
      SUM(CASE WHEN type = 'income' AND status = 'actual' THEN amount_cents ELSE 0 END) AS actual_income,
      SUM(CASE WHEN type = 'expense' AND status = 'actual' THEN amount_cents ELSE 0 END) AS actual_expense,
      SUM(CASE WHEN type = 'income' THEN amount_cents ELSE 0 END) AS projected_income,
      SUM(CASE WHEN type = 'expense' THEN amount_cents ELSE 0 END) AS projected_expense
    FROM transactions
    WHERE budget_id = ?
  `);
  const summary = summaryStmt.get(budgetId) || {};
  const balance = {
    allocated: budget.allocated_amount / 100,
    actualIncome: (summary.actual_income || 0) / 100,
    actualExpense: (summary.actual_expense || 0) / 100,
    projectedIncome: (summary.projected_income || 0) / 100,
    projectedExpense: (summary.projected_expense || 0) / 100
  };
  balance.actualNet = balance.actualIncome - balance.actualExpense;
  balance.projectedNet = balance.projectedIncome - balance.projectedExpense;
  balance.utilization = balance.allocated > 0 ? balance.actualExpense / balance.allocated : 0;
  const categoryStmt = db.prepare(`
    SELECT category,
      SUM(CASE WHEN type = 'expense' THEN amount_cents ELSE 0 END) AS expense_cents,
      SUM(CASE WHEN type = 'income' THEN amount_cents ELSE 0 END) AS income_cents
    FROM transactions
    WHERE budget_id = ?
    GROUP BY category
  `);
  const categories = categoryStmt.all(budgetId).map((row) => ({
    category: row.category,
    expenses: (row.expense_cents || 0) / 100,
    incomes: (row.income_cents || 0) / 100
  }));

  const trendStmt = db.prepare(`
    SELECT strftime('%Y-%m', datetime(timestamp, 'unixepoch')) AS month,
      SUM(CASE WHEN type = 'income' THEN amount_cents ELSE 0 END) AS income_cents,
      SUM(CASE WHEN type = 'expense' THEN amount_cents ELSE 0 END) AS expense_cents
    FROM transactions
    WHERE budget_id = ?
    GROUP BY month
    ORDER BY month
  `);
  const trend = trendStmt.all(budgetId).map((row) => ({
    month: row.month,
    incomes: (row.income_cents || 0) / 100,
    expenses: (row.expense_cents || 0) / 100
  }));

  const deadlineStmt = db.prepare(`
    SELECT status, COUNT(*) AS count FROM deadlines WHERE budget_id = ? GROUP BY status
  `);
  const deadlineCounts = deadlineStmt.all(budgetId).reduce((acc, row) => {
    acc[row.status] = row.count;
    return acc;
  }, {});
  const nowTs = Math.floor(Date.now() / 1000);
  const horizonDays = 30;
  const futureTs = nowTs + horizonDays * 24 * 60 * 60;
  const upcomingStmt = db.prepare(`
    SELECT t.*, e.name AS event_name
    FROM transactions t
    LEFT JOIN events e ON e.id = t.event_id
    WHERE t.budget_id = ?
      AND t.status IN ('planned', 'recurring')
      AND t.timestamp BETWEEN ? AND ?
    ORDER BY t.timestamp ASC
    LIMIT 10
  `);
  const upcoming = upcomingStmt.all(budgetId, nowTs, futureTs).map((row) => ({
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
