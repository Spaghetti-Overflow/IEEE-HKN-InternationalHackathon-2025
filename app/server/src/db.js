import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { config } from './config.js';

const dataDir = path.dirname(config.databasePath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

const db = new Database(config.databasePath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const tableStatements = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    timezone TEXT DEFAULT 'UTC',
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    academic_year_start INTEGER NOT NULL,
    academic_year_end INTEGER NOT NULL,
    allocated_amount INTEGER NOT NULL DEFAULT 0,
    owner_id INTEGER,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(owner_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    budget_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    allocated_amount INTEGER DEFAULT 0,
    start_ts INTEGER,
    end_ts INTEGER,
    notes TEXT,
    FOREIGN KEY(budget_id) REFERENCES budgets(id)
  )`,
  `CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    budget_id INTEGER NOT NULL,
    event_id INTEGER,
    user_id INTEGER,
    type TEXT CHECK(type IN ('income','expense')) NOT NULL,
    status TEXT CHECK(status IN ('actual','planned','recurring')) NOT NULL DEFAULT 'actual',
    amount_cents INTEGER NOT NULL,
    category TEXT NOT NULL,
    notes TEXT,
    timestamp INTEGER NOT NULL,
    recurrence_rule TEXT,
    receipt_path TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(budget_id) REFERENCES budgets(id),
    FOREIGN KEY(event_id) REFERENCES events(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS deadlines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    budget_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_timestamp INTEGER NOT NULL,
    category TEXT,
    status TEXT CHECK(status IN ('open','submitted','won','lost')) DEFAULT 'open',
    link TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(budget_id) REFERENCES budgets(id)
  )`,
  `CREATE TABLE IF NOT EXISTS attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_path TEXT NOT NULL,
    uploaded_at INTEGER NOT NULL,
    FOREIGN KEY(transaction_id) REFERENCES transactions(id)
  )`
];

tableStatements.forEach((sql) => db.prepare(sql).run());

db.prepare('CREATE INDEX IF NOT EXISTS idx_transactions_budget ON transactions(budget_id)').run();
db.prepare('CREATE INDEX IF NOT EXISTS idx_transactions_event ON transactions(event_id)').run();
db.prepare('CREATE INDEX IF NOT EXISTS idx_deadlines_budget ON deadlines(budget_id)').run();

db.function('to_cents', (value) => Math.round(Number(value || 0) * 100));

db.function('from_cents', (value) => (Number(value || 0) / 100));

export { db };
