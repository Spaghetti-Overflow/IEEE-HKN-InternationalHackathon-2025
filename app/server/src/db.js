import { Pool } from 'pg';
import fs from 'fs';
import { config } from './config.js';

if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

const poolConfig = config.databaseUrl
  ? {
      connectionString: config.databaseUrl,
      ssl: config.dbSsl ? { rejectUnauthorized: false } : false
    }
  : {
      host: config.dbHost,
      port: config.dbPort,
      user: config.dbUser,
      password: config.dbPassword,
      database: config.dbName,
      ssl: config.dbSsl ? { rejectUnauthorized: false } : false
    };

export const pool = new Pool(poolConfig);

export const db = {
  query: (text, params = []) => pool.query(text, params)
};

export async function initializeDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        display_name TEXT,
        timezone TEXT DEFAULT 'UTC',
        created_at BIGINT NOT NULL
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS budgets (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        academic_year_start BIGINT NOT NULL,
        academic_year_end BIGINT NOT NULL,
        allocated_amount INTEGER NOT NULL DEFAULT 0,
        owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at BIGINT NOT NULL
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        budget_id INTEGER NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        allocated_amount INTEGER DEFAULT 0,
        start_ts BIGINT,
        end_ts BIGINT,
        notes TEXT
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        budget_id INTEGER NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
        event_id INTEGER REFERENCES events(id) ON DELETE SET NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        type TEXT CHECK (type IN ('income','expense')) NOT NULL,
        status TEXT CHECK (status IN ('actual','planned','recurring')) NOT NULL DEFAULT 'actual',
        amount_cents INTEGER NOT NULL,
        category TEXT NOT NULL,
        notes TEXT,
        timestamp BIGINT NOT NULL,
        recurrence_rule TEXT,
        receipt_path TEXT,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS deadlines (
        id SERIAL PRIMARY KEY,
        budget_id INTEGER NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        due_timestamp BIGINT NOT NULL,
        category TEXT,
        status TEXT CHECK (status IN ('open','submitted','won','lost')) DEFAULT 'open',
        link TEXT,
        created_at BIGINT NOT NULL
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS attachments (
        id SERIAL PRIMARY KEY,
        transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
        file_name TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        file_path TEXT NOT NULL,
        uploaded_at BIGINT NOT NULL
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_transactions_budget ON transactions(budget_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_transactions_event ON transactions(event_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_deadlines_budget ON deadlines(budget_id)');
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
