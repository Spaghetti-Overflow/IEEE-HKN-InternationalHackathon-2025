# Smart Budget Scheduler · IEEE-HKN Budget Hack 2025

<p align="center">
  <strong>Plan academic-year budgets, watch expenses in real time, and never miss a funding deadline.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white&labelColor=20232a" alt="React 18" />
  <img src="https://img.shields.io/badge/Express-4-grey?logo=express&logoColor=white" alt="Express 4" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white" alt="PostgreSQL 16" />
  <img src="https://img.shields.io/badge/Containerized-Docker-0db7ed?logo=docker&logoColor=white" alt="Docker" />
</p>

---

## 📚 Table of Contents

1. [TL;DR](#-tldr)
2. [Architecture & Stack](#-architecture--stack)
3. [Feature Highlights](#-feature-highlights)
4. [Project Layout](#-project-layout)
5. [Getting Started](#-getting-started)
   - [Docker workflow](#docker-workflow)
   - [Local dev (without Docker)](#local-dev-without-docker)
6. [Configuration & Secrets](#-configuration--secrets)
7. [Seed Data Profiles](#-seed-data-profiles)
8. [Makefile & CLI Shortcuts](#-makefile--cli-shortcuts)
9. [API Snapshot](#-api-snapshot)
10. [Security Notes](#-security-notes)
11. [Roadmap](#-roadmap)

---

## ⚡ TL;DR

- **What**: A full-stack budgeting cockpit for IEEE-HKN chapters with analytics, receipts, deadline tracking, and 2FA security.
- **Stack**: React 18 + Vite frontend, Express 4 + PostgreSQL backend, all dockerized for one-command spin up.
- **Audience**: Treasurers who need academic-year visibility, fast exports (CSV/PDF), and guardrails for grant compliance.

> Need a quick taste? Run `make demo_seed` after the stack is up and log in with `demo / hackathon`.

---

## 🧱 Architecture & Stack

| Tier | Tech | Highlights |
| --- | --- | --- |
| Client | React 18, Vite, React Router, Recharts | Dashboard UI, charts, deadline panel, security page, hooks/context for auth + data. |
| Server | Express 4, `pg`, JWT, Multer, PDFKit | REST API, analytics aggregation, CSV/PDF exports, receipt upload pipeline. |
| Database | PostgreSQL 16 | Users, budgets, transactions, deadlines, events, attachments, audit timestamps. |
| Security | bcrypt, TOTP (otplib), Helmet, rate limiting | Username/password auth, optional MFA, secure cookies, basic DoS protection. |
| Ops | Docker Compose, Makefile scripts | Idempotent spin up, seeding helpers, per-service shells, log tailing. |

```
app/
├─ client/            # Vite + React SPA (served via Nginx in Docker)
├─ server/            # Express API + PostgreSQL migrations/seeders
├─ Makefile           # Friendly wrapper around docker compose
├─ docker-compose.yml # postgres + server + client services
└─ .env.example       # Compose-level secrets (copy to app/.env)
```

---

## ✨ Feature Highlights

- 📊 **Budget intelligence** — Actual vs projected balances by academic year, with archived-history browsing.
- 💸 **Transactions & receipts** — CRUD with categories, notes, attachments, and planned/recurring states.
- ⏰ **Deadline radar** — Funding reminders with status tracking and localized timestamps.
- 🎯 **Events & allocations** — Budget events with linked spend so chapters know where every grant dollar lands.
- 🧾 **Exports** — One-click CSV + PDF budget packets, ready for advisors or university finance.
- 🛡️ **Auth + MFA** — Secure login, TOTP enrollment from the dedicated `/security` page, JWT cookies with sane defaults.
- 📈 **Analytics** — Category breakdown bars, monthly trend lines, and deadline counts at a glance.
- 🧱 **Dev ergonomics** — `make up`, instant seeding profiles, and Compose volumes to preserve data between runs.

---

## 🗂 Project Layout

| Path | Purpose |
| --- | --- |
| `app/client/` | React SPA with routes in `src/pages`, auth/data context in `src/context` & `src/hooks`, and API helpers under `src/api`. |
| `app/server/` | Express API with `routes/`, `middleware/`, `utils/`, and seed scripts: `seedBase.js` (baseline admin) + `seed.js` (demo fixtures). |
| `app/docker-compose.yml` | Local production-style stack (Postgres, API, Nginx) powered by `app/.env`. |
| `app/Makefile` | Convenience targets (`make up`, `make demo_seed`, `make server-shell`, …). |
| `server/data/uploads/` | Persistent volume for receipt files if you run the API outside Docker. |

---

## 🚀 Getting Started

### Docker workflow

```bash
cd app
cp .env.example .env              # fill in secrets (JWT, Postgres, origins)
make up                           # builds + boots postgres, server, client
make demo_seed                    # optional: populate demo data
```

Services ship on:

- React client → <http://localhost:5173>
- Express API → <http://localhost:4000>
- PostgreSQL → `localhost:5432` (user `postgres`, db `budgetdb` by default)

Compose uses named volumes (`postgres_data`, `uploads_data`) so data sticks around after `make down`. Run `make clean` to wipe everything.

### Local dev (without Docker)

#### Server (`app/server`)

```bash
cd app/server
cp .env.example .env              # point DATABASE_URL or PG* vars to Postgres
npm install
npm run db:seed:demo              # or npm run db:seed:base
npm run dev
```

Server listens on `http://localhost:4000` and stores uploads under `server/data/uploads/`.

#### Client (`app/client`)

```bash
cd app/client
cp .env.example .env              # ensure VITE_API_URL = http://localhost:4000
npm install
npm run dev
```

Open the Vite URL (usually <http://localhost:5173>); API requests proxy through to the Express server.

---

## 🔐 Configuration & Secrets

| Scope | Template | Notes |
| --- | --- | --- |
| Compose stack | `app/.env.example` | Powers `docker-compose.yml` (Postgres creds, JWT secret, allowed origins, upload caps). Copy to `app/.env` before running `make up`. |
| Express API | `app/server/.env.example` | Configure `DATABASE_URL` or the granular `PGHOST/PGUSER/...` settings and security toggles (`JWT_SECRET`, `AUTH_COOKIE_SECURE`, etc.). |
| React client | `app/client/.env.example` | Only needs `VITE_API_URL` (no `/api` suffix). |

Must-set production values:

- `POSTGRES_PASSWORD` / `POSTGRES_USER`
- `JWT_SECRET` (server refuses to boot with the default)
- `CLIENT_ORIGINS` (comma-separated allowlist for credentialed requests)
- `AUTH_COOKIE_SECURE=true` when serving over HTTPS
- `UPLOAD_MAX_BYTES` + `UPLOAD_ALLOWED_MIME_TYPES` for receipts
- `CLIENT_API_URL` when baking Docker client images

---

## 🌱 Seed Data Profiles

| Command | Creates |
| --- | --- |
| `npm run db:seed:base` or `make base_seed` | Only the configurable admin (set via `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_DISPLAY_NAME`, `ADMIN_TIMEZONE`). Perfect for a clean slate. |
| `npm run db:seed:demo` or `make demo_seed` / `make seed` | Base admin **plus** the `demo / hackathon` account, starter budget, sample transactions, and a deadline. |

After `make clean && make demo_seed`, log in with `demo / hackathon` to explore instantly. Rotate credentials once you create real accounts.

---

## 🛠️ Makefile & CLI Shortcuts

| Make target | Description |
| --- | --- |
| `make up` | Build images (runs `npm ci`) and start postgres, server, and client in detached mode. |
| `make down` | Stop containers while keeping volumes safe. |
| `make clean` | Stop everything and delete volumes (fresh DB + uploads). |
| `make logs` | Tail combined service logs. |
| `make ps` | Inspect container status. |
| `make demo_seed` | Seed admin + demo fixtures. (`make seed` aliases this.) |
| `make base_seed` | Seed only the base admin user. |
| `make server-shell` / `make client-shell` / `make db-shell` | Drop into service shells or `psql`. |

Manual reference:

| Context | Command | Purpose |
| --- | --- | --- |
| API dev | `cd app/server && npm run dev` | Express with nodemon + `.env`. |
| API build | `cd app/server && npm run build` | Placeholder for future bundling (runtime is plain Node). |
| Seed demo | `cd app/server && npm run db:seed:demo` | Populate fixtures for whichever DB `.env` targets. |
| Seed base | `cd app/server && npm run db:seed:base` | Insert admin only. |
| Client dev | `cd app/client && npm run dev` | Start Vite + proxy. |
| Client preview | `cd app/client && npm run build && npm run preview` | Validate the production bundle locally. |
| Docker logs | `cd app && docker compose logs -f server` | Tail a single service without Make wrappers. |

---

## 📡 API Snapshot

| Method | Path | Summary |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Create user (captures timezone). |
| `POST` | `/api/auth/login` | Issue JWT cookie session. |
| `POST` | `/api/auth/login/totp` | Complete login with a 6-digit code when MFA is enabled. |
| `GET` | `/api/auth/me` | Resolve the signed-in profile via cookie. |
| `POST` | `/api/auth/logout` | Clear session cookie. |
| `POST` | `/api/auth/totp/setup` | Generate QR + secret for enrollment. |
| `POST` | `/api/auth/totp/verify` | Confirm TOTP enrollment. |
| `POST` | `/api/auth/totp/disable` | Disable MFA after validating a fresh code. |
| `GET` | `/api/budgets` | Budgets with academic metadata + balances. |
| `GET` | `/api/budgets/archived` | Archived academic-year view. |
| `CRUD` | `/api/transactions` (+ `/receipt`) | Income/expense management with uploads. |
| `CRUD` | `/api/events` | Event-linked allocations. |
| `CRUD` | `/api/deadlines` | Deadline tracking. |
| `GET` | `/api/analytics/overview` | Category split, monthly trend, deadline stats. |
| `GET` | `/api/exports/budget/:id/(csv|pdf)` | Export-ready packets. |

All timestamps are stored as UNIX seconds. Clients send an `X-User-Timezone` header, validated against the IANA DB, so the UI can render local times.

---

## 🔒 Security Notes

- **Secrets & env files** – Keep real `.env` files out of version control; rotate `JWT_SECRET`, Postgres creds, and `CLIENT_ORIGINS` per environment.
- **HTTPS & cookies** – Set `AUTH_COOKIE_SECURE=true` in production so JWT cookies require TLS; cookies default to `SameSite=Lax`.
- **Rate limiting** – Auth routes are wrapped in rate-limit middleware to slow brute force attempts.
- **TOTP** – Secrets are stored server-side; disabling MFA always requires a fresh TOTP code.
- **Uploads** – Multer enforces MIME + size limits. Consider AV scanning or S3 offload for long-term storage.
- **Backups** – Named volumes (`postgres_data`, `uploads_data`) hold live data. Snapshot before upgrades or run `make clean` for a full reset.
- **Logging** – `morgan` logs HTTP requests; add centralized logging or APM hooks for production observability.

---

## 🗺 Roadmap

- [ ] Automated test suite + CI (auth, budgets, exports).
- [ ] Harden file-upload pipeline (virus scanning, quotas, S3/off-site storage).
- [ ] Role-based permissions and admin tooling for chapters.

Have fun budgeting, and may your ledgers always balance. 🎯
# Smart Budget Scheduler (IEEE-HKN Budget Hack 2025)

Full-stack web app (React + Express + PostgreSQL) that helps IEEE-HKN chapters plan yearly budgets, track expenses/incomes in real time, monitor funding deadlines, and visualize spending trends across academic years.

## Architecture

- **Client**: Vite + React 18, React Router, Recharts, Axios.
- **Server**: Express 4, PostgreSQL (`pg` pool), JWT auth, PDFKit for reporting, Multer for receipt uploads.
- **Database**: PostgreSQL with tables for users, budgets, events, transactions, deadlines, attachments.
- **Auth**: Username/password with bcrypt hashing, optional TOTP 2FA, and JWT sessions stored in HTTP-only cookies (configurable TTL + secure flag).

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
- `app/server/` — Express API, organized by `routes/`, `middleware/`, `utils/`, and seed scripts (`scripts/seedBase.js` for baseline admin data plus `scripts/seed.js` for full demo content). Contains its own `.env.example` for standalone development.
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
| Two-factor authentication | ✅ | Optional TOTP enrollment, QR provisioning, and enforced second step on login. |
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
- `TOTP_ISSUER` — Label that appears in authenticator apps when users enroll in two-factor (defaults to “Budget HQ”).
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
3. Ensure PostgreSQL is running (local service or Docker) and choose a seed profile:
    - **Base admin only** (just the configurable admin account):
       ```bash
       npm run db:seed:base
       ```
    - **Demo data** (base admin + demo user/budget/transactions):
       ```bash
       npm run db:seed:demo
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

- `npm run db:seed:base` (or `make base_seed`) inserts only the default admin account. You can customize the username/password/timezone via `ADMIN_*` env vars (see server/.env example) when you want a clean slate.
- `npm run db:seed:demo` (or `make demo_seed` / `make seed`) layers demo fixtures on top: **username** `demo`, **password** `hackathon`, a starter budget, sample transactions, and a deadline.
- After `make clean && make demo_seed`, you can immediately log in with `demo` / `hackathon`. Use this pair for smoke tests, then create real accounts via the UI once ready.
- You can register additional users via the UI; credentials are stored in PostgreSQL with bcrypt hashing.
- Sessions are JWT-based and stored in `httpOnly` cookies. The signing secret defaults to `supersecretkey` but should be overridden via `JWT_SECRET` in production.
- Logout simply clears the cookie; there’s no refresh-token store yet, so revocation happens when tokens expire (configurable via `AUTH_TOKEN_TTL`).

## Two-factor authentication (TOTP)

Multi-factor auth is now built in using TOTP (HMAC-based one-time passwords):

1. Click the **Security** shield button in the dashboard header to open the dedicated `/security` page.
2. Use the **Enable two-factor login** action, scan the QR code with Google Authenticator/Authy/1Password (or paste the secret manually).
3. Enter the 6-digit code to finalize enrollment. The server stores the shared secret (base32) plus a verification timestamp.
4. Future logins require username/password **and** a second challenge. The UI automatically prompts for the code after verifying credentials.
5. To turn 2FA off, supply a current TOTP code on the same security page; you can’t disable without a fresh code.

Environment tips:

- `TOTP_ISSUER` controls the label that authenticator apps display (defaults to `Budget HQ`).
- Challenge JWTs expire after 5 minutes. If a user waits too long, they’ll be asked to re-enter their password before trying another code.
- Rate limiting from the primary auth limiter still applies to `/auth/login`, `/auth/login/totp`, `/auth/totp/verify`, and `/auth/totp/disable`.

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
| `make seed` | Alias for `make demo_seed`. |
| `make demo_seed` | Seed the DB with the base admin plus demo fixtures (`demo`/`hackathon`). |
| `make base_seed` | Seed only the base admin account (no demo content). |
| `make server-shell` / `make client-shell` / `make db-shell` | Drop into a shell/psql inside the running containers for debugging. |

> **Persistence:** Because Compose uses named volumes (`postgres_data`, `uploads_data`), database rows and uploaded files survive `make down`. They are only deleted if you run `make clean` or manually prune volumes.

### Manual command reference

| Context | Command | Purpose |
| --- | --- | --- |
| API dev | `cd app/server && npm run dev` | Start Express with hot reload (uses `server/.env`). |
| API prod build | `cd app/server && npm run build` | _Not needed_ (runtime is plain Node); included for future bundling. |
| Seed data (demo) | `cd app/server && npm run db:seed:demo` | Create demo user/budget in whichever database `server/.env` points to. |
| Seed data (base) | `cd app/server && npm run db:seed:base` | Insert only the configured admin user without demo fixtures. |
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
| POST | `/api/auth/login/totp` | Complete login after password step with a 6-digit code. |
| GET | `/api/auth/me` | Resolve the signed-in user via cookie. |
| POST | `/api/auth/logout` | Clear the session cookie. |
| POST | `/api/auth/totp/setup` | Generate a new shared secret + QR for the current user. |
| POST | `/api/auth/totp/verify` | Confirm enrollment by validating a code. |
| POST | `/api/auth/totp/disable` | Remove the stored secret after verifying a code. |
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
- **Two-factor auth**: TOTP secrets are stored server-side and never exposed after enrollment. Encourage admins to enforce 2FA for treasurers and rotate secrets if a device is lost (disable + re-enable from the dashboard).
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
