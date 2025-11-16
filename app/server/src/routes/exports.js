import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { db } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

function ensureBudget(budgetId, userId) {
  return db.prepare('SELECT * FROM budgets WHERE id = ? AND owner_id = ?').get(budgetId, userId);
}

router.get('/budget/:id/csv', authenticate, (req, res) => {
  const budget = ensureBudget(req.params.id, req.user.id);
  if (!budget) {
    return res.status(404).json({ message: 'Budget not found' });
  }
  const transactions = db.prepare('SELECT * FROM transactions WHERE budget_id = ? ORDER BY timestamp ASC').all(req.params.id);
  const headers = ['id', 'type', 'status', 'amount', 'category', 'timestamp', 'notes'];
  const rows = transactions.map((tx) => [
    tx.id,
    tx.type,
    tx.status,
    (tx.amount_cents / 100).toFixed(2),
    tx.category,
    tx.timestamp,
    tx.notes || ''
  ]);
  const content = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=budget-${budget.name}.csv`);
  res.send(content);
});

router.get('/budget/:id/pdf', authenticate, (req, res) => {
  const budget = ensureBudget(req.params.id, req.user.id);
  if (!budget) {
    return res.status(404).json({ message: 'Budget not found' });
  }
  const transactions = db.prepare('SELECT * FROM transactions WHERE budget_id = ? ORDER BY timestamp ASC').all(req.params.id);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=budget-${budget.name}.pdf`);
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  doc.pipe(res);
  doc.fontSize(18).text(`Budget Report: ${budget.name}`, { underline: true });
  doc.moveDown();
  transactions.forEach((tx) => {
    doc.fontSize(12).text(
      `${tx.type.toUpperCase()} | ${tx.status} | ${(tx.amount_cents / 100).toFixed(2)} | ${tx.category} | ${new Date(tx.timestamp * 1000).toISOString()}`
    );
    if (tx.notes) {
      doc.fontSize(10).fillColor('gray').text(`Notes: ${tx.notes}`);
      doc.fillColor('black');
    }
    doc.moveDown(0.5);
  });
  doc.end();
});

export default router;
