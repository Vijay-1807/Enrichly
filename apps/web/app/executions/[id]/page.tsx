'use client';
import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ExecutionDetail } from '@/lib/api';
import { useRequireAuth } from '@/components/AuthBar';
import { ErrorBox, SkeletonRows, StatusBadge, timeAgo } from '@/components/ui';

export default function ExecutionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const ready = useRequireAuth();
  const [ex, setEx] = useState<ExecutionDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setErr(null);
    try { setEx(await api.getExecution(id)); }
    catch (e: any) { setErr(e.message); }
  }
  useEffect(() => { if (ready) load(); }, [ready]);
  useEffect(() => {
    if (!ready || ex?.status === 'Success' || ex?.status === 'Failed' || ex?.status === 'Cancelled') return;
    const t = setInterval(() => { if (!document.hidden) load(); }, 2500);
    return () => clearInterval(t);
  }, [ready, ex?.status]);

  if (!ready) return null;
  if (err) return <div className="animate-enter"><ErrorBox message={err} onRetry={load} /></div>;
  if (!ex) return <div className="card"><SkeletonRows n={5} /></div>;
  const terminal = ['Success', 'Failed', 'Cancelled'].includes(ex.status);

  async function retry() {
    setBusy(true);
    try {
      const r = await api.retryExecution(id);
      window.location.href = `/executions/${r.executionId}`;
    } catch (e: any) { alert(e.message); }
    finally { setBusy(false); }
  }
  async function cancel() {
    setBusy(true);
    try { await api.cancelExecution(id); await load(); }
    catch (e: any) { alert(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-5">
      <Link href={`/jobs/${ex.jobId}`} className="animate-enter text-sm font-semibold text-orange-700 hover:underline">← {ex.jobName}</Link>
      <div className="animate-enter flex flex-wrap items-center gap-3" style={{ ['--d' as any]: '40ms' }}>
        <h1 className="text-2xl font-extrabold tracking-tight text-stone-900 sm:text-3xl">Execution <span className="font-mono text-orange-700">#{ex.id.slice(0, 8)}</span></h1>
        <StatusBadge status={ex.status} />
        {!terminal && (
          <span className="flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700 ring-1 ring-sky-200">
            <span className="dot bg-sky-500 text-sky-500 dot-live" /> live — auto-refreshing
          </span>
        )}
        <span className="flex w-full flex-wrap gap-2 sm:ml-auto sm:w-auto">
          {!terminal && <button onClick={cancel} disabled={busy} className="btn-secondary flex-1 sm:flex-none">Cancel</button>}
          {(ex.status === 'Failed' || ex.status === 'Cancelled') && (
            <button onClick={retry} disabled={busy} className="btn-primary flex-1 sm:flex-none">{busy ? '…' : '↻ Retry'}</button>
          )}
        </span>
      </div>

      {!terminal && (
        <div className="h-1.5 overflow-hidden rounded-full bg-orange-100">
          <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-amber-400 to-orange-500" style={{ animation: 'shimmer 1.6s linear infinite', backgroundSize: '800px 100%', backgroundImage: 'linear-gradient(90deg,#FBBF24 25%,#F97316 40%,#FBBF24 60%)' }} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[['Trigger', ex.trigger], ['Attempt', String(ex.attempt)],
          ['Duration', ex.durationMs != null ? `${ex.durationMs}ms` : '—'],
          ['HTTP', ex.responseStatus ? String(ex.responseStatus) : '—'],
          ['Worker', ex.workerId?.slice(0, 18) || '—'], ['Started', timeAgo(ex.startedAt)],
          ['Finished', timeAgo(ex.completedAt)], ['Next retry', ex.nextRetryAt ? timeAgo(ex.nextRetryAt) : '—']].map(([k, v], i) => (
          <div key={k} className="card card-hover animate-enter" style={{ ['--d' as any]: `${60 + i * 40}ms` }}>
            <p className="text-[11px] font-bold uppercase tracking-wide text-stone-400">{k}</p>
            <p className="mt-0.5 truncate font-bold text-stone-900" title={String(v)}>{v}</p>
          </div>
        ))}
      </div>

      {ex.errorMessage && (
        <div className="animate-pop rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-orange-50 p-4 text-sm text-red-900">
          <p className="font-bold">⚠ Error</p><p className="mt-1 break-words font-mono text-xs">{ex.errorMessage}</p>
        </div>
      )}

      <div className="card animate-enter" style={{ ['--d' as any]: '160ms' }}>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-stone-500">🔁 Attempts ({ex.attempts.length})</h2>
        <div className="relative space-y-3 before:absolute before:bottom-2 before:left-[15px] before:top-2 before:w-0.5 before:bg-gradient-to-b before:from-orange-200 before:to-amber-100">
          {ex.attempts.map((a, i) => (
            <div key={a.attemptNumber} className="animate-enter relative ml-8 rounded-xl border border-orange-100 bg-white p-3 text-sm shadow-sm transition-shadow duration-300 hover:shadow-md" style={{ ['--d' as any]: `${i * 80}ms` }}>
              <span className={`absolute -left-8 top-3 flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-white ${a.status === 'Success' ? 'bg-emerald-400' : 'bg-red-400'}`} />
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-extrabold text-stone-900">#{a.attemptNumber}</span>
                <StatusBadge status={a.status} />
                <span className="ml-auto text-xs tabular-nums text-stone-400">{a.durationMs != null ? `${a.durationMs}ms · ` : ''}{timeAgo(a.startedAt)}</span>
              </div>
              {a.errorMessage && <p className="mt-1 break-words font-mono text-xs text-red-700">{a.errorMessage}</p>}
              {a.responseStatus && <p className="mt-1 text-xs font-semibold text-stone-600">HTTP {a.responseStatus}</p>}
              {a.responseBody && <pre className="mt-2 max-h-40 overflow-auto rounded-xl bg-stone-900 p-3 font-mono text-[11px] leading-relaxed text-amber-100">{a.responseBody}</pre>}
            </div>
          ))}
          {ex.attempts.length === 0 && <p className="ml-8 text-sm text-stone-500">Worker hasn&apos;t started this execution yet (queued).</p>}
        </div>
      </div>

      <div className="card animate-enter" style={{ ['--d' as any]: '220ms' }}>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-stone-500">📋 Logs ({ex.logs.length})</h2>
        <div className="max-h-72 space-y-1 overflow-auto rounded-xl bg-stone-900 p-3 font-mono text-xs leading-relaxed">
          {ex.logs.map((l, i) => (
            <p key={i} className="break-words"><span className="text-stone-500">{new Date(l.createdAt).toLocaleTimeString()}</span> <span className={l.level === 'error' ? 'font-bold text-red-400' : l.level === 'warn' ? 'font-bold text-amber-300' : 'text-emerald-300'}>[{l.level}]</span> <span className="text-stone-200">{l.message}</span></p>
          ))}
          {ex.logs.length === 0 && <p className="text-stone-500">No logs yet.</p>}
        </div>
      </div>
    </div>
  );
}
