'use client';
import { useState } from 'react';
import { api } from '@/lib/api';

export type JobFormValues = {
  name: string; description: string; url: string; method: string;
  headersJson: string; body: string; scheduleMode: string;
  intervalSeconds: string; enabled: boolean; maxRetries: string; timeoutSeconds: string;
};

export const DEMO_URLS = [
  { label: 'Demo: echo (always 200)', url: '/api/demo/echo' },
  { label: 'Demo: flaky (fails ~50%)', url: '/api/demo/flaky' },
  { label: 'Demo: fail (always 500)', url: '/api/demo/fail' },
  { label: 'Demo: slow 3s', url: '/api/demo/slow?ms=3000' },
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
    <form onSubmit={submit} className="card space-y-4">
      {err && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      <div>
        <label className="label">Name</label>
        <input className="input" value={v.name} onChange={set('name')} required maxLength={200} placeholder="Sync users every hour" />
      </div>
      <div>
        <label className="label">Description</label>
        <input className="input" value={v.description} onChange={set('description')} placeholder="What does this job do?" />
      </div>
      <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
        <div>
          <label className="label">Method</label>
          <select className="input" value={v.method} onChange={set('method')}>
            {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="label">URL</label>
          <input className="input" value={v.url} onChange={set('url')} required placeholder="https://api.example.com/webhook" />
          <div className="mt-1 flex flex-wrap gap-1 text-xs">
            <span className="text-slate-400">Try demo:</span>
            {DEMO_URLS.map(d => (
              <button key={d.url} type="button" className="underline text-slate-500 hover:text-slate-800"
                onClick={() => setV({ ...v, url: `${apiBase()}/api/demo/${d.url.split('/').pop()}` })}>{d.label.split(': ')[1]}</button>
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
      <div className="grid gap-4 sm:grid-cols-4">
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
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={v.enabled} onChange={set('enabled')} /> Enabled
      </label>
      <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : submitLabel}</button>
    </form>
  );
}

function apiBase() {
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:5000';
}
