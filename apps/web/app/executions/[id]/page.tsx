'use client';
import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ExecutionDetail } from '@/lib/api';
import { useRequireAuth } from '@/components/AuthBar';
import { ErrorBox, StatusBadge, timeAgo } from '@/components/ui';

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
  if (err) return <ErrorBox message={err} onRetry={load} />;
  if (!ex) return <p className="text-sm text-slate-500">Loading…</p>;
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
      <Link href={`/jobs/${ex.jobId}`} className="text-sm text-slate-500 hover:underline">← {ex.jobName}</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Execution {ex.id.slice(0, 8)}</h1>
        <StatusBadge status={ex.status} />
        <span className="ml-auto flex gap-2">
          {!terminal && <button onClick={cancel} disabled={busy} className="btn-secondary">Cancel</button>}
          {(ex.status === 'Failed' || ex.status === 'Cancelled') && (
            <button onClick={retry} disabled={busy} className="btn-primary">{busy ? '…' : 'Retry'}</button>
          )}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[['Trigger', ex.trigger], ['Attempt', String(ex.attempt)],
          ['Duration', ex.durationMs != null ? `${ex.durationMs}ms` : '—'],
          ['HTTP', ex.responseStatus ? String(ex.responseStatus) : '—'],
          ['Worker', ex.workerId?.slice(0, 18) || '—'], ['Started', timeAgo(ex.startedAt)],
          ['Finished', timeAgo(ex.completedAt)], ['Next retry', ex.nextRetryAt ? timeAgo(ex.nextRetryAt) : '—']].map(([k, v]) => (
          <div key={k} className="card"><p className="text-xs text-slate-500">{k}</p><p className="font-semibold">{v}</p></div>
        ))}
      </div>

      {ex.errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold">Error</p><p className="mt-1 font-mono text-xs">{ex.errorMessage}</p>
        </div>
      )}

      <div className="card">
        <h2 className="mb-2 font-semibold">Attempts ({ex.attempts.length})</h2>
        <div className="space-y-3">
          {ex.attempts.map(a => (
            <div key={a.attemptNumber} className="rounded-lg border p-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-semibold">#{a.attemptNumber}</span>
                <StatusBadge status={a.status} />
                <span className="ml-auto text-xs text-slate-400">{a.durationMs != null ? `${a.durationMs}ms · ` : ''}{timeAgo(a.startedAt)}</span>
              </div>
              {a.errorMessage && <p className="mt-1 font-mono text-xs text-red-700">{a.errorMessage}</p>}
              {a.responseStatus && <p className="mt-1 text-xs">HTTP {a.responseStatus}</p>}
              {a.responseBody && <pre className="mt-1 max-h-40 overflow-auto rounded bg-slate-50 p-2 font-mono text-xs">{a.responseBody}</pre>}
            </div>
          ))}
          {ex.attempts.length === 0 && <p className="text-sm text-slate-500">Worker hasn&apos;t started this execution yet (queued).</p>}
        </div>
      </div>

      <div className="card">
        <h2 className="mb-2 font-semibold">Logs ({ex.logs.length})</h2>
        <div className="space-y-1 font-mono text-xs">
          {ex.logs.map((l, i) => (
            <p key={i}><span className="text-slate-400">{new Date(l.createdAt).toLocaleTimeString()}</span> <span className={l.level === 'error' ? 'text-red-600' : l.level === 'warn' ? 'text-amber-600' : 'text-slate-600'}>[{l.level}]</span> {l.message}</p>
          ))}
          {ex.logs.length === 0 && <p className="text-slate-500">No logs yet.</p>}
        </div>
      </div>
    </div>
  );
}
