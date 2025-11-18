import bcrypt from 'bcryptjs';
import { db, initializeDatabase, pool } from '../db.js';
import { now, getAcademicYearBounds } from '../utils/time.js';

async function seed() {
  await initializeDatabase();

  const {
    rows: [existing]
  } = await db.query('SELECT id FROM users WHERE username = $1', ['demo']);

  if (existing) {
    console.log('Demo user already exists');
    return;
  }

  const passwordHash = bcrypt.hashSync('hackathon', 10);
  const academic = getAcademicYearBounds();

  const {
    rows: [user]
  } = await db.query(
    `INSERT INTO users (username, password_hash, display_name, timezone, created_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    ['demo', passwordHash, 'Demo User', 'America/New_York', now()]
  );

  const {
    rows: [budget]
  } = await db.query(
    `INSERT INTO budgets (name, academic_year_start, academic_year_end, allocated_amount, owner_id, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    ['Default Chapter Budget', academic.start, academic.end, 500000, user.id, now()]
  );

  await db.query(
    `INSERT INTO transactions (budget_id, user_id, type, status, amount_cents, category, notes, timestamp, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [budget.id, user.id, 'income', 'actual', 200000, 'University grant', 'Initial grant', now(), now(), now()]
  );

  await db.query(
    `INSERT INTO transactions (budget_id, user_id, type, status, amount_cents, category, notes, timestamp, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      budget.id,
      user.id,
      'expense',
      'planned',
      50000,
      'Workshops',
      'Planned workshop supplies',
      now() + 86400 * 30,
      now(),
      now()
    ]
  );

  await db.query(
    `INSERT INTO deadlines (budget_id, title, description, due_timestamp, category, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [budget.id, 'Grant submission', 'Submit paperwork to university', now() + 86400 * 15, 'Grant', 'open', now()]
  );

  console.log('Seeded demo user (username: demo, password: hackathon)');
}

seed()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
