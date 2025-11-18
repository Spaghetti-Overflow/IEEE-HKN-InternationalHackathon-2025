import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { db } from '../db.js';
import { config } from '../config.js';
import { now } from '../utils/time.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

function formatUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    timezone: row.timezone
  };
}

function issueSession(res, user) {
  const payload = { id: user.id, username: user.username, timezone: user.timezone };
  const token = jwt.sign(payload, config.jwtSecret, { expiresIn: config.authTokenTtlSeconds });
  res.cookie(config.authCookieName, token, {
    httpOnly: true,
    secure: config.authCookieSecure,
    sameSite: 'lax',
    maxAge: config.authCookieMaxAgeMs
  });
  return { expiresAt: Date.now() + config.authCookieMaxAgeMs };
}

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

  const createdUser = db
    .prepare('SELECT id, username, display_name, timezone FROM users WHERE id = ?')
    .get(info.lastInsertRowid);
  const session = issueSession(res, createdUser);
  return res.status(201).json({ user: formatUser(createdUser), session });
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

    const session = issueSession(res, user);
    return res.json({ user: formatUser(user), session });
  }
);

router.get('/me', authenticate, (req, res) => {
  const user = db.prepare('SELECT id, username, display_name, timezone FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  res.json({ user: formatUser(user) });
});

router.post('/logout', authenticate, (req, res) => {
  res.clearCookie(config.authCookieName, {
    httpOnly: true,
    secure: config.authCookieSecure,
    sameSite: 'lax'
  });
  res.json({ message: 'Logged out' });
});

export default router;
