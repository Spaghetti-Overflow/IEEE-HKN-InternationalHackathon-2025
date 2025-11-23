import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { db } from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roles.js';
import { now } from '../utils/time.js';

const router = Router();

// Get all users (admin only)
router.get('/users', authenticate, requireAdmin, async (req, res) => {
  const { rows } = await db.query(`
    SELECT id, username, display_name, role, timezone, 
           totp_enabled, oauth_provider, created_at
    FROM users
    ORDER BY created_at DESC
  `);
  res.json(rows);
});

// Update user (admin only)
router.patch('/users/:id', authenticate, requireAdmin, [
  body('role').optional().isIn(['admin', 'treasurer', 'member']),
  body('display_name').optional().trim(),
  body('timezone').optional().trim()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { role, display_name, timezone } = req.body;

  // Prevent removing last admin
  if (role && role !== 'admin') {
    const { rows: admins } = await db.query(`SELECT COUNT(*) as count FROM users WHERE role = 'admin'`);
    const { rows: targetUser } = await db.query(`SELECT role FROM users WHERE id = $1`, [id]);
    
    if (targetUser[0]?.role === 'admin' && parseInt(admins[0].count) <= 1) {
      return res.status(400).json({ message: 'Cannot remove the last admin' });
    }
  }

  // Build dynamic update query
  const updates = [];
  const values = [];
  let paramCount = 1;

  if (role !== undefined) {
    updates.push(`role = $${paramCount++}`);
    values.push(role);
  }
  if (display_name !== undefined) {
    updates.push(`display_name = $${paramCount++}`);
    values.push(display_name);
  }
  if (timezone !== undefined) {
    updates.push(`timezone = $${paramCount++}`);
    values.push(timezone);
  }

  if (updates.length === 0) {
    return res.status(400).json({ message: 'No fields to update' });
  }

  values.push(id);
  await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount}`, values);
  res.json({ message: 'User updated successfully' });
});

// Delete user (admin only)
router.delete('/users/:id', authenticate, requireAdmin, async (req, res) => {
  const { id } = req.params;

  // Prevent deleting last admin
  const { rows: admins } = await db.query(`SELECT COUNT(*) as count FROM users WHERE role = 'admin'`);
  const { rows: targetUser } = await db.query(`SELECT role FROM users WHERE id = $1`, [id]);
  
  if (targetUser[0]?.role === 'admin' && parseInt(admins[0].count) <= 1) {
    return res.status(400).json({ message: 'Cannot delete the last admin' });
  }

  // Prevent self-deletion
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ message: 'Cannot delete your own account' });
  }

  await db.query('DELETE FROM users WHERE id = $1', [id]);
  res.json({ message: 'User deleted' });
});

// Get all categories (admin only)
router.get('/categories', authenticate, requireAdmin, async (req, res) => {
  const { rows } = await db.query('SELECT * FROM categories ORDER BY name ASC');
  res.json(rows);
});

// Create category (admin only)
router.post('/categories', authenticate, requireAdmin, [
  body('name').notEmpty().trim(),
  body('type').isIn(['income', 'expense', 'both'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, type } = req.body;
  const { rows } = await db.query(
    'INSERT INTO categories (name, type, created_at) VALUES ($1, $2, $3) RETURNING *',
    [name, type, now()]
  );
  res.status(201).json(rows[0]);
});

// Update category (admin only)
router.patch('/categories/:id', authenticate, requireAdmin, [
  body('name').optional().notEmpty().trim(),
  body('type').optional().isIn(['income', 'expense', 'both'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { name, type } = req.body;
  
  const updates = [];
  const values = [];
  let paramCount = 1;
  
  if (name !== undefined) {
    updates.push(`name = $${paramCount++}`);
    values.push(name);
  }
  if (type !== undefined) {
    updates.push(`type = $${paramCount++}`);
    values.push(type);
  }
  
  if (updates.length === 0) {
    return res.status(400).json({ message: 'No fields to update' });
  }
  
  values.push(id);
  await db.query(`UPDATE categories SET ${updates.join(', ')} WHERE id = $${paramCount}`, values);
  res.json({ message: 'Category updated' });
});

// Delete category (admin only)
router.delete('/categories/:id', authenticate, requireAdmin, async (req, res) => {
  const { id } = req.params;
  await db.query('DELETE FROM categories WHERE id = $1', [id]);
  res.json({ message: 'Category deleted' });
});

// Get app settings (admin only)
router.get('/settings', authenticate, requireAdmin, async (req, res) => {
  const { rows } = await db.query('SELECT * FROM app_settings');
  const settings = rows.reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});
  res.json(settings);
});

// Update app settings (admin only)
router.post('/settings', authenticate, requireAdmin, [
  body('theme').optional().isString(),
  body('logo_url').optional().isString(),
  body('primary_color').optional().isString(),
  body('organization_name').optional().isString()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const timestamp = now();
  const settings = req.body;

  for (const [key, value] of Object.entries(settings)) {
    await db.query(`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = $3
    `, [key, value, timestamp]);
  }

  res.json({ message: 'Settings updated' });
});

// Get system stats (admin only)
router.get('/stats', authenticate, requireAdmin, async (req, res) => {
  const { rows: userStats } = await db.query('SELECT COUNT(*) as total FROM users');
  const { rows: budgetStats } = await db.query('SELECT COUNT(*) as total FROM budgets');
  const { rows: transactionStats } = await db.query('SELECT COUNT(*) as total FROM transactions');
  const { rows: roleDistribution } = await db.query(`
    SELECT role, COUNT(*) as count 
    FROM users 
    GROUP BY role
    ORDER BY role
  `);

  res.json({
    users: parseInt(userStats[0].total),
    budgets: parseInt(budgetStats[0].total),
    transactions: parseInt(transactionStats[0].total),
    roleDistribution: roleDistribution.map(r => ({ role: r.role, count: parseInt(r.count) }))
  });
});

export default router;
