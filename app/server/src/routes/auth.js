import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { db } from '../db.js';
import { config } from '../config.js';
import { now } from '../utils/time.js';

const router = Router();

const registerValidators = [
  body('username').isLength({ min: 3 }).withMessage('Username too short'),
  body('password').isLength({ min: 6 }).withMessage('Password too short'),
  body('displayName').optional().isLength({ min: 2 }),
  body('timezone').optional().isString()
];

router.post('/register', registerValidators, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password, displayName, timezone } = req.body;
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ message: 'Username already taken' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const stmt = db.prepare(`
    INSERT INTO users (username, password_hash, display_name, timezone, created_at)
    VALUES (@username, @password_hash, @display_name, @timezone, @created_at)
  `);

  const info = stmt.run({
    username,
    password_hash: passwordHash,
    display_name: displayName || username,
    timezone: timezone || 'UTC',
    created_at: now()
  });

  const token = jwt.sign({ id: info.lastInsertRowid, username }, config.jwtSecret, { expiresIn: '12h' });
  return res.status(201).json({ token, user: { id: info.lastInsertRowid, username, displayName: displayName || username } });
});

router.post(
  '/login',
  [body('username').notEmpty(), body('password').notEmpty()],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, config.jwtSecret, { expiresIn: '12h' });
    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        timezone: user.timezone
      }
    });
  }
);

export default router;
