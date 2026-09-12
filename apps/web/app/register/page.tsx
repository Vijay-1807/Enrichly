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
    <div className="mx-auto max-w-sm">
      <h1 className="mb-4 text-2xl font-bold">Create account</h1>
      <form onSubmit={submit} className="card space-y-3">
        {err && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{err}</p>}
        <div><label className="label">Email</label><input className="input" value={email} onChange={e => setEmail(e.target.value)} required /></div>
        <div><label className="label">Password (min 8 chars)</label><input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} /></div>
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Creating…' : 'Register'}</button>
        <p className="text-center text-sm text-slate-500">Have an account? <Link href="/login" className="underline">Sign in</Link></p>
      </form>
    </div>
  );
}
