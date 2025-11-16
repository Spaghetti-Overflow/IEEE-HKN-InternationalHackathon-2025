# Smart Budget Scheduler (IEEE-HKN Budget Hack 2025)

Full-stack web app (React + Express + SQLite) that helps IEEE-HKN chapters plan yearly budgets, track expenses/incomes in real time, monitor funding deadlines, and visualize spending trends across academic years.

## Architecture

- **Client**: Vite + React 18, React Router, Recharts, Axios.
- **Server**: Express 4, better-sqlite3, JWT auth, PDFKit for reporting, Multer for receipt uploads.
- **Database**: SQLite (WAL mode) with tables for users, budgets, events, transactions, deadlines, attachments.
- **Auth**: Username/password with bcrypt hashing and JWT-based sessions.

```
app/
├─ client/   # React SPA
└─ server/   # Express API + SQLite
```

## Feature Checklist vs Requirements

| Area | Status | Notes |
| --- | --- | --- |
| Expense & income tracking | ✅ | CRUD for transactions with actual/planned/recurring statuses, categories, notes, event linkage, receipts. |
| Budget planning | ✅ | Actual & projected balances per budget, academic year metadata, archived section for previous years. |
| Report exports | ✅ | CSV + PDF downloads per budget. |
| Deadline tracking | ✅ | Deadline CRUD with status, due timestamps, external links, dedicated UI panel. |
| Event-linked budgeting | ✅ | Event CRUD with allocated budget plus actual/projected balances. |
| Multiple budgets | ✅ | Users can own many budgets, switch active one, browse archived academic years. |
| Receipt management | ✅ | Upload and view receipts (images/PDFs) per transaction. |
| Analytics & charts | ✅ | Category split bar chart + monthly trend line chart + deadline counters. |
| Authentication | ✅ | Register/login, password hashing, JWT, timezone auto-capture. |
| Academic year linkage | ✅ | Budgets auto-bound to academic years; archived section exposes older years. |
| Local time display | ✅ | Timestamps stored as UNIX seconds; browser timezone captured and UI renders local strings. |
| Containerization | 🔜 | Dockerfiles will follow after code stabilization. |

## Prerequisites

- Node.js 18+
- npm 10+

## Server Setup (`app/server`)

1. Copy environment template:
   ```bash
   cd app/server
   cp .env.example .env
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Seed demo data (creates `demo` user / `hackathon` password):
   ```bash
   npm run db:seed
   ```
4. Run API:
   ```bash
   npm run dev
   ```

API defaults to `http://localhost:4000`. File uploads are stored under `server/data/uploads/` (auto-created).

## Client Setup (`app/client`)

1. Copy environment template:
   ```bash
   cd app/client
   cp .env.example .env
   ```
   `VITE_API_URL` should match the Express server origin (no trailing `/api`).
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start dev server:
   ```bash
   npm run dev
   ```

Open the provided Vite URL (default `http://localhost:5173`).

## Demo Workflow

1. Register or log in with `demo` / `hackathon`.
2. Create a budget for the current academic year—or load the seeded one.
3. Add incomes/expenses (actual, planned, recurring) and link them to events.
4. Upload receipts, set grant deadlines, and monitor status in the dedicated panels.
5. Review analytics charts and export CSV/PDF reports for submissions.
6. Switch to archived academic years using the dedicated section.

## Key Endpoints

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/auth/register` | Create user (stores timezone). |
| POST | `/api/auth/login` | Obtain JWT. |
| GET | `/api/budgets` | List budgets with academic metadata + balances. |
| GET | `/api/budgets/archived` | Filtered archived budgets. |
| CRUD | `/api/transactions` | Income/expense management + receipt upload (`/receipt`). |
| CRUD | `/api/events` | Event-linked budgeting. |
| CRUD | `/api/deadlines` | Funding deadlines. |
| GET | `/api/analytics/overview` | Category + monthly trend + deadline stats. |
| GET | `/api/exports/budget/:id/(csv|pdf)` | Budget exports. |

All timestamps are UNIX seconds; the browser timezone is sent via `X-User-Timezone` and persisted per user to honor local displays.

## Next Steps

- [ ] Add Dockerfiles / docker-compose for one-command local spins.
- [ ] Expand README with deployment + docker instructions once available.
- [ ] Optional: role-based access, advanced auth, and admin tooling for categories/users.

Have fun budgeting! 🎯
