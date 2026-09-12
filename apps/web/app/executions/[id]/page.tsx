'use client';
import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ExecutionDetail } from '@/lib/api';
import { useLiveUpdates } from '@/lib/realtime';
import { useRequireAuth } from '@/components/AuthBar';
import { ErrorBox, SectionLabel, SkeletonRows, StatusBadge, timeAgo } from '@/components/ui';

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

  // Instant refresh on worker broadcast for this execution (polling below stays as fallback).
  const live = useLiveUpdates((e) => {
    if (e.executionId === id && !document.hidden) load();
  }, id);
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

  const facts: [string, string][] = [
    ['Trigger', ex.trigger], ['Attempt', String(ex.attempt)],
    ['Duration', ex.durationMs != null ? `${ex.durationMs}ms` : '—'],
    ['HTTP', ex.responseStatus ? String(ex.responseStatus) : '—'],
    ['Worker', ex.workerId?.slice(0, 18) || '—'], ['Started', timeAgo(ex.startedAt)],
    ['Finished', timeAgo(ex.completedAt)], ['Next retry', ex.nextRetryAt ? timeAgo(ex.nextRetryAt) : '—'],
  ];

  return (
    <div className="space-y-10">
      <section className="animate-enter space-y-4" style={{ ['--d' as any]: '0ms' }}>
        <Link href={`/jobs/${ex.jobId}`} className="text-sm font-medium text-stone-400 transition hover:text-[#15201a]">← {ex.jobName}</Link>
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="h-display text-4xl sm:text-5xl">Run <span className="font-mono text-[#2e7d5b]">#{ex.id.slice(0, 8)}</span></h1>
          <StatusBadge status={ex.status} />
          {!terminal && (
            <span className="pill !border-emerald-300 !bg-emerald-50 !text-emerald-800">
              <span className="dot bg-emerald-600 text-emerald-600 dot-live" /> {live ? 'realtime' : 'live'}
            </span>
          )}
          <span className="flex w-full flex-wrap gap-2 sm:ml-auto sm:w-auto">
            {!terminal && <button onClick={cancel} disabled={busy} className="btn-outline flex-1 sm:flex-none">Cancel</button>}
            {(ex.status === 'Failed' || ex.status === 'Cancelled') && (
              <button onClick={retry} disabled={busy} className="btn-primary flex-1 sm:flex-none">{busy ? '…' : '↻ Retry'}</button>
            )}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border sm:grid-cols-4" style={{ borderColor: 'var(--line)', background: 'var(--line)' }}>
          {facts.map(([k, val]) => (
            <div key={k} className="bg-white p-4">
              <p className="eyebrow !text-[10px]">{k}</p>
              <p className="mt-1 truncate font-semibold" title={val}>{val}</p>
            </div>
          ))}
        </div>
      </section>

      {ex.errorMessage && (
        <div className="animate-enter rounded-2xl border border-red-200 bg-red-50/70 p-5" style={{ ['--d' as any]: '60ms' }}>
          <p className="eyebrow !text-red-400">Failure</p>
          <p className="mt-1.5 break-words font-mono text-[13px] text-red-900">{ex.errorMessage}</p>
        </div>
      )}

      <section className="animate-enter space-y-4" style={{ ['--d' as any]: '100ms' }}>
        <SectionLabel index="01" title={`Attempts · ${ex.attempts.length}`} />
        <div className="relative space-y-3 before:absolute before:bottom-3 before:left-[21px] before:top-3 before:w-px before:bg-[#d9d4c4]">
          {ex.attempts.map((a, i) => (
            <div key={a.attemptNumber} className="animate-enter relative ml-10 rounded-2xl border bg-white p-4 sm:p-5" style={{ borderColor: 'var(--line)', ['--d' as any]: `${i * 70}ms` }}>
              <span className={`absolute -left-10 top-4 flex h-[22px] w-[22px] items-center justify-center rounded-full text-[11px] font-bold text-white ${a.status === 'Success' ? 'bg-[#2e7d5b]' : 'bg-red-400'}`}>
                {a.attemptNumber}
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={a.status} />
                <span className="ml-auto text-xs tabular-nums text-stone-400">{a.durationMs != null ? `${a.durationMs}ms · ` : ''}{timeAgo(a.startedAt)}</span>
              </div>
              {a.errorMessage && <p className="mt-2 break-words font-mono text-xs text-red-700">{a.errorMessage}</p>}
              {a.responseStatus && <p className="mt-2 text-[13px] font-medium">HTTP {a.responseStatus}</p>}
              {a.responseBody && <pre className="mt-2 max-h-44 overflow-auto rounded-xl bg-[#15201a] p-3.5 font-mono text-xs leading-relaxed text-[#d7e3d3]">{a.responseBody}</pre>}
            </div>
          ))}
          {ex.attempts.length === 0 && <p className="ml-10 text-sm text-stone-400">Queued — a worker will pick this up shortly.</p>}
        </div>
      </section>

      <section className="animate-enter space-y-4" style={{ ['--d' as any]: '160ms' }}>
        <SectionLabel index="02" title={`Logs · ${ex.logs.length}`} />
        <div className="max-h-80 space-y-1.5 overflow-auto rounded-2xl bg-[#15201a] p-4 font-mono text-xs leading-relaxed sm:p-5">
          {ex.logs.map((l, i) => (
            <p key={i} className="break-words">
              <span className="text-stone-500">{new Date(l.createdAt).toLocaleTimeString()}</span>{' '}
              <span className={l.level === 'error' ? 'font-bold text-red-400' : l.level === 'warn' ? 'font-bold text-amber-300' : 'text-emerald-300'}>[{l.level}]</span>{' '}
              <span className="text-stone-200">{l.message}</span>
            </p>
          ))}
          {ex.logs.length === 0 && <p className="text-stone-500">No logs yet.</p>}
        </div>
      </section>
    </div>
  );
}
