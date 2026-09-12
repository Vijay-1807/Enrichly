'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, Job, statusColor } from '@/lib/api';
import { useRequireAuth } from '@/components/AuthBar';
import { Empty, ErrorBox, SkeletonRows, StatusBadge, timeAgo } from '@/components/ui';

const STAT_META: Record<string, { icon: string; accent: string; bar: string }> = {
  'Total jobs': { icon: '📦', accent: 'from-amber-100 to-orange-100', bar: 'bg-amber-400' },
  'Active': { icon: '🟢', accent: 'from-emerald-100 to-teal-100', bar: 'bg-emerald-400' },
  'Running': { icon: '⚡', accent: 'from-sky-100 to-indigo-100', bar: 'bg-sky-400' },
  'Failed (24h)': { icon: '🔥', accent: 'from-red-100 to-rose-100', bar: 'bg-red-400' },
  'Success (24h)': { icon: '✨', accent: 'from-yellow-100 to-amber-200', bar: 'bg-amber-500' },
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
      <div className="animate-enter flex flex-wrap items-end justify-between gap-3" style={{ ['--d' as any]: '0ms' }}>
        <div>
          <h1 className="bg-gradient-to-r from-orange-700 via-amber-700 to-orange-600 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-4xl">
            Good day 👋
          </h1>
          <p className="mt-1 text-sm text-stone-500">Create jobs, trigger runs, and watch workers do the rest — failures included.</p>
        </div>
        <Link href="/jobs/new" className="btn-primary">+ New job</Link>
      </div>

      {err && <ErrorBox message={err} onRetry={() => { setLoading(true); load(); }} />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {cards.map(([k, v], i) => (
          <div key={k} className="card card-hover animate-enter overflow-hidden !p-0" style={{ ['--d' as any]: `${60 + i * 70}ms` }}>
            <div className={`h-1 w-full ${STAT_META[k]?.bar}`} />
            <div className="p-4">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-stone-400">
                <span className={`flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br text-sm ${STAT_META[k]?.accent}`}>{STAT_META[k]?.icon}</span>
                <span className="truncate">{k}</span>
              </p>
              {loading && !stats
                ? <div className="skeleton mt-2 h-8 w-16" />
                : <p className="mt-1 text-3xl font-extrabold tabular-nums text-stone-900">{String(v)}</p>}
            </div>
          </div>
        ))}
      </div>

      <div className="card animate-enter !p-0 overflow-hidden" style={{ ['--d' as any]: '200ms' }}>
        <div className="flex flex-col gap-2 border-b border-orange-100 bg-orange-50/50 p-4 sm:flex-row sm:items-center">
          <input className="input sm:max-w-xs" placeholder="🔍 Search jobs…" value={search} onChange={e => setSearch(e.target.value)} />
          <select className="input sm:max-w-[170px]" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="">All statuses</option><option value="active">Active</option><option value="paused">Paused</option>
          </select>
          <span className="text-xs font-medium text-stone-400 sm:ml-auto">{total} job{total === 1 ? '' : 's'}</span>
        </div>

        {loading ? <SkeletonRows n={3} />
          : jobs.length === 0 ? (
            <div className="p-4">
              <Empty
                title="No jobs yet"
                hint="Create your first job — try the demo echo endpoint. It always returns 200."
                action={<Link href="/jobs/new" className="btn-primary">Create your first job →</Link>}
              />
            </div>
          ) : (
            <>
              {/* Mobile: cards */}
              <div className="space-y-2 p-3 sm:hidden">
                {jobs.map((j, i) => (
                  <div key={j.id} className="card card-hover animate-enter !p-4" style={{ ['--d' as any]: `${i * 50}ms` }}>
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/jobs/${j.id}`} className="font-bold text-stone-900">{j.name}</Link>
                      <StatusBadge status={j.lastStatus} />
                    </div>
                    <p className="mt-1 truncate font-mono text-[11px] text-stone-500">{j.method} {j.url}</p>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-stone-400">
                      <span>{j.scheduleMode === 'Interval' ? `⏱ every ${j.intervalSeconds}s` : '👆 manual'}</span>
                      {!j.enabled && <span className="badge bg-stone-200 text-stone-600">paused</span>}
                      <span className="ml-auto tabular-nums">{j.successRate != null ? `${j.successRate}%` : '—'} · {j.totalExecutions} runs</span>
                    </div>
                    <button disabled={running === j.id} onClick={() => runNow(j.id)} className="btn-secondary mt-3 w-full py-2 text-xs font-bold">
                      {running === j.id ? 'Starting…' : '▶ Run now'}
                    </button>
                  </div>
                ))}
              </div>
              {/* Desktop: table */}
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full min-w-[760px] text-sm">
                  <thead><tr className="table-head border-b border-orange-100 bg-orange-50/40">
                    <th className="px-4 py-2.5">Job</th><th>Target</th><th>Schedule</th><th>Last result</th><th>Success</th><th></th>
                  </tr></thead>
                  <tbody>
                    {jobs.map(j => (
                      <tr key={j.id} className="row-hover border-b border-orange-50 last:border-0">
                        <td className="px-4 py-3 pr-2">
                          <Link href={`/jobs/${j.id}`} className="font-bold text-stone-900 hover:text-orange-700 hover:underline">{j.name}</Link>
                          <div className="text-xs text-stone-400">last run {timeAgo(j.lastRunAt)}</div>
                        </td>
                        <td className="max-w-[260px] truncate pr-2 font-mono text-xs text-stone-500">{j.method} {j.url}</td>
                        <td className="whitespace-nowrap pr-2 text-xs text-stone-600">
                          {j.scheduleMode === 'Interval' ? <span>⏱ every {j.intervalSeconds}s</span> : <span>👆 manual</span>}
                          {!j.enabled && <span className="ml-1 badge bg-stone-200 text-stone-600">paused</span>}
                        </td>
                        <td><StatusBadge status={j.lastStatus} /></td>
                        <td className="whitespace-nowrap text-xs tabular-nums text-stone-600">{j.successRate != null ? `${j.successRate}%` : '—'} <span className="text-stone-400">({j.totalExecutions})</span></td>
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
            </>
          )}
      </div>

      {stats?.recentExecutions?.length > 0 && (
        <div className="card animate-enter" style={{ ['--d' as any]: '280ms' }}>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-400">🕘 Recent executions</h2>
          <div className="space-y-1.5 text-sm">
            {stats.recentExecutions.map((e: any) => (
              <Link key={e.id} href={`/executions/${e.id}`} className="row-hover flex flex-wrap items-center gap-2 rounded-xl px-2 py-1.5">
                <span className={`badge ${statusColor(e.status)}`}>{e.status}</span>
                <span className="font-semibold text-stone-800">{e.jobName}</span>
                <span className="text-xs text-stone-400">attempt {e.attempt} · {timeAgo(e.createdAt)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
