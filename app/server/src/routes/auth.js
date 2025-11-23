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
    role: row.role || 'member',
    totpEnabled: Boolean(row.totp_enabled),
    oauthProvider: row.oauth_provider
  };
}

function issueSession(res, user) {
  const payload = { 
    id: user.id, 
    username: user.username, 
    timezone: user.timezone,
    role: user.role || 'member'
  };
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

// Check OAuth configuration status
router.get('/oauth/google/status', (req, res) => {
  const isConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  res.json({ 
    configured: isConfigured,
    message: isConfigured 
      ? 'Google OAuth is configured' 
      : 'Google OAuth is not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to the environment variables.'
  });
});

// OAuth initiation endpoint
router.get('/oauth/google', (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({ 
      message: 'Google OAuth is not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to the environment variables.',
      code: 'OAUTH_NOT_CONFIGURED'
    });
  }

  const redirectUri = `${process.env.PUBLIC_API_URL || 'http://localhost:4000'}/api/auth/oauth/google/callback`;
  const scope = 'openid email profile';
  const state = req.query.redirect_after || '/dashboard';

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(process.env.GOOGLE_CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scope)}` +
    `&state=${encodeURIComponent(state)}`;

  res.redirect(authUrl);
});

// OAuth callback handler (Google example)
router.get('/oauth/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) {
      return res.redirect(`${config.clientOrigin || 'http://localhost:5173'}/login?error=oauth_failed`);
    }

    // Exchange code for tokens (implement Google OAuth flow)
    // This is a placeholder - requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
    const googleUser = await exchangeGoogleCode(code);
    
    const { rows: [existing] } = await db.query(
      'SELECT * FROM users WHERE oauth_provider = $1 AND oauth_id = $2',
      ['google', googleUser.id]
    );

    let user;
    if (existing) {
      user = existing;
    } else {
      const { rows: [newUser] } = await db.query(`
        INSERT INTO users (username, password_hash, display_name, timezone, oauth_provider, oauth_id, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        googleUser.email,
        await bcrypt.hash(Math.random().toString(36), 10), // Random password for OAuth users
        googleUser.name,
        'UTC',
        'google',
        googleUser.id,
        now()
      ]);
      user = newUser;
    }

    issueSession(res, user);
    const redirectPath = state || '/dashboard';
    res.redirect(`${config.clientOrigin || 'http://localhost:5173'}${redirectPath}`);
  } catch (error) {
    console.error('OAuth error:', error);
    const clientOrigin = config.clientOrigin || 'http://localhost:5173';
    if (error.message.includes('Google OAuth not configured')) {
      return res.redirect(`${clientOrigin}/login?error=oauth_not_configured`);
    }
    res.redirect(`${clientOrigin}/login?error=oauth_failed`);
  }
});

// Placeholder for Google token exchange
async function exchangeGoogleCode(code) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error('Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.');
  }

  const redirectUri = `${process.env.PUBLIC_API_URL || 'http://localhost:4000'}/api/auth/oauth/google/callback`;

  // Exchange authorization code for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Failed to exchange authorization code: ${error}`);
  }

  const tokens = await tokenResponse.json();

  // Fetch user profile with access token
  const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` }
  });

  if (!profileResponse.ok) {
    throw new Error('Failed to fetch user profile from Google');
  }

  const profile = await profileResponse.json();
  
  return {
    id: profile.id,
    email: profile.email,
    name: profile.name || profile.email.split('@')[0],
    picture: profile.picture
  };
}

export default router;
