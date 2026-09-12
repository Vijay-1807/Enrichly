'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setBusy(true);
    try {
      const r = await api.register(email, password);
      localStorage.setItem('enrichly_token', r.token);
      localStorage.setItem('enrichly_email', r.email);
      window.location.href = '/';
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="mx-auto grid max-w-3xl items-stretch gap-4 sm:grid-cols-2">
      <div className="animate-enter hidden flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-orange-700 p-6 text-white shadow-lg sm:flex" style={{ ['--d' as any]: '0ms' }}>
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 text-2xl backdrop-blur">🚀</span>
        <div>
          <p className="text-2xl font-extrabold leading-tight">Your workers are waiting.</p>
          <p className="mt-2 text-sm text-orange-100">Create an account and run your first job in under a minute.</p>
        </div>
        <p className="text-xs text-orange-200">Enrichly HR · Job Automation</p>
      </div>
      <div className="animate-enter" style={{ ['--d' as any]: '100ms' }}>
        <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-stone-900">Create account</h1>
        <p className="mb-4 text-sm text-stone-500">Free, instant, no setup needed.</p>
        <form onSubmit={submit} className="card space-y-3">
          {err && <p className="animate-pop rounded-xl border border-red-200 bg-red-50 p-2.5 text-sm text-red-800">{err}</p>}
          <div><label className="label">Email</label><input className="input" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></div>
          <div><label className="label">Password (min 8 chars)</label><input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" /></div>
          <button className="btn-primary w-full py-2.5" disabled={busy}>{busy ? 'Creating…' : 'Register →'}</button>
          <p className="text-center text-sm text-stone-500">Have an account? <Link href="/login" className="link-warm font-semibold">Sign in</Link></p>
        </form>
      </div>
    </div>
  );
}
