'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, Job, statusColor } from '@/lib/api';
import { useRequireAuth } from '@/components/AuthBar';
import { Empty, ErrorBox, StatusBadge, timeAgo } from '@/components/ui';

const STAT_META: Record<string, { icon: string; ring: string }> = {
  'Total jobs': { icon: '📦', ring: 'ring-slate-200' },
  'Active': { icon: '🟢', ring: 'ring-emerald-200' },
  'Running': { icon: '🔵', ring: 'ring-blue-200' },
  'Failed (24h)': { icon: '🔴', ring: 'ring-red-200' },
  'Success (24h)': { icon: '✨', ring: 'ring-amber-200' },
};

export default function Dashboard() {
  const ready = useRequireAuth();
  const [stats, setStats] = useState<any>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);

  async function load() {
    setErr(null);
    try {
      const [s, j] = await Promise.all([
        api.stats(),
        api.listJobs({ page: 1, pageSize: 50, ...(search ? { search } : {}), ...(filter ? { status: filter } : {}) }),
      ]);
      setStats(s); setJobs(j.items); setTotal(j.total);
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (ready) { setLoading(true); load(); } }, [ready]);
  useEffect(() => { if (!ready) return; const t = setTimeout(load, 400); return () => clearTimeout(t); }, [search, filter]);
  useEffect(() => {
    if (!ready) return;
    const t = setInterval(() => { if (!document.hidden) load(); }, 5000);
    return () => clearInterval(t);
  }, [ready]);

  if (!ready) return null;

  async function runNow(id: string) {
    setRunning(id);
    try {
      const r = await api.runJob(id);
      window.location.href = `/executions/${r.execution.id}`;
    } catch (e: any) { alert(e.message); }
    finally { setRunning(null); }
  }

  const cards: [string, string][] = [
    ['Total jobs', stats?.totalJobs ?? '—'],
    ['Active', stats?.activeJobs ?? '—'],
    ['Running', stats?.runningExecutions ?? '—'],
    ['Failed (24h)', stats?.failedLast24h ?? '—'],
    ['Success (24h)', stats ? `${stats.successRateLast24h}%` : '—'],
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Good day 👋</h1>
          <p className="mt-1 text-sm text-slate-500">Create jobs, trigger runs, and watch workers do the rest — failures included.</p>
        </div>
        <Link href="/jobs/new" className="btn-primary">+ New job</Link>
      </div>

      {err && <ErrorBox message={err} onRetry={() => { setLoading(true); load(); }} />}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map(([k, v]) => (
          <div key={k} className={`card ring-1 ${STAT_META[k]?.ring || 'ring-slate-200'}`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{STAT_META[k]?.icon} {k}</p>
            {loading && !stats ? <div className="skeleton mt-2 h-8 w-16" /> : <p className="mt-1 text-3xl font-extrabold tabular-nums">{String(v)}</p>}
          </div>
        ))}
      </div>

      <div className="card !p-0 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
          <input className="input max-w-xs" placeholder="🔍 Search jobs…" value={search} onChange={e => setSearch(e.target.value)} />
          <select className="input max-w-[160px]" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="">All statuses</option><option value="active">Active</option><option value="paused">Paused</option>
          </select>
          <span className="ml-auto text-xs font-medium text-slate-400">{total} job{total === 1 ? '' : 's'}</span>
        </div>
        {loading ? (
          <div className="space-y-2 p-4">{[0, 1, 2].map(i => <div key={i} className="skeleton h-12 w-full" />)}</div>
        ) : jobs.length === 0 ? (
          <div className="p-4"><Empty title="No jobs yet" hint="Create your first job — try the demo echo endpoint. It always returns 200." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="table-head border-b border-slate-100">
                <th className="px-4 py-2.5">Job</th><th>Target</th><th>Schedule</th><th>Last result</th><th>Success</th><th></th>
              </tr></thead>
              <tbody>
                {jobs.map(j => (
                  <tr key={j.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70">
                    <td className="px-4 py-3 pr-2">
                      <Link href={`/jobs/${j.id}`} className="font-bold hover:underline">{j.name}</Link>
                      <div className="text-xs text-slate-400">last run {timeAgo(j.lastRunAt)}</div>
                    </td>
                    <td className="max-w-[260px] truncate pr-2 font-mono text-xs text-slate-600">{j.method} {j.url}</td>
                    <td className="whitespace-nowrap pr-2 text-xs">
                      {j.scheduleMode === 'Interval' ? <span>⏱ every {j.intervalSeconds}s</span> : <span>👆 manual</span>}
                      {!j.enabled && <span className="ml-1 badge bg-slate-200 text-slate-600">paused</span>}
                    </td>
                    <td><StatusBadge status={j.lastStatus} /></td>
                    <td className="whitespace-nowrap text-xs tabular-nums">{j.successRate != null ? `${j.successRate}%` : '—'} <span className="text-slate-400">({j.totalExecutions})</span></td>
                    <td className="px-4 text-right">
                      <button disabled={running === j.id} onClick={() => runNow(j.id)} className="btn-secondary px-3 py-1.5 text-xs font-bold">
                        {running === j.id ? 'Starting…' : '▶ Run'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {stats?.recentExecutions?.length > 0 && (
        <div className="card">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-400">Recent executions</h2>
          <div className="space-y-1.5 text-sm">
            {stats.recentExecutions.map((e: any) => (
              <Link key={e.id} href={`/executions/${e.id}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50">
                <span className={`badge ${statusColor(e.status)}`}>{e.status}</span>
                <span className="font-semibold">{e.jobName}</span>
                <span className="text-xs text-slate-400">attempt {e.attempt} · {timeAgo(e.createdAt)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
