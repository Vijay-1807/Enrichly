'use client';
import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, Job, ExecutionSummary } from '@/lib/api';
import { useRequireAuth } from '@/components/AuthBar';
import { JobForm } from '@/components/JobForm';
import { Empty, ErrorBox, SkeletonRows, StatusBadge, timeAgo } from '@/components/ui';

export default function JobDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const ready = useRequireAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [execs, setExecs] = useState<ExecutionSummary[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    setErr(null);
    try {
      const j = await api.getJob(id);
      setJob(j);
      const e = await api.jobExecutions(id, { page: 1, pageSize: 30 });
      setExecs(e.items);
    } catch (e: any) { setErr(e.message); }
  }
  useEffect(() => { if (ready) load(); }, [ready]);
  useEffect(() => {
    if (!ready) return;
    const t = setInterval(() => { if (!document.hidden) load(); }, 5000);
    return () => clearInterval(t);
  }, [ready]);

  if (!ready) return null;
  if (err) return <div className="animate-enter"><ErrorBox message={err} onRetry={load} /></div>;
  if (!job) return <div className="card"><SkeletonRows n={4} /></div>;

  async function runNow() {
    setBusy(true);
    try {
      const r = await api.runJob(id);
      window.location.href = `/executions/${r.execution.id}`;
    } catch (e: any) { alert(e.message); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!job) return;
    if (!confirm(`Delete "${job.name}"?`)) return;
    await api.deleteJob(id);
    window.location.href = '/';
  }

  return (
    <div className="space-y-5">
      <div className="animate-enter flex flex-wrap items-center gap-2" style={{ ['--d' as any]: '0ms' }}>
        <Link href="/" className="text-sm font-semibold text-orange-700 hover:underline">← Dashboard</Link>
        <h1 className="w-full truncate text-2xl font-extrabold tracking-tight text-stone-900 sm:text-3xl">{job.name}</h1>
        <StatusBadge status={job.lastStatus} />
        <span className="max-w-full truncate font-mono text-xs text-stone-400">{job.method} {job.url}</span>
        <span className="flex w-full flex-wrap gap-2 sm:ml-auto sm:w-auto">
          <button onClick={runNow} disabled={busy} className="btn-primary flex-1 sm:flex-none">{busy ? 'Starting…' : '▶ Run now'}</button>
          <button onClick={() => setEditing(!editing)} className="btn-secondary flex-1 sm:flex-none">{editing ? 'Close' : 'Edit'}</button>
          <button onClick={remove} className="btn-danger flex-1 sm:flex-none">Delete</button>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[['⏱ Schedule', job.scheduleMode === 'Interval' ? `every ${job.intervalSeconds}s` : 'manual'],
          ['🕘 Next run', timeAgo(job.nextRunAt)], ['✨ Success rate', job.successRate != null ? `${job.successRate}%` : '—'],
          ['📊 Runs', `${job.totalExecutions} (${job.failedExecutions} failed)`]].map(([k, v], i) => (
          <div key={k} className="card card-hover animate-enter" style={{ ['--d' as any]: `${60 + i * 60}ms` }}>
            <p className="text-[11px] font-bold uppercase tracking-wide text-stone-400">{k}</p>
            <p className="mt-0.5 truncate font-bold text-stone-900" title={String(v)}>{v}</p>
          </div>
        ))}
      </div>

      {editing && (
        <div className="animate-enter">
          <JobForm
            submitLabel="Save changes"
            initial={{
              name: job.name, description: job.description || '', url: job.url, method: job.method,
              headersJson: job.headersJson || '', body: job.body || '',
              scheduleMode: job.scheduleMode, intervalSeconds: String(job.intervalSeconds || 3600),
              enabled: job.enabled, maxRetries: String(job.maxRetries), timeoutSeconds: String(job.timeoutSeconds),
              rowVersion: job.rowVersion,
            } as any}
            onSubmit={async (p) => {
              const updated = await api.updateJob(id, p);
              setJob(updated); setEditing(false);
            }}
          />
        </div>
      )}

      <div className="card animate-enter !p-0 overflow-hidden" style={{ ['--d' as any]: '180ms' }}>
        <h2 className="border-b border-orange-100 bg-orange-50/50 px-5 py-3 text-sm font-bold uppercase tracking-wide text-stone-500">📜 Execution history</h2>
        {execs.length === 0 ? <div className="p-4"><Empty title="No executions yet" hint="Click Run now to trigger the first run." /></div> : (
          <div className="divide-y divide-orange-50 text-sm">
            {execs.map(e => (
              <Link key={e.id} href={`/executions/${e.id}`} className="row-hover flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 sm:px-5">
                <StatusBadge status={e.status} />
                <span className="font-mono text-xs text-stone-400">#{e.id.slice(0, 8)}</span>
                <span className="text-xs text-stone-500">attempt {e.attempt} · {e.trigger}</span>
                <span className="hidden max-w-[280px] truncate text-xs text-stone-500 md:inline">{e.responseStatus ? `HTTP ${e.responseStatus}` : e.errorMessage?.slice(0, 80)}</span>
                <span className="ml-auto text-xs tabular-nums text-stone-400">{e.durationMs != null ? `${e.durationMs}ms · ` : ''}{timeAgo(e.createdAt)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
