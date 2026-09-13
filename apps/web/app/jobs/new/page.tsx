'use client';
import Link from 'next/link';
import { JobForm } from '@/components/JobForm';
import { useRequireAuth } from '@/components/AuthBar';
import { SectionLabel } from '@/components/ui';
import { api } from '@/lib/api';

export default function NewJob() {
  const ready = useRequireAuth();
  if (!ready) return null;
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <section className="animate-enter space-y-3" style={{ ['--d' as any]: '0ms' }}>
        <Link href="/" className="text-sm font-medium text-stone-400 transition hover:text-[#15201a]">← Overview</Link>
        <SectionLabel index="01" title="New job" />
        <h1 className="h-display text-4xl sm:text-5xl">Ship it.<br /><span className="h-muted">We&apos;ll</span> <span className="display-accent">watch</span> <span className="h-muted">it run.</span></h1>
        <p className="max-w-md text-[15px] text-stone-500">Point a worker at any HTTP endpoint. Start with a demo URL — <span className="green-accent">no external API needed.</span></p>
      </section>
      <JobForm submitLabel="Create job" onSubmit={async (p) => {
        const j = await api.createJob(p);
        window.location.href = `/jobs/${j.id}`;
      }} />
    </div>
  );
}
