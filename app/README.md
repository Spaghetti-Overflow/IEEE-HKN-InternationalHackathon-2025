# Smart Budget Scheduler (IEEE-HKN Budget Hack 2025)

Full-stack web app (React + Express + PostgreSQL) that helps IEEE-HKN chapters plan yearly budgets, track expenses/incomes in real time, monitor funding deadlines, and visualize spending trends across academic years.

## Architecture

- **Client**: Vite + React 18, React Router, Recharts, Axios.
- **Server**: Express 4, PostgreSQL (`pg` pool), JWT auth, PDFKit for reporting, Multer for receipt uploads.
- **Database**: PostgreSQL with tables for users, budgets, events, transactions, deadlines, attachments.
- **Auth**: Username/password with bcrypt hashing and JWT sessions stored in HTTP-only cookies (configurable TTL + secure flag).

```
app/
├─ client/   # React SPA
└─ server/   # Express API + PostgreSQL
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
| Authentication | ✅ | Register/login, password hashing, JWT stored in HTTP-only cookies, timezone auto-capture. |
| Academic year linkage | ✅ | Budgets auto-bound to academic years; archived section exposes older years. |
| Local time display | ✅ | Timestamps stored as UNIX seconds; browser timezone captured and UI renders local strings. |
| Containerization | ✅ | Dockerfiles + docker-compose spin up client, server, and PostgreSQL in one command. |

## Requirements

- Node.js 18+
- npm 10+
- PostgreSQL 15+ (not needed if you run the Docker stack)

## Local development (without Docker)

### Server (`app/server`)

1. Copy environment template:
   ```bash
   cd app/server
   cp .env.example .env
   ```
   > Configure either `DATABASE_URL` or the granular `PG*` vars so the API can reach PostgreSQL. Sessions rely on HTTP-only cookies; ensure `CLIENT_ORIGIN` matches the React URL and tune `AUTH_TOKEN_TTL` / `AUTH_COOKIE_SECURE` for your environment.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Ensure PostgreSQL is running (local service or Docker) and seed demo data (creates `demo` / `hackathon` credentials):
   ```bash
   npm run db:seed
   ```
4. Run API:
   ```bash
   npm run dev
   ```

API defaults to `http://localhost:4000`. File uploads are stored under `server/data/uploads/` (auto-created).

### Client (`app/client`)

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

## Authentication & seed data

- `npm run db:seed` (or `make seed`) creates a demo account with **username** `demo` and **password** `hackathon`. This is handy for quick logins during testing.
- You can register additional users via the UI; credentials are stored in PostgreSQL with bcrypt hashing.
- Sessions are JWT-based and stored in `httpOnly` cookies. The signing secret defaults to `supersecretkey` but should be overridden via `JWT_SECRET` in production.
- Logout simply clears the cookie; there’s no refresh-token store yet, so revocation happens when tokens expire (configurable via `AUTH_TOKEN_TTL`).

## Docker (client + server + PostgreSQL)

Services:

- **postgres**: Official `postgres:16-alpine`, persists data in the `postgres_data` named volume and exposes port `5432` for admin tools.
- **server**: Express API running on port `4000`, mounting an `uploads_data` volume for receipts.
- **client**: Nginx container serving the built React app on `http://localhost:5173`. API calls default to `http://localhost:4000` but can be overridden by setting `CLIENT_API_URL` before running `make up` / `docker compose`.

Environment defaults (`docker-compose.yml`) are suitable for local development; override them via an `app/.env` file (e.g., `CLIENT_API_URL=https://api.example.com`) if you need a different API origin. The first build installs dependencies and compiles the client bundle; subsequent `docker compose up` runs reuse cached layers.

## Makefile shortcuts

If you prefer a single entry point, `app/Makefile` wraps Compose (run these commands from the `app/` directory):

| Command | Description |
| --- | --- |
| `make up` | Build images (including `npm ci`) and start all three services in detached mode. |
| `make down` | Stop containers but **keep** named volumes (Postgres data + uploads). Safe for daily use. |
| `make clean` | Stop containers **and** remove volumes. Use when you want a fresh database/upload folder. |
| `make logs` | Tail logs from all services. |
| `make ps` | Show container status. |
| `make seed` | Run the API seed script in a one-off container (creates `demo`/`hackathon`). |
| `make server-shell` / `make client-shell` / `make db-shell` | Drop into a shell/psql inside the running containers for debugging. |

> **Persistence:** Because Compose uses named volumes (`postgres_data`, `uploads_data`), database rows and uploaded files survive `make down`. They are only deleted if you run `make clean` or manually prune volumes.

## Accessing services

- React client: <http://localhost:5173>
- Express API: <http://localhost:4000>
- PostgreSQL: `localhost:5432` (user `postgres`, password `postgres`, db `budgetdb` by default)

All services share Docker's default bridge network, so inter-container DNS names work automatically (`server` talks to `postgres`, the client bundle calls `http://server:4000`).

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
| POST | `/api/auth/login` | Start cookie session + return profile. |
| GET | `/api/auth/me` | Resolve the signed-in user via cookie. |
| POST | `/api/auth/logout` | Clear the session cookie. |
| GET | `/api/budgets` | List budgets with academic metadata + balances. |
| GET | `/api/budgets/archived` | Filtered archived budgets. |
| CRUD | `/api/transactions` | Income/expense management + receipt upload (`/receipt`). |
| CRUD | `/api/events` | Event-linked budgeting. |
| CRUD | `/api/deadlines` | Funding deadlines. |
| GET | `/api/analytics/overview` | Category + monthly trend + deadline stats. |
| GET | `/api/exports/budget/:id/(csv|pdf)` | Budget exports. |

All timestamps are UNIX seconds; the browser timezone is sent via `X-User-Timezone` and persisted per user to honor local displays.

## Next Steps

- [ ] Add automated tests + CI to cover auth, budgets, transactions, and exports.
- [ ] Harden file-upload handling (virus scanning, size quotas, S3 offload).
- [ ] Optional: role-based access, advanced auth, and admin tooling for categories/users.

Have fun budgeting! 🎯
