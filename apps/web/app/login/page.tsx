'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function Login() {
  const [email, setEmail] = useState('demo@enrichly.dev');
  const [password, setPassword] = useState('password123');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setBusy(true);
    try {
      const r = await api.login(email, password);
      localStorage.setItem('enrichly_token', r.token);
      localStorage.setItem('enrichly_email', r.email);
      window.location.href = '/';
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="mx-auto grid max-w-3xl items-stretch gap-4 sm:grid-cols-2">
      <div className="animate-enter hidden flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-orange-700 p-6 text-white shadow-lg sm:flex" style={{ ['--d' as any]: '0ms' }}>
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 text-2xl backdrop-blur">⚙️</span>
        <div>
          <p className="text-2xl font-extrabold leading-tight">Automate the boring. Observe everything.</p>
          <p className="mt-2 text-sm text-orange-100">Jobs, workers, retries and full execution history — in one warm place.</p>
        </div>
        <p className="text-xs text-orange-200">Enrichly HR · Job Automation</p>
      </div>
      <div className="animate-enter" style={{ ['--d' as any]: '100ms' }}>
        <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-stone-900">Welcome back</h1>
        <p className="mb-4 text-sm text-stone-500">Sign in to your automation workspace.</p>
        <form onSubmit={submit} className="card space-y-3">
          {err && <p className="animate-pop rounded-xl border border-red-200 bg-red-50 p-2.5 text-sm text-red-800">{err}</p>}
          <div><label className="label">Email</label><input className="input" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></div>
          <div><label className="label">Password</label><input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" /></div>
          <button className="btn-primary w-full py-2.5" disabled={busy}>{busy ? 'Signing in…' : 'Sign in →'}</button>
          <p className="text-center text-sm text-stone-500">No account? <Link href="/register" className="link-warm font-semibold">Register</Link></p>
        </form>
      </div>
    </div>
  );
}
