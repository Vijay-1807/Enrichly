'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, Job, WorkerHealth } from '@/lib/api';
import { useLiveUpdates } from '@/lib/realtime';
import { useRequireAuth } from '@/components/AuthBar';
import { Empty, ErrorBox, ICONS, LineIcon, SectionLabel, SkeletonRows, StatusBadge, timeAgo } from '@/components/ui';

const STATS: { key: string; label: string; icon: string; dark?: boolean }[] = [
  { key: 'totalJobs', label: 'Total jobs', icon: ICONS.box },
  { key: 'activeJobs', label: 'Active', icon: ICONS.check },
  { key: 'runningExecutions', label: 'Running', icon: ICONS.bolt, dark: true },
  { key: 'failedLast24h', label: 'Failed · 24h', icon: ICONS.clock },
  { key: 'successRate', label: 'Success · 24h', icon: ICONS.layers },
];

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
  const [workers, setWorkers] = useState<WorkerHealth[]>([]);

  async function load() {
    setErr(null);
    try {
      const [s, j, w] = await Promise.all([
        api.stats(),
        api.listJobs({ page: 1, pageSize: 50, ...(search ? { search } : {}), ...(filter ? { status: filter } : {}) }),
        api.workersHealth().catch(() => ({ workers: [] as WorkerHealth[], livenessWindowSeconds: 60 })),
      ]);
      setStats(s); setJobs(j.items); setTotal(j.total); setWorkers(w.workers);
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }

  const live = useLiveUpdates(() => { if (!document.hidden) load(); });

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

  const val = (k: string) =>
    k === 'successRate' ? (stats ? `${stats.successRateLast24h}%` : '—') : (stats?.[k] ?? '—');

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="animate-enter space-y-3" style={{ ['--d' as any]: '0ms' }}>
        <SectionLabel index="01" title="What we do" />
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h1 className="h-display max-w-2xl text-[42px] sm:text-[56px]">
            Everything your jobs need.<br />
            <span className="h-muted">Nothing failing silently.</span>
          </h1>
          <p className="max-w-xs pb-2 text-[15px] leading-relaxed text-stone-500">
            One connected platform. From the first job to the next retry, every piece together.
            {live && <span className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-emerald-700"><span className="dot bg-emerald-600 text-emerald-600 dot-live" /> realtime on</span>}
          </p>
        </div>
      </section>

      {err && <ErrorBox message={err} onRetry={() => { setLoading(true); load(); }} />}

      {/* Stats */}
      <section className="space-y-4">
        <SectionLabel index="02" title="At a glance" />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          {STATS.map((s, i) => (
            <div
              key={s.key}
              className={`animate-enter rounded-2xl p-5 transition-transform duration-300 hover:-translate-y-0.5 ${s.dark ? 'card-dark' : 'card card-hover'}`}
              style={{ ['--d' as any]: `${60 + i * 60}ms` }}
            >
              <div className="flex items-start justify-between">
                <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${s.dark ? 'bg-white/10 text-emerald-200' : 'bg-[#edf1e8] text-[#1d4a38]'}`}>
                  <LineIcon d={s.icon} className="h-5 w-5" />
                </span>
                <span className={`text-[11px] ${s.dark ? 'text-white/40' : 'text-stone-300'}`}>0{i + 1}</span>
              </div>
              {loading && !stats
                ? <div className="skeleton mt-4 h-9 w-16" />
                : <p className={`mt-4 text-[34px] font-semibold tabular-nums leading-none tracking-tight ${s.dark ? '' : ''}`}>{String(val(s.key))}</p>}
              <p className={`mt-1.5 text-[11px] font-semibold uppercase ${s.dark ? 'text-white/50' : 'text-stone-400'}`} style={{ letterSpacing: '0.14em' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Workers */}
      <section className="animate-enter space-y-4" style={{ ['--d' as any]: '140ms' }}>
        <SectionLabel index="03" title="Workers" aside={<span className="text-xs text-stone-400">{workers.filter(w => w.alive).length} alive</span>} />
        {workers.length === 0
          ? <p className="text-sm text-stone-400">{loading ? 'Checking workers…' : 'No workers reporting yet.'}</p>
          : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {workers.map((w, i) => (
                <div key={w.workerId} className="card card-hover animate-enter p-4" style={{ ['--d' as any]: `${i * 60}ms` }}>
                  <div className="flex items-center gap-2">
                    <span className={`dot ${w.alive ? 'bg-emerald-600 text-emerald-600 dot-live' : 'bg-stone-300 text-stone-300'}`} />
                    <span className="truncate font-mono text-[13px] font-semibold" title={w.workerId}>
                      {w.workerId.split(':')[0]}:{w.workerId.split(':')[1]?.slice(0, 6)}
                    </span>
                    <span className={`ml-auto text-[11px] font-bold uppercase tracking-wide ${w.alive ? 'text-emerald-700' : 'text-stone-400'}`}>
                      {w.alive ? 'alive' : 'stale'}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-xs tabular-nums text-stone-500">
                    <span>{w.processedCount} done</span>
                    <span className="ml-auto">seen {w.secondsSinceSeen}s ago</span>
                  </div>
                </div>
              ))}
            </div>
          )}
      </section>

      {/* Jobs */}
      <section className="animate-enter space-y-4" style={{ ['--d' as any]: '180ms' }}>
        <SectionLabel index="04" title="Jobs" aside={<span className="text-xs text-stone-400">{total} total</span>} />
        <div className="card !p-0 overflow-hidden">
          <div className="flex flex-col gap-2 border-b p-4 sm:flex-row sm:items-center" style={{ borderColor: 'var(--line)' }}>
            <div className="relative sm:max-w-xs sm:flex-1">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
                <LineIcon d={ICONS.search} className="h-4 w-4" />
              </span>
              <input className="input !pl-10" placeholder="Search jobs…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="input sm:max-w-[180px]" value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="">All statuses</option><option value="active">Active</option><option value="paused">Paused</option>
            </select>
          </div>

          {loading ? <SkeletonRows n={3} />
            : jobs.length === 0 ? (
              <div className="p-4">
                <Empty
                  title="No jobs yet"
                  hint="Create your first job — the demo echo endpoint always returns 200."
                  action={<Link href="/jobs/new" className="btn-primary">Create job <LineIcon d={ICONS.arrow} className="h-4 w-4" /></Link>}
                />
              </div>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="divide-y sm:hidden" style={{ borderColor: 'var(--line)' }}>
                  {jobs.map(j => (
                    <div key={j.id} className="space-y-2 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/jobs/${j.id}`} className="font-semibold leading-snug">{j.name}</Link>
                        <StatusBadge status={j.lastStatus} />
                      </div>
                      <p className="truncate font-mono text-xs text-stone-400">{j.method} {j.url}</p>
                      <div className="flex items-center gap-2">
                        <button disabled={running === j.id} onClick={() => runNow(j.id)} className="btn-outline flex-1 py-2 text-[13px]">
                          <LineIcon d={ICONS.play} className="h-3.5 w-3.5" /> {running === j.id ? 'Starting…' : 'Run'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Desktop rows */}
                <div className="hidden sm:block">
                  <div className="eyebrow grid grid-cols-[1.4fr_1.6fr_0.8fr_0.8fr_0.6fr_0.4fr] gap-4 border-b px-5 py-3" style={{ borderColor: 'var(--line)' }}>
                    <span>Job</span><span>Target</span><span>Schedule</span><span>Last result</span><span>Success</span><span />
                  </div>
                  {jobs.map(j => (
                    <div key={j.id} className="row-hover grid grid-cols-[1.4fr_1.6fr_0.8fr_0.8fr_0.6fr_0.4fr] items-center gap-4 border-b px-5 py-4 last:border-0" style={{ borderColor: '#f0ede2' }}>
                      <div className="min-w-0">
                        <Link href={`/jobs/${j.id}`} className="block truncate font-semibold hover:underline">{j.name}</Link>
                        <span className="text-xs text-stone-400">last run {timeAgo(j.lastRunAt)}</span>
                      </div>
                      <span className="truncate font-mono text-[13px] text-stone-500">{j.method} {j.url}</span>
                      <span className="whitespace-nowrap text-[13px] text-stone-500">
                        {j.scheduleMode === 'Interval' ? `every ${j.intervalSeconds}s` : 'manual'}
                        {!j.enabled && ' · paused'}
                      </span>
                      <span><StatusBadge status={j.lastStatus} /></span>
                      <span className="text-[13px] tabular-nums text-stone-500">{j.successRate != null ? `${j.successRate}%` : '—'} <span className="text-stone-300">({j.totalExecutions})</span></span>
                      <span className="text-right">
                        <button disabled={running === j.id} onClick={() => runNow(j.id)} className="btn-outline px-3.5 py-1.5 text-[13px]">
                          <LineIcon d={ICONS.play} className="h-3.5 w-3.5" /> {running === j.id ? '…' : 'Run'}
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
        </div>
      </section>

      {/* Recent */}
      {stats?.recentExecutions?.length > 0 && (
        <section className="animate-enter space-y-4" style={{ ['--d' as any]: '220ms' }}>
          <SectionLabel index="05" title="Recent runs" />
          <div className="space-y-2">
            {stats.recentExecutions.map((e: any) => (
              <Link key={e.id} href={`/executions/${e.id}`} className="card card-hover flex flex-wrap items-center gap-3 !rounded-xl px-4 py-3">
                <StatusBadge status={e.status} />
                <span className="font-semibold">{e.jobName}</span>
                <span className="text-[13px] text-stone-400">attempt {e.attempt} · {timeAgo(e.createdAt)}</span>
                <LineIcon d={ICONS.arrow} className="ml-auto h-4 w-4 text-stone-300" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
