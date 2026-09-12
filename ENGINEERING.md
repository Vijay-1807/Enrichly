# ENGINEERING.md — Enrichly Job Automation Platform

Short, decision-focused notes for reviewers. The full product story is in `README.md`.

## 1. Architecture (30 seconds)

```
Next.js (browser) ──HTTPS──▶ ASP.NET Core API ──EF Core──▶ PostgreSQL (source of truth)
                                    │  ▲
                        create      │  │ claim (FOR UPDATE SKIP LOCKED)
                                    ▼  │
                              executions table ◀── JobWorker (BackgroundService, N replicas)
                                    ▲
                              JobScheduler (due interval jobs, row-locked)
```

- **No Redis.** Postgres is the queue *and* the store. One fewer service to deploy/fail,
  and `SKIP LOCKED` gives us correct competing-consumer semantics with zero extra infra.
  At assignment scale (poll every 2s, dozens of jobs) this is the right trade-off.
  If throughput ever demanded push-based dispatch, I'd add Redis Streams *in front of*
  Postgres (Redis for wake-up, Postgres for truth) — never replace Postgres as truth.
- API, worker, and scheduler ship in **one .NET image**. `docker compose` runs `api` + `worker`
  (same image, two containers) to prove multi-worker safety; production can ` --scale api=3`.
- Frontend is a thin client: JWT in `localStorage`, `NEXT_PUBLIC_API_URL` baked at build,
  5s/2.5s polling instead of websockets (simpler, deployable everywhere).

## 2. How a job is picked up and executed

1. **Create:** `POST /api/jobs/{id}/run` (or scheduler) inserts an `executions` row with
   `status=Queued`. With `Idempotency-Key`, the insert is deduplicated per `(job_id, key)`
   — unique partial index + catch-and-return-winner on race.
2. **Claim:** each worker loops: `BEGIN; SELECT … WHERE status='Queued' AND (next_retry_at IS NULL OR …) ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED; UPDATE → Running + worker_id/locked_at/heartbeat_at/attempt+1; COMMIT`. Losers skip the locked row instead of blocking.
3. **Execute:** worker inserts an `execution_attempts` row, calls the HTTP target with
   `HttpClient` (per-job timeout, `X-Job-Execution-Id` header, secrets never logged),
   truncates bodies to 4KB.
4. **Finish:** `2xx` → `Success`. Else if `attempt <= maxRetries` → back to `Queued` with
   `next_retry_at = now + 5s·2^(attempt-1)` (capped 5 min). Else → `Failed`.
   Every path writes a `job_logs` row and a structured log with `job_id/execution_id/worker_id`.
5. **Observe:** UI polls execution detail (attempts + logs + timeline) until terminal.

## 3. Concurrency

- **Claim race:** `FOR UPDATE SKIP LOCKED` inside a transaction is the entire guarantee.
  Proven by `ConcurrencyTests.TwoWorkers_CannotClaimSameExecution` (real Postgres, parallel
  claimants, exactly one wins; skipped without `TEST_DATABASE_URL`).
- **Double Run Now:** unique index on `(job_id, idempotency_key)` + application-level
  check-then-insert with `DbUpdateException` → return-winner fallback.
- **Concurrent job edits:** `xmin` row-version column; `PUT` accepts `rowVersion` and
  returns `409` on mismatch, plus EF `DbUpdateConcurrencyException` → `409`.
- **Double scheduling:** scheduler claims due *jobs* with the same `SKIP LOCKED` pattern
  before inserting executions, so two scheduler replicas never duplicate an occurrence.

## 4. Retries and failures

- Policy is pure and tested (`RetryPolicy`): exponential `5s·2^(n-1)`, cap 5 min,
  `ShouldRetry(attempt, maxRetries)`. `maxRetries` is "retries after the first try" (0–10).
- Each attempt is its own row (`UNIQUE(execution_id, attempt_number)`) — reviewers see
  exactly what happened on try 1 vs try 3.
- Executor maps: `2xx` = success; non-2xx/timeout/DNS/TLS = failure with message.
  Timeouts use `TaskCanceledException` detection (not cancellation-token confusion).
  Cloud-metadata hosts are blocked (SSRF hygiene).
- **Worker crash:** `heartbeat_at` + `locked_at`; any `Running` row with heartbeat older
  than `StaleTimeoutSeconds` (120s) is requeued to `Queued` with a warning log.
- **Cancel:** `Queued` → `Cancelled` immediately; `Running` → `Cancelled`, and the worker
  re-checks status after the HTTP call so it never overwrites a user cancel.
- **DB/queue blips:** worker/scheduler loops catch, log, and back off; claim and schedule
  transactions roll back cleanly; boot-time migration retries 10×.

## 5. Database decisions

- Tables: `users`, `jobs`, `executions`, `execution_attempts`, `job_logs`. All IDs are
  client-generated GUIDs (safe retries, no sequence contention).
- Key indexes: `users(email)` unique; `jobs(user_id)`, `jobs(enabled)`, `jobs(next_run_at)`;
  `executions(job_id, created_at DESC)`, `executions(status)`, `executions(next_retry_at)`,
  unique `(job_id, idempotency_key)` where non-null; unique `(execution_id, attempt_number)`.
- Enums stored as strings (`Queued`, `Running`, …) — readable in `psql`, no lookup tables.
- `jobs.xmin` as the EF concurrency token (no extra column).
- Every data query is scoped by `UserId` (`Job.UserId == currentUser`); executions join
  through their job. There is no endpoint that touches another user's rows.

## 6. Product decisions

- **HTTP jobs first.** One well-executed type demonstrates scheduling, timeouts, retries,
  and failure visibility better than five stubs. Webhooks/syncs/scripts are all HTTP-shaped.
- **Demo endpoints** (`/api/demo/echo|flaky|fail|slow`) remove the "now find a URL to test"
  friction — the #1 reason take-home demos stall.
- **Execution detail over job list.** The assignment's core question is "what happened when
  it failed?" — so attempts, per-attempt bodies, durations, and logs get the most UI space.
- **Retry creates a new execution** linked via `parent_execution_id`, preserving the original
  failure as evidence instead of mutating it.
- Dashboard shows only what drives action: totals, running, 24h failures/success rate, recent runs.

## 7. Testing

30 xUnit tests, focused where bugs hurt (not coverage theater):
`RetryPolicy` (backoff math, caps, limits), `ExecutionTransitions` (all 11 legal/illegal edges),
`JobValidator` (URL/verb/interval/headers/body rules), `ExecutionService` (idempotent replay,
per-key isolation, user isolation mirroring controller scoping, retry linkage, cancel semantics),
`ConcurrencyTests` (two workers, one row, one winner — real Postgres when available).

## 8. Known limitations

- Polling (2s worker, 15s scheduler, 5s UI) — higher latency/fewer guarantees than push queues.
- Interval schedules only (≥60s); no cron, no timezone support, no pause-during-maintenance.
- Job header secrets stored plaintext; no per-job auth vault, no secret rotation.
- Single HTTP executor; no payload templating, no response-condition success rules.
- Logs capped (200/execution), bodies truncated (4KB/attempt, 2KB in API) — by design.
- No websockets/SSE, no email/Slack notifications, no worker-health dashboard.

## 9. What I'd do with more time

1. Redis Streams wake-up + Postgres truth (sub-second dispatch, same safety).
2. Cron + timezone-aware scheduler with catch-up policy (skip vs backfill).
3. Secret store (per-job credentials, redaction everywhere, rotation).
4. SSE for live execution streaming; worker heartbeat table + health UI.
5. Success rules (e.g. "2xx + body contains X"), webhook triggers-in, Slack/email on final failure.
6. Playwright smoke test: register → create flaky job → run → retry → assert UI.

## 10. Time trade-offs (8–12h box)

- Chose Postgres-queue over Redis: saved ~2h of infra + failure-mode surface, kept the
  concurrency story fully demonstrable.
- Chose polling over websockets: saved ~2h, deployable on any host, still feels live.
- Chose one job type + demo endpoints: saved ~3h, kept failure/retry depth high.
- Chose boot-migration + demo-user seed: reviewers go from `compose up` to running a job
  in under 2 minutes with zero local setup.
