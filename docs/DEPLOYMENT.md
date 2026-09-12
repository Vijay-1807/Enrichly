# Deployment Guide — Enrichly Job Automation

Target topology: **API + Postgres on Render**, **Web on Vercel**.
Why split: Vercel is the best Next.js host; Render runs Docker + managed Postgres in one Blueprint.

## 0. All environment variables (the complete list)

| Variable | Service | Required | Example / notes |
|---|---|---|---|
| `DATABASE_URL` | API | ✅ prod | `postgresql://user:pass@host:5432/enrichly_jobs` — Render injects from database |
| `JWT_SECRET` | API | ✅ prod | 32+ random chars — Render `generateValue`, or `openssl rand -base64 48` |
| `FRONTEND_URL` | API | ✅ prod | `https://enrichly-web.vercel.app` — must exactly match the Vercel URL (CORS) |
| `NEXT_PUBLIC_API_URL` | Web | ✅ prod | `https://enrichly-api.onrender.com` — baked at build time, no trailing slash |
| `ConnectionStrings__Default` | API | local only | `Host=db;Port=5432;Database=enrichly_jobs;Username=postgres;Password=postgres` |
| `Worker__PollIntervalSeconds` | API | no | `2` |
| `Worker__StaleTimeoutSeconds` | API | no | `120` |
| `Worker__LivenessWindowSeconds` | API | no | `60` (workers UI alive threshold) |
| `Scheduler__IntervalSeconds` | API | no | `15` |
| `ASPNETCORE_ENVIRONMENT` | API | no | `Production` on Render |

No `.env` file is committed. For local Docker, `docker compose` works with **no `.env` at all**
(dev defaults). For production, set the four ✅ vars in the dashboards below.

## 1. API + Postgres on Render (5 min)

1. Push this repo to GitHub (done: `Vijay-1807/Enrichly`).
2. Render dashboard → **New → Blueprint** → select the repo → Apply (uses `render.yaml`).
   This creates `enrichly-api` (Docker) + `enrichly-db` (Postgres, free).
3. Wait for deploy → open `https://enrichly-api.onrender.com/api/health` → expect `{"status":"healthy",...}`.
4. Copy the API URL — you need it for Vercel in step 2.
5. After Vercel is live, come back: `enrichly-api` → Environment → set `FRONTEND_URL` to your
   Vercel URL → **Manual Deploy**. (CORS will reject the browser until this matches.)

Notes:
- Migrations + demo user (`demo@enrichly.dev / password123`) run automatically on boot.
- The API process also runs a worker + scheduler, so **one Render instance = full system**.
  For true multi-worker, add a second service pointing at the same image + `DATABASE_URL`
  (renders as the `worker` in `docker-compose.yml`).
- Render free Postgres sleeps when idle; first request after idle takes ~30s. Starter fixes it.
- SignalR realtime works on a single instance. Multi-instance needs a Redis backplane
  (documented limitation in `ENGINEERING.md`); polling fallback keeps the UI correct regardless.

## 2. Web on Vercel (3 min)

1. Vercel dashboard → **Add New → Project** → Import `Vijay-1807/Enrichly`.
2. **Root Directory:** `apps/web` (important — the repo is a monorepo).
3. Framework preset: Next.js (auto-detected). Build: `npm run build`. Output: default.
4. Environment variable: `NEXT_PUBLIC_API_URL` = `https://enrichly-api.onrender.com`
   (your Render URL from step 1 — this is baked in at build time).
5. Deploy → open the Vercel URL → log in with `demo@enrichly.dev / password123`.
6. Copy the Vercel URL back into Render `FRONTEND_URL` (step 1.5) and redeploy the API.

## 3. Verify production (2 min)

1. Create job: `GET https://<api>/api/demo/flaky`, retries 3 → **Run now**.
2. Execution page shows `realtime` badge (SignalR) and live attempt timeline.
3. Create job: `GET https://<api>/api/demo/fail`, retries 0, Notify on **Failed**,
   webhook `https://<api>/api/demo/echo` → run → execution logs show
   `Notification delivered to …`.
4. Dashboard → Workers section shows the Render worker `alive`.
5. `GET https://<api>/api/health` → `healthy`.

## 4. Local Docker (unchanged)

```bash
cp .env.example .env   # optional; defaults work without it
docker compose up --build
# web http://localhost:3000 · api http://localhost:5000/api/health
```
