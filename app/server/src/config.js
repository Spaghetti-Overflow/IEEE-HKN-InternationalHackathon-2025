import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret === 'change_this_secret') {
  throw new Error('JWT_SECRET must be set to a non-default value');
}

const uploadDir = process.env.UPLOAD_DIR || path.resolve(__dirname, '../data/uploads');
const uploadMaxBytes = process.env.UPLOAD_MAX_BYTES ? Number(process.env.UPLOAD_MAX_BYTES) : 5 * 1024 * 1024;
const uploadAllowedMimeTypes = (process.env.UPLOAD_ALLOWED_MIME_TYPES || 'image/jpeg,image/png,application/pdf')
  .split(',')
  .map((type) => type.trim())
  .filter(Boolean);
const clientOrigins = (process.env.CLIENT_ORIGINS || process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const clientOriginPatterns = (process.env.CLIENT_ORIGIN_PATTERNS || '')
  .split(',')
  .map((pattern) => pattern.trim())
  .filter(Boolean);

export const config = {
  port: process.env.PORT ? Number(process.env.PORT) : 4000,
  databaseUrl: process.env.DATABASE_URL || null,
  dbHost: process.env.PGHOST || 'postgres',
  dbPort: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
  dbUser: process.env.PGUSER || 'postgres',
  dbPassword: process.env.PGPASSWORD || 'postgres',
  dbName: process.env.PGDATABASE || 'budgetdb',
  dbSsl: process.env.PGSSL === 'true',
  jwtSecret,
  uploadDir,
  uploadMaxBytes,
  uploadAllowedMimeTypes,
  clientOrigin: clientOrigins[0],
  clientOrigins,
  clientOriginPatterns,
  authCookieName: process.env.AUTH_COOKIE_NAME || 'hkn_budget_token',
  authTokenTtlSeconds: process.env.AUTH_TOKEN_TTL ? Number(process.env.AUTH_TOKEN_TTL) : 60 * 60 * 12,
  authCookieSecure:
    process.env.AUTH_COOKIE_SECURE !== undefined
      ? process.env.AUTH_COOKIE_SECURE === 'true'
      : process.env.NODE_ENV === 'production',
  totpIssuer: process.env.TOTP_ISSUER || 'Budget HQ'
};

config.authCookieMaxAgeMs = config.authTokenTtlSeconds * 1000;
