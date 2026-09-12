'use client';
import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, Job, ExecutionSummary } from '@/lib/api';
import { useRequireAuth } from '@/components/AuthBar';
import { JobForm } from '@/components/JobForm';
import { Empty, ErrorBox, ICONS, LineIcon, SectionLabel, SkeletonRows, StatusBadge, timeAgo } from '@/components/ui';

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

  const facts: [string, string][] = [
    ['Schedule', job.scheduleMode === 'Interval' ? `every ${job.intervalSeconds}s` : 'manual'],
    ['Next run', timeAgo(job.nextRunAt)],
    ['Success rate', job.successRate != null ? `${job.successRate}%` : '—'],
    ['Notify', job.notifyOn && job.notifyOn !== 'None' ? `${job.notifyOn} → ${job.notificationUrl}` : 'off'],
  ];

  return (
    <div className="space-y-10">
      <section className="animate-enter space-y-4" style={{ ['--d' as any]: '0ms' }}>
        <Link href="/" className="text-sm font-medium text-stone-400 transition hover:text-[#15201a]">← Overview</Link>
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="h-display max-w-xl truncate text-4xl sm:text-5xl">{job.name}</h1>
              <StatusBadge status={job.lastStatus} />
            </div>
            <p className="mt-2 truncate font-mono text-[13px] text-stone-400">{job.method} {job.url}</p>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <button onClick={runNow} disabled={busy} className="btn-primary flex-1 sm:flex-none">
              <LineIcon d={ICONS.play} className="h-4 w-4" /> {busy ? 'Starting…' : 'Run now'}
            </button>
            <button onClick={() => setEditing(!editing)} className="btn-outline flex-1 sm:flex-none">{editing ? 'Close' : 'Edit'}</button>
            <button onClick={remove} className="btn-quiet flex-1 text-red-600 hover:!bg-red-50 sm:flex-none">Delete</button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border lg:grid-cols-4" style={{ borderColor: 'var(--line)', background: 'var(--line)' }}>
          {facts.map(([k, val]) => (
            <div key={k} className="bg-white p-4">
              <p className="eyebrow !text-[10px]">{k}</p>
              <p className="mt-1 truncate font-semibold" title={val}>{val}</p>
            </div>
          ))}
        </div>
      </section>

      {editing && (
        <div className="animate-enter">
          <JobForm
            submitLabel="Save changes"
            initial={{
              name: job.name, description: job.description || '', url: job.url, method: job.method,
              headersJson: job.headersJson || '', body: job.body || '',
              scheduleMode: job.scheduleMode, intervalSeconds: String(job.intervalSeconds || 3600),
              enabled: job.enabled, maxRetries: String(job.maxRetries), timeoutSeconds: String(job.timeoutSeconds),
              notificationUrl: job.notificationUrl || '', notifyOn: job.notifyOn || 'None',
              rowVersion: job.rowVersion,
            } as any}
            onSubmit={async (p) => {
              const updated = await api.updateJob(id, p);
              setJob(updated); setEditing(false);
            }}
          />
        </div>
      )}

      <section className="animate-enter space-y-4" style={{ ['--d' as any]: '120ms' }}>
        <SectionLabel index="01" title="Execution history" aside={<span className="text-xs text-stone-400">{execs.length} shown</span>} />
        <div className="card !p-0 overflow-hidden">
          {execs.length === 0 ? <div className="p-4"><Empty title="No executions yet" hint="Run this job to create the first execution." /></div> : (
            <div className="divide-y" style={{ borderColor: '#f0ede2' }}>
              {execs.map(e => (
                <Link key={e.id} href={`/executions/${e.id}`} className="row-hover flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3.5 sm:px-5">
                  <StatusBadge status={e.status} />
                  <span className="font-mono text-xs text-stone-400">#{e.id.slice(0, 8)}</span>
                  <span className="text-[13px] text-stone-500">attempt {e.attempt} · {e.trigger}</span>
                  <span className="hidden max-w-[260px] truncate text-[13px] text-stone-400 lg:inline">{e.responseStatus ? `HTTP ${e.responseStatus}` : e.errorMessage?.slice(0, 80)}</span>
                  <span className="ml-auto flex items-center gap-3 text-xs tabular-nums text-stone-400">
                    {e.durationMs != null ? `${e.durationMs}ms` : ''} {timeAgo(e.createdAt)}
                    <LineIcon d={ICONS.arrow} className="h-4 w-4 text-stone-300" />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
