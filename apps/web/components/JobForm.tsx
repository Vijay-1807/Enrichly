'use client';
import { useState } from 'react';

export type JobFormValues = {
  name: string; description: string; url: string; method: string;
  headersJson: string; body: string; scheduleMode: string;
  intervalSeconds: string; enabled: boolean; maxRetries: string; timeoutSeconds: string;
};

export const DEMO_URLS = [
  { label: 'echo · always 200', path: 'echo' },
  { label: 'flaky · fails ~50%', path: 'flaky' },
  { label: 'fail · always 500', path: 'fail' },
  { label: 'slow · 3s delay', path: 'slow?ms=3000' },
];

export function JobForm({ initial, submitLabel, onSubmit }: {
  initial?: Partial<JobFormValues>; submitLabel: string;
  onSubmit: (payload: any) => Promise<void>;
}) {
  const [v, setV] = useState<JobFormValues>({
    name: initial?.name || '', description: initial?.description || '',
    url: initial?.url || '', method: initial?.method || 'GET',
    headersJson: initial?.headersJson || '', body: initial?.body || '',
    scheduleMode: initial?.scheduleMode || 'Manual',
    intervalSeconds: initial?.intervalSeconds || '3600',
    enabled: initial?.enabled ?? true,
    maxRetries: initial?.maxRetries || '3', timeoutSeconds: initial?.timeoutSeconds || '30',
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof JobFormValues) => (e: any) =>
    setV({ ...v, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      await onSubmit({
        name: v.name, description: v.description || null, url: v.url, method: v.method,
        headersJson: v.headersJson || null, body: v.body || null,
        scheduleMode: v.scheduleMode,
        intervalSeconds: v.scheduleMode === 'Interval' ? Number(v.intervalSeconds) : null,
        enabled: v.enabled, maxRetries: Number(v.maxRetries), timeoutSeconds: Number(v.timeoutSeconds),
        ...(initial as any),
      });
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="card animate-enter space-y-5" style={{ ['--d' as any]: '80ms' }}>
      {err && <p className="animate-pop rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{err}</p>}

      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wide text-orange-700">📝 Basics</h3>
        <div>
          <label className="label">Name</label>
          <input className="input" value={v.name} onChange={set('name')} required maxLength={200} placeholder="Sync users every hour" />
        </div>
        <div>
          <label className="label">Description</label>
          <input className="input" value={v.description} onChange={set('description')} placeholder="What does this job do?" />
        </div>
      </section>

      <section className="space-y-3 border-t border-orange-100 pt-4">
        <h3 className="text-xs font-bold uppercase tracking-wide text-orange-700">🌐 Request</h3>
        <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
          <div>
            <label className="label">Method</label>
            <select className="input" value={v.method} onChange={set('method')}>
              {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label">URL</label>
            <input className="input font-mono" value={v.url} onChange={set('url')} required placeholder="https://api.example.com/webhook" />
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="font-semibold text-stone-400">Try demo:</span>
              {DEMO_URLS.map(d => (
                <button
                  key={d.path} type="button"
                  className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 font-semibold text-orange-800 transition hover:-translate-y-px hover:bg-orange-100 hover:shadow-sm"
                  onClick={() => setV({ ...v, url: `${apiBase()}/api/demo/${d.path}` })}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Headers (JSON object)</label>
            <textarea className="input font-mono" rows={3} value={v.headersJson} onChange={set('headersJson')} placeholder='{"X-Api-Key": "abc"}' />
          </div>
          <div>
            <label className="label">Body</label>
            <textarea className="input font-mono" rows={3} value={v.body} onChange={set('body')} placeholder='{"hello":"world"}' />
          </div>
        </div>
      </section>

      <section className="space-y-3 border-t border-orange-100 pt-4">
        <h3 className="text-xs font-bold uppercase tracking-wide text-orange-700">⏱ Schedule & reliability</h3>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div>
            <label className="label">Schedule</label>
            <select className="input" value={v.scheduleMode} onChange={set('scheduleMode')}>
              <option>Manual</option><option>Interval</option>
            </select>
          </div>
          <div>
            <label className="label">Every (sec)</label>
            <input className="input" type="number" min={60} value={v.intervalSeconds} onChange={set('intervalSeconds')} disabled={v.scheduleMode !== 'Interval'} />
          </div>
          <div>
            <label className="label">Retries</label>
            <input className="input" type="number" min={0} max={10} value={v.maxRetries} onChange={set('maxRetries')} />
          </div>
          <div>
            <label className="label">Timeout (s)</label>
            <input className="input" type="number" min={2} max={120} value={v.timeoutSeconds} onChange={set('timeoutSeconds')} />
          </div>
        </div>
        <button
          type="button" role="switch" aria-checked={v.enabled}
          onClick={() => setV({ ...v, enabled: !v.enabled })}
          className="flex items-center gap-3 text-sm font-semibold text-stone-700"
        >
          <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${v.enabled ? 'bg-gradient-to-r from-amber-500 to-orange-600' : 'bg-stone-300'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-300 ${v.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </span>
          {v.enabled ? 'Enabled — runs on schedule' : 'Paused — manual runs only'}
        </button>
      </section>

      <button className="btn-primary w-full py-2.5 sm:w-auto" disabled={busy}>{busy ? 'Saving…' : submitLabel}</button>
    </form>
  );
}

function apiBase() {
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:5000';
}
