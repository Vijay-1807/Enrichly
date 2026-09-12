'use client';
import Link from 'next/link';
import { JobForm } from '@/components/JobForm';
import { useRequireAuth } from '@/components/AuthBar';
import { api } from '@/lib/api';

export default function NewJob() {
  const ready = useRequireAuth();
  if (!ready) return null;
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="animate-enter">
        <Link href="/" className="text-sm font-semibold text-orange-700 hover:underline">← Dashboard</Link>
        <h1 className="mt-1 bg-gradient-to-r from-orange-700 to-amber-600 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">New job</h1>
        <p className="mt-1 text-sm text-stone-500">Point a worker at any HTTP endpoint. Start with a demo URL — no external API needed.</p>
      </div>
      <JobForm submitLabel="Create job →" onSubmit={async (p) => {
        const j = await api.createJob(p);
        window.location.href = `/jobs/${j.id}`;
      }} />
    </div>
  );
}
