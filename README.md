# Enrichly · Job Automation Platform

A small, reliable job automation platform: create HTTP jobs, run them now or on an interval,
watch execution history with attempts + logs, and retry failures. Built for the Enrichly HR
Full Stack Developer Intern take-home (v1.0, Aug 2026).

**Stack:** Next.js 14 + React + TypeScript · ASP.NET Core 8 (C#) · PostgreSQL 16 · Docker.
PostgreSQL is the source of truth **and** the queue (atomic `FOR UPDATE SKIP LOCKED` claims),
so multiple workers can run with zero extra infrastructure.

## Features

- Auth (register/login, JWT, per-user isolation on every query)
- Job CRUD: HTTP method/URL/headers/body, manual or interval schedule, retries, timeout, enabled flag
- Run Now with `Idempotency-Key` (double-clicks don't create duplicates)
- Scheduler: due interval jobs create executions exactly once (row-locked)
- Workers: competing consumers, atomic claim, exponential-backoff retries, stale-worker recovery
- Execution history: status, attempts, HTTP status, durations, error messages, logs
- Retry failed/cancelled (creates a linked execution), cancel queued/running
- Dashboard stats + search/filter + auto-refresh while jobs run
- Demo endpoints (`/api/demo/echo|flaky|fail|slow`) so reviewers need no external APIs
- Health endpoint, Swagger in dev, structured logs with job/execution/worker IDs

## Repo structure

```
enrichly-job-automation/
  apps/api/            # ASP.NET Core API + worker + scheduler + EF migrations
    Controllers/       # Auth, Jobs, Executions, Dashboard, Health, Demo
    Services/          # JwtService, ExecutionService, HttpJobExecutor, RetryPolicy, JobValidator
    Workers/           # JobWorker (claim→execute→retry), JobScheduler
    Data/Migrations/   # EF Core migrations
  apps/web/            # Next.js App Router frontend
    app/               # dashboard, login, register, jobs/new, jobs/[id], executions/[id]
    components/ lib/
  tests/Api.Tests/     # xUnit: retries, state machine, validation, idempotency, auth, concurrency
  docker-compose.yml   # db + api + worker + web
  ENGINEERING.md       # architecture + decisions + trade-offs
```

## Prerequisites

- .NET 8 SDK, Node 22+, Docker + Compose
- Ports free: 3000 (web), 5000 (api), 5432 (postgres)

## Local setup (fastest: Docker)

```bash
cp .env.example .env
# set JWT_SECRET to a long random string in .env
docker compose up --build
```

Open: web http://localhost:3000 · api http://localhost:5000/api/health · swagger http://localhost:5000/swagger (dev).

Login with the demo user or register a new one:

| Email | Password |
|---|---|
| `demo@enrichly.dev` | `password123` |

> The demo user is created automatically on first API boot (see `Seed` note below) — or just register.

### Without Docker (manual)

```bash
# 1. Postgres
createdb enrichly_jobs  # or: docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16-alpine

# 2. API
cd apps/api
dotnet ef database update
JWT_SECRET=<32+ chars> FRONTEND_URL=http://localhost:3000 dotnet run
# API on http://localhost:5000 (launchSettings) — health: /api/health

# 3. Web
cd ../web
npm install
NEXT_PUBLIC_API_URL=http://localhost:5000 npm run dev
# Web on http://localhost:3000
```

## Database migrations

```bash
cd apps/api
dotnet ef migrations add <Name> --output-dir Data/Migrations
dotnet ef database update
```

The API also runs `MigrateAsync()` on boot with retries, so Docker/production needs no manual step.

## Running tests

```bash
dotnet test tests/Api.Tests/Api.Tests.csproj
```

30 tests covering: exponential backoff, state-transition rules, request validation,
idempotent Run Now, user isolation, retry/cancel semantics, and a Postgres-backed
two-workers-race-on-one-row test (runs when `TEST_DATABASE_URL` is set, skipped otherwise).

```bash
TEST_DATABASE_URL="Host=localhost;Database=enrichly_jobs;Username=postgres;Password=postgres" dotnet test
```

## Deployment

The app is 12-factor: all config via env vars. You need Postgres + API + Web.

| Var | Where | Example |
|---|---|---|
| `DATABASE_URL` or `ConnectionStrings__Default` | API | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` (32+ chars, required) | API | random string |
| `FRONTEND_URL` | API (CORS) | `https://jobs.example.com` |
| `NEXT_PUBLIC_API_URL` (baked at build) | Web | `https://api.example.com` |

**Option A — Render/Railway/Fly (recommended):**
1. Create Postgres, copy its URL to `DATABASE_URL`.
2. Deploy `apps/api` as a web service (Dockerfile included). Set `JWT_SECRET`, `FRONTEND_URL`, `DATABASE_URL`.
3. Deploy `apps/web` with build arg `NEXT_PUBLIC_API_URL=<api url>`.
4. Scale the API to 2+ instances to demo multiple workers.

**Option B — single VPS:** `docker compose up --build -d` with a `.env` pointing at hosted Postgres.

Verify: open the live web URL → register → create a job with `GET <api>/api/demo/flaky` → Run now →
watch attempts/logs → retry when it fails.

## API quick reference

```
POST /api/auth/register|login
GET  /api/health
GET  /api/jobs?search=&status=active|paused&page=&pageSize=
POST /api/jobs   GET /api/jobs/{id}   PUT /api/jobs/{id}   DELETE /api/jobs/{id}
POST /api/jobs/{id}/run              (Idempotency-Key header supported)
GET  /api/jobs/{id}/executions?status=&page=
GET  /api/executions/{id}            (attempts + logs)
POST /api/executions/{id}/retry      POST /api/executions/{id}/cancel
GET  /api/dashboard/stats
GET  /api/demo/echo|flaky|fail|slow?ms=
```

## Known limitations

- Queue is Postgres polling (2s), not push-based — fine at this scale, higher latency than Redis pub/sub.
- One job type (HTTP). No cron expressions (interval ≥ 60s only), no webhooks-in, no notifications.
- No real-time websockets (5s/2.5s polling instead), no pagination beyond 100/page, logs capped at 200/execution.
- Secrets in job headers are stored in plaintext — acceptable for the assignment, must move to a vault for prod.

See `ENGINEERING.md` for the full reasoning.
