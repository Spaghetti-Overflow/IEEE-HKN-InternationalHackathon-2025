import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  port: process.env.PORT ? Number(process.env.PORT) : 4000,
  databasePath: process.env.DATABASE_PATH || path.resolve(__dirname, '../data/budget.db'),
  jwtSecret: process.env.JWT_SECRET || 'change_this_secret',
  uploadDir: process.env.UPLOAD_DIR || path.resolve(__dirname, '../data/uploads'),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  authCookieName: process.env.AUTH_COOKIE_NAME || 'hkn_budget_token',
  authTokenTtlSeconds: process.env.AUTH_TOKEN_TTL ? Number(process.env.AUTH_TOKEN_TTL) : 60 * 60 * 12,
  authCookieSecure: process.env.AUTH_COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production'
};

config.authCookieMaxAgeMs = config.authTokenTtlSeconds * 1000;
