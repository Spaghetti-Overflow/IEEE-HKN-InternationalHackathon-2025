import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { db } from '../db.js';
import { config } from '../config.js';
import { now, isValidTimezone } from '../utils/time.js';
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

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many auth attempts. Please wait before retrying.' }
});

const registerValidators = [
  body('username').isLength({ min: 3 }).withMessage('Username too short'),
  body('password').isLength({ min: 6 }).withMessage('Password too short'),
  body('displayName').optional().isLength({ min: 2 }),
  body('timezone')
    .optional()
    .isString()
    .custom((value) => isValidTimezone(value))
    .withMessage('Invalid timezone')
];

router.post('/register', authLimiter, registerValidators, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password, displayName, timezone } = req.body;
  const {
    rows: [existing]
  } = await db.query('SELECT id FROM users WHERE username = $1', [username]);
  if (existing) {
    return res.status(409).json({ message: 'Username already taken' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const {
    rows: [created]
  } = await db.query(
    `INSERT INTO users (username, password_hash, display_name, timezone, created_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, username, display_name, timezone`,
    [username, passwordHash, displayName || username, timezone || 'UTC', now()]
  );
  const session = issueSession(res, created);
  return res.status(201).json({ user: formatUser(created), session });
});

router.post(
  '/login',
  authLimiter,
  [body('username').notEmpty(), body('password').notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;
    const {
      rows: [user]
    } = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const session = issueSession(res, user);
    return res.json({ user: formatUser(user), session });
  }
);

router.get('/me', authenticate, async (req, res) => {
  const {
    rows: [user]
  } = await db.query('SELECT id, username, display_name, timezone FROM users WHERE id = $1', [req.user.id]);
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
