import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { now, getAcademicYearBounds } from '../utils/time.js';

function seed() {
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get('demo');
  if (!existing) {
    const passwordHash = bcrypt.hashSync('hackathon', 10);
    const info = db
      .prepare('INSERT INTO users (username, password_hash, display_name, timezone, created_at) VALUES (?, ?, ?, ?, ?)')
      .run('demo', passwordHash, 'Demo User', 'America/New_York', now());
    const academic = getAcademicYearBounds();
    const budget = db
      .prepare(
        'INSERT INTO budgets (name, academic_year_start, academic_year_end, allocated_amount, owner_id, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run('Default Chapter Budget', academic.start, academic.end, 500000, info.lastInsertRowid, now());
    db.prepare(
      `INSERT INTO transactions (budget_id, user_id, type, status, amount_cents, category, notes, timestamp, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(budget.lastInsertRowid, info.lastInsertRowid, 'income', 'actual', 200000, 'University grant', 'Initial grant', now(), now(), now());
    db.prepare(
      `INSERT INTO transactions (budget_id, user_id, type, status, amount_cents, category, notes, timestamp, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      budget.lastInsertRowid,
      info.lastInsertRowid,
      'expense',
      'planned',
      50000,
      'Workshops',
      'Planned workshop supplies',
      now() + 86400 * 30,
      now(),
      now()
    );
    db.prepare(
      'INSERT INTO deadlines (budget_id, title, description, due_timestamp, category, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(budget.lastInsertRowid, 'Grant submission', 'Submit paperwork to university', now() + 86400 * 15, 'Grant', 'open', now());
    console.log('Seeded demo user (username: demo, password: hackathon)');
  } else {
    console.log('Demo user already exists');
  }
}

seed();
