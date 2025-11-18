import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { db } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

function ensureBudget(budgetId, userId) {
  return db.prepare('SELECT * FROM budgets WHERE id = ? AND owner_id = ?').get(budgetId, userId);
}

function formatTimestamp(seconds) {
  if (!seconds) return '';
  const date = new Date(Number(seconds) * 1000);
  return date.toISOString();
}

function dollarsFromCents(cents) {
  return Number((Number(cents || 0) / 100).toFixed(2));
}

function slugifyName(name = '') {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'report';
}

function csvEscape(value) {
  const str = value === null || value === undefined ? '' : String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

function csvLine(values) {
  return values.map(csvEscape).join(',');
}

function totalsFromTransactions(transactions) {
  return transactions.reduce(
    (acc, tx) => {
      const amount = Number(tx.amount_cents || 0);
      if (tx.type === 'income') {
        acc.projectedIncome += amount;
        if (tx.status === 'actual') {
          acc.actualIncome += amount;
        }
      } else {
        acc.projectedExpense += amount;
        if (tx.status === 'actual') {
          acc.actualExpense += amount;
        }
      }
      return acc;
    },
    { actualIncome: 0, actualExpense: 0, projectedIncome: 0, projectedExpense: 0 }
  );
}

function buildBudgetReport(budgetId, userId) {
  const budget = ensureBudget(budgetId, userId);
  if (!budget) {
    return null;
  }
  const transactions = db
    .prepare(
      `SELECT t.*, e.name AS event_name
       FROM transactions t
       LEFT JOIN events e ON e.id = t.event_id
       WHERE t.budget_id = ?
       ORDER BY t.timestamp ASC`
    )
    .all(budgetId);
  const deadlines = db
    .prepare('SELECT * FROM deadlines WHERE budget_id = ? ORDER BY due_timestamp ASC')
    .all(budgetId);
  const events = db
    .prepare(
      `SELECT e.*, 
        COALESCE(SUM(CASE WHEN t.type = 'income' AND t.status = 'actual' THEN t.amount_cents ELSE 0 END), 0) AS actual_income,
        COALESCE(SUM(CASE WHEN t.type = 'expense' AND t.status = 'actual' THEN t.amount_cents ELSE 0 END), 0) AS actual_expense,
        COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount_cents ELSE 0 END), 0) AS projected_income,
        COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount_cents ELSE 0 END), 0) AS projected_expense
      FROM events e
      LEFT JOIN transactions t ON t.event_id = e.id
      WHERE e.budget_id = ?
      GROUP BY e.id
      ORDER BY e.start_ts ASC`
    )
    .all(budgetId);

  const totals = totalsFromTransactions(transactions);
  const startYear = new Date(budget.academic_year_start * 1000).getUTCFullYear();
  const academicLabel = `${startYear}/${startYear + 1}`;

  return {
    budget,
    academicLabel,
    transactions,
    deadlines,
    events,
    summary: {
      allocatedAmount: budget.allocated_amount,
      actualIncome: totals.actualIncome,
      actualExpense: totals.actualExpense,
      projectedIncome: totals.projectedIncome,
      projectedExpense: totals.projectedExpense,
      actualBalance: totals.actualIncome - totals.actualExpense,
      projectedBalance: totals.projectedIncome - totals.projectedExpense
    }
  };
}

function buildCsvPayload(report) {
  const { budget, academicLabel, transactions, deadlines, events, summary } = report;
  const lines = [];
  lines.push('"Budget Overview"');
  lines.push(csvLine(['Field', 'Value']));
  lines.push(csvLine(['Budget name', budget.name]));
  lines.push(csvLine(['Academic year', academicLabel]));
  lines.push(csvLine(['Allocated amount (USD)', dollarsFromCents(summary.allocatedAmount).toFixed(2)]));
  lines.push(csvLine(['Actual balance (USD)', dollarsFromCents(summary.actualBalance).toFixed(2)]));
  lines.push(csvLine(['Projected balance (USD)', dollarsFromCents(summary.projectedBalance).toFixed(2)]));
  lines.push(csvLine(['Actual net (income - expense)', dollarsFromCents(summary.actualIncome - summary.actualExpense).toFixed(2)]));
  lines.push(csvLine(['Projected net (income - expense)', dollarsFromCents(summary.projectedIncome - summary.projectedExpense).toFixed(2)]));
  lines.push('');

  lines.push('"Transactions"');
  lines.push(csvLine(['ID', 'Type', 'Status', 'Amount (USD)', 'Category', 'Event', 'Timestamp (ISO)', 'Notes']));
  if (!transactions.length) {
    lines.push(csvLine(['No transactions recorded']));
  } else {
    transactions.forEach((tx) => {
      lines.push(
        csvLine([
          tx.id,
          tx.type,
          tx.status,
          dollarsFromCents(tx.amount_cents).toFixed(2),
          tx.category,
          tx.event_name || '',
          formatTimestamp(tx.timestamp),
          tx.notes || ''
        ])
      );
    });
  }
  lines.push('');

  lines.push('"Deadlines"');
  lines.push(csvLine(['Title', 'Due (ISO)', 'Status', 'Category', 'Link']));
  if (!deadlines.length) {
    lines.push(csvLine(['No deadlines recorded']));
  } else {
    deadlines.forEach((deadline) => {
      lines.push(
        csvLine([
          deadline.title,
          formatTimestamp(deadline.due_timestamp),
          deadline.status,
          deadline.category || '',
          deadline.link || ''
        ])
      );
    });
  }
  lines.push('');

  lines.push('"Events"');
  lines.push(csvLine(['Name', 'Allocated (USD)', 'Actual balance (USD)', 'Projected balance (USD)', 'Window (start → end)']));
  if (!events.length) {
    lines.push(csvLine(['No events recorded']));
  } else {
    events.forEach((event) => {
      const allocated = dollarsFromCents(event.allocated_amount || 0).toFixed(2);
      const actualNetCents = (event.actual_income || 0) - (event.actual_expense || 0);
      const projectedNetCents = (event.projected_income || 0) - (event.projected_expense || 0);
      const actual = dollarsFromCents(actualNetCents).toFixed(2);
      const projected = dollarsFromCents(projectedNetCents).toFixed(2);
      const window = [formatTimestamp(event.start_ts), formatTimestamp(event.end_ts)].filter(Boolean).join(' → ');
      lines.push(csvLine([event.name, allocated, actual, projected, window]));
    });
  }

  return lines.join('\n');
}

function writePdfReport(report, res) {
  const { budget, academicLabel, summary, transactions, deadlines, events } = report;
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  doc.pipe(res);

  doc.fontSize(20).text(`Budget Report: ${budget.name}`);
  doc.moveDown(0.5);
  doc.fontSize(12).text(`Academic Year: ${academicLabel}`);
  doc.text(`Allocated Amount: $${dollarsFromCents(summary.allocatedAmount).toFixed(2)}`);
  doc.text(`Actual Balance: $${dollarsFromCents(summary.actualBalance).toFixed(2)}`);
  doc.text(`Projected Balance: $${dollarsFromCents(summary.projectedBalance).toFixed(2)}`);
  doc.moveDown();

  doc.fontSize(16).text('Transactions', { underline: true });
  doc.moveDown(0.5);
  if (!transactions.length) {
    doc.fontSize(11).text('No transactions recorded.');
  } else {
    transactions.forEach((tx) => {
      doc.fontSize(12).text(`${formatTimestamp(tx.timestamp)} — ${tx.type.toUpperCase()} $${dollarsFromCents(tx.amount_cents).toFixed(2)} (${tx.status})`);
      const details = [tx.category];
      if (tx.event_name) {
        details.push(`Event: ${tx.event_name}`);
      }
      doc.fontSize(10).fillColor('gray').text(details.filter(Boolean).join(' · '));
      if (tx.notes) {
        doc.text(`Notes: ${tx.notes}`);
      }
      doc.fillColor('black');
      doc.moveDown(0.4);
    });
  }

  doc.moveDown();
  doc.fontSize(16).text('Deadlines', { underline: true });
  doc.moveDown(0.5);
  if (!deadlines.length) {
    doc.fontSize(11).text('No deadlines recorded.');
  } else {
    deadlines.forEach((deadline) => {
      doc.fontSize(12).text(`${deadline.title} — ${deadline.status || 'open'}`);
      const dueLine = formatTimestamp(deadline.due_timestamp);
      doc.fontSize(10).fillColor('gray').text(`Due: ${dueLine}${deadline.category ? ` · ${deadline.category}` : ''}`);
      if (deadline.link) {
        doc.text(deadline.link, { underline: true });
      }
      doc.fillColor('black');
      doc.moveDown(0.4);
    });
  }

  doc.moveDown();
  doc.fontSize(16).text('Events', { underline: true });
  doc.moveDown(0.5);
  if (!events.length) {
    doc.fontSize(11).text('No events recorded.');
  } else {
    events.forEach((event) => {
      const actualNetCents = (event.actual_income || 0) - (event.actual_expense || 0);
      const projectedNetCents = (event.projected_income || 0) - (event.projected_expense || 0);
      const actual = dollarsFromCents(actualNetCents).toFixed(2);
      const projected = dollarsFromCents(projectedNetCents).toFixed(2);
      doc.fontSize(12).text(event.name);
      const range = [formatTimestamp(event.start_ts), formatTimestamp(event.end_ts)].filter(Boolean).join(' → ') || 'Dates TBD';
      doc.fontSize(10)
        .fillColor('gray')
        .text(
          `Allocated: $${dollarsFromCents(event.allocated_amount || 0).toFixed(2)} · Net (actual/projected): $${actual} / $${projected} · ${range}`
        );
      if (event.notes) {
        doc.text(`Notes: ${event.notes}`);
      }
      doc.fillColor('black');
      doc.moveDown(0.4);
    });
  }

  doc.end();
}

router.get('/budget/:id/csv', authenticate, (req, res) => {
  const report = buildBudgetReport(req.params.id, req.user.id);
  if (!report) {
    return res.status(404).json({ message: 'Budget not found' });
  }
  const content = buildCsvPayload(report);
  const filename = `budget-${slugifyName(report.budget.name)}.csv`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  res.send(content);
});

router.get('/budget/:id/pdf', authenticate, (req, res) => {
  const report = buildBudgetReport(req.params.id, req.user.id);
  if (!report) {
    return res.status(404).json({ message: 'Budget not found' });
  }
  const filename = `budget-${slugifyName(report.budget.name)}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  writePdfReport(report, res);
});

export default router;
