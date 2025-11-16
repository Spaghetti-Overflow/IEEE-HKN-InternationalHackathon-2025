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

  res.json({ categories, trend, deadlineCounts });
});

export default router;
