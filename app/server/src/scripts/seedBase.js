import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, initializeDatabase, pool } from '../db.js';
import { now } from '../utils/time.js';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || process.env.BASE_SEED_ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || process.env.BASE_SEED_ADMIN_PASSWORD || 'changeme';
const ADMIN_DISPLAY_NAME = process.env.ADMIN_DISPLAY_NAME || process.env.BASE_SEED_ADMIN_DISPLAY_NAME || 'Chapter Admin';
const ADMIN_TIMEZONE = process.env.ADMIN_TIMEZONE || process.env.BASE_SEED_ADMIN_TIMEZONE || 'UTC';

export async function seedBase({ log = true } = {}) {
  await initializeDatabase();

  const {
    rows: [existing]
  } = await db.query('SELECT id, username FROM users WHERE username = $1', [ADMIN_USERNAME]);

  if (existing) {
    if (log) {
  console.log(`Base admin "${ADMIN_USERNAME}" already exists (skipping).`);
    }
    return existing;
  }

  const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, 10);

  const {
    rows: [user]
  } = await db.query(
    `INSERT INTO users (username, password_hash, display_name, timezone, created_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, username`,
  [ADMIN_USERNAME, passwordHash, ADMIN_DISPLAY_NAME, ADMIN_TIMEZONE, now()]
  );

  if (log) {
    console.log(
  `Created base admin "${ADMIN_USERNAME}" with temporary password "${ADMIN_PASSWORD}". Change it immediately after logging in.`
    );
  }

  return user;
}

async function runSeedBase() {
  try {
    await seedBase();
    console.log('Base seed complete.');
  } catch (error) {
    console.error('Base seed failed:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runSeedBase();
}
