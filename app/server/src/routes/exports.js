import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { db } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const palette = {
  primary: '#1E3A8A',
  accent: '#1D4ED8',
  muted: '#4B5563',
  border: '#E0E7FF',
  lightBg: '#EEF2FF',
  cardBg: '#FFFFFF'
};

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2
});

const router = Router();

async function ensureBudget(budgetId, userId) {
  const {
    rows: [budget]
  } = await db.query('SELECT * FROM budgets WHERE id = $1 AND owner_id = $2', [budgetId, userId]);
  return budget || null;
}

function formatTimestamp(seconds) {
  if (!seconds) return '';
  const date = new Date(Number(seconds) * 1000);
  return date.toISOString();
}

function formatReadableDate(seconds) {
  if (!seconds) return '—';
  const date = new Date(Number(seconds) * 1000);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatDateRange(start, end) {
  const startLabel = formatReadableDate(start);
  const endLabel = formatReadableDate(end);
  if (start && end) {
    return `${startLabel} → ${endLabel}`;
  }
  return start ? `${startLabel} → TBD` : end ? `TBD → ${endLabel}` : 'Dates TBD';
}

function dollarsFromCents(cents) {
  return Number((Number(cents || 0) / 100).toFixed(2));
}

function formatCurrency(cents) {
  return usdFormatter.format(dollarsFromCents(cents || 0));
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

async function buildBudgetReport(budgetId, userId) {
  const budget = await ensureBudget(budgetId, userId);
  if (!budget) {
    return null;
  }
  const { rows: transactions } = await db.query(
    `SELECT t.*, e.name AS event_name
     FROM transactions t
     LEFT JOIN events e ON e.id = t.event_id
     WHERE t.budget_id = $1
     ORDER BY t.timestamp ASC`,
    [budgetId]
  );
  const { rows: deadlines } = await db.query(
    'SELECT * FROM deadlines WHERE budget_id = $1 ORDER BY due_timestamp ASC',
    [budgetId]
  );
  const { rows: events } = await db.query(
    `SELECT e.*, 
        COALESCE(SUM(CASE WHEN t.type = 'income' AND t.status = 'actual' THEN t.amount_cents ELSE 0 END), 0) AS actual_income,
        COALESCE(SUM(CASE WHEN t.type = 'expense' AND t.status = 'actual' THEN t.amount_cents ELSE 0 END), 0) AS actual_expense,
        COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount_cents ELSE 0 END), 0) AS projected_income,
        COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount_cents ELSE 0 END), 0) AS projected_expense
     FROM events e
     LEFT JOIN transactions t ON t.event_id = e.id
     WHERE e.budget_id = $1
     GROUP BY e.id
     ORDER BY e.start_ts ASC`,
    [budgetId]
  );

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

  drawReportHeader(doc, `Budget Report`, `${budget.name} • Academic Year ${academicLabel}`);

  drawSummaryGrid(doc, [
    { label: 'Allocated amount', value: formatCurrency(summary.allocatedAmount) },
    { label: 'Actual balance', value: formatCurrency(summary.actualBalance) },
    { label: 'Projected balance', value: formatCurrency(summary.projectedBalance) },
    { label: 'Actual income', value: formatCurrency(summary.actualIncome) },
    { label: 'Actual expenses', value: formatCurrency(summary.actualExpense) },
    {
      label: 'Projected net',
      value: formatCurrency(summary.projectedIncome - summary.projectedExpense)
    }
  ]);

  drawSectionHeading(doc, 'Transactions');
  if (!transactions.length) {
    doc.font('Helvetica').fontSize(11).fillColor(palette.muted).text('No transactions recorded.');
    doc.fillColor('black');
  } else {
    transactions.forEach((tx) => {
      const typeLabel = tx.type === 'income' ? 'Income' : 'Expense';
      const title = `${typeLabel} · ${formatCurrency(tx.amount_cents)} (${tx.status.toUpperCase()})`;
      const subtitle = `${formatReadableDate(tx.timestamp)}${tx.category ? ` • ${tx.category}` : ''}`;
      const details = [tx.event_name && `Event: ${tx.event_name}`, tx.notes && `Notes: ${tx.notes}`].filter(Boolean);
      drawInfoCard(doc, { title, subtitle, lines: details });
    });
  }

  drawSectionHeading(doc, 'Deadlines');
  if (!deadlines.length) {
    doc.font('Helvetica').fontSize(11).fillColor(palette.muted).text('No deadlines recorded.');
    doc.fillColor('black');
  } else {
    deadlines.forEach((deadline) => {
      const title = `${deadline.title} (${deadline.status || 'Open'})`;
      const subtitle = `${formatReadableDate(deadline.due_timestamp)}${deadline.category ? ` • ${deadline.category}` : ''}`;
      const lines = [deadline.link && `Link: ${deadline.link}`].filter(Boolean);
      drawInfoCard(doc, { title, subtitle, lines });
    });
  }

  drawSectionHeading(doc, 'Events');
  if (!events.length) {
    doc.font('Helvetica').fontSize(11).fillColor(palette.muted).text('No events recorded.');
    doc.fillColor('black');
  } else {
    events.forEach((event) => {
      const actualNetCents = (event.actual_income || 0) - (event.actual_expense || 0);
      const projectedNetCents = (event.projected_income || 0) - (event.projected_expense || 0);
      const title = `${event.name} · Allocated ${formatCurrency(event.allocated_amount || 0)}`;
      const subtitle = `Net (actual / projected): ${formatCurrency(actualNetCents)} / ${formatCurrency(projectedNetCents)}`;
      const lines = [formatDateRange(event.start_ts, event.end_ts), event.notes && `Notes: ${event.notes}`].filter(Boolean);
      drawInfoCard(doc, { title, subtitle, lines });
    });
  }

  doc.end();
}

function getContentWidth(doc) {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

function drawReportHeader(doc, title, subtitle) {
  const contentWidth = getContentWidth(doc);
  const headerHeight = 72;
  const x = doc.page.margins.left;
  const y = doc.y;

  doc.save();
  doc.roundedRect(x, y, contentWidth, headerHeight, 12).fill(palette.primary);
  doc.fillColor('white');
  doc.font('Helvetica-Bold').fontSize(22).text(title, x + 20, y + 16, {
    width: contentWidth - 40
  });
  doc.font('Helvetica').fontSize(12).text(subtitle, {
    width: contentWidth - 40
  });
  doc.restore();

  doc.y = y + headerHeight + 20;
  doc.moveDown(0.5);
}

function drawSummaryGrid(doc, entries) {
  const columns = 2;
  const gap = 14;
  const contentWidth = getContentWidth(doc);
  const cellWidth = (contentWidth - gap * (columns - 1)) / columns;
  const cellHeight = 70;
  const startY = doc.y;

  entries.forEach((entry, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = doc.page.margins.left + col * (cellWidth + gap);
    const y = startY + row * (cellHeight + gap);

    doc.save();
    doc.roundedRect(x, y, cellWidth, cellHeight, 10).fill(palette.lightBg);
    doc.restore();

    doc.font('Helvetica').fontSize(9).fillColor(palette.muted).text(entry.label.toUpperCase(), x + 12, y + 12, {
      width: cellWidth - 24
    });
    doc.font('Helvetica-Bold').fontSize(16).fillColor(palette.primary).text(entry.value, x + 12, y + 32, {
      width: cellWidth - 24
    });
    doc.fillColor('black');
  });

  const rows = Math.ceil(entries.length / columns);
  doc.y = startY + rows * (cellHeight + gap);
  doc.moveDown();
}

function drawSectionHeading(doc, title) {
  doc.moveDown();
  doc.font('Helvetica-Bold').fontSize(14).fillColor(palette.primary).text(title.toUpperCase());
  doc.fillColor('black');
  const x = doc.page.margins.left;
  const width = getContentWidth(doc);
  const y = doc.y + 2;
  doc.save();
  doc.rect(x, y, width, 1).fill(palette.border);
  doc.restore();
  doc.moveDown(0.5);
}

function drawInfoCard(doc, { title, subtitle, lines }) {
  const contentWidth = getContentWidth(doc);
  const cardWidth = contentWidth;
  const textWidth = cardWidth - 24;
  const startX = doc.page.margins.left;
  const startY = doc.y;
  const bodyLines = (lines || []).filter(Boolean);

  doc.font('Helvetica-Bold').fontSize(12);
  const titleHeight = doc.heightOfString(title, { width: textWidth });
  doc.font('Helvetica').fontSize(10);
  const subtitleHeight = subtitle ? doc.heightOfString(subtitle, { width: textWidth }) : 0;
  const bodyHeight = bodyLines.reduce((total, line) => {
    return total + doc.heightOfString(line, { width: textWidth });
  }, 0);
  const cardHeight = titleHeight + subtitleHeight + bodyHeight + 28;

  doc.save();
  doc.roundedRect(startX, startY, cardWidth, cardHeight, 10).fillAndStroke(palette.cardBg, palette.border);
  doc.restore();

  let cursorY = startY + 12;
  doc.font('Helvetica-Bold').fontSize(12).fillColor(palette.accent).text(title, startX + 12, cursorY, {
    width: textWidth
  });
  cursorY += titleHeight + 4;

  if (subtitle) {
    doc.font('Helvetica').fontSize(10).fillColor(palette.muted).text(subtitle, startX + 12, cursorY, {
      width: textWidth
    });
    cursorY += subtitleHeight + 4;
  }

  doc.font('Helvetica').fontSize(10).fillColor('black');
  bodyLines.forEach((line) => {
    doc.text(line, startX + 12, cursorY, { width: textWidth });
    cursorY += doc.heightOfString(line, { width: textWidth }) + 2;
  });

  doc.y = startY + cardHeight + 8;
  doc.moveDown(0.1);
}

router.get('/budget/:id/csv', authenticate, async (req, res) => {
  const report = await buildBudgetReport(req.params.id, req.user.id);
  if (!report) {
    return res.status(404).json({ message: 'Budget not found' });
  }
  const content = buildCsvPayload(report);
  const filename = `budget-${slugifyName(report.budget.name)}.csv`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  res.send(content);
});

router.get('/budget/:id/pdf', authenticate, async (req, res) => {
  const report = await buildBudgetReport(req.params.id, req.user.id);
  if (!report) {
    return res.status(404).json({ message: 'Budget not found' });
  }
  const filename = `budget-${slugifyName(report.budget.name)}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  writePdfReport(report, res);
});

export default router;
