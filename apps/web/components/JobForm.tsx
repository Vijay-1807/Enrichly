'use client';
import { useState } from 'react';

export type JobFormValues = {
  name: string; description: string; url: string; method: string;
  headersJson: string; body: string; scheduleMode: string;
  intervalSeconds: string; enabled: boolean; maxRetries: string; timeoutSeconds: string;
};

const DEMOS = [
  { label: 'echo · 200', path: 'echo' },
  { label: 'flaky · ~50%', path: 'flaky' },
  { label: 'fail · 500', path: 'fail' },
  { label: 'slow · 3s', path: 'slow?ms=3000' },
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
    <form onSubmit={submit} className="card animate-enter space-y-7 p-5 sm:p-7" style={{ ['--d' as any]: '80ms' }}>
      {err && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{err}</p>}

      <fieldset className="space-y-4">
        <legend className="eyebrow mb-1">Basics</legend>
        <div>
          <label className="label">Name</label>
          <input className="input" value={v.name} onChange={set('name')} required maxLength={200} placeholder="Sync users every hour" />
        </div>
        <div>
          <label className="label">Description</label>
          <input className="input" value={v.description} onChange={set('description')} placeholder="What does this job do?" />
        </div>
      </fieldset>

      <fieldset className="space-y-4 border-t pt-6" style={{ borderColor: 'var(--line)' }}>
        <legend className="eyebrow mb-1">Request</legend>
        <div className="grid gap-4 sm:grid-cols-[150px_1fr]">
          <div>
            <label className="label">Method</label>
            <select className="input" value={v.method} onChange={set('method')}>
              {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label">URL</label>
            <input className="input font-mono !text-[13px]" value={v.url} onChange={set('url')} required placeholder="https://api.example.com/webhook" />
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-stone-400">Try demo:</span>
              {DEMOS.map(d => (
                <button
                  key={d.path} type="button"
                  className="rounded-full border px-2.5 py-1 text-xs font-semibold text-[#1d4a38] transition hover:bg-[#1d4a38] hover:text-white"
                  style={{ borderColor: '#c8d4c4' }}
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
            <label className="label">Headers · JSON</label>
            <textarea className="input font-mono !text-[13px]" rows={3} value={v.headersJson} onChange={set('headersJson')} placeholder='{"X-Api-Key": "abc"}' />
          </div>
          <div>
            <label className="label">Body</label>
            <textarea className="input font-mono !text-[13px]" rows={3} value={v.body} onChange={set('body')} placeholder='{"hello":"world"}' />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4 border-t pt-6" style={{ borderColor: 'var(--line)' }}>
        <legend className="eyebrow mb-1">Schedule & reliability</legend>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div>
            <label className="label">Schedule</label>
            <select className="input" value={v.scheduleMode} onChange={set('scheduleMode')}>
              <option>Manual</option><option>Interval</option>
            </select>
          </div>
          <div>
            <label className="label">Every · sec</label>
            <input className="input" type="number" min={60} value={v.intervalSeconds} onChange={set('intervalSeconds')} disabled={v.scheduleMode !== 'Interval'} />
          </div>
          <div>
            <label className="label">Retries</label>
            <input className="input" type="number" min={0} max={10} value={v.maxRetries} onChange={set('maxRetries')} />
          </div>
          <div>
            <label className="label">Timeout · s</label>
            <input className="input" type="number" min={2} max={120} value={v.timeoutSeconds} onChange={set('timeoutSeconds')} />
          </div>
        </div>
        <button
          type="button" role="switch" aria-checked={v.enabled}
          onClick={() => setV({ ...v, enabled: !v.enabled })}
          className="flex items-center gap-3 text-sm font-medium"
        >
          <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${v.enabled ? 'bg-[#1d4a38]' : 'bg-stone-300'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-300 ${v.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </span>
          {v.enabled ? 'Enabled — runs on schedule' : 'Paused — manual runs only'}
        </button>
      </fieldset>

      <button className="btn-primary w-full py-3 sm:w-auto sm:px-8" disabled={busy}>{busy ? 'Saving…' : submitLabel}</button>
    </form>
  );
}

function apiBase() {
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:5000';
}
