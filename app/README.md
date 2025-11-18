# Smart Budget Scheduler (IEEE-HKN Budget Hack 2025)

Full-stack web app (React + Express + PostgreSQL) that helps IEEE-HKN chapters plan yearly budgets, track expenses/incomes in real time, monitor funding deadlines, and visualize spending trends across academic years.

## Architecture

- **Client**: Vite + React 18, React Router, Recharts, Axios.
- **Server**: Express 4, PostgreSQL (`pg` pool), JWT auth, PDFKit for reporting, Multer for receipt uploads.
- **Database**: PostgreSQL with tables for users, budgets, events, transactions, deadlines, attachments.
- **Auth**: Username/password with bcrypt hashing and JWT sessions stored in HTTP-only cookies (configurable TTL + secure flag).

```
app/
├─ client/            # React SPA (Vite), builds to dist/ and ships via Nginx
├─ server/            # Express API, PostgreSQL schema bootstrap, seed scripts
├─ Makefile           # Wrapper around docker compose for common workflows
├─ docker-compose.yml # Orchestrates postgres, server, client
└─ .env.example       # Template for compose-level secrets (copy to .env)
```

## Project layout

- `app/client/` — Vite + React app, with routes under `src/pages`, context/hooks in `src/context` & `src/hooks`, and API helpers in `src/api`. Use `.env.example` here for dev-only variables like `VITE_API_URL`.
- `app/server/` — Express API, organized by `routes/`, `middleware/`, `utils/`, and `scripts/seed.js`. Contains its own `.env.example` for standalone development.
- `app/docker-compose.yml` — Production-ish stack (PostgreSQL, API, Nginx) that consumes `app/.env`.
- `app/Makefile` — Convenience targets (`make up`, `make seed`, `make server-shell`, etc.) that wrap Compose commands.
- `server/data/uploads/` — Persistent volume mount for receipt uploads when running locally without Docker.

Refer to the sections below for environment setup and command usage across these areas.

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

## Environment configuration & secrets

| Scope | Template | Purpose |
| --- | --- | --- |
| Compose stack | `app/.env.example` | Drives `docker-compose.yml` (Postgres credentials, JWT secret, origins, upload limits). Copy to `app/.env` and never commit the customized file. |
| Express API only | `app/server/.env.example` | Allows running the API outside Docker; configure either `DATABASE_URL` or the granular `PG*` variables plus auth settings. |
| React client only | `app/client/.env.example` | Provides `VITE_API_URL` (no `/api` suffix) for the dev server/build. |

Key variables to set for production or shared environments:

- `POSTGRES_PASSWORD`, `POSTGRES_USER` — Database credentials consumed by both Postgres and the API.
- `JWT_SECRET` — Strong secret for signing session cookies; validated at boot so it cannot use the default.
- `CLIENT_ORIGINS` — Comma-separated allow-list for browsers hitting the API with credentials; ensures stricter CORS.
- `AUTH_COOKIE_SECURE` — Set `true` when serving over HTTPS so cookies require TLS.
- `UPLOAD_MAX_BYTES`, `UPLOAD_ALLOWED_MIME_TYPES` — Limit receipts to safe size/types (defaults: 5 MB, JPEG/PNG/PDF).
- `CLIENT_API_URL` — Build-time origin for the client when baking Docker/Nginx images.

Compose automatically loads `app/.env` when you run `make up` or `docker compose up`. For local-only Vite/Express dev servers, use the per-app `.env` files. Keep real secrets in `.env` files (or environment variables in CI) and avoid committing them to git.

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
- After `make clean && make up && make seed`, you can immediately log in with `demo` / `hackathon`. Use this pair for smoke tests, then create real accounts via the UI once ready.
- You can register additional users via the UI; credentials are stored in PostgreSQL with bcrypt hashing.
- Sessions are JWT-based and stored in `httpOnly` cookies. The signing secret defaults to `supersecretkey` but should be overridden via `JWT_SECRET` in production.
- Logout simply clears the cookie; there’s no refresh-token store yet, so revocation happens when tokens expire (configurable via `AUTH_TOKEN_TTL`).

## Docker (client + server + PostgreSQL)

1. Copy the template and customize secrets:
   ```bash
   cd app
   cp .env.example .env
   # edit .env to set POSTGRES_PASSWORD, JWT_SECRET, CLIENT_ORIGIN, etc.
   ```
2. Bring everything up:
   ```bash
   make up
   ```

Services:

- **postgres**: Official `postgres:16-alpine`, persists data in the `postgres_data` named volume and exposes port `5432` for admin tools.
- **server**: Express API running on port `4000`, mounting an `uploads_data` volume for receipts.
- **client**: Nginx container serving the built React app on `http://localhost:5173`. API calls default to `http://localhost:4000` but can be overridden by setting `CLIENT_API_URL` before running `make up` / `docker compose`.

Environment defaults (`docker-compose.yml`) pull from `app/.env`. Keep the committed `.env.example` as a reference and *never* check in the customized `.env` with real credentials. The first build installs dependencies and compiles the client bundle; subsequent `docker compose up` runs reuse cached layers.

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

### Manual command reference

| Context | Command | Purpose |
| --- | --- | --- |
| API dev | `cd app/server && npm run dev` | Start Express with hot reload (uses `server/.env`). |
| API prod build | `cd app/server && npm run build` | _Not needed_ (runtime is plain Node); included for future bundling. |
| Seed data | `cd app/server && npm run db:seed` | Create demo user/budget in whichever database `server/.env` points to. |
| Client dev | `cd app/client && npm run dev` | Launch Vite dev server with proxy + HMR. |
| Client build preview | `cd app/client && npm run build && npm run preview` | Build SPA + preview locally before shipping. |
| Docker logs | `cd app && docker compose logs -f server` | Tail a specific service without Makefile wrappers. |

Feel free to translate these into CI/CD scripts or platform-specific automation.

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

## Security considerations for admins

- **Secrets & env files**: Keep `.env` files out of git. Rotate `JWT_SECRET`, database passwords, and `CLIENT_ORIGINS` per environment. The server refuses to boot if `JWT_SECRET` equals the template value.
- **Authentication**: Passwords are hashed with bcrypt; rate limiting guards `/auth/register` and `/auth/login`. HTTP-only cookies honor `AUTH_COOKIE_SECURE` and `SameSite=Lax`. Provide HTTPS + `AUTH_COOKIE_SECURE=true` for production.
- **CORS**: Only origins listed in `CLIENT_ORIGINS` may call the API with credentials. Update this list when adding staging/production frontends.
- **Uploads**: Receipts are stored on disk (volume-backed in Docker) with size/MIME limits enforced by Multer. Consider adding AV scanning or offloading to S3 for long-term storage.
- **Timezone header**: The API validates `X-User-Timezone` against the IANA database before persisting, preventing arbitrary strings from being written to the database.
- **Volumes & backups**: `postgres_data` (database) and `uploads_data` (receipts) persist across restarts. Snapshot them or plug into your backup tooling; `make clean` will delete both volumes.
- **Logging & monitoring**: `morgan` logs HTTP requests; add centralized forwarding (e.g., Fluent Bit) or APM if deploying to cloud. Health checks live at `/health`.
- **Dependency updates**: Dockerfiles use multi-stage builds and pin to current Alpine/Node/Nginx tags. Rebuild periodically (`docker compose build`) to pick up security patches.

Use this section as a baseline operational checklist when onboarding new administrators or preparing for audits.

## Next Steps

- [ ] Add automated tests + CI to cover auth, budgets, transactions, and exports.
- [ ] Harden file-upload handling (virus scanning, size quotas, S3 offload).
- [ ] Optional: role-based access, advanced auth, and admin tooling for categories/users.

Have fun budgeting! 🎯
