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

## Table of Contents

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

## TL;DR

- **What**: A full-stack budgeting cockpit for IEEE-HKN chapters with analytics, receipts, deadline tracking, and 2FA security.
- **Stack**: React 18 + Vite frontend, Express 4 + PostgreSQL backend, all dockerized for one-command spin up.
- **Audience**: Treasurers who need academic-year visibility, fast exports (CSV/PDF), and guardrails for grant compliance.

> Need a quick taste? Run `make demo_seed` after the stack is up and log in with `demo / hackathon`.


## Architecture & Stack

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


## Feature Highlights

### Core Features (100% Complete)

- **Budget intelligence** — Actual vs projected balances by academic year, with archived-history browsing.
- **Transactions & receipts** — CRUD with categories, notes, attachments, and planned/recurring states.
- **Deadline radar** — Funding reminders with status tracking and localized timestamps.
- **Events & allocations** — Budget events with linked spend so chapters know where every grant dollar lands.
- **Exports** — One-click CSV + PDF budget packets with secure token-based authentication for cross-origin downloads.
- **Auth + MFA** — Secure login, TOTP enrollment from the dedicated `/security` page, JWT cookies with sane defaults.
- **Analytics** — Category breakdown bars, monthly trend lines, and deadline counts at a glance.
- **Mobile responsive** — Optimized interface for tablets and smartphones with compact hero panels and touch-friendly controls.
- **Dev ergonomics** — `make up`, instant seeding profiles, and Compose volumes to preserve data between runs.

### Advanced Features (Optional Requirements - 100% Complete)

#### Multi-User & Role-Based Access Control

- **Three permission tiers**: Admin (full control), Treasurer (budget management), Member (view-only)
- **Shared budgets**: Budget ownership with multi-user access via `budget_members` table (editor/viewer roles)
- **Admin safeguards**: System prevents deletion/demotion of the last admin account
- **First-user auto-admin**: Initial account automatically receives admin privileges
- **Role middleware**: `requireAdmin` and `requireTreasurerOrAdmin` functions protect sensitive endpoints

#### Admin Control Panel (`/admin`)

A comprehensive administrative dashboard accessible at `/admin` for users with admin role:

**User Management Tab**
- View all registered users with role badges and registration dates
- Modify user roles (admin/treasurer/member) with inline dropdowns
- Delete user accounts with confirmation (blocks deletion of last admin and self-deletion)
- Display user authentication methods (password vs OAuth)

**Categories Tab**
- Create custom transaction categories with name and type (income/expense/both)
- Edit existing categories inline
- Delete categories that are no longer needed
- Categories apply globally across all budgets

**Settings Tab**
- **Organization Branding**: Configure organization name, theme preferences
- **Visual Customization**: Set primary brand colors and logo URL
- **Persistent Storage**: All settings saved to `app_settings` table with timestamps
- Settings propagate across the application for consistent branding

**Statistics Tab**
- Real-time system metrics dashboard
- **User Analytics**: Total user count with role distribution breakdown
- **Budget Metrics**: Active budget count and total transaction volume
- **Activity Indicators**: Visual cards showing system health and usage patterns

#### OAuth Social Login (Fully Implemented)

**Google OAuth Integration** with complete error handling and user experience:

**Backend Implementation**
- `/api/auth/oauth/google` - Initiates OAuth flow with configuration validation
- `/api/auth/oauth/google/callback` - Handles authorization callback and user creation/linking
- `/api/auth/oauth/google/status` - Pre-flight endpoint to check configuration status
- **Automatic user provisioning**: Creates new users or links to existing accounts by email
- **Error handling**: Graceful redirects to login with error parameters when OAuth fails

**Frontend Integration**
- **Enhanced login page** with "Continue with Google" button featuring Google branding
- **Pre-flight validation**: Checks OAuth configuration before redirecting users
- **Error notifications**: Beautiful error boxes distinguish between configuration and authentication failures
  - Orange "Configuration Required" notices for missing credentials
  - Red error alerts for authentication failures
- **Smart error detection**: URL parameters capture OAuth errors (`oauth_not_configured`, `oauth_failed`)

**Setup Guide**
1. Create OAuth 2.0 credentials at [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Configure OAuth consent screen with required scopes: `openid`, `email`, `profile`
3. Set authorized redirect URI: `http://localhost:4000/api/auth/oauth/google/callback` (or production URL)
4. Add credentials to `server/.env`:
   ```env
   GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   PUBLIC_API_URL=http://localhost:4000  # or production URL
   ```
5. Restart server - the "Continue with Google" button will now function
6. **User experience**: Users see clear error messages if OAuth is not configured

**Extensibility**
- Database schema supports multiple OAuth providers (`oauth_provider`, `oauth_id` fields)
- Add GitHub, Microsoft, or other providers by following the same pattern
- See `docs/OAUTH_SETUP.md` for detailed configuration guide

#### Enhanced UI/UX Features

**Modern Authentication Pages**
- **Gradient backgrounds** with animated floating elements
- **Icon-enhanced forms** with SVG icons for each input field
- **Password visibility toggle** with eye icons instead of text
- **Animated buttons** with ripple effects on hover
- **Loading states** with spinner animations during submission
- **Welcome badges** with contextual icons (login vs registration)
- **Smooth transitions** and micro-interactions throughout

**Error Handling & User Feedback**
- **Styled error boxes** with appropriate colors:
  - Red alerts for authentication errors
  - Orange warnings for configuration issues
- **Icon-based messaging** with contextual SVG icons
- **Clear call-to-action** text guiding users to solutions
- **Animated entrance** for error messages (slideIn animation)

**Responsive Design Enhancements**
- Touch-friendly button sizes and spacing
- Mobile-optimized form layouts
- Adaptive card shadows and hover states
- Fluid typography scaling across devices



## Project Layout

| Path | Purpose |
| --- | --- |
| `app/client/` | React SPA with routes in `src/pages`, auth/data context in `src/context` & `src/hooks`, and API helpers under `src/api`. |
| `app/server/` | Express API with `routes/`, `middleware/`, `utils/`, and seed scripts: `seedBase.js` (baseline admin) + `seed.js` (demo fixtures). |
| `app/docker-compose.yml` | Local production-style stack (Postgres, API, Nginx) powered by `app/.env`. |
| `app/Makefile` | Convenience targets (`make up`, `make demo_seed`, `make server-shell`, …). |
| `server/data/uploads/` | Persistent volume for receipt files if you run the API outside Docker. |


## Getting Started

### Docker workflow

```bash
cd app
cp .env.example .env # fill in secrets (JWT, Postgres, origins)
make up              # builds + boots postgres, server, client
make demo_seed       # optional: populate demo data
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
cp .env.example .env # point DATABASE_URL or PG* vars to Postgres
npm install
npm run db:seed:demo # or npm run db:seed:base
npm run dev
```

Server listens on `http://localhost:4000` and stores uploads under `server/data/uploads/`.

#### Client (`app/client`)

```bash
cd app/client
cp .env.example .env # ensure VITE_API_URL = http://localhost:4000
npm install
npm run dev
```

Open the Vite URL (usually <http://localhost:5173>); API requests proxy through to the Express server.


## Configuration & Secrets

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


## Seed Data Profiles

| Command | Creates |
| --- | --- |
| `npm run db:seed:base` or `make base_seed` | Only the configurable admin (set via `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_DISPLAY_NAME`, `ADMIN_TIMEZONE`). Perfect for a clean slate. |
| `npm run db:seed:demo` or `make demo_seed` / `make seed` | Base admin **plus** the `demo / hackathon` account, four budgets (current, outreach, recruitment, legacy), linked events, a dozen+ transactions, and a wall of deadlines so the UI looks demo-ready. |

The demo fixtures now preload:

- 4 budgets spanning current, future, and archived academic years
- 6 marquee events tied to those budgets
- 14 transactions (mix of actual, planned, and recurring entries, many linked to events)
- 6 deadlines covering every status, complete with helpful descriptions/links

After `make clean && make demo_seed`, log in with `demo / hackathon` to explore instantly. Rotate credentials once you create real accounts.


## Makefile & CLI Shortcuts

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


## API Snapshot

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


## Security Notes

- **Secrets & env files** – Keep real `.env` files out of version control; rotate `JWT_SECRET`, Postgres creds, and `CLIENT_ORIGINS` per environment.
- **HTTPS & cookies** – Set `AUTH_COOKIE_SECURE=true` in production so JWT cookies require TLS; cookies default to `SameSite=Lax`.
- **Rate limiting** – Auth routes are wrapped in rate-limit middleware to slow brute force attempts.
- **TOTP** – Secrets are stored server-side; disabling MFA always requires a fresh TOTP code.
- **Uploads** – Multer enforces MIME + size limits. Consider AV scanning or S3 offload for long-term storage.
- **Backups** – Named volumes (`postgres_data`, `uploads_data`) hold live data. Snapshot before upgrades or run `make clean` for a full reset.
- **Logging** – `morgan` logs HTTP requests; add centralized logging or APM hooks for production observability.
