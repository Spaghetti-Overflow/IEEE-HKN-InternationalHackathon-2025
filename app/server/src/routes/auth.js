import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { db } from '../db.js';
import { config } from '../config.js';
import { now, isValidTimezone } from '../utils/time.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
authenticator.options = { window: 1 };
const totpIssuer = config.totpIssuer || 'Budget HQ';

function formatUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    timezone: row.timezone,
    totpEnabled: Boolean(row.totp_enabled)
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

function issueTotpChallenge(user) {
  return jwt.sign(
    { id: user.id, username: user.username, purpose: 'totp' },
    config.jwtSecret,
    { expiresIn: 5 * 60 }
  );
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
     RETURNING id, username, display_name, timezone, totp_enabled`,
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

    if (user.totp_enabled) {
      const challengeToken = issueTotpChallenge(user);
      return res.json({ requiresTotp: true, challengeToken });
    }

    const session = issueSession(res, user);
    return res.json({ user: formatUser(user), session });
  }
);

router.post(
  '/login/totp',
  authLimiter,
  [body('challengeToken').notEmpty(), body('code').isLength({ min: 6, max: 6 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { challengeToken, code } = req.body;
    let payload;
    try {
      payload = jwt.verify(challengeToken, config.jwtSecret);
    } catch (error) {
      return res.status(401).json({ message: 'Challenge expired. Sign in again.' });
    }

    if (payload.purpose !== 'totp') {
      return res.status(400).json({ message: 'Invalid challenge context' });
    }

    const {
      rows: [user]
    } = await db.query('SELECT * FROM users WHERE id = $1', [payload.id]);
    if (!user || !user.totp_enabled || !user.totp_secret) {
      return res.status(401).json({ message: 'Two-factor authentication not available for this user' });
    }

    const isValid = authenticator.verify({ token: code, secret: user.totp_secret });
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid verification code' });
    }

    const session = issueSession(res, user);
    return res.json({ user: formatUser(user), session });
  }
);

router.post('/totp/setup', authenticate, async (req, res) => {
  try {
    const {
      rows: [user]
    } = await db.query('SELECT id, username, totp_enabled FROM users WHERE id = $1', [req.user.id]);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.totp_enabled) {
      return res.status(400).json({ message: 'Two-factor authentication already enabled' });
    }

    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(user.username, totpIssuer, secret);
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl);

    await db.query('UPDATE users SET totp_secret = $1, totp_enabled = FALSE WHERE id = $2', [secret, req.user.id]);

    res.json({ secret, otpauthUrl, qrDataUrl });
  } catch (error) {
    console.error('TOTP setup failed', error);
    res.status(500).json({ message: 'Failed to prepare two-factor setup' });
  }
});

router.post(
  '/totp/verify',
  authenticate,
  [body('code').isLength({ min: 6, max: 6 }).withMessage('Enter the 6-digit code from your authenticator app')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { code } = req.body;
      const {
        rows: [user]
      } = await db.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
      if (!user || !user.totp_secret) {
        return res.status(400).json({ message: 'Generate a setup QR before verifying.' });
      }

      const isValid = authenticator.verify({ token: code, secret: user.totp_secret });
      if (!isValid) {
        return res.status(400).json({ message: 'Invalid or expired code' });
      }

      const {
        rows: [updated]
      } = await db.query(
        'UPDATE users SET totp_enabled = TRUE, totp_verified_at = $1 WHERE id = $2 RETURNING id, username, display_name, timezone, totp_enabled',
        [now(), req.user.id]
      );

      res.json({ message: 'Two-factor authentication enabled', user: formatUser(updated) });
    } catch (error) {
      console.error('TOTP verify failed', error);
      res.status(500).json({ message: 'Could not verify code' });
    }
  }
);

router.post(
  '/totp/disable',
  authenticate,
  [body('code').isLength({ min: 6, max: 6 }).withMessage('Enter a valid 6-digit code to confirm.')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { code } = req.body;
      const {
        rows: [user]
      } = await db.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
      if (!user || !user.totp_enabled || !user.totp_secret) {
        return res.status(400).json({ message: 'Two-factor authentication is not enabled yet' });
      }

      const isValid = authenticator.verify({ token: code, secret: user.totp_secret });
      if (!isValid) {
        return res.status(400).json({ message: 'Invalid verification code' });
      }

      const {
        rows: [updated]
      } = await db.query(
        `UPDATE users
           SET totp_secret = NULL,
               totp_enabled = FALSE,
               totp_verified_at = NULL
         WHERE id = $1
         RETURNING id, username, display_name, timezone, totp_enabled`,
        [req.user.id]
      );

      res.json({ message: 'Two-factor authentication disabled', user: formatUser(updated) });
    } catch (error) {
      console.error('TOTP disable failed', error);
      res.status(500).json({ message: 'Could not disable two-factor authentication' });
    }
  }
);

router.get('/me', authenticate, async (req, res) => {
  const {
    rows: [user]
  } = await db.query('SELECT id, username, display_name, timezone, totp_enabled FROM users WHERE id = $1', [req.user.id]);
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

router.get('/export-token', authenticate, (req, res) => {
  const token = jwt.sign({ id: req.user.id, username: req.user.username }, config.jwtSecret, { expiresIn: '5m' });
  res.json({ token });
});

export default router;
