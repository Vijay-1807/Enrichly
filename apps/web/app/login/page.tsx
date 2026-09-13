'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { ICONS, LineIcon } from '@/components/ui';

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
    <div className="mx-auto grid max-w-4xl items-stretch gap-5">
      <div className="card-dark animate-enter hidden flex-col justify-between p-8 sm:flex" style={{ ['--d' as any]: '0ms' }}>
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
          <LineIcon d={ICONS.layers} className="h-5 w-5 text-emerald-200" />
        </span>
        <div>
          <p className="h-display text-[34px] text-white">Automate <span className="display-accent !text-emerald-200">the boring.</span><br /><span className="text-white/50">Observe</span> <span className="display-accent !text-emerald-300">everything.</span></p>
          <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-white/60">Jobs, workers, retries and <span className="text-emerald-300">full execution history</span> — in one connected platform.</p>
        </div>
        <p className="eyebrow !text-white/40">enrichly · job automation</p>
      </div>
      <div className="animate-enter" style={{ ['--d' as any]: '80ms' }}>
        <h1 className="h-display text-4xl">Welcome back</h1>
        <p className="mt-2 text-[15px] text-stone-500">Sign in to your automation workspace.</p>
        <form onSubmit={submit} className="card mt-6 space-y-4 p-5 sm:p-6">
          {err && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{err}</p>}
          <div><label className="label">Email</label><input className="input" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></div>
          <div><label className="label">Password</label><input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" /></div>
          <button className="btn-primary w-full py-3" disabled={busy}>{busy ? 'Signing in…' : <>Sign in <LineIcon d={ICONS.arrow} className="h-4 w-4" /></>}</button>
          <p className="text-center text-sm text-stone-500">No account? <Link href="/register" className="font-semibold text-[#1d4a38] underline underline-offset-4">Register</Link></p>
        </form>
      </div>
    </div>
  );
}
