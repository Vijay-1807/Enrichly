'use client';
import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, Job, ExecutionSummary } from '@/lib/api';
import { useRequireAuth } from '@/components/AuthBar';
import { JobForm } from '@/components/JobForm';
import { Empty, ErrorBox, StatusBadge, timeAgo } from '@/components/ui';

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
  if (err) return <ErrorBox message={err} onRetry={load} />;
  if (!job) return <p className="text-sm text-slate-500">Loading…</p>;

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
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/" className="text-sm text-slate-500 hover:underline">← Dashboard</Link>
        <h1 className="w-full text-2xl font-bold">{job.name}</h1>
        <StatusBadge status={job.lastStatus} />
        <span className="text-xs text-slate-400">{job.method} {job.url}</span>
        <span className="ml-auto flex gap-2">
          <button onClick={runNow} disabled={busy} className="btn-primary">{busy ? 'Starting…' : 'Run now'}</button>
          <button onClick={() => setEditing(!editing)} className="btn-secondary">{editing ? 'Close' : 'Edit'}</button>
          <button onClick={remove} className="btn-secondary text-red-600">Delete</button>
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[['Schedule', job.scheduleMode === 'Interval' ? `every ${job.intervalSeconds}s` : 'manual'],
          ['Next run', timeAgo(job.nextRunAt)], ['Success rate', job.successRate != null ? `${job.successRate}%` : '—'],
          ['Runs', `${job.totalExecutions} (${job.failedExecutions} failed)`]].map(([k, v]) => (
          <div key={k} className="card"><p className="text-xs text-slate-500">{k}</p><p className="font-semibold">{v}</p></div>
        ))}
      </div>

      {editing && (
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
      )}

      <div className="card">
        <h2 className="mb-2 font-semibold">Execution history</h2>
        {execs.length === 0 ? <Empty title="No executions yet" hint="Click Run now to trigger the first run." /> : (
          <div className="divide-y text-sm">
            {execs.map(e => (
              <Link key={e.id} href={`/executions/${e.id}`} className="flex items-center gap-3 py-2 hover:bg-slate-50">
                <StatusBadge status={e.status} />
                <span className="font-mono text-xs text-slate-400">{e.id.slice(0, 8)}</span>
                <span className="text-xs">attempt {e.attempt} · {e.trigger}</span>
                <span className="text-xs text-slate-500">{e.responseStatus ? `HTTP ${e.responseStatus}` : e.errorMessage?.slice(0, 80)}</span>
                <span className="ml-auto text-xs text-slate-400">{e.durationMs != null ? `${e.durationMs}ms · ` : ''}{timeAgo(e.createdAt)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
