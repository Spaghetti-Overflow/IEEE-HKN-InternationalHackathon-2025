import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { now } from '../utils/time.js';
import { config } from '../config.js';

const router = Router();

const numberFrom = (value) => Math.round(Number(value) * 100);

const txValidators = [
  body('budgetId').isInt({ min: 1 }),
  body('type').isIn(['income', 'expense']),
  body('status').isIn(['actual', 'planned', 'recurring']),
  body('amount').isFloat({ min: 0 }),
  body('timestamp').isInt({ min: 0 }),
  body('category').notEmpty(),
  body('recurrenceRule').optional().isString(),
  body('eventId').optional().isInt({ min: 1 })
];

router.get('/', authenticate, (req, res) => {
  const { budgetId } = req.query;
  const budgets = db.prepare('SELECT id FROM budgets WHERE owner_id = ?').all(req.user.id).map((b) => b.id);
  if (!budgets.length) {
    return res.json([]);
  }
  const filterId = budgetId ? Number(budgetId) : null;
  if (filterId && !budgets.includes(filterId)) {
    return res.status(403).json({ message: 'Budget not accessible' });
  }
  const stmt = db.prepare(`
    SELECT t.*, e.name AS event_name
    FROM transactions t
    LEFT JOIN events e ON e.id = t.event_id
    WHERE t.budget_id IN (${budgets.map(() => '?').join(',')})
    ${filterId ? 'AND t.budget_id = ?' : ''}
    ORDER BY t.timestamp DESC
  `);
  const rows = stmt.all(...budgets, ...(filterId ? [filterId] : []));
  const formatted = rows.map((row) => ({
    id: row.id,
    budgetId: row.budget_id,
    eventId: row.event_id,
    eventName: row.event_name,
    type: row.type,
    status: row.status,
    amount: row.amount_cents / 100,
    category: row.category,
    notes: row.notes,
    timestamp: row.timestamp,
    recurrenceRule: row.recurrence_rule,
    receiptPath: row.receipt_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
  res.json(formatted);
});

router.post('/', authenticate, txValidators, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const budget = db.prepare('SELECT * FROM budgets WHERE id = ? AND owner_id = ?').get(req.body.budgetId, req.user.id);
  if (!budget) {
    return res.status(404).json({ message: 'Budget not found' });
  }
  const stmt = db.prepare(`
    INSERT INTO transactions (
      budget_id, event_id, user_id, type, status, amount_cents, category, notes, timestamp, recurrence_rule, created_at, updated_at
    ) VALUES (@budget_id, @event_id, @user_id, @type, @status, @amount, @category, @notes, @timestamp, @recurrence, @created, @updated)
  `);
  const payload = {
    budget_id: req.body.budgetId,
    event_id: req.body.eventId || null,
    user_id: req.user.id,
    type: req.body.type,
    status: req.body.status,
    amount: numberFrom(req.body.amount),
    category: req.body.category,
    notes: req.body.notes || null,
    timestamp: req.body.timestamp,
    recurrence: req.body.recurrenceRule || null,
    created: now(),
    updated: now()
  };
  const info = stmt.run(payload);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.put('/:id', authenticate, txValidators, (req, res) => {
  const transaction = db.prepare(`
    SELECT t.* FROM transactions t
    JOIN budgets b ON b.id = t.budget_id
    WHERE t.id = ? AND b.owner_id = ?
  `).get(req.params.id, req.user.id);
  if (!transaction) {
    return res.status(404).json({ message: 'Transaction not found' });
  }
  const payload = {
    budget_id: req.body.budgetId,
    event_id: req.body.eventId || null,
    type: req.body.type,
    status: req.body.status,
    amount: numberFrom(req.body.amount),
    category: req.body.category,
    notes: req.body.notes || null,
    timestamp: req.body.timestamp,
    recurrence: req.body.recurrenceRule || null,
    updated: now(),
    id: req.params.id
  };
  db.prepare(`
    UPDATE transactions SET
      budget_id = @budget_id,
      event_id = @event_id,
      type = @type,
      status = @status,
      amount_cents = @amount,
      category = @category,
      notes = @notes,
      timestamp = @timestamp,
      recurrence_rule = @recurrence,
      updated_at = @updated
    WHERE id = @id
  `).run(payload);
  res.json({ message: 'Transaction updated' });
});

router.delete('/:id', authenticate, (req, res) => {
  const tx = db.prepare(`
    SELECT t.*, a.id AS attachment_id, a.file_path FROM transactions t
    LEFT JOIN attachments a ON a.transaction_id = t.id
    JOIN budgets b ON b.id = t.budget_id
    WHERE t.id = ? AND b.owner_id = ?
  `).all(req.params.id, req.user.id);
  if (!tx.length) {
    return res.status(404).json({ message: 'Transaction not found' });
  }
  tx.forEach((row) => {
    if (row.file_path && fs.existsSync(row.file_path)) {
      fs.unlinkSync(row.file_path);
    }
  });
  db.prepare('DELETE FROM attachments WHERE transaction_id = ?').run(req.params.id);
  db.prepare('DELETE FROM transactions WHERE id = ?').run(req.params.id);
  res.json({ message: 'Transaction removed' });
});

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, config.uploadDir),
  filename: (_, file, cb) => {
    const unique = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
    cb(null, unique);
  }
});

const upload = multer({ storage });

router.post('/:id/receipt', authenticate, upload.single('receipt'), (req, res) => {
  const transaction = db.prepare(`
    SELECT t.* FROM transactions t JOIN budgets b ON b.id = t.budget_id
    WHERE t.id = ? AND b.owner_id = ?
  `).get(req.params.id, req.user.id);
  if (!transaction) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(404).json({ message: 'Transaction not found' });
  }
  if (!req.file) {
    return res.status(400).json({ message: 'Missing receipt file' });
  }
  const stmt = db.prepare(`
    INSERT INTO attachments (transaction_id, file_name, mime_type, file_path, uploaded_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  const info = stmt.run(transaction.id, req.file.originalname, req.file.mimetype, req.file.path, now());
  db.prepare('UPDATE transactions SET receipt_path = ? WHERE id = ?').run(req.file.path, transaction.id);
  res.status(201).json({ attachmentId: info.lastInsertRowid, path: req.file.path });
});

router.get('/:id/receipt', authenticate, (req, res) => {
  const attachment = db.prepare(`
    SELECT a.* FROM attachments a
    JOIN transactions t ON t.id = a.transaction_id
    JOIN budgets b ON b.id = t.budget_id
    WHERE t.id = ? AND b.owner_id = ?
    ORDER BY a.uploaded_at DESC LIMIT 1
  `).get(req.params.id, req.user.id);
  if (!attachment) {
    return res.status(404).json({ message: 'Receipt not found' });
  }
  res.setHeader('Content-Type', attachment.mime_type);
  res.setHeader('Content-Disposition', `inline; filename="${attachment.file_name}"`);
  fs.createReadStream(attachment.file_path).pipe(res);
});

export default router;
