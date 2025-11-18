import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { db } from '../db.js';
import { isValidTimezone } from '../utils/time.js';

export async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  let token = null;
  if (header?.startsWith('Bearer ')) {
    token = header.replace('Bearer ', '');
  } else if (req.cookies?.[config.authCookieName]) {
    token = req.cookies[config.authCookieName];
  }

  if (!token) {
    return res.status(401).json({ message: 'Missing token' });
  }
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    const timezone = req.headers['x-user-timezone'];
    if (timezone && isValidTimezone(timezone)) {
      await db.query('UPDATE users SET timezone = $1 WHERE id = $2', [timezone, decoded.id]);
      req.user.timezone = timezone;
    }
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}
