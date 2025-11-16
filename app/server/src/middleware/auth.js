import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { db } from '../db.js';

export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing token' });
  }

  const token = header.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    const timezone = req.headers['x-user-timezone'];
    if (timezone) {
      db.prepare('UPDATE users SET timezone = ? WHERE id = ?').run(timezone, decoded.id);
      req.user.timezone = timezone;
    }
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}
