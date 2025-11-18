import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
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

router.get('/', authenticate, async (req, res) => {
  const { budgetId } = req.query;
  const { rows: budgetRows } = await db.query('SELECT id FROM budgets WHERE owner_id = $1', [req.user.id]);
  if (!budgetRows.length) {
    return res.json([]);
  }
  const budgetIds = budgetRows.map((row) => row.id);
  const filterId = budgetId ? Number(budgetId) : null;
  if (filterId && !budgetIds.includes(filterId)) {
    return res.status(403).json({ message: 'Budget not accessible' });
  }
  const params = [budgetIds];
  let filterClause = '';
  if (filterId) {
    params.push(filterId);
    filterClause = 'AND t.budget_id = $2';
  }
  const { rows } = await db.query(
    `SELECT t.*, e.name AS event_name
     FROM transactions t
     LEFT JOIN events e ON e.id = t.event_id
     WHERE t.budget_id = ANY($1::int[])
     ${filterClause}
     ORDER BY t.timestamp DESC`,
    params
  );
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

router.post('/', authenticate, txValidators, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const {
    rows: [budget]
  } = await db.query('SELECT id FROM budgets WHERE id = $1 AND owner_id = $2', [req.body.budgetId, req.user.id]);
  if (!budget) {
    return res.status(404).json({ message: 'Budget not found' });
  }
  const createdAt = now();
  const {
    rows: [inserted]
  } = await db.query(
    `INSERT INTO transactions (
        budget_id, event_id, user_id, type, status, amount_cents, category, notes, timestamp, recurrence_rule, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id`,
    [
      req.body.budgetId,
      req.body.eventId || null,
      req.user.id,
      req.body.type,
      req.body.status,
      numberFrom(req.body.amount),
      req.body.category,
      req.body.notes || null,
      req.body.timestamp,
      req.body.recurrenceRule || null,
      createdAt,
      createdAt
    ]
  );
  res.status(201).json({ id: inserted.id });
});

router.put('/:id', authenticate, txValidators, async (req, res) => {
  const {
    rows: [transaction]
  } = await db.query(
    `SELECT t.* FROM transactions t
     JOIN budgets b ON b.id = t.budget_id
     WHERE t.id = $1 AND b.owner_id = $2`,
    [req.params.id, req.user.id]
  );
  if (!transaction) {
    return res.status(404).json({ message: 'Transaction not found' });
  }
  const {
    rows: [targetBudget]
  } = await db.query('SELECT id FROM budgets WHERE id = $1 AND owner_id = $2', [req.body.budgetId, req.user.id]);
  if (!targetBudget) {
    return res.status(404).json({ message: 'Budget not found' });
  }
  await db.query(
    `UPDATE transactions SET
        budget_id = $1,
        event_id = $2,
        type = $3,
        status = $4,
        amount_cents = $5,
        category = $6,
        notes = $7,
        timestamp = $8,
        recurrence_rule = $9,
        updated_at = $10
      WHERE id = $11`,
    [
      req.body.budgetId,
      req.body.eventId || null,
      req.body.type,
      req.body.status,
      numberFrom(req.body.amount),
      req.body.category,
      req.body.notes || null,
      req.body.timestamp,
      req.body.recurrenceRule || null,
      now(),
      req.params.id
    ]
  );
  res.json({ message: 'Transaction updated' });
});

router.delete('/:id', authenticate, async (req, res) => {
  const { rows } = await db.query(
    `SELECT t.id, a.file_path
     FROM transactions t
     LEFT JOIN attachments a ON a.transaction_id = t.id
     JOIN budgets b ON b.id = t.budget_id
     WHERE t.id = $1 AND b.owner_id = $2`,
    [req.params.id, req.user.id]
  );
  if (!rows.length) {
    return res.status(404).json({ message: 'Transaction not found' });
  }
  rows.forEach((row) => {
    if (row.file_path && fs.existsSync(row.file_path)) {
      fs.unlinkSync(row.file_path);
    }
  });
  await db.query('DELETE FROM attachments WHERE transaction_id = $1', [req.params.id]);
  await db.query('DELETE FROM transactions WHERE id = $1', [req.params.id]);
  res.json({ message: 'Transaction removed' });
});

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, config.uploadDir),
  filename: (_, file, cb) => {
    const unique = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
    cb(null, unique);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: config.uploadMaxBytes },
  fileFilter: (_, file, cb) => {
    if (!config.uploadAllowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error('Unsupported file type'));
    }
    cb(null, true);
  }
});

router.post('/:id/receipt', authenticate, (req, res, next) => {
  upload.single('receipt')(req, res, async (err) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? 'Receipt exceeds size limit' : err.message;
      return res.status(400).json({ message });
    }
    try {
      const {
        rows: [transaction]
      } = await db.query(
        `SELECT t.* FROM transactions t JOIN budgets b ON b.id = t.budget_id
         WHERE t.id = $1 AND b.owner_id = $2`,
        [req.params.id, req.user.id]
      );
      if (!transaction) {
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(404).json({ message: 'Transaction not found' });
      }
      if (!req.file) {
        return res.status(400).json({ message: 'Missing receipt file' });
      }
      const uploadedAt = now();
      const {
        rows: [attachment]
      } = await db.query(
        `INSERT INTO attachments (transaction_id, file_name, mime_type, file_path, uploaded_at)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [transaction.id, req.file.originalname, req.file.mimetype, req.file.path, uploadedAt]
      );
      await db.query('UPDATE transactions SET receipt_path = $1 WHERE id = $2', [req.file.path, transaction.id]);
      res.status(201).json({ attachmentId: attachment.id, path: req.file.path });
    } catch (error) {
      next(error);
    }
  });
});

router.get('/:id/receipt', authenticate, async (req, res) => {
  const {
    rows: [attachment]
  } = await db.query(
    `SELECT a.* FROM attachments a
     JOIN transactions t ON t.id = a.transaction_id
     JOIN budgets b ON b.id = t.budget_id
     WHERE t.id = $1 AND b.owner_id = $2
     ORDER BY a.uploaded_at DESC
     LIMIT 1`,
    [req.params.id, req.user.id]
  );
  if (!attachment) {
    return res.status(404).json({ message: 'Receipt not found' });
  }
  res.setHeader('Content-Type', attachment.mime_type);
  res.setHeader('Content-Disposition', `inline; filename="${attachment.file_name}"`);
  fs.createReadStream(attachment.file_path).pipe(res);
});

export default router;
