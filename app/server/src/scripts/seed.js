import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, pool } from '../db.js';
import { now, getAcademicYearBounds } from '../utils/time.js';
import { seedBase } from './seedBase.js';

export async function seedDemo() {
  await seedBase({ log: false });

  const {
    rows: [existing]
  } = await db.query('SELECT id FROM users WHERE username = $1', ['demo']);

  if (existing) {
    console.log('Demo user already exists');
    return existing;
  }

  const passwordHash = bcrypt.hashSync('hackathon', 10);
  const academic = getAcademicYearBounds();

  const {
    rows: [user]
  } = await db.query(
    `INSERT INTO users (username, password_hash, display_name, timezone, role, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    ['demo', passwordHash, 'Demo User', 'America/New_York', 'admin', now()]
  );

  const dayInSeconds = 86400;
  const seedTimestamp = now();
  const cents = (value) => Math.round(Number(value || 0) * 100);
  const daysFromSeed = (days = 0) => seedTimestamp + Math.round(days * dayInSeconds);

  const budgetConfigs = [
    { key: 'legacy', name: 'Legacy Scholarship Fund', allocated: 180000, academicTs: seedTimestamp - dayInSeconds * 370 },
    { key: 'outreach', name: 'STEM Outreach & Events', allocated: 220000, academicTs: seedTimestamp },
    { key: 'recruitment', name: 'Recruitment Sprint 2025', allocated: 160000, academicTs: seedTimestamp + dayInSeconds * 140 },
    { key: 'default', name: 'Default Chapter Budget', allocated: 520000, academicTs: academic.start }
  ];

  const budgetsByKey = {};

  for (const [index, config] of budgetConfigs.entries()) {
    const bounds = getAcademicYearBounds(config.academicTs);
    const createdAt = seedTimestamp + index;
    const {
      rows: [budgetRow]
    } = await db.query(
      `INSERT INTO budgets (name, academic_year_start, academic_year_end, allocated_amount, owner_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [config.name, bounds.start, bounds.end, cents(config.allocated), user.id, createdAt]
    );
    budgetsByKey[config.key] = budgetRow;
  }

  const eventConfigs = [
    {
      key: 'techSymposium',
      budget: 'default',
      name: 'Tech Symposium Showcase',
      allocated: 25000,
      startOffset: 35,
      endOffset: 36,
      notes: 'Joint event with the ECE department.'
    },
    {
      key: 'alumniGala',
      budget: 'default',
      name: 'Alumni Impact Gala',
      allocated: 32000,
      startOffset: -15,
      endOffset: -14,
      notes: 'Fundraising dinner with alumni speakers.'
    },
    {
      key: 'k12Roadshow',
      budget: 'outreach',
      name: 'K-12 STEM Roadshow',
      allocated: 18000,
      startOffset: 12,
      endOffset: 25,
      notes: 'Visiting three partner schools.'
    },
    {
      key: 'campusExpo',
      budget: 'outreach',
      name: 'Spring Campus Expo',
      allocated: 14000,
      startOffset: 55,
      endOffset: 56,
      notes: 'Hands-on demos and recruitment table.'
    },
    {
      key: 'hackathonBootcamp',
      budget: 'recruitment',
      name: 'New Member Hackathon Bootcamp',
      allocated: 20000,
      startOffset: 90,
      endOffset: 91,
      notes: 'Weekend onboarding sprint.'
    },
    {
      key: 'scholarshipBrunch',
      budget: 'legacy',
      name: 'Scholarship Awards Brunch',
      allocated: 12000,
      startOffset: -120,
      endOffset: -119,
      notes: 'Celebration for recipients and donors.'
    }
  ];

  const eventsByKey = {};
  for (const config of eventConfigs) {
    const {
      rows: [event]
    } = await db.query(
      `INSERT INTO events (budget_id, name, allocated_amount, start_ts, end_ts, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        budgetsByKey[config.budget].id,
        config.name,
        cents(config.allocated),
        config.startOffset !== undefined ? daysFromSeed(config.startOffset) : null,
        config.endOffset !== undefined ? daysFromSeed(config.endOffset) : null,
        config.notes || null
      ]
    );
    eventsByKey[config.key] = event;
  }

  const transactionConfigs = [
    { budget: 'default', type: 'income', status: 'actual', amount: 125000, category: 'University grant', notes: 'Annual allocation posted by finance.', daysOffset: -42 },
    { budget: 'default', type: 'income', status: 'actual', amount: 28000, category: 'Corporate sponsorship', notes: 'TekNova bronze sponsorship for symposium.', daysOffset: -18, event: 'alumniGala' },
    { budget: 'default', type: 'expense', status: 'actual', amount: 16300, category: 'Lab upgrades', notes: 'Soldering stations and RF kits.', daysOffset: -7 },
    { budget: 'default', type: 'expense', status: 'planned', amount: 4800, category: 'Catering', notes: 'Tech Symposium reception catering.', daysOffset: 32, event: 'techSymposium' },
    { budget: 'default', type: 'expense', status: 'recurring', amount: 950, category: 'Software subscriptions', notes: 'EDA + PM tool seats.', daysOffset: -3 },
    { budget: 'outreach', type: 'income', status: 'actual', amount: 15000, category: 'Community grant', notes: 'STEM equity micro-grant.', daysOffset: -25 },
    { budget: 'outreach', type: 'expense', status: 'actual', amount: 3200, category: 'Travel', notes: 'Vans + insurance for Roadshow.', daysOffset: -6, event: 'k12Roadshow' },
    { budget: 'outreach', type: 'expense', status: 'planned', amount: 5400, category: 'Printing', notes: 'Expo signage + take-home kits.', daysOffset: 48, event: 'campusExpo' },
    { budget: 'recruitment', type: 'income', status: 'planned', amount: 10000, category: 'Industry pledge', notes: 'Pending robotics sponsor.', daysOffset: 20 },
    { budget: 'recruitment', type: 'expense', status: 'planned', amount: 7800, category: 'Stipends', notes: 'Bootcamp mentor honoraria.', daysOffset: 85, event: 'hackathonBootcamp' },
    { budget: 'recruitment', type: 'expense', status: 'recurring', amount: 450, category: 'Snacks', notes: 'Weekly recruiting stand-ups.', daysOffset: 7 },
    { budget: 'legacy', type: 'income', status: 'actual', amount: 42000, category: 'Donations', notes: 'Annual alumni giving push.', daysOffset: -160, event: 'scholarshipBrunch' },
    { budget: 'legacy', type: 'expense', status: 'actual', amount: 28000, category: 'Scholarship awards', notes: 'Spring scholarship payouts.', daysOffset: -130 },
    { budget: 'legacy', type: 'expense', status: 'planned', amount: 1500, category: 'Marketing', notes: 'Highlight video editing.', daysOffset: -90 }
  ];

  for (const [index, tx] of transactionConfigs.entries()) {
    await db.query(
      `INSERT INTO transactions (budget_id, event_id, user_id, type, status, amount_cents, category, notes, timestamp, recurrence_rule, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        budgetsByKey[tx.budget].id,
        tx.event ? eventsByKey[tx.event].id : null,
        user.id,
        tx.type,
        tx.status,
        cents(tx.amount),
        tx.category,
        tx.notes || null,
        daysFromSeed(tx.daysOffset || 0),
        tx.recurrenceRule || null,
        seedTimestamp + index,
        seedTimestamp + index
      ]
    );
  }

  const deadlineConfigs = [
    {
      budget: 'default',
      title: 'IEEE Foundation grant narrative',
      description: 'Finalize and upload the STEM impact narrative.',
      dueOffset: 14,
      category: 'Grant',
      status: 'open',
      link: 'https://www.ieeefoundation.org/'
    },
    {
      budget: 'default',
      title: 'Corporate sponsor report',
      description: 'Send recap to TekNova with photos and outcomes.',
      dueOffset: -5,
      category: 'Report',
      status: 'submitted'
    },
    {
      budget: 'outreach',
      title: 'STEM night permit',
      description: 'City permit for robotics night at Jefferson High.',
      dueOffset: 4,
      category: 'Compliance',
      status: 'open'
    },
    {
      budget: 'recruitment',
      title: 'Bootcamp mentor contracts',
      description: 'Route contracts for signature and upload to DocuSign.',
      dueOffset: 32,
      category: 'Operations',
      status: 'open'
    },
    {
      budget: 'legacy',
      title: 'Scholarship fund thank-you letters',
      description: 'Mail handwritten notes to donors.',
      dueOffset: -45,
      category: 'Stewardship',
      status: 'won'
    },
    {
      budget: 'legacy',
      title: 'State compliance filing',
      description: 'Annual charity registration paperwork.',
      dueOffset: -2,
      category: 'Compliance',
      status: 'lost'
    }
  ];

  for (const [index, deadline] of deadlineConfigs.entries()) {
    await db.query(
      `INSERT INTO deadlines (budget_id, title, description, due_timestamp, category, status, link, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        budgetsByKey[deadline.budget].id,
        deadline.title,
        deadline.description || null,
        daysFromSeed(deadline.dueOffset),
        deadline.category || null,
        deadline.status || 'open',
        deadline.link || null,
        seedTimestamp + index
      ]
    );
  }

  console.log(
    `Seeded demo user (username: demo, password: hackathon) with ${budgetConfigs.length} budgets, ${eventConfigs.length} events, ${transactionConfigs.length} transactions, and ${deadlineConfigs.length} deadlines.`
  );
  return user;
}

async function runSeedDemo() {
  try {
    await seedDemo();
    console.log('Demo seed complete.');
  } catch (error) {
    console.error('Demo seed failed:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runSeedDemo();
}
